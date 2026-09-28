"use strict";

/*
 * QE24 ModSettings Probe (r239)
 *
 * Hand-authored QA mod for SDK 0.24's DECLARATIVE mod settings -
 * Bootstrap.Settings, "rendered in the Mods UI" per the declarations. The
 * no-code editor does not expose settings yet; this probe is the first
 * in-game look at how they look and function, per Zeis's r235 call
 * ("build a test mod with it and I'll check in game and report how it
 * looks and/or functions").
 *
 * What it carries:
 *   - one probe Bootstrap with six settings: one of every declared type
 *     (two toggles - one defaulting on, one off - a select, a text, a
 *     number, a slider with min/max/step). Labels all start with "Probe:"
 *     so they are recognisable in the Mods menu.
 *   - a load log: OnModPackageLoaded counts loads and prints
 *     "MS-load <n>: <ModSettings.getAll() JSON>" - the machine-readable
 *     evidence that the game keeps the player's values and the mod reads
 *     them back.
 *   - a quest whose seven objectives are the QA checklist
 *     (docs/plans/r239-modsettings-probe.md). The surface under test is
 *     the Mods UI, which no event observes - there is deliberately no
 *     settings-changed event in the 99-event catalogue - so this is a
 *     LOOK-CHANGE-REPORT probe: the objectives tell Zeis what to look at,
 *     change, and write down, and the log lines are the readback proof.
 */
var sdk = require("@hotbunny/hackhub-content-sdk");

var MOD_ID = "qe-sdk-0.24-modsettings";

function log(message) {
    try { console.log("[" + MOD_ID + "] " + message); } catch (_e) {}
}

function safe(label, fn, fallback) {
    try {
        return fn();
    } catch (e) {
        log(label + " failed: " + (e && e.message ? e.message : e));
        return fallback;
    }
}

function allSettingsJson() {
    return safe("ModSettings.getAll", function () {
        if (sdk.ModSettings && sdk.ModSettings.getAll) {
            return JSON.stringify(sdk.ModSettings.getAll());
        }
        return "ModSettings API not present in this SDK build";
    }, "unreadable");
}

/* Load counter: one increment per game (re)load. MS-load 1 shows the
   defaults; MS-load 2+ shows what the player actually set - the
   persistence + readback evidence. */
var LOADS = 0;

/* ── The probe Bootstrap ────────────────────────────────────────────────── */
class QEModSettingsProbe extends sdk.Bootstrap {
    constructor() {
        super(...arguments);
        this.Settings = [
            { key: "probe.toggle_on", label: "Probe: toggle (default ON)", type: "toggle", default: true },
            { key: "probe.toggle_off", label: "Probe: toggle (default OFF)", type: "toggle", default: false },
            {
                key: "probe.select", label: "Probe: select (pick one)", type: "select", default: "blue",
                options: [
                    { label: "Red", value: "red" },
                    { label: "Green", value: "green" },
                    { label: "Blue", value: "blue" },
                    { label: "Violet", value: "violet" }
                ]
            },
            { key: "probe.text", label: "Probe: text (type something)", type: "text", default: "hello probe" },
            { key: "probe.number", label: "Probe: number (any whole number)", type: "number", default: 7 },
            { key: "probe.slider", label: "Probe: slider (0-100, steps of 5)", type: "slider", default: 50, min: 0, max: 100, step: 5 }
        ];
    }
    OnModPackageLoaded() {
        LOADS += 1;
        log("MS-load " + LOADS + ": " + allSettingsJson());
    }
    OnModPackageUnloaded() {
        log("mod package unloaded");
    }
}
sdk.RegisterModPackage(QEModSettingsProbe);

/* ── The quest (the QA checklist, in run order) ─────────────────────────── */
class QEModSettingsProbeQuest extends sdk.Quest {
    constructor() {
        super();
        this.Name = "QEModSettingsProbeQuest";
        this.Title = "QE24 mod settings probe";
        this.Description = "Developer QA probe for declarative mod settings (r239). The seven objectives are the checklist: work top to bottom in the Mods menu, then restart the game and re-claim for the last row. Rows that say WRITE DOWN need the exact answer for the report.";
        this.Group = "sandbox";
        this.AutoStart = false;
        this.AutoComplete = false;
        this.HasCompleteButton = false;
        this.Abandonable = true;
        this.HackhubPost = {
            content: "QA probe (r239): the mod-settings quest. Accept to run the seven rows - open the Mods menu, find this mod's settings, look, change, write down.",
            comments: []
        };
        this.Objectives = [
            { name: "ms-01-find", description: "Open the Mods menu in the game and find the QE24 ModSettings Probe. WHERE exactly do its settings appear (which panel/section, how is the mod listed)? WRITE DOWN the layout." },
            { name: "ms-02-types", description: "Check all six settings render: two toggles (one on, one off by default), a select with four options, a text field, a number field, a slider (0-100 in steps of 5). WRITE DOWN which render, which do not, and any that look broken." },
            { name: "ms-03-labels", description: "Do the labels show the exact text written (all start with 'Probe:')? Is the select's current value (Blue by default) visible? Is the slider's position visible?" },
            { name: "ms-04-change", description: "Change every setting: flip BOTH toggles, pick Violet in the select, type a new word in the text, set the number to 42, drag the slider. WRITE DOWN how each control behaves (does the slider snap to steps of 5? does the number accept only whole numbers?)." },
            { name: "ms-05-persist", description: "Restart the game. Reopen the Mods menu: are your values still there (toggles flipped, Violet, your word, 42, your slider position)?" },
            { name: "ms-06-readback", description: "After the restart, re-claim this quest. The game's debug log should now show an 'MS-load 2:' line with YOUR values (Violet/42/etc) and a claim line with the same - that is the proof the MOD reads back what you set. WRITE DOWN the two log lines." },
            { name: "ms-07-reset", description: "Does the Mods UI offer a way to reset settings to their defaults? (The SDK declares reset/resetAll for mod code, but whether the UI exposes one is unknown.) WRITE DOWN what you find - 'no control visible' is a valid answer." }
        ];
    }
    CreateData() { return {}; }
    OnStart() {
        log("QEModSettingsProbeQuest started - MS-readback at claim: " + allSettingsJson());
    }
    OnComplete() { log("QEModSettingsProbeQuest OnComplete fired"); }
    OnAbandon() { log("QEModSettingsProbeQuest abandoned"); }
}
sdk.RegisterQuest(QEModSettingsProbeQuest);

/* Test hooks for the editor's vitest smoke test (src/compiler/__tests__/
   modsettingsProbeMod.test.ts). The game ignores a mod's module exports. */
module.exports = { loadCount: function () { return LOADS; }, MOD_ID: MOD_ID };
