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
