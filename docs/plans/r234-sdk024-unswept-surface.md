# r234 — SDK 0.24 sweep: what is still un-integrated

**Status: decisions taken (r235); the deleteable row is shipped, the rest
are queued in the README Next up.** In progress #1 continuation: "see if the
new (0.24) SDK has any other items or features we haven't integrated yet. Or
bug fixes … that we weren't able to use up until that update."

Method: the pinned `@hotbunny/hackhub-content-sdk@0.24.0` `index.d.ts`
(declarations, authoritative) diffed against (a) the r167 0.21→0.24 diff
(already generated, in the r167 plan), (b) every `sdk.*` call in the
shipping runtime (`src/compiler/runtimeSource.ts`), (c) the compiled quest
emission, and (d) the developer's fix record ([`docs/07`](../07-dev-response-mod-sdk-bug-report-response.md))
plus the QA ledger ([`reference/sdk-0.24-qa/STATUS.md`](../sdk-0.24-qa/STATUS.md)).

## 0. Decisions taken (Zeis, r235)

| Finding | Decision |
|---------|----------|
| **`deleteable` (BUG 8 fix)** | **"Extremely important" — built immediately (r235).** Per-file toggle, off by default, emits the flag; QA row D-01 in the scaffold. |
| **Guided tour (`Quest.Steps`)** | A **node**, and Zeis asked for agreement: yes — the same declarative-lift pattern as `comms.dialogue` (the node carries the tour data on the canvas, the compiler lifts it into `Quest.Steps`; the canvas gets placement, selection and warnings, and the data doubles as the editor's own guided tour). Next up #2. |
| **Desktop app checks** | **In scope, not parked.** Zeis, verbatim: "not until a template asks is completely irrelevant. We're not making a template editor, we're making a quest mod editor for authors to do with whatever they want. Having the ability to check if a command like lynx is installed, or another mods' custom tool is important to create hints and prevent dead ends." Open QA question: do terminal tools / other mods' `RegisterCommand` tools appear in `getInstalledApps()` — it decides condition-vs-node. Next up #3. |
| **Dynamic webpages** | **Investigate** (the `DynamicWebsitePageDefinition` handler pages vs the static builder). The **Http** namespace itself stays frozen — Zeis confirmed the freeze; this row is Website pages only. Next up #4. |
| **ModSettings** | **Build a probe mod; Zeis checks in game** and reports how the settings look and function, then the editor-surface decision. Next up #5. |
| **Localization** | **Full UI/UX plan** before building — a bigger integration (the r203 machinery exists; the authoring workflow does not). Next up #6. |
| **App / PhoneApp** | **Next up** — bigger integrations, investigate the shape first. Next up #7. |
| **`Variables` (mod-level)** | Questioned ("how is it different from what we ship? Is there a legitimate reason not to integrate it?"). Answer: we ship **per-quest** (quest Data, `fx.setData`/`{{data.*}}`) and **cross-mod global** (SharedStorage, via the toolpack storage emitter); `Variables` is the missing middle scope — **private to one mod, across that mod's quests** (campaign memory). Legitimate deferral reason: SharedStorage can fake it, and single-quest mods (most) never need it. If wanted, the cheap integration is a scope choice (quest / mod / shared) on the existing data surface — no new namespace. Zeis's call, answered in the r235 reply. |

## 1. Already consumed (the 0.21 → 0.24 surface)

| Area | Shipped as | Evidence |
|------|-----------|----------|
| Wi-Fi creation/control | **Create Wi-Fi** node (visible) | r167; r166 in-game QA |
| `destroyNetwork` → `Promise<boolean>` | cleanup awaits it, always settles | r52+ teardown, QA reload rows |
| 99 events (was 92) | event catalogue + trigger picker | `reference/hackhub-events.json`, generator |
| Mail: `send()` returns id, `Mail.remove`, `replyable` | replyable mails direct, **Withdraw on quest end** toggle | r211–r214, W-01…W-04 green in game |
| `Time` + `Scheduler` | **Timer** node (wait / a coming day / an exact date) | r172/r173 + r176/r177, T-rows green; Dead Air (r233) now rides it |
| `Twotter.updateUser` / `removeUser` | **Twotter re-implementation** | r196, T-11b/T-12b/T-15c green |
| `complete()` / `retire()` / `Quest.unclaim` | **Complete / Retire / Unclaim quest** nodes | runtime 1537–1549, with unavailable-API guards |
| Event payload fixes (BUG 4: RemoteConnection, Lynx.Search, +1) | catalogue payload docs updated | eventDocs entries |
| `UI.prompt` rich options | **Ask player** node already passes title/label/placeholder/defaultValue/password | runtime 2243–2255 |
| `Translations` (r203 pack extra) + `{{tr.key}}` | mod-level table emitted when non-empty; runtime resolves `{{tr.}}` inline | compile 775/811, runtime `fillTranslations` |

## 2. Bug-fix consumption (docs/07, BUG 1–10)

| Bug | Dev status | Our status |
|-----|-----------|------------|
| 1 — quest completion freezes renderer (critical) | fixed | no-freeze evidence: completion rows in `QE24-TestResults - 3.md`; W-03 withdraw-on-complete green on the patched build (r214) |
| 2 — quest entry can never be removed | fixed | Retire/Unclaim nodes shipped (above) |
| 3 — Twotter corrupts saves | fixed | re-implemented r196, QA green |
| 4 — payload shape mismatches | fixed | catalogue + docs updated; BUG 5 (declarative objective `trigger`) was this in disguise — **not a bug**, no action |
| 5 — (see 4) | n/a | n/a |
| 6 — network destroy hangs | fixed | awaited promise, QA reload rows |
| 7 — `addCommandData` older entry wins | fixed | no surface change needed |
| 8 — mod-placed file cannot be deleted | fixed via **`NetworkFileMap.deleteable`** | **NOT consumed** — see §3.2 |
| 9 — mail from uninstalled mod stays | fixed | `Mail.remove` path (W-rows) |
| 10 — date deprecation warning | not fixed | known limitation (game's own content, M-09) |
| Q1 scripted outgoing mail / Q5 Suspicion + log forensics | need API design | fenced (docs/03 §1/§5); nothing to do until designed |

## 3. Un-integrated opportunities (the answer to the question)

### 3.1 Guided tours — the big one
`Quest.Steps?: QuestTourStep[]` on the quest definition: "a guided tour of
the desktop, shown while this quest is the player's oldest unfinished one."
A step is `{ target, content, placement? }` + **`advanceOn?: <objective
name>`** — with it set, the bubble tracks what the player *did* (the step
passes when the objective completes), without it the step waits on Next.
Targets: game UI regions (`taskbar`, `startMenu`, `tray`, `objectives`,
`desktop`, `wifi`, `controlBar`), an app's window/taskbar button/desktop
icon, a **raw CSS selector**, or `{ page }` — an element inside a page the
pack serves, marked `data-hh-anchor`. Mod-level `Tour.start/stop` covers the
pre-quest onboarding case (no quest behind it yet).

- **Authoring shape:** a quest-level `steps` array (declarative, emitted
  like `dialog` — the engine scopes it, no runtime calls needed) plus a
  `data-hh-anchor` convention on the website builder.
- **Content keys:** step `content` is a localization key resolved in the
  pack's bundle — the r203 translations table + `{{tr.}}` runtime already
  exist; what's missing is the workflow (which fields take keys, table
  editing). A tour round can start with plain-key strings and lean on the
  existing table.
- **Gate (must verify in game first, per the standing rule):** does the
  engine honour `Steps` on editor-registered quests? Do bubbles advance on
  objective completion? Does `{ page }` resolve against a static editor
  website? A two-step test quest in the QA project answers all three.
- **Why it matters:** the missing onboarding surface — a quest (or a
  template) could coach the player through the desktop, and it pairs with
  the templates-as-teaching direction.

### 3.2 `deleteable` on placed files (BUG 8 fix, un-consumed)
`FileDefinition.deleteable?: boolean` — "opt a placed file out of
remote-file protection … such as a log line they are told to clean up." The
editor's `mapFiles` never sets it, so every file a mod places stays
protected. Small surface: a "player can delete this" toggle on the file
fields (`world.files`, device files). **Gate:** in-game default check —
confirm a placed file is currently undeletable and that the flag makes it
deletable (one QA row). Unblocks "wipe the evidence" beats that today can
only be faked.

### 3.3 Desktop app checks
`Desktop.getInstalledApps` / `Desktop.isAppInstalled` — r167's verdict
stands: conditions/diagnostics around required apps, not a story node until
a real template needs one. Cheap to add to the trigger/branch condition
space if ever wanted.

### 3.4 Localization as a product pass (separate round, if wanted)
The table and `{{tr.}}` resolution exist (r203), but no authoring workflow:
no field declares "this is a key", no table editor UX, no Tour pairing.
r167's verdict stands — a product-design pass, not a single node.

### 3.5 Assessed and parked
| Surface | What it is | Verdict |
|---------|-----------|---------|
| `Variables` | mod-level key/value (vs quest Data, vs cross-mod SharedVariables) | only real use = campaign memory across a multi-quest mod; overlaps what we have; no surface until a multi-quest template wants it |
| `ModSettings` | mod-level settings KV (get/set/reset) | the in-game settings-UI registration surface is unclear from the declarations; product decision before any authoring |
| `Theme` | register/setActive/injectCSS/removeCSS | cosmetic, pack-level; no quest use case |
| `App` / `PhoneApp` | HTML mod apps on the desktop / phone home screen | a full app-authoring surface — outside this browser-only tool's scope; note for the future |
| `Http` (hosts, server, fetch, cookies, intercept, collaborator) | the whole HTTP virtualization stack | **still fenced, with reasons**: terminal `curl` missing, DNS-only collaborator hits absent, static sites not firing Http.* objectives (docs/03 §1–§4); waiting on the dev |

## 4. Still waiting on the developers (status unchanged)

docs/03 §1–§4 (HTTP/curl/collaborator), §5 Suspicion, §6 SMS (+ the new
player-dial question from r232), §13 disabled-mod stickiness, §12
quest-state readback, §21 feed-post surfacing, §19 API v2. In progress #1
stays open on these.

## 5. Suggested order (Zeis picks)

1. **`deleteable`** — smallest, consumes a confirmed bug fix, one QA row.
2. **Guided tours** — the new authoring surface; QA-gated first (a test
   quest proves the engine honours `Steps`), then the quest-level steps
   array + `data-hh-anchor` convention.
3. **Desktop app checks** — only when a template asks for it.
4. **Localization pass** — its own round if wanted.

Next step: an item picked here gets a full design (schema fields, emission,
QA plan) as the r235 plan **before** code — plan → review → build.
