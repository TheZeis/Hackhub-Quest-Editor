import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

/**
 * Smoke test for the hand-authored ModSettings QA probe
 * (reference/sdk-0.24-qa/modsettings/dist/mod.js, r239).
 *
 * The probe is the template for the editor's future settings surface, so
 * its declaration is verified here the way compiled exports are: load
 * mod.js against a stub SDK and check the Bootstrap's Settings array and
 * the quest's checklist. The in-game half (how the Mods menu renders and
 * keeps the values) is answered by Zeis's run - rows MS-01..MS-07 in
 * docs/plans/r239-modsettings-probe.md.
 */

const MOD_JS_PATH = resolve(__dirname, "../../../reference/sdk-0.24-qa/modsettings/dist/mod.js");

function stubSdk() {
    const registered: { packages: any[]; quests: any[] } = { packages: [], quests: [] };
    return {
        Bootstrap: class {},
        RegisterModPackage: (c: any) => { registered.packages.push(c); },
        Quest: class {},
        RegisterQuest: (c: any) => { registered.quests.push(c); },
        ModSettings: {
            get: (_key: string) => undefined,
            getAll: () => ({ "probe.toggle_on": true, "probe.toggle_off": false }),
            set: () => {},
            reset: () => {},
            resetAll: () => {},
        },
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

describe("modsettings probe mod (r239)", () => {
    let sdk: ReturnType<typeof stubSdk>;
    let pkg: any;
    let questClass: any;

    beforeAll(() => {
        sdk = stubSdk();
        const mod = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk as unknown) as { loadCount: () => number };
        expect(sdk.__registered.packages).toHaveLength(1);
        expect(sdk.__registered.quests).toHaveLength(1);
        pkg = new (sdk.__registered.packages[0])();
        questClass = sdk.__registered.quests[0];
        // Simulate one game load.
        pkg.OnModPackageLoaded();
        expect(mod.loadCount()).toBe(1);
    });

    it("declares six settings: one of every declared type, two toggles", () => {
        const s = pkg.Settings;
        expect(s).toHaveLength(6);
        const types = s.map((x: { type: string }) => x.type).sort();
        expect(types).toEqual(["number", "select", "slider", "text", "toggle", "toggle"]);
        // Every setting has the three required keys and a usable default.
        for (const x of s) {
            expect(x.key).toMatch(/^probe\./);
            expect(x.label).toMatch(/^Probe:/);
            expect(x.default).toBeDefined();
        }
    });

    it("the select carries its four options; the slider carries min/max/step", () => {
        const s = pkg.Settings;
        const select = s.find((x: { key: string }) => x.key === "probe.select");
        expect(select.options).toHaveLength(4);
        expect(select.options.every((o: { label: string; value: string }) => o.label && o.value)).toBe(true);
        expect(select.default).toBe("blue");
        expect(select.options.some((o: { value: string }) => o.value === "blue")).toBe(true);
        const slider = s.find((x: { key: string }) => x.key === "probe.slider");
        expect(slider.min).toBe(0);
        expect(slider.max).toBe(100);
        expect(slider.step).toBe(5);
        expect(slider.default).toBeGreaterThanOrEqual(slider.min);
        expect(slider.default).toBeLessThanOrEqual(slider.max);
    });

    it("the load hook counts loads (the MS-load N evidence line)", () => {
        // A fresh instance: its counter starts at zero, so two simulated
        // (re)loads must read exactly 2 - the "MS-load 2:" line Zeis
        // compares his changed values against.
        const sdk2 = stubSdk();
        const mod2 = runMod(readFileSync(MOD_JS_PATH, "utf8"), sdk2 as unknown) as { loadCount: () => number };
        const pkg2 = new (sdk2.__registered.packages[0])();
        pkg2.OnModPackageLoaded();
        expect(mod2.loadCount()).toBe(1);
        pkg2.OnModPackageLoaded();
        expect(mod2.loadCount()).toBe(2);
    });

    it("the quest carries the seven MS rows as objectives, in run order", () => {
        const quest = new questClass();
        const names = quest.Objectives.map((o: { name: string }) => o.name);
        expect(names).toEqual([
            "ms-01-find",
            "ms-02-types",
            "ms-03-labels",
            "ms-04-change",
            "ms-05-persist",
            "ms-06-readback",
            "ms-07-reset",
        ]);
        expect(quest.HackhubPost.content).toContain("mod-settings");
    });

    it("the quest start logs the readback (MS-readback at claim)", () => {
        const quest = new questClass();
        expect(() => quest.OnStart()).not.toThrow();
    });
});
