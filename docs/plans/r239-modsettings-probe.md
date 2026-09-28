# r239 — ModSettings probe: plan, build, QA checklist

**Status: probe built and unit-verified; awaiting Zeis's in-game run.**
Zeis's r235 call (2026-09-27): for mod settings, "build a test mod with it
and I'll check in game and report how it looks and/or functions." He asked
for it alongside the r238 dynamic-page probe so one session covers both.

## 1. In plain language — what mod settings are, and what is unknown

A mod can declare a few **knobs** — a switch, a choice from a list, a text
box, a number, a slider — and the game is supposed to **show those knobs in
the Mods menu** so the player can set them before playing, and the mod then
**reads back** what the player chose and behaves accordingly. That is the
difference between a quest that ships with one fixed difficulty and one
whose difficulty the player picks in a menu.

What the SDK *declares* (this is written down, not guessed):

- every mod has **one entry point** (a "Bootstrap") that may carry a list of
  settings, and those settings are "rendered in the Mods UI";
- a setting has a **key** (its name in code), a **label** (what the player
  sees), a **type** — `toggle`, `select`, `text`, `number`, `slider` — and a
  **default**; a select also carries its **options**, and a slider carries
  **min / max / step**;
- mod code reads them back with `ModSettings.get(key)` / `getAll()`, and can
  also `set`, `reset` one, or `resetAll()`.

What is **unknown**, and what this probe answers in game:

| Question | Where it shows up |
|---|---|
| Do the knobs appear at all, and **where** in the Mods menu? | MS-01 |
| Do **all six types** render, or does one come out broken/blank? | MS-02 |
| Do the **labels, current values and slider position** show correctly? | MS-03 |
| Does **changing** them behave sanely (slider snapping, number limits)? | MS-04 |
| Are the values **remembered** across a game restart? | MS-05 |
| Does the **mod actually read back** what was set? | MS-06 |
| Can the player **reset** to the defaults from the UI? | MS-07 |

Note the last one: the SDK gives *mod code* a reset function, but says
nothing about the *menu* offering one. "No control visible" is a valid and
useful answer.

## 2. How the probe is built

- `reference/sdk-0.24-qa/modsettings/` — a hand-made mod (the editor cannot
  express settings yet — that is the feature under test), built the same way
  as the r238 dynamic-page probe, so the two install and run side by side.
- **One Bootstrap with six settings — one of every declared type**: two
  toggles (one defaulting **on**, one **off**), a select with four options
  (default Blue), a text box, a number, and a slider 0–100 in steps of 5.
  Every label starts with **"Probe:"** so they are unmistakable in the Mods
  menu.
- **A load counter that prints the readback.** Every time the game loads the
  mod it logs `MS-load <n>: {…every setting and its value…}`. Load 1 shows
  the defaults; load 2 (after the restart) shows *the player's* values. That
  line — plus a second one printed when the quest is claimed — is the
  machine-readable proof the mod reads back what was set, which is the one
  question no amount of looking at the menu can answer.
- **A quest whose seven objectives are the checklist** (MS-01…MS-07), each
  saying what to look at, what to change, and what to write down.
- **No permissions are requested** and nothing auto-starts: the surface
  under test is a menu, not gameplay.

Why the checklist is a *quest* rather than a note: it is the pattern that
worked for the mail and dynamic-page probes — Zeis works the tracker top to
bottom and cannot lose his place between the two mods.

## 3. What is verified here (without the game)

`src/compiler/__tests__/modsettingsProbeMod.test.ts` loads the probe against
a stub SDK and checks the declaration — the part that is easy to get silently
wrong and invisible in game:

- six settings, one of every declared type, two of them toggles;
- every setting has a key, a label starting with "Probe:", and a default;
- the select carries its four options and its default is one of them;
- the slider carries min 0 / max 100 / step 5 and its default is in range —
  **falsified**: the test goes red when the step is changed to 2;
- the load hook counts loads (a fresh instance reading 1 then 2 — the
  "MS-load 2" line the run depends on);
- the quest carries the seven rows in run order, with the feed post;
- the claim-time readback does not throw.

The in-game half — how the menu looks, keeps, snaps and resets — is answered
by the run below.

## 4. How to run it (one session, both probes)

1. Install **both** zips from `reference/sdk-0.24-qa/delivery/`:
   `qe-sdk-024-dynprobe-1.0.0.zip` (r238) and
   `qe-sdk-024-modsettings-1.0.0.zip` (r239). The Harness 1.0.29 can stay.
2. Restart the game. The settings probe logs an `MS-load 1` line.
3. Open Hackhub: accept **"QA probe (r239)"** (and **"QA probe (r238)"** for
   the dynamic pages).
4. **Do the settings rows first** — MS-01…MS-04 are pure menu work with no
   restart, then MS-05 needs the restart that MS-06 reads the log after. The
   dynamic-page rows can be woven in while waiting for the restart.
