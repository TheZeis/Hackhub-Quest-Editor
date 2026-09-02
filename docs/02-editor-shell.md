# Step 2 — Editor shell: schema, store, canvas, inspector

This document records what Step 2 built and, more importantly, the **contracts** the
remaining steps are now written against. Step 3 (website builder + conversation
editors) and Step 4 (export engine) extend this shell; they do not restructure it.

The architecture it implements is in
[`01-analysis-and-architecture.md`](01-analysis-and-architecture.md).

---

## 1. What ships in this step

| Area | Files | What it does |
|---|---|---|
| Schema | `src/schema/{common,nodes,edges,registry,project,events,index}.ts` | The `ProjectDocument` model: 32 node types, 4 edge kinds, recursive network devices, 92 game events |
| Store | `src/store/{editor,autosave}.ts` | Zustand + Immer; undo/redo, path-addressed writes, autosave |
| Canvas | `src/editor/canvas/*` | React Flow surface, typed nodes and edges, socket-level connection validation |
| Palette | `src/editor/palette/NodePalette.tsx` | Searchable, category-grouped, drag-or-click node library |
| Inspector | `src/editor/inspector/*` | Registry-driven field renderer, event picker, condition builder, list + device-tree editors |
| Shell | `src/editor/shell/*`, `src/App.tsx` | Top bar, quest tabs, status bar, toasts, template gallery, shortcut sheet |
| Templates | `src/templates/index.ts` | Blank / Hello Hack / Simple Linear Wi-Fi Hack |

35 source files, ~7,250 lines, **200 tests passing**.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck && npm test && npm run build
```

---

## 2. The schema is the product

Every node type is described **once**, in `NODE_TYPES_REGISTRY` (`src/schema/registry.ts`),
and four different subsystems read that single description:

```
                     ┌── palette  (label, blurb, icon, category)
NODE_TYPES_REGISTRY ─┼── canvas   (sources[], targets[] → handles)
                     ├── inspector (fields[] → the entire form)
                     └── export    (hook → which lifecycle method emits it)
