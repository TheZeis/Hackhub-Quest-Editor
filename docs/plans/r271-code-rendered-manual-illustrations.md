# r271 — Code-rendered manual illustrations

**Status: direct-from-disk loading is confirmed; scenes 2 and 5 have r273 layout
corrections and are awaiting re-review.** The game-only tutorial figure has been
removed by decision, its useful prose remains, and no editor figure has been
replaced. r272 fixed the bundle's `process.env.NODE_ENV` reference and Firefox's
sandboxed `moz-nullprincipal` origin blocking local assets. Zeis confirmed that
all five frames now load from disk without the editor running. r273 implements
the two visual changes he requested; bulk conversion remains held until he
reviews the updated prototype.

## Approved direction

Zeis approved the shared, offline-capable renderer and the five-scene prototype,
with **no game screenshot**:

1. Use one locally bundled, read-only figure renderer, shared by the manual, with
   each illustration selected by a scene ID. Prefer one reusable iframe document
   and lazy-loaded frames; do not create a separate HTML or image file for every
   scene.
2. After the prototype passes visual review and the offline, accessibility,
   search and safety checks below, replace the **88 current editor-only figure
   slots** with rendered scenes. The game-only tutorial figure is removed, not
   depicted as an editor view or an invented game screenshot.
3. Leave the five other game-only names and two unlinked editor-panel names
   dormant; they are not figures on current manual pages.

The content decision is settled: this manual will not include a game screenshot
for the installation step. The written instructions remain, and the renderer
must not pretend an editor view is a view of the game.

## What the audit found

At the start of the investigation, `src/manual.coverage.test.ts` G8 reported
**89 missing image references**. A filesystem walk of the same 51 HTML pages
confirmed every one was missing from `public/manual/img/`; the directory was
absent. The targeted coverage file passed **27/27 tests** and printed the same
89 count. The table below records that pre-decision audit; removing the game-only
figure now leaves **88 current editor-image references**.

| References before the no-game choice | Count | What they depict |
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

At audit time, before Zeis's no-game decision, the r164 manifest contained
**96 unique PNG names**, not the 91 in its summary. Its intro and capture
instructions still said 33 node shots; the node table actually listed 41
inspector names, while its heading and arithmetic said 37, plus two additional
editor panels. Its recipe table listed 17 how-tos, not 16. The current Node
Reference and manual inventory both confirm 41 node types. The pre-decision
arithmetic was 71 Tier 1 names, 20 Tier 2 names and five additional unlinked
game names: 96. The corrected r164 inventory now has **95 declared names**:
70 Tier 1 editor slots, 20 Tier 2 editor slots and five dormant game-only names.
The tutorial game slot was removed. The manifest now distinguishes rendered
illustrations from PNG captures rather than carrying the stale totals forward.

## Prototype checkpoint — 2026-10-03

The first renderer is in place at `public/figures/renderer.html`, with one
bundled script and stylesheet in `public/figures/assets/`. Its checked-in scene
catalogue and renderer source live in `scripts/manual-figures/`. The review page
is `public/manual-figure-prototype.html`; it is outside the handbook folder, so
it does not become a manual search result or a new page in G8.

The five scenes are `node-objective-inspector`, `howto-wired-canvas`,
`settings-panel`, `tour-workspace`, and `tutorial-drag-wire`. They seed the real
First Contact template into an in-memory editor store and compose the current
inspector, canvas, node library, top bar, status bar and Settings panel where
appropriate. The mid-drag wire is a fixed SVG line over real node cards, clearly
identified as a static illustration. The initial prototype sandboxed every frame
without same-origin access. Firefox later confirmed that this opaque origin blocks
local file assets, so r272 now grants `allow-same-origin` only when opened from
`file://`; the HTTP preview remains scripts-only. The frames are marked inert
and receive a no-op local-storage shim; the renderer does not mount `App` or
autosave. Its isolated CSS bundle omits the optional font files because every
prototype uses the default system font, so it has no font asset URLs to resolve
from disk.

The local bundle is built as part of `npm run gen:manual`. The prototype page has
parent-page descriptions and descriptive iframe titles, and lazy-loads each
scene. The search builder now adds iframe titles to indexed page text; the scene
heading and parent description remain ordinary page prose. A temporary manual
fixture confirmed the title, parent description and caption all reach the search
index; the final index remains 285 entries from 51 manual pages. The builder
walks only `public/manual/`, so the shared renderer and review page are not
indexed.

Zeis's first direct-from-disk test exposed a bundle boot failure. The generated
IIFE retained `process.env.NODE_ENV`, which is not defined in browsers, so the
renderer script threw before any scene replaced its HTML fallback. r272 defines
that expression as production. Firefox then exposed a second blocker: the
sandbox's opaque origin blocked `renderer.js` and `renderer.css`. The parent now
grants the file origin only for `file://` and keeps the HTTP preview
scripts-only. The automated smoke checks both parent-page policies and boots all
five local scenes. JSDOM needs a no-op `ResizeObserver` and does not enforce
Firefox's sandbox origins; Zeis has since confirmed the fix by opening the latest
file directly in Firefox.

