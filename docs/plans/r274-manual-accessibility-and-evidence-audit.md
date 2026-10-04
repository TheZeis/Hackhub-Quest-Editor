# r274 — Manual figure accessibility contract and evidence audit

**Status:** Structural checks are in place. Zeis checked the prototype from a
local file in Firefox: Tab stayed in Firefox and never entered a scene, so the
keyboard check passes. Zeis has no screen reader installed; that check remains
untested and lower priority. None of the 88 current editor figure references
has been converted.

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
| Figures | `public/manual/` has 88 missing editor-image references; `public/manual-figure-prototype.html` has five scenes; `docs/plans/r271-code-rendered-manual-illustrations.md` records the no-game-image decision | The prototype is approved visually. Zeis checked it from disk in Firefox: Tab stayed in browser chrome and did not enter any scene. Record the keyboard check as passed for this prototype; do not infer a screen-reader result. Zeis has no screen reader and ranks that check below reading clarity, number guidance and color-independent cues. The other 88 slots remain unchanged. The five unlinked game-image names and two unlinked editor-panel names remain dormant. |
| Dyslexia, dyscalculia and color vision | `src/manual.coverage.test.ts` G6/G18; `public/manual/manual.css`; `src/schema/edges.ts`; `public/manual/concepts.html` wire legend; generated node-reference pages | The manual already enforces banned jargon/fillers and a zero budget for sentences over 20 words. The audit must also check number ranges/units, information conveyed only by color, and contrast/readability in light of the editor's matching palette. No new claim should be made until those checks are complete. |
| App entry and UI walkthrough | `public/manual.html`, `vite.config.ts`, `src/App.tsx`, and the editor shell components | The manual entry route serves and redirects in Vite. No app component currently links into a handbook anchor. Do not add an in-app link as part of this documentation-only work. |

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
- Zeis tested the local-file prototype in Firefox. He reports that Tab cycles
  Firefox controls and never enters the page scenes; selecting text can move the
  selection, but no illustration control receives keyboard focus. Record this
  keyboard check as passed for the prototype, based on his report.
- Zeis has no screen reader installed. No screen-reader result is available, and
  none is claimed. He ranks that check below reading clarity, number guidance,
  and color-independent cues; do not ask him to install a tool solely for this.
- The editor preview is serving on port 5173. This workspace itself has no
  browser binary or browser automation package, so we cannot independently
  verify pixels or assistive-technology output.

## Next steps

1. Audit the manual for dyslexia-friendly reading, clear number ranges and
   units, and information that might rely on color alone. The existing short-
   sentence and jargon gates help but do not cover all of these.
2. Finish the Phase 1 cited inventory and G7/G9 coverage gates for messages,
   UI strings, templates, export files and permissions before changing their
   reader-facing sections.
3. Keep the screen-reader check explicitly unverified and lower priority. Do
   not claim compatibility; revisit it if a suitable review tool becomes
   available.
4. After the higher-priority accessibility and inventory work, extend G8 for
   scene IDs, descriptions, captions and search, then convert the 88 current
   editor figure slots. Keep the seven dormant names out of the active total.
5. Keep the existing TOC and source format unless the evidence audit gives a
   concrete reason to propose a change; if either changes, request approval
   before authoring under the new design.
