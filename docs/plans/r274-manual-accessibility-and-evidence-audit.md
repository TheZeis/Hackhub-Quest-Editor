# r274 — Manual figure accessibility contract and evidence audit

**Status:** Structural checks for the five-scene prototype are in place. Zeis
confirmed from disk in Firefox that pressing Tab never focuses the page or any
illustration; this closes the keyboard check. Screen-reader output was not
checked. Zeis does not have a screen reader and has set that check below the
manual's plain-language, number-clarity and colour-accessibility priorities. It
is recorded as unverified, not as a migration blocker. None of the 88 current
editor figure references has been converted.

This is a gap report, not the complete cited Phase 1 inventory. No reader-facing
handbook prose was authored; the 88 published figure references are unchanged.

## What changed

The prototype keeps each caption in its original visual position, but now uses
`<figure>` and `<figcaption>`. Every iframe has a descriptive `title`, points
`aria-describedby` at that caption, and uses `tabindex="-1"`. The shared
renderer document still has an inert body, so its displayed editor controls do
not act as controls. The external frame remains sandboxed and lazy-loaded.

The offline smoke now checks those markup relationships, unique non-empty frame
names, the tab-index rule, the inert renderer body, both sandbox policies, and
all five local scene starts. It does not claim to emulate keyboard focus or a
screen reader.

No editor behavior or product copy changed. `EDITOR_BUILD` remains
`2026-10-03.r267`.

## Evidence snapshot

The existing node inventory is generated from the live registry. Its current
counts are **41 obtainable node types**, **164 editable fields**, **80 fixed
sockets**, **99 game events** in **10 groups**, and **10 node categories**. The
41 node pages exist, the node voice file has entries for every obtainable node,
and the coverage suite checks node pages, field anchors, stale node/field
anchors, event names, links, language and the current build stamp.

Sources: `src/schema/registry.ts`, `src/schema/nodes.ts`,
`src/schema/events.ts`, `reference/hackhub-events.json`,
`scripts/extract-manual-inventory.mjs`, `docs/manual/inventory.json`,
`docs/manual/node-voice.json`, and `src/manual.coverage.test.ts` (G1–G3,
G5–G6, G10, G13–G18).

The deployed handbook remains a multi-page static site. `public/manual.html`
redirects to `public/manual/index.html`; the manual pages use local CSS,
JavaScript and a generated search index. The approved figure direction is still
one local, read-only renderer, no game screenshot, and no `App` or autosave in
the renderer.

## Evidence gaps found before any new reader-facing copy

| Area | Evidence | Gap to close |
|---|---|---|
| Validation and export messages | `src/analysis/graph.ts#analyseGraph`, `src/analysis/fields.ts#fieldWarnings`, `src/compiler/compile.ts#computeWarningDetails`, and `src/compiler/targetWarnings.ts#warnTargetMatching` | The test header explicitly says G7 message-index coverage is not implemented. `checking.html` says it contains every diagnostic, but does not have entries for several source branches, including the unanswered `Ask player` warning, terminal-command-as-app and impossible-date field warnings, the handbook and Wi-Fi export notes, and target-matching warnings. G11 verifies ten curated panel messages only; its comment accepts that it will not find a new inline message. Extract every source message family, then fix the page and make the gate fail on drift. |
| UI labels and controls | `src/manual.coverage.test.ts` header (G9), `src/editor/shell/TopBar.tsx`, `src/editor/palette/NodePalette.tsx`, editor dialogs and inspector components | The suite has no G9 check that quoted `<b class="ui">` labels still exist in the product. The complete control list has not yet been extracted into an inventory. |
| Templates | `src/templates/index.ts#TEMPLATES`, `public/manual/guides.html#templates`, and `public/manual/tutorial.html#new-project` | The editor exposes 14 template cards. The manual gives the count and explains First Contact plus the two Reference sheets, but has no source-linked inventory of all 14 cards or drift gate. Confirm whether each card needs its own reader-facing description before changing the page. |
| Export permissions and files | `src/compiler/compile.ts#computePermissions` and `compileProject`, `src/editor/shell/ExportDialog.tsx`, `public/manual/export.html#permissions`, and `public/manual/export.html#zip-contents` | The manual lists seven permissions and eight files. No gate compares either table with the compiler output, so their completeness is not machine-checked. |
| Figures | `public/manual/` has 88 missing editor-image references; `public/manual-figure-prototype.html` has five scenes; `docs/plans/r271-code-rendered-manual-illustrations.md` records the no-game-image decision | The five-scene prototype is approved visually, and Zeis's Firefox-from-disk check confirms Tab does not enter the page or focus a frame. Screen-reader output remains unverified, but is not a blocker under the user's stated priorities; keep the external title and caption. The other 88 slots remain unchanged. The five unlinked game-image names and two unlinked editor-panel names remain dormant. |
| App entry and UI walkthrough | `public/manual.html`, `vite.config.ts`, `src/App.tsx`, and the editor shell components | The manual entry route serves and redirects in Vite. No app component currently links into a handbook anchor. Do not add an in-app link as part of this documentation-only work. |

