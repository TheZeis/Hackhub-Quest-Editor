# r273 — Manual figure scene layout review

**Status: Zeis approved the five-scene prototype on 2026-10-04.** At his
suggestion, scene 5's white horizontal arrow is now a regular mouse cursor. The
planned 88-figure migration has not started.

## Review feedback and scope

Zeis's r272 check confirmed that the prototype opens directly from disk and
renders all five scenes in Firefox without the editor running. In his first
visual review, he praised the other three scenes and requested two focused fixes:

- **Scene 2, wired how-to canvas:** the canvas toolbar and zoom controls are
  unrelated to the connection explanation, and the fixed-width frame clips the
  Objective node at the page width he reviewed.
- **Scene 5, mid-drag state:** its fixed-width frame clips the nodes, and the
  loose wire endpoint sits too close to the Objective socket, suggesting a
  completed connection instead of a drag in progress. After the layout revision,
  Zeis noted that the cursor faced right and appeared behind the endpoint. That
  was corrected to face left and paint in front. He approved the prototype on
  2026-10-04, then suggested a regular mouse-cursor shape instead of a white
  horizontal arrow; the cursor silhouette now follows that suggestion.

Only these two scenes are in scope. No figure was migrated into the manual in
this polish round, no game image was added, and no product UI or copy changed.

## Changes

- Scene 2's toolbar, React Flow zoom controls and minimap are hidden in the
  figure-only stylesheet. Its iframe now fills the available width (up to 960
  px), spans the wide card, and lets the real canvas `fitView` center both nodes.
- Scene 5's iframe now fills the available width (up to 900 px) in a wide card.
  React Flow fits the nodes to the current frame, and the decorative wire now
  lives in `ViewportPortal`, so its curve follows the same pan/zoom transform as
  the node cards. Its open end sits in the gap before the Objective socket. A
  regular mouse cursor points up-left at the loose end, with its tip overlapping
  the connection point; it is painted in front.
- The offline-renderer smoke checks responsive frame widths, hides the unwanted
  controls in scene 2, and asserts scene 5's cursor points toward the endpoint,
  has the taller-than-wide silhouette of a mouse cursor, overlaps the endpoint,
  paints above it, and shares the fitted viewport.

## Verification

- `npm run gen:manual-figures`: passed; both protocol sandbox checks and all five
  `file://` scene boot smokes passed, including the new scene-specific assertions.
- `npm run build`: passed; the existing nonfatal warning about the main app
  chunk exceeding 1 MB remains.
- `npm test -- src/manual.coverage.test.ts`: **27/27 passed**; G8 remains at 88
  missing editor-image references and G18 remains **0**.
- Source uses the existing editor components. No `src/**` product code or copy
  changed, and `EDITOR_BUILD` remains `2026-10-03.r267`.
- JSDOM verifies startup, CSS visibility and layout rules, not visual pixels.
  Zeis confirmed Firefox's direct-file load and approved the visual prototype on
  2026-10-04. The subsequent mouse-cursor shape change follows his optional
  suggestion; automated checks validate its SVG geometry, not rendered pixels.

## Next

1. Zeis's visual approval is recorded; this round does not need another review
   request. The live preview reflects the optional mouse-cursor shape change.
2. Keep the 88 figure references unchanged in this polish round. Resume the
   separate r271 migration phase with its remaining accessibility checks and
   scene-ID/search coverage work.
3. Preserve the scope decisions: no game screenshot, the five unlinked
   game-only names and two unlinked editor-panel names remain dormant, and G18
   stays at zero.
