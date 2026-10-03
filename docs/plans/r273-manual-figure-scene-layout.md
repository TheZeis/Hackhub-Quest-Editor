# r273 — Manual figure scene layout review

**Status: the scene layout and cursor corrections are implemented; awaiting
visual re-review.** The full r271 figure migration remains gated on Zeis's approval.

## Review feedback and scope

Zeis confirmed that opening the latest prototype directly from disk now renders
all five scenes in Firefox. No editor process needs to run. He approved the
overall scenes except for two layout issues shown in his screenshots:

- **Scene 2, wired how-to canvas:** the canvas toolbar and zoom controls are
  unrelated to the connection explanation, and the fixed-width frame clips the
  Objective node at the page width he reviewed.
- **Scene 5, mid-drag state:** its fixed-width frame clips the nodes, and the
  loose wire endpoint sits too close to the Objective socket, suggesting a
  completed connection instead of a drag in progress. After the layout revision,
  Zeis noted that the cursor faced right and appeared behind the endpoint; the
  cursor should face left and sit visibly in front of the loose end.

Only these two scenes are in scope. No figure is being migrated into the manual,
no game image is added, and no product UI or copy is changed.

## Changes

- Scene 2's toolbar, React Flow zoom controls and minimap are hidden in the
  figure-only stylesheet. Its iframe now fills the available width (up to 960
  px), spans the wide card, and lets the real canvas `fitView` center both nodes.
- Scene 5's iframe now fills the available width (up to 900 px) in a wide card.
  React Flow fits the nodes to the current frame, and the decorative wire now
  lives in `ViewportPortal`, so its curve follows the same pan/zoom transform as
  the node cards. Its open end sits in the gap before the Objective socket; the
  cursor now points left at that end and is painted in the foreground.
- The offline-renderer smoke checks responsive frame widths, hides the unwanted
  controls in scene 2, and asserts scene 5's cursor faces left, touches the loose
  endpoint, paints above it, and shares the fitted viewport.

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
  Firefox's direct-file load was confirmed by Zeis before these layout changes;
  he should inspect the updated scenes in the live preview and directly from
  disk before the prototype is considered approved.

## Next

1. Ask Zeis for a quick re-review of scene 5's cursor in the live preview and
   from disk: confirm it faces the loose wire end and reads clearly in front of
   the connection point. The positive scene 2 and overall layout review stands.
2. Keep all 88 existing editor figures unchanged until the revised prototype is
   approved.
3. Preserve the scope decisions: no game screenshot, the five unlinked
   game-only names and two unlinked editor-panel names remain dormant, and G18
   stays at zero.
