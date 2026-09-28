import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

/**
 * Smoke test for the hand-authored dynamic-page QA probe
 * (reference/sdk-0.24-qa/dynprobe/dist/mod.js, r238).
 *
 * The probe is the template for what the editor will EVENTUALLY emit for
 * dynamic pages, so its handler logic is verified here the same way the
 * compiled runtime is: load mod.js against a stub SDK, then exercise each
 * dynamic page's metadata() like the game would - with a request context.
 * The game-side behaviour (404 rendering, caching, the iframe bridge) is
 * answered in game by the quest's objectives; this file pins the logic that
 * does not need the game.
 */

const MOD_JS_PATH = resolve(__dirname, "../../../reference/sdk-0.24-qa/dynprobe/dist/mod.js");

function stubSdk() {
    const registered: { websites: any[]; quests: any[]; commands: any[] } = { websites: [], quests: [], commands: [] };
    const emitted: { name: string; data: any }[] = [];
    const listeners: { name: string; cb: (d: any) => void }[] = [];
    const sent: any[] = [];
    return {
        Website: class {},
        RegisterWebsite: (c: any) => { registered.websites.push(c); },
        Quest: class {
            Events = { on: (name: string, cb: (d: any) => void) => { listeners.push({ name, cb }); } };
            completeObjective = () => {};
        },
        RegisterQuest: (c: any) => { registered.quests.push(c); },
        Command: class {},
        RegisterCommand: (_opts: unknown) => (c: any) => { registered.commands.push(c); },
        Events: {
            register: (_name: string) => {},
            on: (name: string, cb: (d: any) => void) => { listeners.push({ name, cb }); },
            emit: (name: string, data?: any) => {
                emitted.push({ name, data });
                listeners.filter((l) => l.name === name).forEach((l) => l.cb(data));
            },
        },
        Mail: { send: (mail: any) => { sent.push(mail); return "mail-id-" + sent.length; } },
        __registered: registered,
        __emitted: emitted,
        __listeners: listeners,
        __sent: sent,
    };
}

/** Stub tool-belt for a command's Run(tools): positional args only. */
const toolsWith = (...args: string[]) => ({ getArgs: () => args });

function runMod(modJs: string, sdk: unknown) {
    const mod: { exports: any } = { exports: {} };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function("require", "module", "exports", modJs)((name: string) => {
        if (name === "@hotbunny/hackhub-content-sdk") return sdk;
        throw new Error(`unexpected require: ${name}`);
    }, mod, mod.exports);
    return mod.exports;
}

const ctx = (partial: Record<string, unknown>) => ({
    url: "http://qe24-dyn.test/",
    params: {} as Record<string, string>,
    query: {} as Record<string, string>,
    ...partial,
});