```

Adding a node type is therefore a single registry entry: it appears in the palette,
renders on the canvas with the right sockets, gets a full inspector form, and is
visible to the compiler — with no component changes. The 32 existing types are the
proof; the compiler in Step 4 consumes the same table.

`NodeTypeDef`:

```ts
interface NodeTypeDef {
    type: NodeType;
    category: CategoryId;
    label: string;       // "Wi-Fi access point"
    blurb: string;       // one line under the label in the palette
    icon: string;
    targets: HandleSpec[];   // input sockets
    sources: HandleSpec[];   // output sockets
    hook: "onStart" | "onObjectivesStart" | "onComplete" | "onAbandon" | "declarative";
    fields: FieldDef[];  // the inspector form
    create(): unknown;   // default data, from the Zod schema
}
```

### The discriminated union must stay generic

`src/schema/nodes.ts` builds all 32 node schemas through one helper:

```ts
const node = <T extends string, D extends z.ZodTypeAny>(type: T, data: D) => …
```

The generics are load-bearing. An earlier non-generic version
(`(type: string, data: z.ZodTypeAny)`) made `z.literal(type)` infer
`ZodLiteral<string>` and every node's `data` infer `unknown`, silently collapsing the
32-way discriminated union into one undifferentiated shape — TypeScript reported no
error. `summarize.ts`'s `const exhaustive: never = node` guard caught it. **Any future
schema helper that takes a literal or a nested schema must be generic the same way.**

---

## 3. Connection rules

Wires are typed. `canConnect(sourceKind, targetKind)` is a pure function over four
kinds, and it is enforced in two places: React Flow's `isValidConnection` (so an
illegal wire cannot be drawn) and `store.connect()` (so it cannot be created
programmatically either).

| Kind | Meaning | Colour |
|---|---|---|
| `flow` | "then do this" — execution order | slate |
| `condition` | trigger → objective: *this event completes it* | cyan |
| `unlock` | objective → objective: *prerequisite* | emerald |
| `data` | value passed between nodes | violet |

Handle layout, all derived from the registry:

| Node type | Targets | Sources |
|---|---|---|
| `entry.*` | — | `out` |
| `objective` | `in`, `trigger`, `unlocked-by` | `done`, `unlock` |
| `trigger.event` | `in` | `when` (condition) |
| `reply.input` | `in` | `success`, `failure` |
| `flow.branch` | `in`, `trigger` | `true`, `false` |
| `flow.note` | — | — |
| everything else | `in` | `out` |

`store.connect()` additionally rejects self-loops and exact duplicate wires.

---

## 4. Lifecycle hooks

The SDK runs `OnStart()` **once** at claim, and `OnObjectivesStart()` at claim *and on
every game start*. Listeners registered in `OnStart()` die on reload — a class of bug a
non-coder cannot diagnose. So the registry declares, per node type, which lifecycle
method it must be emitted into, and the compiler will obey it:

| Hook | Node types |
|---|---|
| `onStart` | world-building, effects, comms sent once (mail, tweet, network creation…) |
| `onObjectivesStart` | `reply.*`, `flow.branch` — anything that listens for player input |
| `declarative` | `objective`, `trigger.event`, `flow.note` — data, not code |
| `onComplete` / `onAbandon` | cleanup |

The inspector shows the hook as a chip on the selected node so the author can see the
distinction without needing to understand it.

---

## 5. Store contract

`src/store/editor.ts`. One serialisable `ProjectDocument` is the only source of truth;
React Flow's runtime fields (`selected`, `measured`, `dragging`) are mapped out on the
way in and never reach the document.

- **`mutate(recipe, { history })`** — every write goes through this. It snapshots
  `original(state).project` via `structuredClone` into `past` (capped at 120) unless
  `history: false`.
  > `original()` matters: inside `produce`, `state.project` is an Immer draft *proxy*,
  > and `structuredClone` throws `DataCloneError` on it. This bit the first undo/redo
  > implementation; the store tests now cover it.
- **`beginTransient()` / `commitTransient()`** — drag start/end, so one drag is one undo
  step. Viewport pans opt out of history entirely.
- **`setPath` / `getPath`** — dotted *and* numeric keys (`attachment.name`,
  `messages.2.content`). Intermediate containers become arrays when the next segment is
  numeric. This is what lets the inspector address a list row by position without
  threading callbacks.
- **`updateNodeData(nodeId, patch)`** — the inspector's only write path.

`src/store/autosave.ts` debounces a write of the whole document to `localStorage`
(600 ms), revalidates it against `ProjectSchema` on load, and **discards** anything
that fails to parse — a corrupt draft must never wedge the editor.

---

## 6. Inspector contract

`Field` switches over `FieldDef.kind` and renders:

`text` · `textarea` · `number` · `toggle` · `select` · `event` · `conditions` ·
`list` · `deviceTree` · `section` · `note`

Reads go through `getPath(node.data, path)`; writes go through
`updateNodeData(nodeId, { [path]: value })`. Nested paths mean a `list` field can be
rendered recursively — a port row inside a device inside a router — with no extra
plumbing.

**The event picker offers all 92 events with their real payloads**, grouped into ten
categories, and lets an author type a custom event name (`MyMod.CustomEvent`) for
another mod's events. **The condition builder** offers the payload's actual fields as a
combobox, warns on an unrecognised field, and offers `{{runtime.tokens}}` as values.
This is the direct payoff of generating the catalogue from `index.d.ts` instead of the
docs' stale table.

---

## 7. Decisions taken during the build

1. **Templates carry explicit quest ids** (`q-wifi-hack`, …) and a counter-based node-id
   generator, so `build()` is byte-identical every call. Step 4's codegen must be
   diffable and snapshot-testable, and a `nanoid()` in the fixture would defeat that.
2. **`ProjectSchema.quests` has `.min(1)`**, and `store.removeQuest` refuses to remove
   the last quest. The whole shell assumes an active quest exists; making that a schema
   invariant is cheaper than defending against it in eight components.
3. **`ReactFlowProvider` is hoisted into `App`**, above the palette, canvas and
   inspector, rather than wrapping only the canvas. The palette calls `getViewport()` to
   place a node at the canvas centre; a provider scoped to the canvas alone leaves it
   with an empty store and it throws on first render.
4. **No SMS editor** (see `01-…` §8). The comms category is Phone calls, E-Mail,
   Kisscord, WeeChat and Twotter.

---

## 8. Bugs this step's tests caught

Recorded because they are the kind that recur:

| Bug | Caught by |
|---|---|
| `ReactFlowProvider` scoped too low → whole app crashed on mount | `app.test.tsx` smoke test |
| `Tabs.Trigger` outside `Tabs.List` → Radix `RovingFocusGroup` throw | `app.test.tsx` |
| `structuredClone` on an Immer draft → `DataCloneError` on undo/redo | `editor.test.ts` history suite |
| `payloadFields("void")` returned `["void"]`, offering a nonsense condition field | `schema.test.ts` |
| `removeQuest` could empty `quests`, violating `.min(1)` | `editor.test.ts` |
| `eventLabel` contradicted its own doc comment | `schema.test.ts` |
| `@apply field-input` on a plain class → **build failure** under Tailwind v4 | `npm run build` |

Tailwind v4 only resolves `@apply` against real utilities, so the three shared control
bases (`field-input`, `btn`, `btn-ghost`) are declared with `@utility` in
`src/index.css`.

---

## 9. Next: Step 3

- **Website builder** — `world.website` / `world.page` nodes get a WYSIWYG page editor
  and a template library; `seo: false` pages are surfaced as *hidden clues for
  `dirhunter`*, which is the mechanic the game exposes (see `01-…` §7.3).
- **Conversation editors** — visually distinct surfaces for Phone calls (`Quest.Dialog`),
  E-Mail, Kisscord (with `unlocksAfter` gating) and WeeChat.
- **Reply mechanics** — `reply.hackertyper` (mash keys, predefined text types out) and
  `reply.manual` (type a phrase; success/failure branches via exact match or regex).
  Both map to `tools.prompt`, the only SDK primitive that captures player-typed input.

The registry entries for all of these already exist; Step 3 replaces their generic
`list`-of-messages fields with purpose-built editors.

---

## 10. Visual feedback round

After the first look at the running editor, three problems were reported and fixed.
They are recorded here because each one points at a rule worth keeping.

### Sockets were too small to grab

Two causes, only one of them cosmetic:

1. The node card had `overflow-hidden`. React Flow places handles *straddling* the
   border, so the outer half of every socket — and half its hit area — was clipped.
2. The visible dot was 9px with no extra hit area.

Fix: drop `overflow-hidden` (the accent bar rounds itself instead), size the dot at
13px, and widen the grab area with an invisible `::before { inset: -12px }`. The
pseudo-element extends the hit box **without changing the element React Flow
measures**, so edges still anchor on the dot's centre.

Hover feedback uses a `box-shadow` ring rather than `transform: scale()` — React Flow
owns the handle's transform for centring, and overriding it knocks the socket off its
anchor.

Sockets are now coloured by connection kind, and `flow` moved off grey to blue: a
socket you cannot see is a socket you cannot grab, and flow is the wire an author
draws most often.

### The flow read as four unrelated fragments

The real problem was that the four lifecycle nodes *are* four unrelated roots, and
nothing said so. Changes:

- **Renamed** to state when they fire: *On quest claim*, *On start & reload*,
  *On quest complete*, *On quest abandoned*.
- **The entry-point note now says the thing people get wrong**: they never connect to
  each other, and listeners belong under *On start & reload*.
- **Templates only include the entry points they use.** An empty lifecycle node is
  noise a beginner has to reason about. The blank template keeps all four plus a note,
  deliberately unconnected, to teach that before it becomes a bug.
- **A pure analysis layer** (`src/analysis/graph.ts`) flags the problems that are
  actually fatal: an objective with no trigger (blocking), an unreachable node, a
  branch or manual-input outcome that goes nowhere, an unused entry point. It renders
  as a badge on the offending node and a count on the canvas. Step 4's export report
  reuses it verbatim.
- **A "Tidy up" button** runs a deterministic layered layout (depth from the roots
  becomes the column) so the graph always reads left to right.

One subtlety worth keeping: the reachability BFS must seed from `entry.*` **and**
`trigger.event` **and** `objective`. An objective is activated by whatever fires into
its trigger socket, not by a lifecycle node — seeding only from `entry.*` flagged every
objective-led chain as unreachable.

### There was no answer to "what do I type here?"

147 fields, 27 explanations. Both halves were fixed:

- **Every field now has a hint** — 140 hints across the registry, each saying what the
  *game* does with the value rather than restating the label. A test enforces it:
  `gives every editable field an explanation` fails the build if a new field ships
  bare, and a second test rejects hints that are too short to say anything or too long
  to read in a tooltip.
- **Hints moved behind an ⓘ tooltip** on the field label. Printed under every field
  they made the inspector a wall of grey text; behind a tooltip all 140 cost nothing
  vertically.
- **A "Node Reference" template** puts all 32 node types on one canvas, filled with
  example input, laid out by category. It is the fallback for anyone who would rather
  look at a filled-in example than read a tooltip.

### Bugs this round caught

| Bug | Caught by |
|---|---|
| `AttachmentSchema.id` was required but the inspector writes attachments as a nested section, so no id was ever supplied — an author adding an attachment produced an invalid document | templates suite (`ZodError` on `attachment.id`) |
| The registry's `create()` seeds device/rule ids with `nanoid()`, so **templates were not deterministic** — which would also break Step 4's byte-identical codegen | `builds deterministically` |
| `quest.dataKeys` is an array of `{ key, type }`, not strings | templates suite |
| Reachability seeded only from `entry.*`, flagging every objective-led chain | `reaches every node from an entry point` |
| The generator script's hint-inserter mistook a hint on a select *option* for the field's own, silently skipping `ipMode` and `action` | the new hint-coverage test |

The last one is worth naming: a script that edits 140 places in a 990-line file by line
surgery corrupted the file twice before it worked. The version that shipped does one
provably-local thing — insert after a field's own `key:` — and is idempotent. See
`reference/add-hints.py`.

---

## 11. Screenshot round two: overlap and label clutter

A look at the branching template surfaced two defects.

**Nodes overlapped.** The hand-written template positions put a trigger node almost
exactly on top of a world node (`domain` at 640,160 vs the nmap trigger at 660,150).
Hand-written coordinates are exactly as fragile as they look, so the templates now
build their positions with the *same* `layeredLayout()` the canvas' Tidy up button
uses — applied whenever a graph has wires. The reference sheet stays a deliberate
grid. A regression test fails if any two template nodes' bounding boxes intersect.

**Socket labels sat on top of the node's own text.** The labels were rendered inside
the card, over the summary lines. Two-part fix:

1. They now render in the **gutter outside the card**, vertically centred on their
   dot, so they can never cover the node's content.
2. They are only shown **on hover, on selection, or while a wire is being dragged**
   (`useConnection().inProgress`). At rest the coloured dot and the legend are
   enough; the names appear precisely when you are about to use them.

Cards were also given a fixed `w-60` width so columns are predictable for the layout
and the gutter has room for the labels. Column gap widened to 360px accordingly.

---

## 12. Feedback round three: chrome bugs, share, and a hint QA pass

**Inspector collapse button covered the "Node" tab.** It was pinned `top-left` of the
inspector, exactly on the first tab. Moved to the right of the tab bar, where the row
is empty.

**The minimap showed only the grey viewport rect.** First guess (CSS variables in an
SVG fill) was wrong — React Flow sets the minimap fill through `style`, where `var()`
resolves fine. The real cause: the MiniMap only draws a node whose *user-node* carries
dimensions, and dimensions arrive as `dimensions` changes in `onNodesChange`, which we
discarded. So every minimap rect bailed out at `nodeHasDimensions`. The canvas now folds
those measurements back into the nodes it hands React Flow (transient state, not saved
to the document), and the minimap paints one coloured rect per node.

**Template import/export.** New `src/templates/share.ts`: `downloadProject()` writes
the whole `ProjectDocument` as `<mod-id>.quest-editor.json`; `parseProjectFile()`
validates an imported file against `ProjectSchema` and rejects it with a readable
reason (never half-loads). Both buttons live in the Templates dialog. Round-trip and
rejection are unit-tested.

**Hint QA pass** — reading every popout as a player, not a programmer:

- Fixed two *swapped* hints: `mail → To` had the files hint, and `files → target` had a
  stray action hint.
- `Set quest data → Value` now states plainly that any text is accepted and nothing
  there can error (answering "should this be a dropdown?": no — it is free text plus
  `{{data.name}}` inserts, and the hint now says so).
- Objective hints softened from rules to suggestions ("Nudge, don't solve" → "as
  gentle or as cryptic as you want").
- Removed internal references a player can't act on ("Step 3", `Shell.addCommandData`),
  and jargon like `unlocksAfter`, "regular expression", "reverse shell".

**Hint coverage, measured.** A throwaway audit over the registry counted **112 field
descriptors, 104 of them inputs — and all 104 carry a hint**; the 8 without are
informational note/section rows. The remaining jargon scan now returns only intentional
in-game command names (`fern`) and the Discord-style formatting note.

**Layout: keep wired pairs together.** `layeredLayout` seeded each column with the
author's order and never reordered, so a node could land rows away from the one feeding
it (e.g. *On quest complete → Pay the player*), and long crossing wires made the graph
look more tangled than it is. The columns are now refined with four barycenter sweeps
(pull each node towards the mean row of its neighbours, right then left), with the
author's order as seed and tiebreak. Deterministic as before; the investigation
template now places both flagged pairs on the same row.

---

## 13. Step 3 — messaging simulators and the website builder

**Communication nodes now edit inside a live, game-styled preview** instead of a
bare field list:

- **Kisscord** — a DM window: NPC bubbles left, the player's right, lock chips on
  gated messages. The script editor below paces lines (delay in seconds), flips
  sender, and gates any message behind quest objectives with tappable chips
  (the SDK pauses the chain at the first gated message and resumes on completion).
- **WeeChat** — an IRC terminal log (`[hh:mm] <nick> line`), with username, delay
  and sender per line.
- **Mail** — an inbox reading view (subject, from/to, rendered HTML body,
  attachment chip) above the existing fields.
- **Phone call** — the dialog tree itself, with a tappable phone preview. Branches
  live on the quest (several call nodes can share a script); each line has speaker,
  text, timeout and end-of-call, and player choices can continue, jump to a line,
  switch branch, or hang up. The preview plays the script so authors can feel the
  conversation before shipping it.

**Website builder** (`Websites` in the top bar): a mod-level site list, per-site
pages, and an edit/preview workspace. Pages are WYSIWYG — a contentEditable surface
styled like the rendered page (bold/italic/underline, headings, quote, lists,
links) storing HTML, previewed inside a fake in-game browser with the real
`host + path` in the address bar. Five ready-made page templates ship, including a
**hidden clue page** that starts unlisted in a deep sub-directory.

The dirhunter contract is surfaced as one honest toggle: **"Listed in the in-game
search"**. Off means the page stays routable but leaves the search index — exactly
what `dirhunter` brute-forces — and both the page list (lock glyph) and the preview
(a banner) say so plainly.

Websites live on the project document (`project.websites`), shared by all quests;
the Step 4 compiler will write each page to the mod's website output verbatim.

**Template discoverability fix.** The page templates originally sat behind an
unlabeled "+" icon two clicks deep — opening the builder on a project with no
sites showed nothing but "No websites yet." Now the empty state offers **site
templates** ("Corporate site" with a hidden audit page, "Leak archive") next to a
blank-site button, and the pages column has a labeled **New page** button whose
picker lists the five page templates with blurbs.

**Pages are full HTML documents now.** Real sites — including the ones authors
bring from LLMs — are self-contained documents with their own `<style>`, inline
SVG and scripts; a fragment-only model made templates look like bland blog pages.
Consequences in the builder:

- The workspace has three modes. **Visual** renders the page's own document in an
  isolated iframe with the body editable, so the page's CSS applies while editing
  and can never leak into the builder; images inserted from disk are embedded as
  data URIs because the game's web views have no internet. **Code** exposes the
  complete document for copy-pasting html/css/js. **Preview** runs the document
  (scripts included) inside a sandboxed iframe behind a fake browser bar.
- **Load HTML** replaces the page with a finished `.html` file from disk; bare
  fragments are wrapped in a styled base document.
- Templates were rebuilt as believable sites: a corporate suite (front page with
  hero and cards, team directory, status dashboard, contact), a deliberately plain
  "printed memo" hidden page, and a space-agency homepage in the style authors
  already bring (dark hero, orbit SVG, missions with status tags, newsroom, staff
  directory, dead employee portal). Site templates: Corporate, Public agency,
  Leak archive. Blank sites start from a styled starter page, not a bare fragment.

**Template repertoire round two.** Three more site templates, each built from new
page designs so authors get references, not just more of the same: a
Substack-style **newsletter blog** (landing with subscribe box, full article,
hidden drafts page), a Reddit-style **forum** (front page with vote rails whose
top post opens into its own nested comment thread), and a **recipe site**
(card-grid home plus full recipe page with ingredients panel and numbered
method). That makes 6 site templates over 13 page templates.

Site templates are no longer an empty-state-only affair: the sites column "+"
opens a picker offering blank plus every site template at any time, and each
page has a **Duplicate** button so one designed page can seed several
(`path` + `-copy`, selected immediately).

**The community naza page is now the Public agency template, verbatim.** The
author committed `src/editor/websites/naza-homepage.html` to the branch; the
`agency` page template and site template import it with `?raw`, so that file is
the single source of truth (the earlier hand-built placeholder is gone). The
"no external resources" test now bans resource URLs (`src=`/`href=`/`@import`/
`url(...)`) rather than the string "http", since prose and the SVG xmlns are
not fetches.

**Round ten: scans, row actions, and a highlighted code view.** Uploaded
single-file sites (like the naza page) keep their contents invisible to the
builder's page list, so the workspace now carries a **Document scan** panel:
`scanDocument()` reports internal path links missing from the site (with a
*Create N missing pages* stub action), in-page anchor sections ("these jump to
sections inside this page" — naza's `#missions`/`#portal` nav is section-based,
not multi-page), HTML comments with the first snippet shown (the classic
view-source clue, e.g. naza's temp-password ops note), and script/form counts.
The duplicate and delete buttons moved off the workspace toolbar onto each page
row, revealed on hover: duplicate as before, delete red with a Radix
AlertDialog confirm ("Do you really want to delete this page?"). The code view
gained Prism syntax highlighting (transparent textarea over a highlighted
`<pre>`, synced scroll) and a **Format** button that lazy-loads
`prettier/standalone` + the html plugin.

**Round eleven: naza rebuilt as real pages, plain-language scans, AI prompt.**
Claude's community naza file was a single-file site whose nav used in-page
anchors — fine in a browser, useless for quests (no `/portal` page to gate, no
unlisted page for dirhunter). `scripts/build-naza-pages.mjs` now slices it into
8 real pages under `src/editor/websites/naza/` (home, missions, humans,
science, news, directory, portal, and an unlisted `/it/helpdesk`), keeping the
original stylesheet, gov bar, header and footer verbatim; anchor links became
path links, the directory gained an Employee ID column (NZA-3419 for t.reyes),
and the unlisted helpdesk page spells out the temp-password format — the
portal's comment clue is now solvable in-game. The agency site template ships
all 8 pages (`/it/helpdesk` hidden from search); page templates offer landing,
portal and helpdesk individually. The document scan was rewritten for
non-programmers ("Inside this page", ⚠️/🥚/⚙️ findings with what-to-do, dead
links get a *Fix it: create the missing pages* button), and the toolbar gained
an **✨ AI website prompt** popout: describe the site, copy a generated prompt
that teaches any LLM HackHub's quirks (one self-contained .html per page, no
internet resources, real path links, one unlinked secret page), then Load HTML
the results.

