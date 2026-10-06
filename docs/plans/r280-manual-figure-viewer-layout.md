# r280 — Fit and center larger manual illustrations

**Status: implemented on 2026-10-07.** Zeis reviewed the r279 viewer and shared a
browser screenshot: at its initial 100% size, the scene looked off-center,
clipped at the edges, and smaller than the available dialog area.

## Changes

- The viewer now opens with the scene fitted to the usable width and height,
  rather than always starting at native size. Fit can enlarge a scene when the
  window has spare room, while a small safety inset and downward scale rounding
  keep the frame inside the scroll viewport.
- The viewport centers the scene horizontally and vertically when it fits. If
  the scene is larger than the viewport, it starts at the top-left scroll origin
  so all edges remain reachable rather than centering off-screen.
- The dialog now uses more of the browser window. The **100%** control still
  switches to the scene's native design size, while the default fit and the Fit
  button maximize the visible area.
- The smoke test gives the viewer a known viewport, verifies the fitted frame
  stays within its bounds, checks both-axis centering rules, and exercises zoom
  in/out, Fit and actual-size controls on both HTTP and `file://` pages.

## Verification

- `npm run gen:manual`: passed; all 88 scenes smoke-rendered, both viewer
  scenarios passed, 88 references across 51 pages remain intact, and generation
  is idempotent (0 HTML pages required changes).
- `src/manual.coverage.test.ts`: 30 tests passed; 88 rendered figures and 0
  missing raster captures.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite emitted its existing large-chunk warning.
- `npm audit`: 0 vulnerabilities.
- `git diff --check`: passed.

The new fit and centering behavior is covered by JSDOM and explicit viewport
geometry assertions, but no independent real-browser pixel comparison has yet
been made. The handbook preview is available for manual review. The previous
full suite remains green (1,848 tests across 90 files); this follow-up changes
only the static handbook viewer, its CSS and its smoke test. No editor build
stamp changed; `EDITOR_BUILD` remains `2026-10-03.r267`.
