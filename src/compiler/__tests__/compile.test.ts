/**
 * Step 4 export compiler: permissions, warnings, and — the important part —
 * the emitted mod.js actually runs against a stub SDK: quests register,
 * OnStart builds networks and sends mail, triggers evaluate their
 * conditions, and manual-input commands branch on the typed answer.
 */
import { describe, expect, it } from "vitest";
import { compileProject, EDITOR_BUILD } from "@/compiler/compile";
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
        // and the crash-fix registration must ride along in the same build
        expect(modJs).toContain("sdk.Twotter.addUser");
    });
});

describe("Twotter account registration (search-crash fix)", () => {
    function accountProject() {
        const p = createProject();
        const q = p.quests[0];
        q.twotterAccounts = [
            { id: "acct-qa", username: "qatester", displayName: "QA Tester", avatar: "assets/twotter/account-qa.png", bio: "QA", verified: true, followers: undefined, following: undefined },
        ] as never;
        return p;
    }

    it("registers accounts through the Twotter API with complete records", async () => {
        const added: Record<string, unknown>[] = [];
        const sdk = stubSdk([], []);
        (sdk as any).Twotter = {
            // mirrors the platform: fills the fields the quest converter omits
            createUser: (o: Record<string, unknown>) => ({
                id: o.id,
                username: o.username,
                name: o.firstName,
                surname: o.lastName,
                avatar: o.avatar ?? "placeholder.png",
                banner: "placeholder-banner.png",
                joinedAt: "2026-01-01T00:00:00.000Z",
                followers: o.followers ?? 0,
                following: o.following ?? 0,
                password: "generated",
                bio: o.bio,
                verified: o.verified,
            }),
            addUser: (u: Record<string, unknown>) => added.push(u),
            getUserByUsername: () => undefined,
        };
        runMod(compileProject(accountProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);

        const mod = new (sdk as any).__registered.mod();
        mod.OnModPackageLoaded();
        expect(added).toHaveLength(1);
        expect(added[0]).toMatchObject({
            id: "acct-qa",
            username: "qatester",
            name: "QA",
            surname: "Tester",
            avatar: "assets/twotter/account-acct-qa.png", // compiler swapped the non-data-URL for a real placeholder asset
            banner: "placeholder-banner.png", // no longer undefined — this crashed search
        });

        // and the quest no longer double-registers via the lossy converter
        const q0 = new (sdk as any).__registered.quests[0]();
        expect(q0.TwotterAccounts).toBeUndefined();
    });

    it("falls back to quest-level accounts when the Twotter API is missing", () => {
        const sdk = stubSdk([], []); // no Twotter namespace
        runMod(compileProject(accountProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q0 = new (sdk as any).__registered.quests[0]();
        expect(q0.TwotterAccounts).toHaveLength(1);
    });

    it("does not register the same username twice on mod reload", () => {
        const added: Record<string, unknown>[] = [];
        const sdk = stubSdk([], []);
        (sdk as any).Twotter = {
            createUser: (o: Record<string, unknown>) => o,
            addUser: (u: Record<string, unknown>) => added.push(u),
            getUserByUsername: (name: string) => (name === "qatester" ? { id: "existing" } : undefined),
        };
        runMod(compileProject(accountProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const mod = new (sdk as any).__registered.mod();
        mod.OnModPackageLoaded();
        expect(added).toHaveLength(0);
    });
});

describe("Twotter tweet registration (search-crash fix, round 22)", () => {
    /**
     * The QA test3 repro: an account with no avatar and a tweet whose accountId
     * is empty. Round 21 moved accounts onto the platform API but left tweets at
     * quest level; with the quest-level account list suppressed, the game's
     * tweet converter had no author to resolve and crashed search on an
     * undefined field. Tweets must now post through the API with a complete
     * record whose userId resolves to a real registered user.
     */
    function tweetCrashProject(): ProjectDocument {
        const p = createProject();
        const q = p.quests[0];
        q.twotterAccounts = [
            { id: "5WjPOEiU", username: "qatester3", displayName: "QA Tester 3", verified: false, bio: "third tester" },
        ] as never;
        const entry = node("entry.start");
        const tweet = node("comms.tweet", {
            accountId: "", // the exact repro: no account picked
            content: "This is a Q&A Test Tweet (number 3)",
            comments: 2,
            shares: 1,
            views: 10,
            postedAgo: "2 days",
        });
        q.graph.nodes = [entry, tweet];
        q.graph.edges = [edge(entry.id, tweet.id, "flow")];
        return p;
    }

    function apiSdk() {
        const added: Record<string, unknown>[] = [];
        const posted: Record<string, any>[] = [];
        const sdk = stubSdk([], []);
        const byUsername = new Map<string, Record<string, unknown>>();
        (sdk as any).Twotter = {
            createUser: (o: Record<string, unknown>) => ({
                id: o.id ?? `gen-${o.username}`,
                username: o.username,
                name: o.firstName,
                surname: o.lastName,
                avatar: o.avatar ?? "placeholder.png",
                banner: "placeholder-banner.png",
                joinedAt: "2026-01-01T00:00:00.000Z",
                followers: o.followers ?? 0,
                following: o.following ?? 0,
                password: "generated",
                bio: o.bio,
                verified: o.verified,
            }),
            addUser: (u: Record<string, unknown>) => {
                added.push(u);
                byUsername.set(u.username as string, u);
            },
            postTweet: (t: Record<string, any>) => posted.push(t),
            getUserByUsername: (name: string) => byUsername.get(name),
        };
        return { sdk, added, posted };
    }

    it("posts tweets through the API with a complete record and a resolved author", () => {
        const { sdk, posted } = apiSdk();
        runMod(compileProject(tweetCrashProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const mod = new (sdk as any).__registered.mod();
        mod.OnModPackageLoaded();

        expect(posted).toHaveLength(1);
        const t = posted[0];
        // author resolved to the single registered account, never undefined
        expect(t.userId).toBe("5WjPOEiU");
        expect(t.content).toBe("This is a Q&A Test Tweet (number 3)");
        // structured interaction — the shape the platform search UI reads
        expect(t.interaction).toEqual({ comments: 2, share: 1, likes: 0, views: 10 });
        expect(t.showInTimeline).toBe(true);
        expect(typeof t.id).toBe("string");
        expect(t.id.length).toBeGreaterThan(0);

        // and the quest no longer ships the lossy quest-level tweet list
        const q0 = new (sdk as any).__registered.quests[0]();
        expect(q0.Tweets).toBeUndefined();
    });

    it("falls back to quest-level tweets when the Twotter API is missing", () => {
        const sdk = stubSdk([], []); // no Twotter namespace at all
        runMod(compileProject(tweetCrashProject()).files.find((f) => f.path === "dist/mod.js")!.content, sdk);
        const q0 = new (sdk as any).__registered.quests[0]();
        expect(q0.Tweets).toHaveLength(1);
        expect(q0.Tweets[0].content).toBe("This is a Q&A Test Tweet (number 3)");
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
