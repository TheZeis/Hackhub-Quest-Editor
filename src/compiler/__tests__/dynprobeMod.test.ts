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
    const registered: { websites: any[]; quests: any[] } = { websites: [], quests: [] };
    return {
        Website: class {},
        RegisterWebsite: (c: any) => { registered.websites.push(c); },
        Quest: class {
            Events = { on: () => {} };
            completeObjective = () => {};
        },
        RegisterQuest: (c: any) => { registered.quests.push(c); },
        __registered: registered,
    };
}

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

    it("the quest carries the twelve DP rows as objectives, in run order", () => {
        const quest = new (sdk.__registered.quests[0])();
        const names = quest.Objectives.map((o: { name: string }) => o.name);
        expect(names).toEqual([
            "dp-01-control",
            "dp-02-echo",
            "dp-03-article-hit",
            "dp-04-article-miss",
            "dp-05-news-before",
            "dp-06-state-first",
            "dp-07-state-second",
            "dp-08-news-after",
            "dp-09-talkback",
            "dp-10-mail-from-page",
            "dp-11-page-exports",
            "dp-12-site-exports-dyn",
        ]);
        expect(quest.HackhubPost.content).toContain("qe24-dyn.test");
    });
});
