/**
 * Step 4 export compiler: permissions, warnings, and — the important part —
 * the emitted mod.js actually runs against a stub SDK: quests register,
 * OnStart builds networks and sends mail, triggers evaluate their
 * conditions, and manual-input commands branch on the typed answer.
 */
import { describe, expect, it, vi } from "vitest";
import { compileProject, computePermissions, computeWarnings, EDITOR_BUILD } from "@/compiler/compile";
import { nodeTypeDef } from "@/schema/registry";
import { createProject, type ProjectDocument } from "@/schema/project";
import type { NodeDoc } from "@/schema/nodes";
import type { EdgeDoc } from "@/schema/edges";

let seq = 0;
const nid = () => `n${++seq}`;

function node(type: Parameters<typeof nodeTypeDef>[0], patch: Record<string, unknown> = {}): NodeDoc {
    const data = { ...(nodeTypeDef(type).create() as object), ...patch };
    return { id: nid(), type, position: { x: 0, y: 0 }, data } as NodeDoc;
}

const edge = (source: string, target: string, kind: EdgeDoc["kind"], sourceHandle = "out", targetHandle = "in"): EdgeDoc => ({
    id: `e${source}-${target}-${sourceHandle}`,
    source,
    sourceHandle,
    target,
    targetHandle,
    kind,
});

function scenarioProject(): ProjectDocument {
    const project = createProject();
    const quest = project.quests[0];
    quest.name = "heist";
    quest.title = "The Heist";
    quest.autoStart = true;

    const entry = node("entry.start");
    const mail = node("comms.dialogue", {
        kind: "mail",
        mail: { from: "h@x.net", subject: "Job", content: "<p>hi</p>", replyable: false },
    });
    const net = node("world.network", {
        ipMode: "fixed",
        device: {
            id: "r1",
            ip: "10.0.0.14",
            type: "ROUTER",
            ports: [{ id: "p1", external: 22, internal: 22, service: "ssh", active: true }],
            users: [{ id: "u1", username: "admin", password: "pw" }],
        },
    });
    const obj = node("objective", { name: "scan", description: "Scan it" });
    const trig = node("trigger.event", {
        event: "Terminal.NmapScan",
        conditions: [{ id: "c1", join: "and", field: "ip", op: "equals", value: "10.0.0.14" }],
    });
    const input = node("reply.input", {
        commandName: "unlock",
        prompt: "Password?",
        expected: "opensesame",
        matchMode: "exact",
        successMessage: "in you go",
        failureMessage: "nope",
    });
    const notifyOk = node("fx.notify", { message: "welcome" });
    const notifyBad = node("fx.notify", { message: "locked out" });
    const obj2 = node("objective", { name: "vault", description: "Reach the vault" });
    const ht = node("reply.hackertyper", {
        surface: "website",
        targetRef: "target.net",
        text: "ACCESS GRANTED",
        eventName: "", // must be generated from the node id
    });
    const notifyGranted = node("fx.notify", { message: "granted" });

    quest.graph.nodes = [entry, mail, net, obj, trig, input, notifyOk, notifyBad, obj2, ht, notifyGranted];
    quest.graph.edges = [
        edge(entry.id, mail.id, "flow"),
        edge(entry.id, net.id, "flow"),
        edge(entry.id, input.id, "flow"),
        edge(mail.id, obj2.id, "flow"),
        edge(trig.id, obj.id, "condition", "trigger", "trigger"),
        edge(input.id, notifyOk.id, "flow", "out"),
        edge(input.id, notifyBad.id, "flow", "failure"),
        edge(ht.id, notifyGranted.id, "flow"),
    ];

    project.websites.push({
        id: "w1",
        host: "target.net",
        name: "Target",
        pages: [
            { id: "p1", path: "/", title: "Home", seo: true, content: "<html><body>home</body></html>" },
            { id: "p2", path: "/secret", title: "Secret", seo: false, content: "<html><body>clue</body></html>" },
        ],
    });
    return project;
}

function stubSdk(calls: string[], listeners: [string, (d: unknown) => void][]) {
    const registered = { quests: [] as any[], websites: [] as any[], commands: [] as any[] };
    class Quest {
        Data: Record<string, unknown> = {};
        Events = {
            on: (e: string, h: (d: unknown) => void) => listeners.push([e, h]),
            off: () => {},
            offAll: () => {},
        };
        sendMail(i: number) { calls.push(`sendMail:${i}`); }
        createDialog(b: string) { calls.push(`createDialog:${b}`); }
        completeObjective(n: string) { calls.push(`complete:${n}`); }
        SetData(k: string, v: unknown) { calls.push(`setData:${k}=${v}`); }
    }
    class Website {}
    class Command {}
    class Bootstrap {}
    const sdk = {
        Quest,
        Website,
        Command,
        Bootstrap,
        RegisterQuest: (c: unknown) => registered.quests.push(c),
        RegisterWebsite: (c: unknown) => registered.websites.push(c),
        RegisterCommand: (c: unknown) => registered.commands.push(c),
        RegisterModPackage: (c: unknown) => (registered as any).mod = c,
        Network: {
            createSubnetNetwork: (d: { ip: string }) => { calls.push(`net:${d.ip}`); return d.ip; },
            createWifiNetwork: () => calls.push("wifi"),
            createUser: (u: unknown) => u,
            randomIp: () => "10.9.9.9",
        },
        Events: { emit: (e: string) => calls.push(`emit:${e}`), on: () => {} },
        Shell: { addCommandData: (c: string) => calls.push(`cmdData:${c}`) },
        UI: { notify: (m: string) => calls.push(`notify:${m}`), toast: (m: string) => calls.push(`toast:${m}`) },
        Bank: {},
        __registered: registered,
    };
    return sdk;
}

/** Flush every pending promise chain the interpreter may have started. */
const settle = async () => {
    for (let i = 0; i < 60; i++) await new Promise((r) => setTimeout(r, 0));
};

const registered0 = (sdk: unknown) => (sdk as any).__registered;

function runMod(modJs: string, sdk: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function("require", "module", "exports", modJs)((name: string) => {
        if (name === "@hotbunny/hackhub-content-sdk") return sdk;
        throw new Error(`unexpected require: ${name}`);
    }, { exports: {} }, {});
}

