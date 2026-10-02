# r257 — Desktop app checks: a node that routes on what is installed

**Status:** plan, not built. Zeis chose the *node* shape on 2026-10-02; per the
r230 rule a change of this size gets a plan first.

## Why

Zeis (r235): a quest may need to check whether a command like **lynx** or
another mod's custom tool is installed, in order to write hints and prevent dead
ends — and *"not until a template asks"* is not a valid deferral for a
quest-mod editor.

The SDK's own doc comment argues the same thing, in stronger terms
(`node_modules/@hotbunny/hackhub-content-sdk/index.d.ts:3885-3895`):

> Most of the desktop's apps are not there on a fresh machine - they are
> unlocked and installed as the player earns them - so a pack that pushes a
> chat message or a file at an app it assumed was present produces a
> notification for something the player cannot open, which reads as the pack
> being broken.

So this is not a convenience feature. It is the difference between a hint and a
dead end.

## The surface (verified, not assumed)

Both live in the `Desktop` namespace — the same one the editor already uses for
widgets:

| Declaration | Line |
|---|---|
| `Desktop.isAppInstalled(app: string): boolean` | `index.d.ts:3895` |
| `Desktop.getInstalledApps(): string[]` | `index.d.ts:3897` |

`@param app` is *"The app's name as the desktop knows it, e.g. `Kisscord`"*.
Neither function is referenced anywhere in `src/` today.

## Decision: a node, not a condition

Worth recording, because the cheaper option was checked and genuinely does not
reach. A condition clause is `{ field, op, value }` where `field` is a *payload
field path* — `ip`, `results`, `file.name` (`src/schema/nodes.ts:59-68`) — and
`flow.branch` reads it from `source: "event" | "data"` (`nodes.ts:617-621`).
Conditions **compare data that is already in hand**; nothing in that mechanism
can call an SDK function. So "is Kisscord installed" cannot be expressed as a
condition without extending the condition system with a new source kind — which
is a larger change than the node, not a smaller one.

## Proposed shape

`flow.appcheck`, in the **Flow control** palette category (`registry.ts:247`),
modelled closely on `flow.branch` (`registry.ts:1256-1278`) because it routes
the same way.

| Aspect | Value | Precedent |
|---|---|---|
| `targets` | `[inFlow, triggerIn]` | `flow.branch` |
| `sources` | `[trueOut, falseOut]` — "Installed" / "Missing" | `flow.branch` |
| `hook` | `onObjectivesStart` | `flow.branch` |
| field 1 | `app` — text, the app's name as the desktop knows it | — |
| field 2 | `mode` — `one` (test a named app) or `list` (write every installed app's name into quest data, so a later condition or a terminal tool can read it) | `fx.setData` |

`mode: "list"` is what makes `getInstalledApps()` reachable at all, and it
composes with the condition system that already exists: the node writes, then
`flow.branch` on `source: "data"` tests. Without it the second declaration
would be dead weight.

## Touchpoints

| File | Change |
|---|---|
| `src/schema/nodes.ts` | `AppCheckNodeDataSchema` (`app`, `mode`), plus the data union |
| `src/schema/registry.ts` | one `NODE_TYPES_REGISTRY` entry; `NodeType` union |
| `src/compiler/runtimeSource.ts` | the emitted case, next to `flow.branch` at `:1808` |
| `src/compiler/compile.ts` | **`EDITOR_BUILD` bump** — this changes compiler output, so AR13 requires it (unlike r251–r256) |
| `src/schema/__tests__/schema.test.ts:44` | `has 40 node types` → 41 |
| manual pages | regenerate; the **161 fields / 76 sockets** figures in `README.md` and `docs/06` move with it |

The three-counts hazard applies: node types, editable fields and sockets are
asserted independently and must be updated together or the suite disagrees with
itself.

## The open question that could still change this

The roadmap row has carried it since r235: **do terminal tools and other mods'
`RegisterCommand` tools appear in `getInstalledApps()`?**

The declaration says *"Every app installed on this save, by name"* and the
`isAppInstalled` example is `Kisscord` — a desktop app. Whether **lynx** is
modelled as a desktop app or as a shell binary is not answerable from the
declarations. If terminal tools are *not* in the list, then the motivating case
("does the player have lynx") is not covered by this node, and the answer is a
different mechanism — which is why this should be settled in game before the
inspector copy promises anything.

Recommendation: build the node (it is correct and useful for desktop apps
either way), and file the question rather than guess in the UI text.

## Tests

- registry: the type is palette-visible, in `flow`, with two sources
- schema: defaults (`mode: "one"`, empty `app`), and a blank `app` warns rather
  than emitting a call that can never match
- compiler: `mode: "one"` emits `Desktop.isAppInstalled(...)` and routes;
  `mode: "list"` emits `getInstalledApps()` into quest data; **a project without
  the node compiles byte-identically to before**
- runtime: true and false paths both reachable; the list path writes under the
  key the branch condition reads
- analysis: an `app` name that is not a known desktop app is an info, not an
  error — the list is save-dependent by design

## Hazards

`runtimeSource.ts` is a `String.raw` file: a stray backtick breaks the build.
One writer per DOM attribute; nothing eager in `dataScope()`.

## Out of scope

Installing or uninstalling apps (no SDK surface), and any UI that lists apps for
the author to pick from — the list is per-save, so a picker would be a lie.