5. File the answers in the table below (or a new `QE24-Playtest-ModSettings.md`
   in the same folder); screenshots are welcome for MS-01 (the layout).

## 4b. What the first run showed (2026-09-28) — MS-01 is the only open row

Zeis installed the probe beside the r238 dynamic-page probe. **The settings
pipeline verifies green; the UI to change them was not found.**

```
[ContentSDK] Mod "QE24 ModSettings Probe" uses API v1 (current: v2). Running in compatibility mode.
[qe-sdk-024-modsettings] MS-load 1: {"probe.toggle_on":true,"probe.toggle_off":false,"probe.select":"blue","probe.text":"hello probe","probe.number":7,"probe.slider":50}
[qe-sdk-024-modsettings] QEModSettingsProbeQuest started - MS-readback at claim: {…the same six values…}
```

- **The declaration is parsed.** All six keys of all five types come back
  with their exact defaults — a declaration the game ignored or mangled
  would not appear in `getAll()` at all.
- **The readback works in game**, at package load and again at quest claim.
  Whatever the player sets would reach mod code.
- The compat-mode warning is the known one, filed as `docs/03` §19.

So **MS-02…MS-07 are unrun, not failed** — the values were never changed
because no UI was found to change them in. Two candidates (r240):

1. **Wrong place.** Settings may render in the game's **Mods list** — the
   one Zeis already uses to enable/disable mods (T-15c: *"Disable the export
   in the game's Mods list, accept 'Restart the game to apply updates'"*),
   not in the phone's Settings app. Worth one look before anything else.
2. **Wrong API version.** The game reports *current: v2* and runs v1 mods in
   compatibility mode; settings are a newer surface, so the UI may be
   v2-only. `reference/sdk-0.24-qa/modsettings-v2/` is the identical probe
   with `apiVersion: 2` — install it **instead of** the v1 probe and check
   the same two places.

Filed with the developers as `docs/03` §23.

## 5. QA checklist

| Row | Do | Write down | Green means |
|---|---|---|---|
| **MS-01** find | Open the **Mods menu**, find the *QE24 ModSettings Probe* | **WHERE** its settings appear — which panel/section, how the mod is listed in the list of mods. Screenshot if easy | The surface is reachable at all; we learn the layout the editor's future settings panel must match |
| **MS-02** types | Look at all six knobs | Which of the six render, which do not, and any that look broken/blank | All five types are usable → the editor can offer all of them |
| **MS-03** labels | Check the text | Do the labels read exactly (all start with "Probe:")? Is the select's current value (**Blue**) visible? Is the slider's **position** visible, or is it a bar with no number? | Labels and values are readable by a player; a slider without a number is a copy problem for the editor, not a blocker |
| **MS-04** change | Change **every** knob: flip **both** toggles, pick **Violet**, type a new word, set the number to **42**, drag the slider to some value | How each behaves — does the slider **snap to steps of 5**? does the number box accept only whole numbers? does the text accept anything? | The controls behave as declared. **Slider not snapping / number accepting junk = the min/max/step hints are decorative** → the editor must not promise validation |
| **MS-05** persist | **Restart the game**, reopen the Mods menu | Are your values still there — toggles flipped, Violet, your word, 42, your slider position? | Values survive a restart (they are saved somewhere). If they reset, per-player settings are cosmetic only and the editor's "player picks difficulty" idea needs another route |
| **MS-06** readback | After the restart, **re-claim the quest** | Copy the two log lines: the **`MS-load 2:`** line and the **`MS-readback at claim:`** line. They must show **your** values (Violet / 42 / your word), not the defaults | **The decisive row**: the mod reads back what the player set — the whole feature is real. Defaults showing instead = the values are stored but not handed to mod code |
| **MS-07** reset | Look around the Mods UI once more | Is there any way for the player to **reset to defaults**? "No control visible" is a valid answer | Tells us whether the editor should generate its own reset affordance or rely on the game's |

**Reading reds** (what each failure changes for the editor):

- **MS-01 settings not visible at all** → the surface may be unreachable for
  a mod like ours (wrong API version, or the menu only shows certain mods);
  the next step is a docs/03 question to the developers, not more probing.
- **MS-02 a type renders broken** (say the slider) → that type is out of the
  editor's first settings release; the others ship.
- **MS-05 not persisted** → the editor's settings panel must say plainly
  "these apply to this session" rather than implying they are remembered.
- **MS-06 defaults read back** → the loop is broken; the editor should not
  build a settings feature on it until the developers confirm.
- **MS-07 no reset** → the editor generates its own "reset to defaults"
  button in the panel it renders, or the player reinstalls the mod.

## 6. Files

- `reference/sdk-0.24-qa/modsettings/` — the probe mod (manifest + dist/mod.js + README.txt)
- `reference/sdk-0.24-qa/delivery/qe-sdk-024-modsettings-1.0.0.zip` — installable
- `src/compiler/__tests__/modsettingsProbeMod.test.ts` — the unit verification above
