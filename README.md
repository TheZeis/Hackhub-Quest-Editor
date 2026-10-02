# HackHub Quest Mod Editor

A visual, no-code editor for building **quest mods** for
[HackHub — Ultimate Hacker Simulator](https://store.steampowered.com/app/2980270/HackHub__Ultimate_Hacker_Simulator/).

Non-coders design branching quests on a node canvas, build in-game websites in a
WYSIWYG editor (with hidden pages for `dirhunter` to find), script phone calls /
e-mail / Kisscord / WeeChat conversations, add hackertyper and typed-passphrase
moments, and export a complete, game-ready mod as a `.zip` — no coding at any point.

---

## Install & Run

**Windows, one click:**

Download/clone this repository (green "Code" button on the top of this page. Click the down arrow button -> Download ZIP)
and double-click **`Launch.bat`**.

It installs everything (needs [Node.js](https://nodejs.org/), LTS version), starts the editor, and opens it in your browser
at <http://localhost:5173>. 

***Important***: Keep the terminal window open while you work. Closing the terminal closes the tool and you could lose
your progress if you haven't saved yet.

**Any OS, manually:**

```bash
npm ci
npm run dev          # → http://localhost:5173
```

**Development commands:**

Only relevant to coders, if you just want to use the tool you can ignore this.

```bash
npm run typecheck    # tsc --noEmit
npm test             # 1,830 tests (vitest)
npm run recover      # re-align after a sandbox re-provision (docs/SANDBOX-RESETS.md)
npm run build        # typecheck + vite build → dist/
```

---

## Making a mod (no coding)

1. **Start** — open the editor and hit **Templates** in the top bar to begin from
   a starter quest, or start blank.
2. **Build the story** — drag nodes from the left palette onto the canvas
   (objectives, triggers, networks with devices/ports/files, mails, chats,
   rewards…) and wire their sockets. Click any node to edit it on the right;
   every field explains itself on hover.

   Wiring is meant to feel physical: drop a wire on a node's **body** and it
   takes that node's one matching socket; pull a wire out of an input and it
   comes with you, keeping the end it came from — drop it on another node to
   move it there, on empty canvas (or press Escape) to remove it. Dots drift
   along each wire to show which way the story runs; the **Wires moving** button
   holds them still. **Group frames** are dragged by their title bar, so
   anything sitting inside one stays grabbable, and a **Sequence** node fires
   its outputs one after another with the pauses you set.
3. **Write conversations** — the **Dialogues** button opens the dialogue editor:
   one node, four flavours (phone call, Kisscord, e-mail, WeeChat), with player
   moments: typed answers with failure routes, hackertyper sends, file uploads.
   Kisscord and WeeChat conversations can also be **timed to the story** — a
   per-node switch plays them message by message when the flow reaches the node,
   so a chat can land on a **Sequence** beat instead of existing from the start.
   Hit **Save** when a conversation feels done.
4. **Build websites** — the **Websites** button opens the WYSIWYG website
   builder: real-looking templates (news, agency, blog, forum, recipes…), a
   code view with syntax highlighting, HTML import, embedded images, and
   **unlisted pages** that stay out of the in-game search index — the classic
   `dirhunter` hiding place.
5. **Export** — the **Export mod** button compiles everything into a mod folder
   and downloads it as a `.zip`. It shows which permissions the mod needs and
   gives plain-language notes about anything worth knowing.
6. **Play** — unzip into the game's `mods/` directory and start HackHub. The mod
   runs directly from `dist/mod.js`; **no build step needed**. (Programmers get
   `src/index.ts` + scaffolding in the same zip if they want to rebuild.)

Your work autosaves in the browser as you go. **Templates → save/export** writes
a project file you can share with anyone else using the editor.

---

## Coders and LLMs, read this first:
If you're just a gamer who wants to make quest mods for the game, you can ignore
everything that comes after this. If you're a coder or interested in modifying
this tool (you're very welcome to!), read on:

[`docs/01-analysis-and-architecture.md`](docs/01-analysis-and-architecture.md) is the
foundation for everything that follows. The three findings that shape the whole design:

1. **A HackHub mod is a TypeScript project, not a data package.**
   `QuestObjectiveTrigger.condition` is a *function*; message chains take `onSent`
   callbacks; dynamic website pages take a `metadata(context)` function. So the export
   engine ships an **interpreter**: the emitted `dist/mod.js` embeds the project as data
   plus a small plain-JS runtime that walks the quest graph — which is exactly why
   exported mods need no build step.

2. **The event catalogue must come from the pinned SDK, not stale prose.**
   Older guide pages said `Terminal.NmapScan` was `{ ip, ports }`; the runtime
   emits `{ ip, versionScan? }`. They said `Quest.Claimed` was `{ questName }`;
   it is `{ name, id }`. The editor now generates its event list from the
   installed SDK declarations (currently 99 events in SDK 0.24.0), because an
   editor built from stale prose would generate triggers that never fire.

3. **There is no SMS API.** Phone *calls* exist (`Quest.Dialog`); text messages do not.
   So no SMS editor ships — see decision 2 below.

---

## Roadmap

Live list of what is being worked on. Newest problems at the top of each
section; anything ticked off moves to **Done recently** and is eventually
archived once it has stayed fixed for a few rounds.

### In progress

Nothing mid-flight at r255. The three rows this section carried are closed;
what each left behind is recorded where it will be found again.

| Row | Disposition |
|---|---|
| **Dynamic webpages** | **Closed — nothing actionable is left in the editor.** The content half is green in game (per-request content, path params, no caching, the 404 look, the iframe bridge, all four export combinations, and r248's reproduction of the game's own news-site behaviour). What remains needs the developers, not us: the `Http.Response` fence *and* the "every page view renders twice" observation are both filed in [`docs/03` §23](docs/03-questions-for-the-developers.md), and the fence is already listed under **Known limitations** below. The row's last open line — whether `Mail.getPlayerEmail()` round-trips — was answered by r252's mail C arriving. |
| **ModSettings** | **Closed — answered 2026-09-28, filed in [`docs/03` §22](docs/03-questions-for-the-developers.md).** The UI was never missing; it is main-menu only, and the full loop is proven. Both remainders are recorded there, including the one obligation that outlives the probe: **if the editor ever generates mod settings it must ship its own reset**, because the game's menu exposes none. Nothing to build until the editor grows a settings surface. |
| *(the placeholder row)* | Removed — it recorded only that nothing else was mid-flight at r251. |

### Next up

| # | Item | Notes |
|---|---|---|
| 1 | **Dead Air in-game playtest** | r232/r233 are code-verified (the shipping runtime read, the template invariants), but the template's novel parts have not been seen in game: the **converging wire** (the call's two outcomes into one drip), the **Timer day** on the game's clock, the phone's typed-answer terminal command, and the Kisscord player-typed send. The QA harness was retired in r253, so this one needs no harness: author the template in the editor, install its export, and play it. File the results under `docs/`. |
| 2 | **App / PhoneApp surfaces** | 0.24's home-screen mod apps (an iframe plus a `HackhubSDK.Phone` bridge), and the phone app surface. Zeis (r235): bigger integrations — investigate the shape first, plan before building. Note: this is about mod apps on the home screen, not dialing (docs/03 §6). |
| 3 | "Branching consequence" template | A choice that changes which ending the player gets. "Two Ways Out" is approved (may be morally grey) but not yet built. The official Cryptographer Hunt (a phone social-engineering scene with a fail route on the wrong choice) is the strongest argument for it — see [`docs/plans/r127-official-quest-comparison.md`](docs/plans/r127-official-quest-comparison.md). The shape now ships inside The Long Game (r136, act III: a typed verdict with two endings); whether a standalone template still adds anything is Zeis's call. (Dead Air's r233 rework moved its failed call from a second ending to a wait-and-retry route — see r233.) |
| 4 | **Handbook round — the dedicated agent** | Zeis runs this with a different, dedicated agent (r232 call). Starting list from the r232-round audit: the shortcut appendix lacks the Ctrl+G row; the group page never says how a frame is created or that frames nest; no prose on ungrouping, the r229 frame-colour setting, or r231's arrange carry; and a stale inspector note ("Draw a box around part of your quest"). |


### Parked

Deferred on Zeis's call, with the reason recorded so the work is not lost.

| Item | Why parked | Notes |
|---|---|---|
| **Tutorial node (guided tours)** | Zeis, 2026-10-02: obscure, and not worth the tokens to implement now or soon. | 0.24 ships declarative engine-scoped tours (`Quest.Steps`: steps with optional `advanceOn`, targets on the taskbar/start menu/tray/objectives panel/desktop/wifi panel/control bar, page anchors via `data-hh-anchor` on served sites). The r235 call still stands — it is a **node**, the canvas carries the tour the way a `comms.dialogue` node carries a script, and the compiler lifts it into `Quest.Steps`; the same data could also power the editor's own guided tour. Feasibility notes: [`docs/plans/r234-sdk024-unswept-surface.md`](docs/plans/r234-sdk024-unswept-surface.md). |
| **Localization** | Zeis, 2026-10-02: the feature is too big an implementation for now, but wanted in the future. | The machinery **already ships** (r203: the translations table, the game's own 30 language codes, and `{{tr.key}}` resolution anywhere text is emitted) and still compiles — but no node's text fields reference translation keys, so the product workflow is unbuilt: which fields are translatable, how an author tags one, how coverage is checked. Zeis (r235): plan it as a bigger integration before touching it. **The Extras dialog's "Text & languages" tab is commented out** (`ExtrasDialog.tsx`, one line) because half a workflow is a dead end for an author; `TextPanel` stays exported and its three tests still run against it, and a fourth asserts the tab is not offered. |

### Done recently

| # | Item | Notes |
|---|---|---|
| r264 | **The answered and the withdrawn are out of the developer list — and it is renumbered** | Zeis's call on the r263 audit: *"remove §19 and §25 completely, then fix the numbering. There's no need to make the file longer with something he already answered, or to tell him about a bug we had that is entirely unrelated to him."* Gone are the API v2 question (answered 2026-09-28 — add `"apiVersion": 2`, which the editor has emitted since r241) and the withdrawn mail-delivery report (our own invented `player@gomail.com`). The list is **23 sections with no gaps**. Renumbering a document with **143 cross-references** was the real work: the mapping went into the file's header, the *live* pointers moved (`README.md`, four rows of the QA ledger), the *historical* ones stayed as written per this repository's archive rule, and the r263 row now names sections instead of numbering them. Three code comments cited the deleted §19 and now carry the date instead. One deliberate omission: `runtimeSource.ts:2956` also cites a section, but its comments ship inside `dist/mod.js` (verified against the built QA export), so editing it would change compiler output and cost an `EDITOR_BUILD` bump — left alone and flagged. |
| r263 | **The developer list audited before it goes to SteelWaffe** | Zeis asked that every claim in [`docs/03`](docs/03-questions-for-the-developers.md) be verified first, so nothing in it wastes the developer's time. Each was checked against the pinned SDK 0.24.0 declarations and the QA record, including two transcripts fetched from the `QA-filedump` branch: **20 claims verified line-for-line** (each with its file:line in [`docs/plans/r263`](docs/plans/r263-developer-list-audit.md)) and **eight time-wasters** found and fixed — the suspicion and SMS sections re-asked questions he already answered in [`docs/07`](docs/07-dev-response-mod-sdk-bug-report-response.md); the feed-post section's first two bullets were answered by our own later runs; the author/avatar section's "unmeasured" employer fallback was in fact measured by HF-5; the Twotter-uninstall and `AccountCreated` sections pointed at transcripts that do not contain the quoted lines; the static- and dynamic-HTTP sections filed one fence twice; the duplicate-toast item had no date or version; and the header named one build while the items span 1.3.0/25341308, 1.3.1/25388883 and 1.3.13. Zeis's calls: the quoted log lines are real and stay (the logs are gone, so the pointers now say that instead of naming files that lack them), and *"remove things that don't need his input, like bugs that were ours"* — so the feed-post section keeps one paragraph about our own class-emission bug and only the three engine notes. Two of my own audit findings were wrong and are recorded as such: I called §3's transcript block and §7 unsupported before searching `docs/plans/r166-sdk-0.24-ingame-qa.md`, which backs both. Section numbers were left alone in that round (143 cross-references point at them); r264 then removed the two answered items and renumbered the list, so the numbers quoted here are the pre-r264 ones. |
| r262 | **The app dropdown now offers only desktop apps — terminal commands can never pass the check** | Zeis ran the test on one save with **lynx installed**: `Lynx` → fail, `apt-get install lynx` → fail, and the control `Kisscord` → **success**. The control is what makes it a result: the node worked, name matching worked, and terminal commands still read `Missing`, so `isAppInstalled` reports **desktop apps only** and no quest can route on a terminal command. Three changes follow. The captured store list is split — `GAME_DESKTOP_APPS` (5 pre-installed + 4 installable) feeds the dropdown, while `GAME_TERMINAL_COMMANDS` stays in the file as captured data but is **deliberately not offered**, because a dropdown offering a value that can never work is worse than no dropdown. Typing one now **warns beside the field** ("the game does not count Lynx as an app, so this check always reads Missing even when it is installed"), so the author finds out before shipping rather than after a player reports a dead branch. And the manual's mistake row is rewritten to the verified finding. Two of my own claims are retracted on the record: **r261's "the list is partial by design" was wrong** — Zeis confirmed it is complete apart from `apt-get` options, and the store sidebar counts I read as missing apps double-count apps filed under several categories; and **r260/r261 assumed lynx simply was not installed on his save** — it was. One question to him would have settled it before two rounds were built on the guess. |
| r261 | **App name is a dropdown of the game's real apps, plus a Custom box** | Zeis corrected the record with an App Store screenshot: `apt-get install lynx` is real, and Terminal Commands (Hydra, Lynx, Metasploit, OpenSSL) are a store category — so the earlier "lynx is a terminal tool, not an app" line was wrong. The field is now `selectOrCustom` over names **captured from the in-game store** and stored as data (`GAME_APP_NAMES`), the same discipline as `GAME_LANGUAGES` — never invented, because a fabricated dropdown is the `player@gomail.com` mistake again. ~~Partial by design: the store's sidebar counts more apps than were listed.~~ ~~His lynx fail toast re-read as the node working on a save where lynx simply was not installed yet.~~ **Both clauses disproved by r262's in-game test — the list is complete and lynx was installed.** |
| r260 | **App Install Check reshaped by Zeis's first look at it** | Two changes from using the node, both his. **Saving the list is now a toggle, not a second mode** — the check is the node's job and saving the list is a side effect you may want *alongside* it, so making it a mode forced a choice between two things that are not alternatives, and made the node's outputs change shape depending on a dropdown. It is on by default and has its own hint explaining what it is for. **Deliberately not limited to one node per quest**: the list changes while a quest runs because the player unlocks apps, so a second check later legitimately wants a fresh snapshot — same key refreshes it, different keys keep two moments. The saved list is now offered in the tag picker alongside anything “Set quest data” stores, because a value an author cannot pick is a value they will not use. His lynx probe came back **Missing**, which is a *pass* for the node — it ran, asked the game and routed — and the likely reason is recorded in the manual: terminal commands are not desktop apps. `EDITOR_BUILD` → `2026-10-02.r260`. |
---

### Standing rule

**Never guess. Check, test, confirm.** Every claim about what the game or SDK
does must be backed by one of: the SDK declarations, the working reference mod,
or a real in-game test. A fix shipped on a theory has cost this project more
rounds than any bug — see r41, r43, r55, r60, r61 and r66.

**Author-facing text is written for someone who has never written code.** Zeis
is a former game QA tester with a year of Unreal Engine 5 and no coding
background, and he is the audience for every label, hint, warning and dialog in
this editor. A control must say what it *does*, in plain words, and keep any
syntax out of the way behind it. His example: a field that inserts
`{{random.username}}` must not read "Insert `{{random.username}}`" — it reads
**"Fresh name"**, with "a new random name, different every time" underneath,
and the raw tag shown last, small and grey. `TokenInsert.tsx` is the reference
implementation: `label` (plain words) → `produces` (what the player will see) →
`token` (the syntax, de-emphasised). The same applies to error messages, which
say what to do rather than what failed.

This rule never yields to convenience. If a feature cannot be described without
showing its syntax, the feature is not finished.

### Known limitations (not bugs)

| Item | Why |
|---|---|
| No ctrl+drag to deselect | Three rounds (r93–r95) failed to make it work in a real browser and it was dropped as not worth the cost. React Flow sends no change events for a box over already-selected nodes, and the geometry workaround needed a store subscription firing every frame. **Ctrl+click** to deselect works. |
| Wi-Fi Bettercap name wart | Create Wi-Fi is visible and exports through SDK 0.24's native API. Current game builds can still print `SSID: undefined` after Bettercap targets an SDK-created AP by BSSID, even though scan, join, handshake capture and hashcat recovery worked in r166 QA. |
| A disabled mod stays disabled | The game remembers that a mod was disabled in the Mods list, and nothing clears it: not replacing the mod with a **newer version**, not deleting it from the mods folder and copying it back, not a **fresh save**. The mod then silently does not load — its quests are invisible, and `Quest.claim()` says nothing. Workaround: enable it in the Mods list and restart the game (a disable there is only applied on restart). Our QA harness now detects it: `qe24 run` and `qe24 twotter audit` print `Editor export: loaded (v…)` or `NOT LOADED in this session`. Reported to the developers: [`docs/03`](docs/03-questions-for-the-developers.md) §13. |
| Accounts outlive a disk-deleted mod | A mod's Twotter accounts and posts are **not** removed when the mod's folder is deleted while the game is closed — its code never runs, so nothing of ours can clean up — and the game drops the mod's quests (`[PruneOrphanQuests] …: no installed content defines it`) but keeps the accounts. Every other route is clean: completing or abandoning the story removes what the quest created (T-11b/T-12b, green), and **disabling the mod in the Mods list removes the accounts when the game applies the change on restart** (T-15c, green: `twotter: removeUser(qe-tw-account) -> true (mod unloaded)`). Question filed: [`docs/03`](docs/03-questions-for-the-developers.md) §11. |
| HTTP/curl and DNS collaborator nodes fenced | SDK 0.24 declares HTTP/collaborator events, but terminal `curl` was missing, DNS-only collaborator hits did not arrive, and static editor websites did not fire HTTP objectives in QA. Generic event triggers still list the raw events. |
| No tweet pictures | SDK 0.24's `TwotterTweet` has no picture field, so an authored image cannot reach a post (the authoring picture control was hidden in r187). The runtime still sends the key if the SDK ever grows one. Question filed: [`docs/03`](docs/03-questions-for-the-developers.md) §10. |
| No suspicion or SMS nodes | SDK 0.24 still has no Suspicion/log-forensics API and no SMS/text-message namespace or events. |
| No log-cleaning node | Entirely engine-side: the game logs connections on the machine, and the player wipes them from its own UI. |
| Date deprecation warning (`moment` RFC2822) | Never a mod bug: on a **clean save with every mod removed** the warning still fires, with the same game-tweet stamp T-09b identified in r185 — it is the game's own content on 1.3.1 ([STATUS, M-09](docs/archive/sdk-0.24-qa/STATUS.md)). The dev's answer ([docs/07](docs/07-dev-response-mod-sdk-bug-report-response.md)) blamed Twotter/Kisscord `Date.toString()` in mod content; either that fix is not in 1.3.1 or it does not cover the game's own tweets. Nothing a mod can change. |


Rounds 100–115 are archived at
[`docs/archive/rounds-100-115.md`](docs/archive/rounds-100-115.md). Rounds 1–74
are in the build log at [`docs/02-editor-shell.md`](docs/02-editor-shell.md),
which is kept as an archive — the bug histories in it explain several of the
rules the code now follows.

Older **Done recently** rows are archived in
[`docs/archive/`](docs/archive/): r227–r259 in
[`rounds-227-259.md`](docs/archive/rounds-227-259.md) (carries a correction
banner — see [`docs/plans/r250-r237-r249-audit.md`](docs/plans/r250-r237-r249-audit.md)
before acting on it) and r130–r150 in
[`rounds-130-150.md`](docs/archive/rounds-130-150.md) (historical filename). The
SDK 0.24 in-game QA evidence — every result file and the `STATUS.md` ledger —
is in [`docs/archive/sdk-0.24-qa/`](docs/archive/sdk-0.24-qa/); the mods it
tested were deleted in r253, the findings are what remain.

### Build status

All four original steps are complete — the editor builds playable mods. The
work since has been in-game QA, and the polish that came out of it.

Counted from the code at r260 (compiler build `2026-10-02.r260`):
**1,830 tests** across 89 files, **41 node types** in 10 categories (all palette-visible), **164 editable
fields** and **80 sockets** (counted in the manual), **14 templates**
(12 playable + 2 reference sheets), **99 game events**, against
`@hotbunny/hackhub-content-sdk@0.24.0`.

### Documentation

| Document | What it is |
|---|---|
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | **Current state, and what is next.** Start here when picking the project up. |
| [`docs/06-how-it-works-today.md`](docs/06-how-it-works-today.md) | **Start here.** How the editor is built as it stands, and the rules the code follows. |
| [`docs/01-analysis-and-architecture.md`](docs/01-analysis-and-architecture.md) | The original design and its reasoning. |
| [`docs/02-editor-shell.md`](docs/02-editor-shell.md) | Archive: the build log for rounds 1–74. Stale figures, load-bearing bug histories. |
| [`docs/03-questions-for-the-developers.md`](docs/03-questions-for-the-developers.md) | Open questions about the game and SDK. |
| [`docs/04-engine-bug-quest-completion.md`](docs/04-engine-bug-quest-completion.md) | Historical freeze-on-complete report; SDK 0.24 / game 1.3.0 QA now shows the completion APIs working. |
| [`docs/05-bug-report-for-hotbunny.md`](docs/05-bug-report-for-hotbunny.md) | The consolidated report sent to the game's developer. |
| [`docs/07-dev-response-mod-sdk-bug-report-response.md`](docs/07-dev-response-mod-sdk-bug-report-response.md) | The developer's reply — **fenced**: promised, not shipped. Read the banner before acting on it. |
| [`docs/plans/`](docs/plans/) | Per-round working notes: the evidence behind specific fixes. |
| [`docs/ideas/custom-hacking-tools.md`](docs/ideas/custom-hacking-tools.md) | Future-feature ideation (r236, not scheduled): custom hacking tools a quest could register for its player — stateful, identity, faked decode, time, GUI and toolpack ideas, with the decisions made on them. |
| [`docs/In-Game-Handbook.md`](docs/In-Game-Handbook.md) | Zeis's transcription of the game's handbook — the top authority for how a player acts. |
| [`reference/Official-Quest/`](reference/Official-Quest/) | Zeis's transcriptions of the official quests (8 — the complete official set) — how real quests flow, cross-checked in [`docs/plans/r127-official-quest-comparison.md`](docs/plans/r127-official-quest-comparison.md); the hardcoded Journalist's Sister line (13 quests) analyzed in [`docs/plans/r131-journalists-sister-analysis.md`](docs/plans/r131-journalists-sister-analysis.md). |
| [`.github/agents/clean-code-architect.md`](.github/agents/clean-code-architect.md) | The clean-code & architecture agent brief — the code-quality rulebook LLM sessions work by. |
| [`docs/archive/`](docs/archive/) | Retired roadmap history that no longer fits in the living README. |

---

## Repository layout

```
Launch.bat                          # Windows one-click launcher
docs/
  01-analysis-and-architecture.md   # Step 1 — schema, stack, architecture
  02-editor-shell.md                # Steps 2–4 — contracts + build log, rounds 1–74
  03-questions-for-the-developers.md# Open questions about the game and SDK
  04-engine-bug-quest-completion.md # Historical freeze-on-complete report
  05-bug-report-for-hotbunny.md     # Consolidated report sent to the developer
  06-how-it-works-today.md          # How the editor is built as it stands
  HANDOFF.md                        # Current state, and what is next
  In-Game-Handbook.md               # Zeis's transcription of the game's handbook
  plans/                            # Per-round working notes (the evidence)
  archive/                          # Retired roadmap history
reference/
  generate-event-catalogue.mjs      # parses the SDK's index.d.ts → event palette data
  hackhub-events.json               # all 99 events with verified payloads (generated)
  Official-Quest/                   # Zeis's transcriptions of the game's official quests
scripts/
  build-naza-pages.mjs              # regenerates the "public agency" site template
public/
  fonts/                            # self-hosted woff2 typefaces + their OFL licences
src/
  schema/                           # the ProjectDocument model (Zod) — the product's spine
    registry.ts                     #   one description per node type: palette, handles,
                                    #   inspector fields and lifecycle hook all read this
    events.ts                       #   the 99-event catalogue, with real payloads
    migrate.ts                      #   upgrades old drafts (e.g. the 4 comms node types
                                    #   that became one general dialogue node)
  analysis/                         # node + field warnings (issues with next steps)
  store/                            # Zustand + Immer: undo/redo, autosave
  editor/
    canvas/                         # React Flow surface, typed nodes and edges
    settings/                       # editor preferences (theme, font, snap, grid, wires) —
                                    #   editor-only, never part of the project document
    palette/                        # searchable node library
    inspector/                      # registry-driven field renderer, event + condition
                                    #   pickers, list and network-device editors
      sims/                         # the conversation editors + live call/chat previews
    websites/                       # WYSIWYG website builder, site/page templates,
                                    #   HTML import, AI-prompt helper
    shell/                          # top bar, quest tabs, status bar, overlays,
                                    #   dialogue editor, export dialog
  compiler/                         # Step 4 — project → mod folder (manifest, dist/mod.js
                                    #   interpreter, scaffolding), permissions, advice
  templates/                        # starter + reference quests (deterministic builds)
```

**One table drives four subsystems.** Every node type is described once in
`NODE_TYPES_REGISTRY`; the palette, the canvas handles, the inspector form and the
compiler all read that description. Adding a node type is a single registry entry —
no component changes. See
[docs/02 §2](docs/02-editor-shell.md#2-the-schema-is-the-product).

### Regenerating the event catalogue

The trigger palette is generated from the SDK's own type declarations rather than
transcribed from the docs, so it cannot drift silently:

```bash
npm i -D @hotbunny/hackhub-content-sdk
node reference/generate-event-catalogue.mjs
# or, against an arbitrary declarations file:
node reference/generate-event-catalogue.mjs --sdk path/to/index.d.ts
```

The generator has an integrity gate: it refuses to write (exit 1) and prints a
diagnostic if a future SDK version introduces a shape the parser mishandles. A
silently-wrong palette would be much worse than a failed regeneration.

---

## Settled decisions

Four decisions materially changed the architecture. All four are settled; the details
and their consequences are in
[§8 of the architecture doc](docs/01-analysis-and-architecture.md#8-settled-decisions).

1. **Delivery** — **browser app, ZIP export.** Vite SPA, no server, no desktop shell.
2. **SMS** — **dropped.** No native primitive exists, so no SMS editor ships. The
   conversation editors are Phone calls, E-Mail, Kisscord and WeeChat.
   **Twotter is dropped too** (round 31): a quest-declared account reaches the
   save with an undefined `bio`, and the game's own Twotter search calls
   `.toLowerCase()` on it — so searching for any word that does not match
   something else crashes the game, before *and* after the mod is uninstalled,
   with no API a mod can use to repair the record. Seven in-game QA rounds; the
   full account is in
   [docs/02 “Round 31”](docs/02-editor-shell.md). It comes back when the SDK
   does.
3. **Granularity** — **many quests per mod**, with single-quest as the default
   new-project template.
4. **Generated code** — **the editor owns it.** Re-exporting overwrites `src/`;
   the project document is the only durable state.

---

## License

MIT — see [LICENSE](LICENSE).

HackHub and the HackHub Content SDK are © HotBunny Interactive Entertainment Inc.
This project is an independent third-party tool and is not affiliated with or endorsed
by HotBunny.
