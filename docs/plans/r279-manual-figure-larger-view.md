# r279 — Larger view for wide manual illustrations

**Status: implemented on 2026-10-07.** Zeis approved a larger-view gallery for
full-workspace manual illustrations that are too small to read inline. Both the
illustration itself and a separate visible button must open it; the expanded
scene stays a fixed illustration rather than becoming an interactive editor.

## Implementation

- The 11 workspace scenes at least 1,280 px wide are marked as expandable by
  `scripts/manual-figures/markup.mjs`. The page image is a click/tap target and
  an explicitly labeled **View larger** button is provided separately for
  keyboard and assistive-technology access.
- `public/manual/manual.js` builds a native modal dialog with page-local
  previous/next navigation, zoom, fit, a renderer-failure message, Escape/Close,
  and focus return. The viewer uses the scene's natural dimensions and removes
  its temporary frame when changing scenes or closing.
- The larger iframe copies its source scene's sandbox policy and keeps
  `tabindex="-1"`. It does not add editor interactivity. Descriptive parent-page
  captions remain present, and the larger frame references them in its
  accessible description. If the browser lacks modal-dialog support, the
  expansion controls remain hidden and the inline illustration and caption
  continue to work.
- `scripts/manual-figures/handbook.mjs` now re-renders existing active figure
  markup from its saved scene ID, description and caption. This ensures manual
  regeneration adds changed controls to already-rendered pages instead of only
  updating newly converted raster references.
- G8 asserts that only eligible wide workspace scenes receive both opener
  controls. The JSDOM viewer smoke covers click and button openers, local gallery
  navigation, natural dimensions, zoom controls, failure fallback, Escape,
  focus return, and sandbox/tabindex behavior for HTTP and `file://` pages.

The eligible scenes are `tour-workspace`, `tour-empty-canvas`,
`tutorial-02-first-contact`, `tutorial-04-inspector-tabs`,
`guide-inspector-drawer`, `guide-websites`, `guide-websites-page`,
`guide-settings`, `howto-07-website`, `howto-08-hidden-page`, and
`howto-12-tool-match`.

## Verification

- `npm run gen:manual`: passed; 88 code-rendered figures across 51 HTML pages,
  11 existing scenes refreshed with the larger-view controls, 41 node pages
  regenerated, 407 search entries, and 0 unmatched evidence labels.
- Offline renderer smoke: all 88 scenes rendered; viewer behavior passed on
  both HTTP and `file://` documents.
- G8: 30 targeted tests passed; 88 rendered figures and 0 missing raster
  captures.
- `npm run typecheck`: passed.
- `npm test`: 1,848 tests across 90 files passed.
- `npm run build`: passed. Vite printed its existing large-app-chunk warning;
  the suite also emitted existing React `act(...)` and style warnings.
- `npm audit`: 0 vulnerabilities.

JSDOM is not a pixel-level browser review. The gallery's actual browser layout,
keyboard focus trap and screen-reader output remain unverified and are tracked
for follow-up in the README. No editor build stamp changed; `EDITOR_BUILD`
remains `2026-10-03.r267`.