**Round twelve: prompt advice not commandments, naza beauty fix, discoverable
dialogues.** The AI prompt now says 1–6 pages, names no specific fonts (the LLM
may pick any OS font), and every secret is optional advice ("you can…") since
quest design decides. The naza pages' visual regression is fixed: the
generator double-wrapped the stylesheet (`<style><style>`), which poisoned the
first CSS rules — the `:root` variables died, turning the gov bar white-on-
white and the type serif; all 8 pages now carry one clean style block. The
dialogue editor (branch scripts, choices, phone preview) was extracted into a
shared `BranchScriptEditor` and now has a top-level home: a **Dialogues**
button in the top bar opens it for the active quest without placing a call
node first; the phone node inspector uses the same editor.

**Round thirteen: the general dialogue node.** The four separate comms nodes
(phone call, Kisscord, e-mail, WeeChat) are now one palette entry —
**Dialogue** — whose inspector card shows its flavour and the first words of
its first line, and opens the dialogue editor. Inside, a type selector opens
the matching interface: phone (quest-shared branches, choices, typed replies
with wrong-answer routes), Kisscord (DM chain with objective gating, player
sends hackertyper-style, file uploads, typed answers), mail (compose +
attachment + reading view), WeeChat (IRC log with typed answers). Every
"player types" moment takes an expected answer, match mode, case, a
wrong-answer line, and a wrong route (try again / end / the node's new Wrong
output). The phone preview gained a replay button. Saved projects with the old
node types migrate automatically (`schema/migrate.ts`). The reference template
and counts now know 29 node types.

