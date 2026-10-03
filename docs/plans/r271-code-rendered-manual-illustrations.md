# r271 — Code-rendered manual illustrations

**Status: investigation complete; proposal only. Awaiting Zeis's approval.** No
manual figures, editor code, screenshot slots or coverage tests have been changed.

## Decision requested

Approve a small prototype before replacing any existing figure:

1. Use one locally bundled, read-only figure renderer, shared by the manual, with
   each illustration selected by a scene ID. Prefer one reusable iframe document
   and lazy-loaded frames; do not create a separate HTML or image file for every
   scene.
2. If the prototype passes the offline, accessibility, search and visual checks
   below, replace the **88 current editor-only figure slots** with rendered
   scenes. Keep the one current game-only figure as a genuine capture unless
   Zeis prefers to remove it or use a clearly labelled schematic instead.
3. Leave the five other game-only names and two unlinked editor-panel names
   dormant; they are not figures on current manual pages.

The game-only exception is the only content decision this code investigation
cannot make for Zeis. The renderer must not pretend an editor view is a view of
the game.

## What the audit found

`src/manual.coverage.test.ts` G8 walks all manual HTML and currently reports **89
missing image references**. A filesystem walk of the same 51 HTML pages confirms
that every one is missing from `public/manual/img/`; the directory is absent.
The targeted coverage file passes **27/27 tests** and prints the same 89 count.

| Current references | Count | What they depict |
|---|---:|---|
| Node reference panels | 41 | One editor inspector figure for each of the 41 documented node types |
| How-to diagrams | 17 | Editor node arrangements and wires |
| Tutorial figures | 14 | 13 editor views and one game mod-list view |
| Feature-guide figures | 12 | Editor panels, dialogs, settings and canvas tools |
| Troubleshooting figures | 3 | Editor warnings and the export report |
| Screen-tour figures | 2 | Editor workspace and empty canvas |
| **Total** | **89** | **88 editor views; one game view** |

The exception is `tutorial-14-installed.png`: its alt text and the r164 capture
spec both say it shows the **game's mod list**, not the editor. The five
`ingame-*.png` names in §5 of the r164 plan are also game-only, but no current
manual page references them. Two editor names—`node-world-network-devicetree.png`
and `node-trigger-event-conditions.png`—are likewise declared but not linked.
The present G8 count is based on references in pages, so none of those seven
unlinked names is included in 89.

The r164 manifest currently contains **96 unique PNG names**, not the 91 in its
summary. Its intro and capture instructions still say 33 node shots; the node
table actually lists 41 inspector names, while its heading and arithmetic say
37, plus two additional editor panels. Its recipe table has 17 how-tos, not 16.
The current Node Reference and manual inventory both confirm 41 node types. The
correct arithmetic is 71 Tier 1 names, 20 Tier 2 names and five additional
unlinked game names: 96 total. The proposal must correct the manifest's counts
and distinguish a rendered illustration from a PNG capture rather than carry
these stale totals forward.

## What can render the real editor

The editor already has central sources for most of what these figures show:

- `src/schema/registry.ts` defines the 41 node types, labels, categories, socket
  descriptions, default data and inspector field descriptors. The
  `Node Reference` template in `src/templates/reference.ts` builds one example
  of every currently available node type.
- `src/editor/canvas/GraphNode.tsx`, `TypedEdge.tsx` and `QuestCanvas.tsx` render
  the real node cards, typed wires and canvas. `src/editor/inspector/Field.tsx`
  and `InspectorPanel.tsx` render the real fields and inspector tabs.
- `src/editor/shell/TopBar.tsx`, `StatusBar.tsx` and the dialog components render
  the rest of the editor chrome. `src/index.css` is the app's design-token and
  Tailwind source. The manual has its own CSS, which mirrors parts of that
  palette but is not the app's stylesheet.
- `scripts/build-node-pages.mjs` generates the 41 node-reference pages and
  currently writes their PNG `<img>` figures. It must emit the scene references
  too, or the next manual regeneration would undo the migration.