## Accessibility priorities and additional evidence

Zeis's priority for this manual is clear reading, clear numbers and units, and
colour cues that do not depend on hue alone. The existing handbook gate G18
holds authored sentences to twenty words and currently reports **0** violations.
The wire legend spells out Then, When, Unlocks and Data; Unlocks uses a dashed
line and Data a dotted line. Warning levels are also written as Amber or Red.
These are useful safeguards, not a substitute for reviewing each recipe and
figure alternative.

A simple contrast calculation from `public/manual/manual.css` found that
`--ink-4` reaches about **3.02:1** on `--void` and **2.79:1** on `--surface`.
That token colours small, secondary node identifiers in the 41 node-page
headers and in `nodes.html`. The brighter `--ink-3` token measures **5.32:1**
and **4.92:1** on those backgrounds. The palette mirrors the app; the manual
could use the existing brighter token for those small labels without inventing
a new colour. No CSS change is included in this checkpoint; verify the manual
appearance before adjusting it.

The counts above describe what is in the current source and manual. They do not
prove that the prose is complete or that a reader can use a figure with a screen
reader.

## Existing structure and approvals preserved

The current information architecture is the ten-page handbook already listed
in `docs/plans/r164-manual-structure-proposal.md`: start page, first-quest
tutorial, concepts, node reference, feature guides, how-to recipes, checking,
export/install, troubleshooting, and appendices. The source format already
separates generated node facts in `docs/manual/inventory.json` from human prose
in `docs/manual/node-voice.json`, with static HTML pages under `public/manual/`.
This checkpoint proposes no new top-level page and no delivery-mechanism change.

## Verification

- `npm run gen:manual` completed: 41 node pages written, zero awaiting prose;
  the local figure bundle built; all five existing file-URL scene smokes passed;
  search index remains 285 entries from 51 pages.
- `npm run gen:manual-figures` passed again after the accessibility markup
  changes: file and HTTP sandbox checks, parent-page caption checks, inert-body
  checks and all five local scene starts.
- The full `npm test` suite passed before the markup change: 89 files and 1,834
  tests. It emitted existing React `act(...)` and style warnings.
- `npx vitest run src/manual.coverage.test.ts`: **27/27 passed** after the
  markup change; G8 still reports 88 missing editor-image references.
- `npm run typecheck` and `npm run build`: passed. The production build copies
  `manual.html`, `manual/index.html`, the prototype and local figure renderer.
  Vite emits the existing nonfatal warning that the main app chunk is larger
  than 1 MB.
- `git diff --check` and `node --check
  scripts/manual-figures/smoke-offline-renderer.mjs`: passed.
- The live preview serves on port 5173. Zeis opened the prototype from disk in
  Firefox and reported that Tab cycled through Firefox controls without
  focusing the page or any scene. This is the expected result. Screen-reader
  output remains unverified; Zeis does not have a screen reader and has said it
  is lower priority than plain-language, number-clarity and colour-accessibility
  work. Keep the external title and caption, and do not claim assistive-technology
  testing.

## Next steps

1. Finish the Phase 1 evidence inventory and G7/G9 coverage gates for messages,
   UI strings, templates, export files and permissions before updating those
   reader-facing sections.
2. Once Phase 1 is complete, present the full information architecture and
   table of contents for approval. Agree on the source format before any Phase
   3/4 tooling or authoring; do not proceed without approval.
3. Review reading accessibility: use short, ordered instructions, explain each
   number with its unit, and ensure wire, category and severity meaning never
   depends on colour alone. Audit the low-contrast `ink-4` labels before
   changing manual CSS.
4. Extend G8 for scene IDs, descriptions, captions and search, then convert the
   88 current editor figure slots. Keep the seven dormant names out of the
   active total. The user-confirmed keyboard pass closes that part of the gate;
   screen-reader output remains explicitly unverified and is not a blocker.