---

## Addendum — Round 14: Step 4 export compiler

**Export dialog (top bar → "Export mod").** Compiles the whole project into a
build-free HackHub mod folder and downloads it as a zip:

- `manifest.json` — id/name/version/author/description, `apiVersion: 1`, and a
  **permissions list computed from the graph** (network/mail/shell/events/ui/
  bank — only what the nodes actually need).
- `dist/mod.js` — the mod the game loads directly. It embeds the project as
  JSON plus a small interpreter (plain ES2020, no build step for the player):
  quests register with Objectives (unlock edges → `unlocksAfter`, trigger
  events → declarative `trigger.condition`), mails/dialogs/chats/tweets,
  websites with `seo:false` pages staying out of the search index (the
  dirhunter hiding place), and typed-answer moments becoming terminal
  commands (`qe-…`) that emit `QE.<id>.ok` / `.wrong` events for your graph.
- `src/index.ts`, `package.json`, `esbuild.config.mjs`, `tsconfig.json`,
  `README.md` — for power users who want to rebuild/extend the mod.

**Export-time advice (never blocking):** standalone world.port/files/firewall/
domain/database and handbook nodes, phone input commands, Kisscord uploads,
and unlisted pages each surface a plain-language note in the dialog.

**Verification:** `src/compiler/__tests__/compile.test.ts` evals the emitted
`mod.js` against a stub SDK — quests/websites/commands register, `OnStart`
creates the subnet and sends the mail, trigger conditions evaluate against
event payloads, and input commands branch on the typed answer. The full
reference template (every node type) compiles and runs through the
interpreter. 289 tests green.