His visual review found that scene 2's editor toolbar/zoom controls were noise
and its Objective node was clipped, while scene 5's nodes were clipped and its
wire endpoint looked connected. r273 hides the unneeded canvas chrome, makes
both frames responsive, fits the nodes to each frame, and puts the scene 5 wire
endpoint visibly in the gap. These changes pass the scene smoke but still need
visual re-review. No editor figures have been bulk-migrated; G8 should still
report **88 current missing editor-image references** and no game-only figure.

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

## Work sequence

1. **Correct the inventory.** The r164 manifest's totals and slot types are
   updated below to separate editor illustrations, the five dormant game names
   and two unlinked editor panels. The tutorial's game-only figure has been
   removed by Zeis's direction while the useful installation prose stays.
2. **Build and review the five-scene prototype.** The scenes now cover a
   registry-backed node inspector, a wired how-to canvas, the Settings panel,
   the full workspace and a fixed mid-drag state. Compare them with the actual
   editor at its default Midnight theme and system font. Bulk migration remains
   stopped until Zeis reviews this prototype.
3. **Test the offline and semantic path.** The r272 JSDOM smoke checks that
   local-file frames receive the file-only origin permission, HTTP frames remain
   scripts-only, and all five local scenes start. Zeis confirmed that the page
   now opens from disk in Firefox without the editor running. JSDOM does not
   enforce Firefox's sandbox origin rules or verify pixels. Review scenes 2 and
   5 after r273, then check that each frame has an accessible name, no control
   is interactive, and descriptions and captions remain outside the frame.
   Keep keyboard and screen-reader checks open until review.
4. **After review, convert the 88 current editor figures** to scene references,
   preserving useful existing captions and descriptions. Do not render an editor
   lookalike for the game's mod list. Leave the five additional game-only and
   two unlinked editor slots dormant.
5. **Teach G8 the difference during that migration.** Validate every scene ID
   against the catalogue, require descriptions/captions, reject unknown or
   unused active scenes, and count only real missing PNG captures as pending.
   With the game figure removed, the expected end state is **88 rendered editor
   scenes and zero current capture slots**. The five dormant game names must not
   inflate the live count.
6. **Verify and record.** Run `npm run gen:manual` after updating its page and
   renderer steps, then run G8, G17 and G18; run `npm run typecheck`,
   `npm run build`, the full test suite if the coverage test under `src/` changes,
   and `git diff --check`. Inspect the manual at normal and narrow widths, with a
   keyboard and screen reader, and check that every visual claim matches the
   actual editor. Since this is a documentation renderer, do not bump
   `EDITOR_BUILD` unless product editor code changes.

## Acceptance criteria

- After the review gate, the 88 current editor figures render from one shared
  local renderer and scene catalogue. There are no 88 separate hand-maintained
  HTML files or image assets.
- Every scene is fixed and non-interactive, uses current editor labels and
  defaults, and is visually checked against the editor. Dynamic states are
  identified as illustrations, not working controls.
- Manual search finds each scene's description and caption. Screen readers get
  a descriptive frame name and equivalent text outside the frame.
- Opening the manual directly from disk with no network renders the scenes and
  keeps search working.
- G8 reports generated scenes separately from actual PNG captures, rejects
  unknown IDs, and does not count rendered figures as missing PNGs. At this
  prototype checkpoint, before any migration, it still reports **88 missing
  editor-image references**.
- The game-only tutorial figure is removed by Zeis's decision and is never
  represented as an editor screenshot. The five other game-only names and two
  unlinked editor-panel names remain dormant.
- No editor figure is replaced before Zeis approves the five-scene prototype.
  No editor behavior or product copy changes are included.

## Self-review

The central risk is visual drift: the actual node and inspector renderers depend
on store and React Flow state, and some forms have special editors. That is why
the plan requires a five-scene proof before moving any of the 88 references. The
iframe is a recommendation, not an untested guarantee: its local-file behavior,
search treatment, frame naming and loading cost are explicit prototype gates.

The other significant finding changes the apparent scope. Not every pending
figure is an editor screenshot: the tutorial's installation image showed the
game's mod list. Zeis chose no game screenshot, so that figure is removed and
its useful prose remains. The five unlinked game images and two editor panels
stay dormant. r272 corrected the renderer's undefined `process.env.NODE_ENV`
reference and Firefox's sandbox-origin block on local files; Zeis confirmed that
the page now opens in Firefox from disk. r273 addresses the layout issues in
scenes 2 and 5. Visual re-review and assistive-technology checks remain open; do
not bulk-convert editor figures until Zeis approves the revised prototype.