describe("compile", () => {
    it("computes permissions and packs the mod folder", () => {
        const result = compileProject(scenarioProject());
        const paths = result.files.map((f) => f.path);
        expect(paths).toContain("manifest.json");
        expect(paths).toContain("dist/mod.js");
        expect(paths).toContain("src/index.ts");
        expect(result.permissions).toEqual(expect.arrayContaining(["network", "mail", "shell"]));
        const manifest = JSON.parse(result.files.find((f) => f.path === "manifest.json")!.content);
        expect(manifest.apiVersion).toBe(1);
        expect(manifest.permissions).toContain("network");
    });

    it("the emitted mod.js runs: OnStart builds the network and sends the mail", async () => {
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        const { files } = compileProject(scenarioProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const reg = (sdk as any).__registered;
        expect(reg.quests).toHaveLength(1);
        expect(reg.websites).toHaveLength(1);
        expect(reg.commands).toHaveLength(1);

        const q = new reg.quests[0]();
        expect(q.Name).toBe("heist");
        // the behaviour toggles reach the game — without AutoStart the quest
        // would wait to be claimed and OnStart would never run
        expect(q.AutoStart).toBe(true);
        q.OnStart();
        await settle(); // flow steps are promise-chained
        expect(calls).toContain("net:10.0.0.14");
        expect(calls).toContain("sendMail:0");
        // flow reaching an objective ticks it off …
        expect(calls).toContain("complete:vault");
        // … but the flow PAUSES at the input node until the player answers
        expect(calls).not.toContain("notify:welcome");
        expect(calls).not.toContain("notify:locked out");

        // the trigger's declarative condition evaluates against the payload
        q.OnObjectivesStart();
        const scan = q.Objectives.find((o: { name: string }) => o.name === "scan");
        expect(scan.trigger.event).toBe("Terminal.NmapScan");
        expect(scan.trigger.condition({ ip: "10.0.0.14" })).toBe(true);
        expect(scan.trigger.condition({ ip: "1.2.3.4" })).toBe(false);
    });

    it("manual input commands branch on the typed answer", async () => {
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        const { files } = compileProject(scenarioProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const reg = (sdk as any).__registered;

        const Cmd = reg.commands[0];
        const cmd = new Cmd();
        const tools = (answer: string) => ({
            prompt: async () => answer,
            printSuccess: (m: string) => calls.push(`ok:${m}`),
            printError: (m: string) => calls.push(`err:${m}`),
        });

        await cmd.Run(tools("opensesame"));
        expect(calls.join(" ")).toContain("emit:QE.");
        expect(calls.join(" ")).toContain(".ok");
        expect(calls).toContain("notify:welcome");

        await cmd.Run(tools("wrong"));
        expect(calls.join(" ")).toContain(".wrong");
        expect(calls).toContain("notify:locked out");
        expect(calls).toContain("err:nope");
    });

    it("hackertyper reveal resumes the flow and mounts a widget page", async () => {
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        const { files } = compileProject(scenarioProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const reg = (sdk as any).__registered;
        const q = new reg.quests[0]();
        q.OnObjectivesStart();

        // the generated event name resumes the flow out of the hackertyper node
        const htListener = listeners.find(([ev]) => ev.startsWith("QE.ht."));
        expect(htListener, "no listener for the generated hackertyper event").toBeTruthy();
        htListener![1]({});
        await settle();
        expect(calls).toContain("notify:granted");

        // the widget page exists on the target site, hidden from search, emitting once
        const site = new reg.websites[0]();
        const widget = site.Pages.find((p: { path: string }) => p.path.startsWith("/qe/ht/"));
        expect(widget.seo).toBe(false);
        expect(widget.html).toContain(htListener![0]);
        expect(widget.html).toContain("done=true");
    });

    it("websites compile with hidden pages out of the search index", () => {
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        const { files } = compileProject(scenarioProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const site = new (sdk as any).__registered.websites[0]();
        expect(site.Host).toBe("target.net");
        const secret = site.Pages.find((p: { path: string }) => p.path === "/secret");
        expect(secret.seo).toBe(false);
        expect(secret.html).toContain("clue");
    });

    it("the export dialog shows the compile summary and packs a zip", async () => {
        const { buildModZip } = await import("@/editor/shell/ExportDialog");
        const result = compileProject(scenarioProject());
        const zip = await buildModZip(result, "heist-mod");
        const names = Object.keys(zip.files);
        expect(names).toContain("heist-mod/manifest.json");
        expect(names).toContain("heist-mod/dist/mod.js");
    });
});

describe("world.wifi against the real SDK surface", () => {
    function wifiProject() {
        const p = createProject();
        const q = p.quests[0];
        const entry = node("entry.start");
        const wifi = node("world.wifi", {
            ssid: "CafeNet",
            password: "cake",
            signal: 2,
            ipMode: "fixed",
            ip: "10.0.0.77",
        });
        q.graph.nodes = [entry, wifi];
        q.graph.edges = [edge(entry.id, wifi.id, "flow")];
        return p;
    }

    it("falls back to a router network when the SDK has no Wi-Fi API (0.21.0 reality)", async () => {
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        delete (sdk.Network as { createWifiNetwork?: unknown }).createWifiNetwork;
        runMod(compileProject(wifiProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (sdk as any).__registered.quests[0]();
        q.OnStart();
        await settle();
        expect(calls).toContain("net:10.0.0.77");
        expect(calls.join(" ")).not.toContain("wifi");
    });

    it("prefers a native Wi-Fi API if a future SDK ships one", async () => {
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        runMod(compileProject(wifiProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (sdk as any).__registered.quests[0]();
        q.OnStart();
        await settle();
        expect(calls).toContain("wifi");
        expect(calls.join(" ")).not.toContain("net:10.0.0.77");
    });
});

describe("round-19 fixes", () => {
    it("passes the mail's custom From through sendMail", async () => {
        const p = createProject();
        const q = p.quests[0];
        const entry = node("entry.start");
        const mail = node("comms.dialogue", {
            kind: "mail",
            mail: { from: "Stevey@gomail.com", subject: "Job", content: "hi", replyable: false },
        });
        q.graph.nodes = [entry, mail];
        q.graph.edges = [edge(entry.id, mail.id, "flow")];

        const sent: unknown[][] = [];
        const { registered, sdk } = (() => {
            const base = stubSdk([], []);
            (base as any).Quest.prototype.sendMail = function (...args: unknown[]) { sent.push(args); };
            return { registered: (base as any).__registered, sdk: base };
        })();
        runMod(compileProject(p).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q0 = new registered.quests[0]();
        q0.OnStart();
        await settle();
        expect(sent[0][0]).toBe(0);
        expect(sent[0][1]).toBe("Stevey@gomail.com");
    });

    it("charges a percentage of the player's balance via the real Bank API", async () => {
        const p = createProject();
        const q = p.quests[0];
        const entry = node("entry.start");
        const charge = node("fx.withdraw", { amountMode: "percent", percent: 25, description: "tax" });
        q.graph.nodes = [entry, charge];
        q.graph.edges = [edge(entry.id, charge.id, "flow")];

        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        (sdk as any).Bank = {
            getBalance: () => 4000,
            withdraw: (tx: { amount: number; description: string }) => calls.push(`withdraw:${tx.amount}:${tx.description}`),
            transaction: (tx: { amount: number }) => calls.push(`deposit:${tx.amount}`),
        };
        runMod(compileProject(p).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q0 = new (registered0(sdk).quests[0])();
        q0.OnStart();
        await settle();
        expect(calls).toContain("withdraw:1000:tax");
    });

    it("waits in seconds and embeds cover/icon files with manifest references", async () => {
        const p = createProject();
        p.mod.tags = ["story", "network"];
        p.mod.icon = "data:image/png;base64,iVBORw0KGgo=";
        p.mod.cover = "data:image/jpeg;base64,/9j/4AAQ=";
        const q = p.quests[0];
        const entry = node("entry.start");
        const wait = node("flow.delay", { seconds: 2 });
        q.graph.nodes = [entry, wait];
        q.graph.edges = [edge(entry.id, wait.id, "flow")];

        const result = compileProject(p);
        const manifest = JSON.parse(result.files.find((f) => f.path === "manifest.json")!.content);
        expect(manifest.icon).toBe("assets/icon.png");
        expect(manifest.cover).toBe("assets/cover.jpg");
        expect(manifest.tags).toEqual(["story", "network"]);
        const iconFile = result.files.find((f) => f.path === "assets/icon.png")!;
        expect(iconFile.base64).toBe(true);

        // seconds are honoured (the Wait node stored 2s → a real 2000ms sleep)
        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        runMod(result.files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const started = Date.now();
        const q0 = new (sdk as any).__registered.quests[0]();
        q0.OnStart();
        await new Promise((r) => setTimeout(r, 2100)); // the Wait node slept 2 real seconds
        expect(Date.now() - started).toBeGreaterThanOrEqual(1900);
    });
});

describe("export build stamp", () => {
    it("stamps the editor build id into dist/mod.js", () => {
        const modJs = compileProject(createProject()).files.find((f) => f.path === "dist/mod.js")!.content;
        expect(modJs).toContain(`build ${EDITOR_BUILD}`);
        // Accounts are declared per-quest, never registered through the global
        // API — the imperative path re-posted on reload and could not be undone
        // when the mod was removed, so it must not creep back in.
        expect(modJs).not.toContain("sdk.Twotter.addUser");
        expect(modJs).not.toContain("sdk.Twotter.createUser");
    });
});

describe("Twotter accounts + tweets register declaratively (SDK-native)", () => {
    /**
     * The QA test3 repro: an account with no avatar and a tweet whose accountId
     * is empty. Rounds 21–22 routed Twotter content through the imperative
     * global API (Twotter.addUser/postTweet); in-game that re-posted on every
     * load, dropped tweet images, and left orphaned records after the mod was
     * removed. The SDK's intended path is the declarative quest-level lists,
     * which the engine scopes to the quest and cleans up automatically — so the
     * emitted mod must NOT touch the global Twotter API at all.
     */
    function tweetProject(): ProjectDocument {
        const p = createProject();
        const q = p.quests[0];
        q.twotterAccounts = [
            { id: "5WjPOEiU", username: "qatester3", displayName: "QA Tester 3", verified: false, bio: "third tester" },
        ] as never;
        const entry = node("entry.start");
        const tweet = node("comms.tweet", {
            accountId: "5WjPOEiU",
            content: "This is a Q&A Test Tweet (number 3)",
            image: "data:image/png;base64,AA==",
            comments: 2,
            shares: 1,
            views: 10,
            postedAgo: "2 days",
        });
        q.graph.nodes = [entry, tweet];
        q.graph.edges = [edge(entry.id, tweet.id, "flow")];
        return p;
    }

    it("never calls the global Twotter API (would re-post on reload / orphan records)", async () => {
        const modJs = compileProject(tweetProject()).files.find((f) => f.path === "dist/mod.js")!.content;
        expect(modJs).not.toContain("Twotter.addUser");
        expect(modJs).not.toContain("Twotter.createUser");
        // The one thing the Mod class does on load is repair half-built
        // Twotter account records (see "Twotter save safety"); it must not
        // create, add or post anything.
        expect(modJs).toContain("__qeRepairTwotter(sdk)");

        // The live post path exists for nodes that opt into timing, but a
        // project that has not opted in must never reach it, even once the
        // quest has run.
        const calls: string[] = [];
        const sdk = stubSdk(calls, []) as any;
        sdk.Twotter = {
            postTweet: () => calls.push("postTweet"),
            addUser: () => calls.push("addUser"),
            createUser: () => calls.push("createUser"),
            getUserByUsername: () => undefined,
        };
        runMod(modJs, sdk);
        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        q.OnObjectivesStart();
        await settle();
        expect(calls.filter((c) => /postTweet|addUser|createUser/.test(c))).toEqual([]);
    });

    it("declares accounts and tweets on the quest so the engine can clean them up", () => {
        const sdk = stubSdk([], []);
        runMod(compileProject(tweetProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q0 = new (sdk as any).__registered.quests[0]();

        expect(q0.TwotterAccounts).toHaveLength(1);
        expect(q0.TwotterAccounts[0]).toMatchObject({
            id: "5WjPOEiU",
            username: "qatester3",
            displayName: "QA Tester 3",
        });
        // avatar is always a real asset path (empty string crashed search)
        expect(q0.TwotterAccounts[0].avatar).toBe("assets/twotter/account-5WjPOEiU.png");

        expect(q0.Tweets).toHaveLength(1);
        expect(q0.Tweets[0]).toMatchObject({
            accountId: "5WjPOEiU",
            content: "This is a Q&A Test Tweet (number 3)",
            comments: 2,
            shares: 1,
            views: 10,
        });
        // the picture survives as a real asset file — impossible via the global API
        expect(q0.Tweets[0].image).toMatch(/^assets\/twotter\/tweet-.+\.png$/);
    });

    function tweetWith(patch: Record<string, unknown>): ProjectDocument {
        const p = createProject();
        const q = p.quests[0];
        q.twotterAccounts = [
            { id: "a1", username: "acct", displayName: "Acct", verified: false },
        ] as never;
        const entry = node("entry.start");
        const tweet = node("comms.tweet", { accountId: "a1", content: "hi", ...patch });
        q.graph.nodes = [entry, tweet];
        q.graph.edges = [edge(entry.id, tweet.id, "flow")];
        return p;
    }

    function firstTweet(p: ProjectDocument) {
        const sdk = stubSdk([], []);
        runMod(compileProject(p).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        return new (sdk as any).__registered.quests[0]().Tweets[0];
    }

    it("time mode 'now' ships no date so the game shows it relative to real time", () => {
        const t = firstTweet(tweetWith({ timeMode: "now", postedAgo: "2 days" }));
        expect(t.postedAgo).toBeUndefined();
    });

    it("time mode 'relative' passes the author's age string straight through", () => {
        const t = firstTweet(tweetWith({ timeMode: "relative", postedAgo: "3 hours" }));
        expect(t.postedAgo).toBe("3 hours");
    });

    it("time mode 'absolute' converts a picked date into an SDK age string", () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString().slice(0, 10);
        const t = firstTweet(tweetWith({ timeMode: "absolute", postedAt: threeDaysAgo }));
        expect(t.postedAgo).toBe("3 days");
    });

    it("carries the show-in-timeline choice through to the tweet", () => {
        expect(firstTweet(tweetWith({ showInTimeline: true })).showInTimeline).toBe(true);
        // default (off) must not leak a false that some engines could mishandle
        expect(firstTweet(tweetWith({})).showInTimeline).toBeUndefined();
    });

    it("registers each account exactly once, no matter how many times the quest is instantiated", () => {
        const sdk = stubSdk([], []);
        runMod(compileProject(tweetProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q1 = new (sdk as any).__registered.quests[0]();
        const q2 = new (sdk as any).__registered.quests[0]();
        // Each quest instance carries the same declarative list; the engine — not
        // the mod — decides when to (re)apply it, so we never accumulate copies.
        expect(q1.TwotterAccounts).toHaveLength(1);
        expect(q2.TwotterAccounts).toHaveLength(1);
        expect(q1.Tweets).toHaveLength(1);
        expect(q2.Tweets).toHaveLength(1);
    });
});

describe("tweets compile to the real SDK shape", () => {
    it("accounts get ids/avatars and tweets stay flat with images", async () => {
        const p = createProject();
        const q = p.quests[0];
        q.twotterAccounts = [
            { id: "acct-1", username: "nightowl", displayName: "Night Owl", avatar: "data:image/png;base64,AA==", bio: "hacker", verified: true, followers: undefined, following: undefined },
        ] as never;
        const entry = node("entry.start");
        const tweet = node("comms.tweet", {
            accountId: "acct-1",
            content: "look at this",
            image: "data:image/png;base64,BB==",
            likes: 12,
            timeMode: "relative",
            postedAgo: "2 days",
        });
        q.graph.nodes = [entry, tweet];
        q.graph.edges = [edge(entry.id, tweet.id, "flow")];

        const { registered, sdk } = (() => {
            const base = stubSdk([], []);
            return { registered: (base as any).__registered, sdk: base };
        })();
        runMod(compileProject(p).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q0 = new registered.quests[0]();
        expect(q0.TwotterAccounts[0]).toMatchObject({ id: "acct-1", username: "nightowl", displayName: "Night Owl", verified: true });
        expect(q0.Tweets[0]).toMatchObject({ accountId: "acct-1", content: "look at this", likes: 12, postedAgo: "2 days" });
        expect(q0.Tweets[0].image).toBe("assets/twotter/tweet-" + tweet.id + ".png");
        expect(q0.Tweets[0].interaction).toBeUndefined(); // old docs-era shape is gone
        expect(q0.Tweets[0].showInTimeline).toBeUndefined();
    });
});

describe("twotter crash regression (empty avatar)", () => {
    it("every account ships a real avatar file and tweets reference image files", () => {
        const p = createProject();
        const q = p.quests[0];
        // the QA repro: an account with no avatar, and a tweet with an embedded image
        q.twotterAccounts = [
            { id: "spnVxepH", username: "QATester", displayName: "Q&A Tester", verified: true, bio: "I only exist to test Twotter features" },
            { id: "withpic", username: "pic", displayName: "Pic", avatar: "data:image/png;base64,AA==" },
        ] as never;
        const entry = node("entry.start");
        const tweet = node("comms.tweet", { accountId: "spnVxepH", content: "hi", image: "data:image/jpeg;base64,/9j/AA==" });
        q.graph.nodes = [entry, tweet];
        q.graph.edges = [edge(entry.id, tweet.id, "flow")];

        const result = compileProject(p);
        const modJs = result.files.find((f) => f.path === "dist/mod.js")!.content;
        const projectJson = JSON.parse(
            /var PROJECT = (\{[\s\S]*?\});\n/.exec(modJs)![1],
        );
        const accounts = projectJson.quests[0].twotterAccounts;
        expect(accounts[0].avatar).toBe("assets/twotter/account-spnVxepH.png");
        expect(accounts[1].avatar).toBe("assets/twotter/account-withpic.png");
        const tweetNode = projectJson.quests[0].graph.nodes.find((n: { type: string }) => n.type === "comms.tweet");
        expect(tweetNode.data.image).toBe("assets/twotter/tweet-" + tweet.id + ".jpg");

        // …and the files really are in the zip manifest
        const paths = result.files.map((f) => f.path);
        expect(paths).toContain("assets/twotter/account-spnVxepH.png");
        expect(paths).toContain("assets/twotter/account-withpic.png");
        expect(paths).toContain(`assets/twotter/tweet-${tweet.id}.jpg`);
        // no empty avatar or data URL survives anywhere in the emitted mod
        expect(modJs).not.toContain("data:image/jpeg;base64");
        expect(/"avatar":\s*""/.test(modJs)).toBe(false);
    });
});

describe("quest behaviour toggles", () => {
    it("advises when a quest will not start on its own", () => {
        const result = compileProject(createProject());
        expect(result.warnings.some((w) => /starts only when the player accepts/.test(w))).toBe(true);
        // and stays quiet once auto-start is on
        const p = createProject();
        p.quests[0].autoStart = true;
        expect(compileProject(p).warnings.some((w) => /starts only when/.test(w))).toBe(false);
    });
});

describe("reference template through the compiler", () => {
    it("compiles and runs end to end", async () => {
        const { getTemplate } = await import("@/templates");
        const project = getTemplate("reference")!.build();
        const result = compileProject(project);
        expect(result.warnings.length).toBeGreaterThanOrEqual(0);

        const calls: string[] = [];
        const listeners: [string, (d: unknown) => void][] = [];
        const sdk = stubSdk(calls, listeners);
        runMod(result.files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const reg = (sdk as any).__registered;
        expect(reg.quests.length).toBeGreaterThanOrEqual(1);
        expect(reg.mod).toBeTruthy();

        for (const QC of reg.quests) {
            const q = new QC();
            q.OnStart();
            q.OnObjectivesStart();
        }
        await settle();
        for (const WC of reg.websites) new WC();
        for (const CC of reg.commands) new CC();
        // no exception anywhere = every node type survives the interpreter
    });
});

describe("random target ip: CreateData + {{data.targetIp}}", () => {
    /** Unlike stubSdk() above, SetData here actually persists into Data and
     * createSubnetNetwork records the full device — this exercises the real
     * CreateData()/Data round trip the shared stub short-circuits. */
    function persistingSdk() {
        const calls: string[] = [];
        const registered: any = { quests: [] };
        class Quest {
            Data: Record<string, unknown> = {};
            Events = { on: () => {}, off: () => {}, offAll: () => {} };
            sendMail() {}
            createDialog() {}
            completeObjective() {}
            SetData(k: string, v: unknown) {
                (this.Data as any)[k] = v;
            }
        }
        const sdk = {
            Quest,
            Website: class {},
            Command: class {},
            Bootstrap: class {},
            RegisterQuest: (c: unknown) => registered.quests.push(c),
            RegisterWebsite: () => {},
            RegisterCommand: () => {},
            RegisterModPackage: () => {},
            Network: {
                createSubnetNetwork: (d: { ip: string }) => calls.push(`net:${d.ip}`),
                createUser: (u: unknown) => u,
                randomIp: () => "45.33.32.156",
            },
            UI: { notify: (m: string) => calls.push(`notify:${m}`), toast: () => {} },
            Shell: {},
            Bank: {},
        };
        return { sdk, registered, calls };
    }

    it("allocates targetIp once in CreateData and reuses it for the live network and every {{data.targetIp}} token", async () => {
        const project = createProject();
        const quest = project.quests[0];
        quest.autoStart = true;

        const entry = node("entry.start");
        const net = node("world.network", {
            ipMode: "random",
            device: { id: "r1", ip: "10.0.0.1", type: "ROUTER", ports: [], users: [] },
        });
        const notify = node("fx.notify", { message: "target is {{data.targetIp}}" });
        quest.graph.nodes = [entry, net, notify];
        quest.graph.edges = [
            edge(entry.id, net.id, "flow"),
            edge(net.id, notify.id, "flow"),
        ];

        const { sdk, registered, calls } = persistingSdk();
        const { files } = compileProject(project);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const QC = registered.quests[0];
        const q = new QC();
        q.Data = await q.CreateData(); // mirrors what the real engine does before OnStart
        q.OnStart();
        await settle();

        expect(q.Data.targetIp).toBe("45.33.32.156");
        expect(calls).toContain("net:45.33.32.156"); // same ip used for the live network
        expect(calls).toContain("notify:target is 45.33.32.156"); // and for the token
    });

    it("CreateData() returns {} when nothing needs a random ip", async () => {
        const { sdk, registered } = persistingSdk();
        const { files } = compileProject(createProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const QC = registered.quests[0];
        const q = new QC();
        expect(await q.CreateData()).toEqual({});
    });
});

describe("flow.sequence fires its outputs in order, with the author's pauses", () => {
    /**
     * The SDK has no scheduling API of its own (grep: no timer/schedule/
     * sequence anywhere in index.d.ts), so sequencing lives in the emitted
     * interpreter. Its step delays mirror the SDK's own convention for chat
     * chains: `delayMs`, applied *before* the item fires.
     */
    function sequenceProject(): { project: ProjectDocument; ids: string[] } {
        const project = createProject();
        const quest = project.quests[0];
        quest.autoStart = true;

        const entry = node("entry.start");
        const seqNode = node("flow.sequence", {
            steps: [
                { id: "a", label: "First", delayMs: 0 },
                { id: "b", label: "Second", delayMs: 60 },
                { id: "c", label: "Third", delayMs: 60 },
            ],
        });
        const one = node("fx.notify", { message: "one" });
        const two = node("fx.notify", { message: "two" });
        const three = node("fx.notify", { message: "three" });

        quest.graph.nodes = [entry, seqNode, one, two, three];
        quest.graph.edges = [
            edge(entry.id, seqNode.id, "flow"),
            edge(seqNode.id, one.id, "flow", "step-a"),
            edge(seqNode.id, two.id, "flow", "step-b"),
            edge(seqNode.id, three.id, "flow", "step-c"),
        ];
        return { project, ids: [entry.id, seqNode.id] };
    }

    it("runs every output top to bottom", async () => {
        const calls: string[] = [];
        const sdk = stubSdk(calls, []);
        const { files } = compileProject(sequenceProject().project);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        // Real timers: the steps really do wait.
        await new Promise((r) => setTimeout(r, 400));
        await settle();

        expect(calls).toEqual(["notify:one", "notify:two", "notify:three"]);
    });

    it("waits the step's delay before firing it", async () => {
        const calls: string[] = [];
        const sdk = stubSdk(calls, []);
        const { project } = sequenceProject();
        // Long enough that flushing microtasks cannot outrun the timer.
        const steps = (project.quests[0].graph.nodes[1].data as { steps: { delayMs: number }[] }).steps;
        steps[1].delayMs = 600;
        steps[2].delayMs = 600;
        const { files } = compileProject(project);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await settle(); // no real time has passed yet
        expect(calls).toEqual(["notify:one"]); // only the 0 ms step has fired

        await new Promise((r) => setTimeout(r, 1500));
        await settle();
        expect(calls).toEqual(["notify:one", "notify:two", "notify:three"]);
    });

    it("uses the game's own timer when the SDK exposes one", async () => {
        const calls: string[] = [];
        const sdk = stubSdk(calls, []) as any;
        // SDK 0.21.0 ships Random.sleep(ms): Promise<void>.
        sdk.Random = { sleep: (ms: number) => { calls.push(`sleep:${ms}`); return Promise.resolve(); } };
        const { files } = compileProject(sequenceProject().project);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await settle();

        expect(calls).toEqual([
            "notify:one",
            "sleep:60",
            "notify:two",
            "sleep:60",
            "notify:three",
        ]);
    });

    it("an output with nothing wired to it simply does nothing", async () => {
        const calls: string[] = [];
        const sdk = stubSdk(calls, []);
        const { project } = sequenceProject();
        // Drop the wire from the middle step.
        const quest = project.quests[0];
        quest.graph.edges = quest.graph.edges.filter((e) => e.sourceHandle !== "step-b");
        const { files } = compileProject(project);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await new Promise((r) => setTimeout(r, 400));
        await settle();

        expect(calls).toEqual(["notify:one", "notify:three"]);
    });
});

describe("tweets wired into the story post live, on the beat", () => {
    /**
     * SDK 0.21.0: quest-level `Tweets` are "tweets to post when the quest
     * starts", so a tweet node inside a Sequence would appear far too early.
     * `Twotter.postTweet(tweet: TwotterTweet)` is the platform API for posting
     * one at a moment of our choosing — note `interaction.share` (singular).
     */
    function twotterSdk(calls: string[]) {
        const sdk = stubSdk(calls, []) as any;
        sdk.Twotter = {
            postTweet: (t: unknown) => calls.push(`tweet:${JSON.stringify(t)}`),
            getUserByUsername: (u: string) => ({ id: `live-${u}`, username: u }),
        };
        return sdk;
    }

    function project(wire: boolean, patch: Record<string, unknown> = {}) {
        const p = createProject();
        const quest = p.quests[0];
        quest.name = "beat";
        quest.autoStart = true;
        quest.twotterAccounts = [
            { id: "acc1", username: "dockwatch", displayName: "Dock Watch", avatar: "", verified: false },
        ];
        const entry = node("entry.start");
        const seqNode = node("flow.sequence", {
            steps: [{ id: "a", label: "Tweet drops", delayMs: 0 }],
        });
        const tweet = node("comms.tweet", {
            accountId: "acc1",
            postLive: true, // the author asked for it to land on the beat
            content: "Something moved on the 14th.",
            likes: 42,
            comments: 7,
            shares: 11,
            views: 3180,
            ...patch,
        });
        quest.graph.nodes = [entry, seqNode, tweet];
        quest.graph.edges = wire
            ? [edge(entry.id, seqNode.id, "flow"), edge(seqNode.id, tweet.id, "flow", "step-a")]
            : [edge(entry.id, seqNode.id, "flow")];
        return { p, tweetId: tweet.id };
    }

    it("posts through the platform API when the flow reaches it, not at quest start", async () => {
        const calls: string[] = [];
        const sdk = twotterSdk(calls);
        const { files } = compileProject(project(true).p);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        // it is NOT registered up front any more …
        expect(q.Tweets).toBeUndefined();
        expect(calls.filter((c) => c.startsWith("tweet:"))).toHaveLength(0);

        q.OnStart();
        await settle();

        const posted = calls.filter((c) => c.startsWith("tweet:"));
        expect(posted).toHaveLength(1);
        const payload = JSON.parse(posted[0].slice("tweet:".length));
        expect(payload.content).toBe("Something moved on the 14th.");
        expect(payload.userId).toBe("live-dockwatch"); // the id the platform knows
        expect(payload.interaction).toEqual({ comments: 7, share: 11, likes: 42, views: 3180 });
        expect(payload.id).toContain("beat");
    });

    it("posts a given tweet only once per playthrough", async () => {
        const calls: string[] = [];
        const sdk = twotterSdk(calls);
        const { files } = compileProject(project(true).p);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        q.OnStart();
        await settle();
        expect(calls.filter((c) => c.startsWith("tweet:"))).toHaveLength(1);
    });

    it("leaves a tweet that did not opt in declarative, so the engine still owns it", async () => {
        const calls: string[] = [];
        const sdk = twotterSdk(calls);
        const { files } = compileProject(project(false).p);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        expect(q.Tweets).toHaveLength(1);
        q.OnStart();
        await settle();
        expect(calls.filter((c) => c.startsWith("tweet:"))).toHaveLength(0);
    });

    it("stays declarative when the node opted in but sits outside the story", async () => {
        const calls: string[] = [];
        const sdk = twotterSdk(calls);
        const { files } = compileProject(project(false).p); // opted in, no flow wire
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (registered0(sdk).quests[0])();
        expect(q.Tweets).toHaveLength(1);
        q.OnStart();
        await settle();
        expect(calls.filter((c) => c.startsWith("tweet:"))).toHaveLength(0);
    });

    it("falls back to the declarative list when the game has no postTweet", async () => {
        const calls: string[] = [];
        const sdk = stubSdk(calls, []); // no Twotter namespace at all
        const { files } = compileProject(project(true).p);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        expect(q.Tweets).toHaveLength(1);
        q.OnStart();
        await settle();
        // nothing thrown, nothing lost
        expect(calls.filter((c) => c.startsWith("tweet:"))).toHaveLength(0);
    });

    it("says plainly what a wired tweet gives up", () => {
        const warnings = computeWarnings(project(true, { image: "data:image/png;base64,AAA", timeMode: "relative", postedAgo: "3 days" }).p);
        expect(warnings.join("\n")).toContain("posted live at that moment");
        expect(warnings.join("\n")).toContain("no picture field");
        expect(warnings.join("\n")).toContain("“post time” is ignored");
    });
});

describe("workshop tags", () => {
    it("exports whatever tags the author typed, invented ones included", () => {
        const p = createProject();
        p.mod.tags = ["story", "dockyards noir", "my-own-tag"];
        const { files } = compileProject(p);
        const manifest = JSON.parse(files.find((f) => f.path === "manifest.json")!.content);
        expect(manifest.tags).toEqual(["story", "dockyards noir", "my-own-tag"]);
    });

    it("omits the tags field entirely when there are none", () => {
        const { files } = compileProject(createProject());
        const manifest = JSON.parse(files.find((f) => f.path === "manifest.json")!.content);
        expect("tags" in manifest).toBe(false);
    });
});

/**
 * Chats can land on the beat too — same opt-in deal as tweets.
 * SDK 0.21.0: Kisscord.sendMessage(channelUserId, content, isMine),
 * WeeChat.sendMessage({ host, username, message }).
 */
describe("conversations timed to the story", () => {
    function chatSdk(calls: string[]) {
        const sdk = stubSdk(calls, []) as any;
        sdk.Kisscord = {
            sendMessage: (ch: string, content: string, isMine?: boolean) =>
                calls.push(`kc:${ch}:${content}:${isMine ? "me" : "them"}`),
        };
        sdk.WeeChat = {
            createServer: () => {},
            removeServer: () => {},
            sendMessage: (m: { host: string; username: string; message: string }) =>
                calls.push(`wc:${m.host}:${m.username}:${m.message}`),
        };
        return sdk;
    }

    function chatProject(kind: "kisscord" | "weechat", opts: { wire: boolean; live: boolean }) {
        const p = createProject();
        const quest = p.quests[0];
        quest.name = "beat";
        quest.autoStart = true;
        const entry = node("entry.start");
        const chat = node("comms.dialogue", {
            kind,
            postLive: opts.live,
            kisscord: {
                contactId: "informant",
                messages: [
                    { id: "m1", content: "You there?", isMine: false, delayMs: 0, playerAction: "none", playerText: "", unlocksAfter: [] },
                    { id: "m2", content: "The dock gate is open.", isMine: false, delayMs: 0, playerAction: "none", playerText: "", unlocksAfter: [] },
                ],
            },
            weechat: {
                host: "irc.darknet.org",
                password: "hunter2",
                registerServer: false,
                messages: [
                    { id: "m1", content: "gate is open", username: "ghost", isMine: false, delayMs: 0, playerAction: "none", playerText: "" },
                ],
            },
        });
        quest.graph.nodes = [entry, chat];
        quest.graph.edges = opts.wire ? [edge(entry.id, chat.id, "flow")] : [];
        return p;
    }

    async function run(kind: "kisscord" | "weechat", opts: { wire: boolean; live: boolean }) {
        const calls: string[] = [];
        const sdk = chatSdk(calls);
        const { files } = compileProject(chatProject(kind, opts));
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await settle();
        return { calls, q };
    }

    it("sends a Kisscord conversation when the flow arrives, in order", async () => {
        const { calls, q } = await run("kisscord", { wire: true, live: true });
        // Not handed to the engine up front any more …
        expect(q.KisscordChats).toBeUndefined();
        expect(calls.filter((c) => c.startsWith("kc:"))).toEqual([
            "kc:informant:You there?:them",
            "kc:informant:The dock gate is open.:them",
        ]);
    });

    it("sends a WeeChat line live, with its host and speaker", async () => {
        const { calls, q } = await run("weechat", { wire: true, live: true });
        expect(q.WeeChatChats).toBeUndefined();
        expect(calls.filter((c) => c.startsWith("wc:"))).toEqual([
            "wc:irc.darknet.org:ghost:gate is open",
        ]);
    });

    it("plays a conversation once, however often the flow comes back", async () => {
        const calls: string[] = [];
        const sdk = chatSdk(calls);
        const { files } = compileProject(chatProject("kisscord", { wire: true, live: true }));
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        q.OnStart();
        await settle();
        expect(calls.filter((c) => c.startsWith("kc:"))).toHaveLength(2); // two messages, once
    });

    it("stays a normal quest conversation when it did not opt in", async () => {
        const { calls, q } = await run("kisscord", { wire: true, live: false });
        expect(q.KisscordChats).toHaveLength(1);
        expect(calls.filter((c) => c.startsWith("kc:"))).toHaveLength(0);
    });

    it("stays declarative when it opted in but nothing is wired into it", async () => {
        const { calls, q } = await run("weechat", { wire: false, live: true });
        expect(q.WeeChatChats).toHaveLength(1);
        expect(calls.filter((c) => c.startsWith("wc:"))).toHaveLength(0);
    });

    it("falls back to the declarative script when the game cannot send live", async () => {
        const calls: string[] = [];
        const sdk = stubSdk(calls, []); // no Kisscord namespace at all
        const { files } = compileProject(chatProject("kisscord", { wire: true, live: true }));
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (registered0(sdk).quests[0])();
        expect(q.KisscordChats).toHaveLength(1);
        q.OnStart();
        await settle();
        expect(calls.filter((c) => c.startsWith("kc:"))).toHaveLength(0);
    });

    it("says plainly what a timed conversation gives up", () => {
        const warnings = computeWarnings(chatProject("kisscord", { wire: true, live: true }));
        expect(warnings.join("\n")).toContain("sent live at that moment");
        expect(warnings.join("\n")).toContain("“unlocks after”");
        const unwired = computeWarnings(chatProject("kisscord", { wire: false, live: true }));
        expect(unwired.join("\n")).toContain("nothing is wired into it");
    });
});

/**
 * The QA crash of 02/09/2026 (log on the QA-filedump branch):
 *
 *   TypeError: Cannot read properties of undefined (reading 'toLowerCase')
 *       at Array.filter … useMemo
 *
 * Searching Twotter for a word that matches nothing crashed the game, and kept
 * crashing it after the mod was removed, because the broken account record is
 * in the save. A TwotterUser carries more fields than a quest account
 * definition can (name, surname, banner, joinedAt, password); whatever the
 * engine leaves unset is undefined, and search lowercases them all.
 *
 * The same log also shows the quest never starting at all:
 *   Mod "twotter-qatest-5" tried to use Network.getPlayerIp without "network"
 * — for a project that mentions no player IP anywhere.
 */
describe("Twotter save safety", () => {
    /** The game's own search, as the crash log describes it. */
    function searchLikeTheGame(users: Record<string, unknown>[], query: string) {
        const q = query.toLowerCase();
        return users.filter(
            (u) =>
                String((u as { username: string }).username).toLowerCase().includes(q) ||
                (u.name as string).toLowerCase().includes(q) ||
                (u.surname as string).toLowerCase().includes(q) ||
                (u.bio as string).toLowerCase().includes(q),
        );
    }

    /** A user record the way the QA save had it: half the fields missing. */
    function halfBuiltUser(username: string) {
        return { id: "u1", username, avatar: "a.png", followers: 0, following: 0 } as Record<string, unknown>;
    }

    function tweetProject(patch: Record<string, unknown> = {}) {
        const p = createProject();
        const quest = p.quests[0];
        quest.name = "QATest";
        quest.autoStart = true;
        quest.twotterAccounts = [
            { id: "k5nKaikR", username: "qatest5", displayName: "QA Test", avatar: "", verified: false, ...patch },
        ];
        const entry = node("entry.start");
        const tweet = node("comms.tweet", { accountId: "k5nKaikR", content: "Hello World!" });
        quest.graph.nodes = [entry, tweet];
        quest.graph.edges = [edge(entry.id, tweet.id, "flow")];
        return p;
    }

    function twotterStore(calls: string[], user: Record<string, unknown>) {
        const sdk = stubSdk(calls, []) as any;
        sdk.Twotter = {
            getUserByUsername: (u: string) => ((user.username === u ? user : undefined)),
            getUserById: (id: string) => (user.id === id ? user : undefined),
        };
        return sdk;
    }

    it("reproduces the crash: an unrepaired record kills search on a word that matches nothing", () => {
        const user = halfBuiltUser("qatest5");
        // "test" is a substring of the username, so the filter short-circuits
        // before it reaches the undefined fields — which is exactly why QA saw
        // a successful search followed by a crash on the next word.
        expect(searchLikeTheGame([user], "test")).toHaveLength(1);
        expect(() => searchLikeTheGame([user], "boop")).toThrow(TypeError);
    });

    it("fills every string field the save needs, and search survives", async () => {
        const calls: string[] = [];
        const user = halfBuiltUser("qatest5");
        const sdk = twotterStore(calls, user);
        const { files } = compileProject(tweetProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await settle();

        for (const key of ["username", "name", "surname", "avatar", "banner", "bio", "joinedAt", "password"]) {
            expect(typeof user[key], `${key} must be a string in the save`).toBe("string");
        }
        // The display name is split the way a person would: "QA Test".
        expect(user.name).toBe("QA");
        expect(user.surname).toBe("Test");
        // And now the search that crashed the game finds nothing, quietly.
        expect(searchLikeTheGame([user], "boop")).toEqual([]);
        expect(searchLikeTheGame([user], "qatest")).toHaveLength(1);
    });

    it("leaves a record the engine already built properly alone", async () => {
        const calls: string[] = [];
        const user = {
            id: "k5nKaikR", username: "qatest5", name: "Dock", surname: "Watch", avatar: "a.png",
            banner: "b.png", bio: "hi", joinedAt: "2026-01-01", password: "x", followers: 3, following: 4,
        } as Record<string, unknown>;
        const sdk = twotterStore(calls, user);
        const { files } = compileProject(tweetProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await settle();
        expect(user.name).toBe("Dock");
        expect(user.surname).toBe("Watch");
        expect(user.followers).toBe(3);
    });

    it("declares accounts with no holes in them", () => {
        const { files } = compileProject(tweetProject());
        const src = files.find((f) => f.path === "dist/mod.js")!.content;
        const account = JSON.parse(
            src.slice(src.indexOf('"twotterAccounts":[') + '"twotterAccounts":['.length).split("}]")[0] + "}",
        );
        expect(account.username).toBe("qatest5");
        // bio/followers/following/verified are always written, never left out:
        // an absent field is an undefined field once it reaches the save.
        const calls: string[] = [];
        const sdk = twotterStore(calls, halfBuiltUser("qatest5"));
        runMod(src, sdk);
        const q = new (registered0(sdk).quests[0])();
        expect(q.TwotterAccounts[0]).toMatchObject({
            bio: "",
            followers: 0,
            following: 0,
            verified: false,
        });
        expect(typeof q.TwotterAccounts[0].avatar).toBe("string");
    });

    it("repairs a broken save on mod load, before any quest runs", async () => {
        // The scenario that matters most: the player's save already holds the
        // half-built record and the quest is long finished (or never claimed).
        // Installing the mod has to be enough.
        const calls: string[] = [];
        const user = halfBuiltUser("qatest5");
        const sdk = twotterStore(calls, user);
        const { files } = compileProject(tweetProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const ModPackage = (registered0(sdk) as { mod: new () => { OnModPackageLoaded(): void } }).mod;
        expect(ModPackage).toBeTruthy();
        new ModPackage().OnModPackageLoaded();

        expect(typeof user.name).toBe("string");
        expect(typeof user.joinedAt).toBe("string");
        expect(searchLikeTheGame([user], "boop")).toEqual([]);
        // …and it did it by patching, not by creating a second account.
        expect(calls.filter((c) => /addUser|createUser|postTweet/.test(c))).toEqual([]);
    });

    it("says in the log which fields it had to fill, so a crash report can name them", () => {
        const said: string[] = [];
        const spy = vi.spyOn(console, "log").mockImplementation((m: unknown) => void said.push(String(m)));
        const user = halfBuiltUser("qatest5");
        const sdk = twotterStore([], user);
        const { files } = compileProject(tweetProject());
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        new (registered0(sdk).mod)().OnModPackageLoaded();
        spy.mockRestore();

        const line = said.find((l) => l.includes("@qatest5")) ?? "";
        expect(line).toContain("repaired Twotter account");
        expect(line).toContain("name");
        expect(line).toContain("surname");
    });

    it("never touches the player's IP unless the author asked for it", async () => {
        const calls: string[] = [];
        const sdk = twotterStore(calls, halfBuiltUser("qatest5"));
        // The loader throws for an undeclared permission — exactly as the log shows.
        sdk.Network = {
            getPlayerIp: () => {
                calls.push("getPlayerIp");
                throw new Error('[ContentSDK] Mod tried to use Network.getPlayerIp without "network" permission.');
            },
        };
        const { files } = compileProject(tweetProject());
        expect(JSON.parse(files.find((f) => f.path === "manifest.json")!.content).permissions).not.toContain("network");
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const q = new (registered0(sdk).quests[0])();
        expect(() => q.OnStart()).not.toThrow();
        q.OnObjectivesStart();
        await settle();
        expect(calls).not.toContain("getPlayerIp");
    });

    it("asks for the permission when a token does need the player's IP", () => {
        const p = tweetProject();
        (p.quests[0].graph.nodes[1].data as { content: string }).content = "Your IP is {{player.ip}}";
        expect(computePermissions(p)).toContain("network");
        const { files } = compileProject(p);
        expect(JSON.parse(files.find((f) => f.path === "manifest.json")!.content).permissions).toContain("network");
    });

    it("still resolves the token when the permission is there", async () => {
        const calls: string[] = [];
        const sdk = twotterStore(calls, halfBuiltUser("qatest5"));
        sdk.Network = { getPlayerIp: () => "10.0.0.7" };
        sdk.UI = { notify: (m: string) => calls.push(`notify:${m}`) };
        const p = tweetProject();
        const notify = node("fx.notify", { message: "IP {{player.ip}}", variant: "notify" });
        p.quests[0].graph.nodes.push(notify);
        p.quests[0].graph.edges.push(edge(p.quests[0].graph.nodes[0].id, notify.id, "flow"));
        const { files } = compileProject(p);
        runMod(files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q = new (registered0(sdk).quests[0])();
        q.OnStart();
        await settle();
        expect(calls).toContain("notify:IP 10.0.0.7");
    });
});
