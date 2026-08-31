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

**The minimap showed only the grey viewport rect.** React Flow paints minimap node
rects with an SVG `fill` *attribute*, and the category colours were CSS variables —
`fill="var(--…)"` never resolves, so every node drew as nothing. Added `CATEGORY_HEX`
(the same values as the `--color-cat-*` tokens) and made the minimap use it.

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
