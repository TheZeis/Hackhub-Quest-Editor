/**
 * Step 4 export compiler: permissions, warnings, and — the important part —
 * the emitted mod.js actually runs against a stub SDK: quests register,
 * OnStart builds networks and sends mail, triggers evaluate their
 * conditions, and manual-input commands branch on the typed answer.
 */
import { describe, expect, it } from "vitest";
import { compileProject } from "@/compiler/compile";
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