---

## Addendum — Round 15: full QA sweep (code + UI/UX)

**Method:** two passes. (1) Code QA: whole-suite reruns for flake detection,
a cross-cutting invariants suite (`src/__tests__/qa.test.tsx`: registry
completeness, defaults round-tripping through zod, crash-free summaries,
every template compiling **and its emitted mod.js running**, hostile-text
compilation, corrupted-draft autosave), plus an end-to-end read of the
round-14 compiler. (2) UI/UX QA: a whole-app smoke suite
(`src/__tests__/appSmoke.test.tsx`) that mounts the real `App`, walks every
top-bar surface, exercises canvas render + undo, and fails on any
console.error/warn; plus accessibility and design-token audits.

**Bugs found and fixed:**

- **Compiled mods could not complete objectives.** `completeObjective` was
  never called — objectives only completed via declarative triggers. Flow
  reaching an objective node now ticks it off.
- **`reply.input` didn't wait for the player.** Flow arriving at the node
  immediately followed the "Correct" path; it now pauses and is resumed by
  the generated terminal command (Correct/Wrong handles included).
- **Hackertyper flow-outs were dead** and the widget re-emitted its event on
  every keypress after completion. Reveal now resumes the flow (listener
  registered in `OnObjectivesStart`) and emits exactly once.
