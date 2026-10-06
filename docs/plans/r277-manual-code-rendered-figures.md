# r277 — All live manual figures use the shared code renderer

**Status: implemented on 2026-10-06.** The approved 88 live editor-figure
references now point to fixed, read-only scenes in the shared local renderer.
This is a component-rendered manual, not a set of raster screenshots or
hand-drawn mockups. The removed game-only tutorial figure stays removed; the
written installation instructions remain. Five unlinked game-only names and
two unlinked editor-panel names remain dormant and are not in the active count.

## Scope delivered

| Figure group | Active references |
|---|---:|
| Node reference panels | 41 |
| How-to scenes | 17 |
| Tutorial editor figures | 13 |
| Feature guides | 12 |
| Troubleshooting figures | 3 |
| Screen-tour figures | 2 |
| **Total** | **88** |

One shared scene catalogue and renderer supply the illustrations. Scene state is
seeded from the current editor components, registry-supported node data,
checked-in examples, and fixed fixtures. Dynamic moments are represented as
still illustrations. The scenes do not accept author input or claim to depict
the game. The how-to tool-match fixture shows the checked-in Recon-NG addon and
its supported services alongside a fixed network target; its selected network,
child device, and SSH port details are expanded in the rendered state.

The renderer and generated assets are local. Existing handbook operation remains
static and offline-capable. Figures keep their parent-page description/caption,
descriptive iframe title, `aria-describedby`, `tabindex="-1"`, lazy loading,
safe sandbox policy, inert renderer document, and a useful failure fallback.
The earlier Firefox-from-disk check for the five-scene prototype still records
that Tab skips those prototype frames. This migration has **not** been given a
pixel-level review in a real browser. Screen-reader output has not been tested
and is explicitly unverified.

## Regeneration and coverage

- `scripts/build-node-pages.mjs` writes the correct relative URL and scene ID
  for every generated node page.
- `scripts/manual-figures/handbook.mjs` converts the approved active references
  without reintroducing the removed game-only image; the renderer generator also
  refreshes the static figure stylesheet.
- The manual index includes every live figure's page, description and scene ID,
  including pages without a matching heading.
- G8 checks the active group totals, unknown and unused active IDs, descriptions
  and captions, renderer markup and local paths, accessibility/fallback
  attributes, search-index coverage, and missing raster captures as a separate
  count. Its latest output is **88 code-rendered figures; 0 distinct missing
  raster captures**.

## Verification

- `npm run gen:manual` completed: 88 active scenes smoke-tested across 51 HTML
  pages, 41 node pages regenerated, 407 search entries, and 0 unmatched evidence
  labels.
- `npm run typecheck` passed.
- `npx vitest run src/manual.coverage.test.ts` passed all 30 targeted tests.
- `npm test` passed the full suite: 1,848 tests across 90 files.
- `npm run build` passed. Vite printed its existing large-app-chunk warning.
- The offline renderer smoke ran every active scene under JSDOM and asserted key
  fixture content, including the expanded SSH port version. This checks DOM
  rendering and scene startup, not pixel-level visual appearance.

No product component, UI behavior, author-facing copy, or editor build stamp
changed. `EDITOR_BUILD` remains `2026-10-03.r267`. `npm install` reported one
high-severity audit finding; it was not automatically fixed as part of this
documentation/renderer work.