These are not standalone picture components. The canvas and inspector read the
editor's Zustand store; graph nodes also use React Flow context and connection
state. `App.tsx` starts autosave and keyboard shortcuts. The normal app also
reads and writes local settings for theme, font and inspector layout
(`src/store/autosave.ts`, `src/editor/settings/theme.ts`,
`src/editor/settings/uiFont.ts` and `src/editor/inspector/drawerLayout.ts`). A
manual view must therefore seed its own fixed example state, provide the needed
React Flow context, set a consistent Midnight theme and system font, and **not**
mount autosave or read/write the author's project or preferences. The event
conditions, device tree and dialogue fields use special editors, so a generic
field-only drawing would not be faithful for every node.

The r164 scenes that describe a wire mid-drag or a dry run part-way through a
trace are snapshots of a moment, not proof of how those actions behave. They can
be represented as fixed display states; the written steps must remain the
explanation of the interaction. The renderer must not imply that a reader can
edit the example.

## Constraints the design has to keep

- The manual is deliberately usable from `file://`. `manual.css` states that it
  has no network calls or external fonts; `build-manual-index.mjs` uses local
  script files because `fetch()` does not work for the manual's offline search.
  Every renderer file must be local, and the frame must not fetch data or contact
  the editor, a server or the game.
- The search builder reads manual HTML, strips tags, and indexes page text. It
  does **not** inspect the rendered contents of an iframe. It also does not
  currently index an image's `alt` attribute. A frame needs a meaningful
  `title`, a parent-page text alternative and a caption; the indexer must include
  the title/description and caption in the search text. The generic renderer
  document must not become a misleading search result.
- Current figures use `<img alt>` and `<figcaption>`. The replacement must keep
  an equivalent non-visual description in the parent manual, not rely on text
  drawn inside a frame. The frame's visual contents should not expose fake
  editable controls or keyboard stops.
- G8 currently recognizes only missing `<img>` paths whose `.png` names occur
  anywhere in `r164-manual-screenshots.md`. It logs pending PNGs and checks for
  orphan PNGs in `public/manual/img/`. It has no scene-ID or generated-figure
  concept.
- The manual's pages are static, but a code-rendered scene needs local scripts.
  There is no Chromium, Firefox, Playwright or Puppeteer installed in this
  workspace, so this investigation could not visually compare a rendered scene
  with the running editor. The first approved step must be a real browser
  prototype, not an assertion that visual fidelity has already been proven.

## Proposed design

Create **one shared scene renderer** and a small checked-in scene catalogue.
Each parent-page figure would carry a stable scene ID and point to the same
local renderer document, for example `figure.html?scene=tour-workspace`.
A single locally bundled classic script and stylesheet render that scene using a
fixed, read-only data fixture. Use `loading="lazy"` and explicit scene dimensions
so a long page does not boot every React view immediately. Bundle locally rather
than depending on JavaScript modules loaded across `file://` origins; confirm
that choice in the prototype.

Where practical, compose the existing editor components and styles. For node
cards, inspectors and graph arrangements, read labels, fields, sockets and
example values from the registry and templates instead of typing a parallel
version by hand. The catalogue supplies only the scene-specific composition:
which nodes, example values, selected tab, dialog state, crop and dimensions.
For specialized dialogs or transient states, use the existing component where
it can be seeded safely; otherwise make a clearly static scene from the same
UI tokens and mark the limits in its caption. Do not change editor behavior or
product copy to make an illustration work.

The parent page retains the current figure's meaningful description and
caption. The iframe gets a descriptive `title`; a short text alternative remains
in the page for screen readers and search. Search-index generation should
explicitly collect that text, and skip the generic renderer page. A failed local
bundle must leave a visible, useful fallback rather than a blank frame. No scene
may rely on `aria-label` alone, because the current indexer does not read
attributes.

This keeps the number of maintained files small: one renderer page, one local
bundle/style pair and one scene catalogue, rather than 88 hand-built pages or
screenshots. Each existing figure gets only its scene ID and descriptive text.
If the iframe approach fails the direct-from-disk or accessibility tests, use
the same scene catalogue to generate static inline SVG/HTML at manual-build
time; do not fall back to 88 hand-maintained mockups.