describe("dynprobe mod (r238)", () => {
    let sdk: ReturnType<typeof stubSdk>;
    let site: any;
    let pages: any[];

    beforeAll(() => {
        sdk = stubSdk();
        const mod = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk as unknown);
        expect(sdk.__registered.websites).toHaveLength(1);
        expect(sdk.__registered.quests).toHaveLength(1);
        site = new (sdk.__registered.websites[0])();
        pages = site.Pages;
        void mod;
    });

    it("registers one site on the probe host with 8 pages: 1 static + 7 dynamic", () => {
        expect(site.Host).toBe("qe24-dyn.test");
        expect(pages).toHaveLength(8);
        const staticPages = pages.filter((p) => typeof p.html === "string");
        const dynamicPages = pages.filter((p) => typeof p.metadata === "function");
        expect(staticPages).toHaveLength(1);
        expect(dynamicPages).toHaveLength(7);
        expect(staticPages[0].path).toBe("/");
        // A dynamic page carries NO static html - its content is the function.
        for (const p of dynamicPages) expect(p.html).toBeUndefined();
    });

    it("P2 /echo renders the query value and dumps the raw context", () => {
        const page = pages.find((p) => p.path === "/echo");
        const meta = page.metadata(ctx({ url: "http://qe24-dyn.test/echo?msg=zeis", query: { msg: "zeis" }, searchStr: "?msg=zeis" }));
        expect(meta.html).toContain("You asked for: <b>zeis</b>");
        expect(meta.html).toContain('"msg": "zeis"');
    });

    it("P3 /article/:id renders a known record via params", () => {
        const page = pages.find((p) => p.path === "/article/:id");
        const meta = page.metadata(ctx({ url: "http://qe24-dyn.test/article/1", params: { id: "1" } }));
        expect(meta.html).toContain("Article one: the lighthouse ledger");
        expect(meta.html).toContain('{"id":"1"}');
    });

    it("P3 /article/:id falls back to the raw URL when params is empty", () => {
        const page = pages.find((p) => p.path === "/article/:id");
        const meta = page.metadata(ctx({ url: "http://qe24-dyn.test/article/2", params: {} }));
        expect(meta.html).toContain("Article two: the missing ferry timetable");
    });

    it("P3 /article/:id returns null for an unknown record (the 404 row)", () => {
        const page = pages.find((p) => p.path === "/article/:id");
        expect(page.metadata(ctx({ url: "http://qe24-dyn.test/article/99", params: { id: "99" } }))).toBeNull();
        expect(page.metadata(ctx({ url: "http://qe24-dyn.test/article/99", params: {} }))).toBeNull();
    });

    /* The beat is one-way module state, so the two state-dependent tests
       each load their OWN fresh instance (fresh DYN) instead of sharing
       the beforeAll one - order-independent either way. */

    it("P4 /state shows the visit counter and the beat-flipped phase", () => {
        const sdk2 = stubSdk();
        const mod2 = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk2 as unknown) as { beat: () => void };
        const site2 = new (sdk2.__registered.websites[0])();
        const page = site2.Pages.find((p: any) => p.path === "/state");
        const first = page.metadata(ctx({}));
        expect(first.html).toContain("Phase: <b>claimed</b>");
        expect(first.html).toContain("Visits to this page this session: <b>1</b>");
        const second = page.metadata(ctx({}));
        expect(second.html).toContain("<b>2</b>");
        // The quest fires the beat on the first /state visit; the mod
        // exports the same function for this test.
        mod2.beat();
        const third = page.metadata(ctx({}));
        expect(third.html).toContain("Phase: <b>beat-fired</b>");
        expect(third.html).toContain("<b>3</b>");
    });

    it("P5 /news lists the three articles and reorders after the beat (the bcc pattern)", () => {
        const sdk3 = stubSdk();
        const mod3 = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk3 as unknown) as { beat: () => void; state: { news: string[] } };
        const site3 = new (sdk3.__registered.websites[0])();
        const page = site3.Pages.find((p: any) => p.path === "/news");
        const before = page.metadata(ctx({}));
        expect(before.html).toContain("harbour cranes back in service");
        expect(before.html).not.toContain("UPDATE: probe quest beat fired");
        mod3.beat();
        const after = page.metadata(ctx({}));
        const updateAt = after.html.indexOf("UPDATE: probe quest beat fired");
        const oldTopAt = after.html.indexOf("harbour cranes back in service");
        expect(updateAt).toBeGreaterThan(0);
        expect(oldTopAt).toBeGreaterThan(updateAt);
        expect(mod3.state.news).toHaveLength(4);
    });

    it("P7 /exports exposes a per-page function that captures the request", () => {
        const page = pages.find((p) => p.path === "/exports");
        const meta = page.metadata(ctx({ url: "http://qe24-dyn.test/exports?article=2", query: { article: "2" } }));
        expect(meta.exports.currentArticle()).toBe("article-2");
        expect(meta.html).toContain("currentArticle()");
    });

    it("site Exports are callable and reach both page kinds", () => {
        expect(site.Exports.dynGreeting("zeis")).toBe("Greetings, zeis - site-level export");
        const staticPage = pages.find((p) => p.path === "/");
        expect(staticPage.html).toContain("dynGreeting(\"tester\")");
        const dynPage = pages.find((p) => p.path === "/site-exports");
        expect(dynPage.metadata(ctx({})).html).toContain("dynGreeting(\"zeis\")");
    });

    it("the quest carries the DP rows as objectives, in run order", () => {
        const quest = new (sdk.__registered.quests[0])();
        const names = quest.Objectives.map((o: { name: string }) => o.name);
        expect(names).toEqual([
            "dp-01-control",
            "dp-02-echo",
            "dp-03-article-hit",
            "dp-04-article-miss",
            "dp-05-news-before",
            "dp-06-beat-command",
            "dp-07-news-after",
            "dp-08-state-twice",
            "dp-09-direct-mail",
            "dp-10-bridge-mail",
            "dp-11-page-exports",
            "dp-12-site-exports",
            "dp-13-http-events",
            "dp-14-tick-rows",
        ]);
        expect(quest.HackhubPost.content).toContain("qe24-dyn.test");
    });

    /* ── r246 additions ─────────────────────────────────────────────────── */

    it("the beat is fired by the qedyn command, not by an HTTP event", () => {
        // r241/r242: Http.Response never reaches a mod for its own site, so
        // the r238 beat - wired to that event - could never fire and the
        // bcc.com A/B never ran its "after" half.
        const sdk2 = stubSdk();
        const mod2 = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk2 as unknown) as {
            beat: (src?: string) => boolean;
            state: { beatFired: boolean; beatSource: string; news: string[] };
        };
        expect(sdk2.__registered.commands).toHaveLength(1);
        const cmd = new (sdk2.__registered.commands[0])();
        expect(cmd.CommandName).toBe("qedyn");
        expect(mod2.state.beatFired).toBe(false);
        cmd.Run(toolsWith("beat"));
        expect(mod2.state.beatFired).toBe(true);
        expect(mod2.state.beatSource).toBe("qedyn beat");
        // The front page gained the UPDATE article on top.
        expect(mod2.state.news[0]).toContain("UPDATE:");
    });

    it("P6 /form prints what Mail.send RETURNED, and offers the emit bridge", () => {
        const page = pages.find((p: { path: string }) => p.path === "/form");
        const html = page.metadata(ctx({})).html;
        // r245: the old page printed its own "sent" text and threw the
        // engine's answer away. Now the return value is the whole point.
        expect(html).toContain("var id = HackhubSDK.Mail.send(");
        expect(html).toContain("(null = refused, an id = accepted)");
        expect(html).toContain("qe24DynBridge()");
        expect(html).toContain("bridgeSendMail");
    });

    it("the bridge export emits instead of sending, and the listener sends", () => {
        // The documented workaround: an Exports function may not do anything
        // permissioned (it loses its mod identity - docs/03 §14); it may only
        // emit. The real send happens in a top-level listener.
        const sdk3 = stubSdk();
        const mod3 = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk3 as unknown) as {
            state: { mailBridged: string };
            BRIDGE_EVENT: string;
        };
        const site3 = new (sdk3.__registered.websites[0])();
        expect(typeof site3.Exports.bridgeSendMail).toBe("function");
        expect(sdk3.__sent).toHaveLength(0);
        const result = site3.Exports.bridgeSendMail();
        expect(result).toBe("emitted");
        // One emit, and the listener's Mail.send is what actually ran.
        expect(sdk3.__emitted).toHaveLength(1);
        expect(sdk3.__emitted[0].name).toBe(mod3.BRIDGE_EVENT);
        expect(sdk3.__sent).toHaveLength(1);
        expect(sdk3.__sent[0].subject).toContain("QE24 dynprobe: talk-back");
        // The listener recorded what the send returned (an id here, null in
        // game if the call is refused) - the value DP-09/DP-10 ask for.
        expect(mod3.state.mailBridged).toBe("mail-id-1");
    });

    it("every Http.Response is logged BEFORE the host filter (r242's flaw)", () => {
        const sdk4 = stubSdk();
        const mod4 = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk4 as unknown) as {
            state: { httpEvents: string[] };
        };
        const quest = new (sdk4.__registered.quests[0])();
        quest.OnObjectivesStart();
        const http = sdk4.__listeners.find((l: { name: string }) => l.name === "Http.Response");
        if (!http) throw new Error("the quest registered no Http.Response listener");
        // An event for a DIFFERENT host must still be recorded - that is what
        // separates "no event fired" from "an event with an unexpected host".
        http.cb({ request: { host: "somewhere.else", method: "GET", path: "/" } });
        expect(mod4.state.httpEvents).toHaveLength(1);
        expect(mod4.state.httpEvents[0]).toContain("somewhere.else");
    });
});