- **Blank hackertyper event names** emitted `""` despite the inspector
  promising a generated name; both widget and listener now use
  `QE.ht.<nodeId>` when blank.
- **Autosave silently swallowed foreign data:** any JSON object parsed as a
  blank project (all fields have zod defaults), quietly replacing a draft.
  The draft envelope (`kind`) is now sanity-checked before schema parsing.
- **Flaky test hardening:** compiler tests used fixed 10–20 ms flushes; they
  now settle deterministically (observed failure on a cold run).
- **A11y:** ListEditor move buttons had `title` but no accessible name.

**Audit results (no action needed):** all custom design tokens used in TSX
are defined in `@theme`; every icon-only button and search/file input has an
accessible name; every Radix dialog has Title+Description; no div-onClick
anti-patterns; destructive canvas actions are undo-covered and site deletion
is confirm-gated.

**Verification:** 298/298 tests (13 files), `tsc --noEmit` clean, production
build OK.

---

## Addendum — Round 18: real-game feedback (auto-start naming, Wi-Fi reality)

- **“On quest claim” → “Quest start.”** The old name implied the node only runs
  after the player manually accepts; with “Start automatically” on it runs on
  install. Label, blurb, node-card summary and the lifecycle note all updated.
- **Wi-Fi, verified against SDK 0.21.0:** `Network.createWifiNetwork` **does not
  exist** (docs/01 §2.4 corrected). The emitted mod now feature-detects it — if a
  future SDK ships one it is used; otherwise the node falls back to
  `createSubnetNetwork` (a regular router at the node's IP) instead of calling an
  undefined function. The Export dialog warns in plain language.
- **Signal strength** became a labelled 0–3 slider (new `slider` inspector field
  kind) with an honest hint that the current mod SDK does not read it yet.
- Compiler tests cover both Wi-Fi paths (fallback + future-native). 302 tests.

---

## Addendum — Round 19: playtest feedback sweep (13 items)

**Phase 1 — bugs & Mod tab.** Mail "From" now reaches the game via
`sendMail(index, from)` (QuestMailDefinition has no `from` — the game used to
fall back to the employer address). `Bank.transfer` did not exist: pay/charge
now call `Bank.transaction`/`Bank.withdraw`, with a new fixed-or-percentage
amount mode (`Bank.getBalance()` drives the percentage). Wait node switched
from ms to seconds (migration rewrites old drafts). Mod tab: real image
pickers for cover/icon (PNG/JPG, embedded in the project, decoded into
`assets/…` files in the zip and referenced by path in the manifest — `tags`
now land in the manifest too). Tag input rebuilt: chips, Enter/comma commit,
Tab-autocomplete and a common-tags quick list (the old field split on every
keystroke, which ate spaces). All hint/descriptor text brightened
(`text-ink-4` → `text-ink-3`, node blurbs `text-ink-2`).

**Phase 2 — canvas.** Left-drag is now a selection marquee (panning moved to
middle/right mouse), `SelectionMode.Partial`; Ctrl+C/X/V/D copy, cut, paste,
duplicate multi-selections (internal wires included, fresh ids, +32px
offset). Flow wires animate with subtle marching dashes. Double-clicking a
wire drops a `flow.reroute` nodule that splits it — fan-out and tidying,
pass-through at runtime. `layout.group` frames: named/commentable, resizable
(NodeResizer), drag the frame and every node whose centre is inside moves
with it; frames render behind cards (zIndex −1) and are skipped by the graph
analysis and the compiler.

**Phase 3 — tweets.** Compiled against SDK 0.21.0's real shapes:
`TweetDefinition` is flat (`accountId`, `image?`, `likes?`…) — the old
docs-era `{interaction, showInTimeline}` shape is gone; accounts get required
`id`/`displayName`/`avatar`. New Quest-tab "Twotter accounts" editor
(username, display name, avatar upload, bio, verified); the tweet node got an
account picker and an optional attached picture.

**Phase 4 — answered without code.** The suspicion/"you got hacked" minigame
is **not exposed** in SDK 0.21.0 (no matches for suspicion/minigame/counter-
hack in `index.d.ts`), so a "Hack the player" node is not possible today.

**Verified against the SDK's own `index.d.ts` (0.21.0, npm):** `sendMail(
index, from?, to?)`, `QuestMailDefinition {title, content, replyable?,
attachment?}`, `Bank.{transaction, withdraw, getBalance, getPlayerAccount}`,
`TweetDefinition {accountId, content, image?, likes?, comments?, shares?,
views?, postedAgo?}`, `TwotterAccountDefinition {id, username, displayName,
avatar, …}`, `ModManifest {icon?, cover?, tags?}`, no Wi-Fi/suspicion APIs.

**Verification:** 320 tests (15 files), `tsc --noEmit` clean.

---

## Addendum — Round 20: Twotter search crash (game-breaking)

**Symptom (QA-filedump):** searching a mod-registered account in Twotter
crashed the game: `TypeError: Cannot read properties of undefined (reading
'toLowerCase')`, preceded by a moment.js deprecation warning (that one is the
game parsing `postedAgo: "3h"` — cosmetic noise, not the crash).

**Root cause:** accounts with no avatar shipped `avatar: ""`. `avatar` is the
one asset-like string on `TwotterAccountDefinition`; the game parses it and an
empty string yields `undefined` before `.toLowerCase()`. (Tweet images as raw
data URLs are the same risk class.)

**Fix:** the compiler now emits Twotter assets as real files — uploaded
avatars/pictures are decoded into `assets/twotter/…`, accounts without an
avatar get a generated 64×64 placeholder PNG, and the emitted project
references the files by path. Verified by recompiling the user's exact
crash-causing project. Mods exported before this fix must be re-exported.

---

## Addendum — Round 21: the Twotter search crash, take two

Round 20 gave every account a real avatar file; the crash persisted
(user-confirmed with the `QA-filedump` mod). Root cause, finally pinned: the
**platform** record (`TwotterUser`) requires `name`, `surname`, `banner`,
`joinedAt` and `password`, but the quest-level `TwotterAccountDefinition`
cannot express any of them — the game's converter leaves them `undefined`,
and the Twotter search UI dereferences one of them
(`TypeError: Cannot read properties of undefined (reading 'toLowerCase')`).

**Fix:** exported mods now register accounts through the platform API in
`OnModPackageLoaded` — `Twotter.createUser()` (which fills sensible defaults
for exactly those fields) + `Twotter.addUser()`, deduped via
`getUserByUsername`. The quest-level `TwotterAccounts` assignment remains
only as a fallback for games without that API.

**Verified against the user's crashing project** (QA-filedump): compiling it
with the fixed compiler and running the emitted `mod.js` against a stub
platform yields a complete user record (every `TwotterUser` field defined),
no quest-level double registration, and the tweet resolving to the right
account id. 324 tests green.

---

## Addendum — Round 24: canvas polish, a Sequence node, and remembered tags

Seven items from the user, checked against the SDK (`@hotbunny/hackhub-content-sdk@0.21.0`
`index.d.ts`) before any test was written.

**1. Tweet card said “no account yet” after an account was picked.** The card
printed the raw `accountId`; with an id like `acc_9f2` and no lookup, an empty
picker and a filled one read almost the same. `summarize()` now resolves the id
against `quest.twotterAccounts` and shows the real `@handle`, or says the
account is “not in this quest” if it was deleted. (SDK: `TweetDefinition.accountId`
must match a `TwotterAccountDefinition.id` — the id is the right thing to store,
only the display was wrong.)

**2–4. Reroute nodule.** Its two 13px sockets each carried a 37px invisible grab
ring, so the entire 16px nodule was socket: it could not be clicked, dragged or
selected — which is why pressing Delete removed the wires (those *were*
selectable) and left the nodule behind. It is now a 36px node with a 22px ring
you grab, and its sockets are trimmed to the dot in the middle (`.qe-reroute`
rules in `index.css`). Both sockets sit on the same point, so the nodule reads
as **one** dot: wires arrive at and leave from the centre, and any number of
wires can be dragged out of it. Deletion needed no store change — proven by a
mounted-app test that selects the nodule, presses Delete and asserts both the
node and its wires are gone.

**5. Group frames** grew a colour-picked title bar spanning the frame (8 preset
swatches plus a full colour picker; `color` on `LayoutGroupNodeDataSchema`,
default slate for older drafts). The label's ink flips between near-black and
near-white by luminance, so a yellow frame is still readable. Resize corners went
from React Flow's 5px to 9px with an invisible 7px pad around them.

**6. Wires** are now a solid line in the colour of the socket they leave, with a
row of round dots — slightly fatter than the wire — drifting along it towards
the target. One dot every 14px, one gap per 1.4s: exactly half the speed of the
marching dashes it replaces (28px/1.4s). The dot overlay is `pointer-events:
none`, so clicking a wire still selects the wire. The canvas legend was redrawn
to match. Honours `prefers-reduced-motion`.

**7. New node — `flow.sequence` (Flow control → “Sequence”).** One input, as many
outputs as the author adds; each output has a name and a pause in milliseconds,
and they fire top to bottom. Sockets are *derived from data*: `NodeTypeDef` gained
an optional `dynamicSources(data)`, and `sourcesOf(node)` (registry) is now the
single answer for “what outputs does this node have”, used by the canvas, the
store's `connect`, the analysis and the tests. Removing a step removes any wire
attached to it (`updateNodeData` prunes sockets that no longer exist), and an
unwired output is reported as a “Dead end” with sequence-specific wording.

*SDK grounding:* there is **no** scheduling/timer/sequence API anywhere in the
d.ts, so sequencing has to live in the emitted interpreter — but the step field
mirrors the SDK's own convention for chat chains (`delayMs`, “applied before it
is sent”). Waits now prefer `Random.sleep(ms): Promise<void>` (SDK 0.21.0) when
present and fall back to `setTimeout`; quest hooks may return promises
(`OnStart(): void | Promise<void>`), so awaiting a sequence is legal.

**8. The Mod tab remembers tags** the author invents (`src/lib/tagMemory.ts`,
browser-local, capped at 60, never exported). They appear in autocomplete and in
a “Your tags” strip, each removable from the memory.

**Launch.bat** now polls port 5173 and closes itself as soon as the editor
answers (opening the browser first); if the port never answers within a minute it
stays open with an explanation instead. No PowerShell on the PC → short fixed
wait.

**Verification:** 358 tests (17 files, +27), `tsc --noEmit` clean, `vite build`
clean. Node types: 31 → **32** (schema, reference template and its `nodeCount`
updated together). Export stamp: `EDITOR_BUILD = "2026-09-02.r24"`.