## Work sequence after approval

1. **Correct the inventory.** Update the r164 manifest's stale counts and mark
   each slot as editor illustration, actual capture, or declared-but-unlinked.
   Update `scripts/build-node-pages.mjs` so `npm run gen:manual` keeps the 41
   generated node pages on scene references. Keep current scope to the 88 editor
   figures. Do not add the two dormant editor scenes or five dormant game scenes
   to the manual without a separate decision.
2. **Prove the renderer on five representative scenes:** a registry-driven node
   inspector; a how-to canvas with typed wires; a dialog or settings panel; the
   full editor workspace; and a transient state such as the mid-drag wire. This
   checks the five different rendering problems before 88 references move.
   Compare the scenes with the actual editor at its default Midnight theme and
   system font. Show this prototype for visual review before bulk conversion.
3. **Test the offline and semantic path.** Open the manual page directly from
   disk with the network unavailable. Confirm the local frame script and CSS
   load; the search still finds figure labels; the frame has an accessible name;
   and its controls are not interactive. If this fails, stop and use the
   build-time inline-renderer fallback before migrating pages.
4. **Convert the 88 current editor figures** to scene references, preserving
   useful existing captions and descriptions. Keep
   `tutorial-14-installed.png` as an actual capture slot pending Zeis's decision;
   do not render an editor lookalike for the game's mod list. Leave the five
   additional game-only and two unlinked editor slots unused.
5. **Teach G8 the difference.** Validate every scene ID against the catalogue,
   require descriptions/captions, reject unknown or unused active scenes, and
   count only real missing PNG captures as pending. If the game figure stays,
   the expected current result is **88 rendered editor scenes and one capture
   pending**. If Zeis removes that figure, it becomes **88 scenes and zero
   current captures pending**. The five dormant game names must not inflate the
   live count.
6. **Verify and record.** Run `npm run gen:manual` after updating its page and
   renderer steps, then run G8, G17 and G18; run `npm run typecheck`,
   `npm run build`, the full test suite if the coverage test under `src/` changes,
   and `git diff --check`. Inspect the manual at normal and narrow widths, with a
   keyboard and screen reader, and check that every visual claim matches the
   actual editor. Since this is a documentation-only renderer, do not bump
   `EDITOR_BUILD` unless product editor code changes.

## Acceptance criteria

- The 88 current editor figures render from one shared local renderer and
  scene catalogue. There are no 88 separate hand-maintained HTML files or
  image assets.
- Every scene is fixed and non-interactive, uses current editor labels and
  defaults, and is visually checked against the editor. Dynamic states are
  identified as illustrations, not working controls.
- Manual search finds each scene's description and caption. Screen readers get
  a descriptive frame name and equivalent text outside the frame.
- Opening the manual directly from disk with no network renders the scenes and
  keeps search working.
- G8 reports generated scenes separately from actual PNG captures, rejects
  unknown IDs, and does not count the 88 rendered figures as missing PNGs.
- The single current game-only slot is either a true game capture or removed by
  Zeis's decision; it is never represented as an editor screenshot.
- No existing figure is replaced before Zeis approves this plan. No editor
  behavior or product copy changes are included in the proposal.

## Self-review

The central risk is visual drift: the actual node and inspector renderers depend
on store and React Flow state, and some forms have special editors. That is why
the plan requires a five-scene proof before moving any of the 88 references. The
iframe is a recommendation, not an untested guarantee: its local-file behavior,
search treatment, frame naming and loading cost are explicit prototype gates.

The other significant finding changes the apparent scope. Not every pending
figure is an editor screenshot: the tutorial's installation image shows the
game's mod list. The plan preserves that truth and leaves the five unlinked
game images alone. It also corrects the r164 manifest's stale counts rather than
using its stated 91-image total. No browser-rendered examples were produced in
this investigation, and no implementation is authorized until Zeis approves or
revises the plan.
