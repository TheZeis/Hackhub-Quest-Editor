# r272 — Direct-from-disk renderer boot failure

**Status: fixed; the five-scene prototype is ready for user review.** Bulk
conversion of the 88 current editor figures remains gated on that review.

## Report and scope

After r271 was pushed, Zeis opened `public/manual-figure-prototype.html` from a
downloaded repository. Every frame stayed on the static message “This editor
illustration could not load.” The live preview was also unavailable to him.

The report called for a working local-file prototype before review. It did not
authorize migrating figures, changing product behavior or changing product
copy. The game-only tutorial image stays removed, its useful prose stays, the
five unlinked game-only names and two unlinked editor-panel names stay dormant,
and no screenshot is introduced.

## Diagnosis

The renderer's generated IIFE contained unprocessed `process.env.NODE_ENV`
checks from its React dependencies. The standalone Vite library build did not
replace that expression. Browser pages do not provide Node's `process` global,
so the renderer script raised `ReferenceError: process is not defined` before it
could replace the static fallback with any of the five scenes.

This was reproduced by loading `renderer.html` and its local bundle from a
`file://` URL in JSDOM. The iframe sandbox was a possible lead, but it was not
the failure observed in the bundle; the sandbox configuration was left intact.
The new smoke check also exercises all five scene IDs over local file URLs.

## Fix

`vite.manual-figures.config.ts` now defines `process.env.NODE_ENV` as
`"production"` for this fixed, standalone renderer build. React's environment
checks are therefore folded into the browser bundle instead of looking for a
Node global. Regenerating the asset reduces `renderer.js` from roughly 1.63 MB
to 1.23 MB (375.61 KB gzip); the stylesheet remains 95.57 KB.

Added `scripts/manual-figures/smoke-offline-renderer.mjs` to the
`gen:manual-figures` command. It loads the real renderer document, stylesheet
and script over `file://` for each scene, rejects unresolved `process.env.NODE_ENV`
references and runtime/fallback errors, and confirms all five scenes mount.
JSDOM has no browser layout engine or `ResizeObserver`, so this boot smoke
provides a minimal `ResizeObserver` stub. It verifies local asset loading and
scene startup, not rendered pixels or real-browser iframe policy.

## Verification

- `npm run gen:manual`: passed; 41 node pages written, zero awaiting prose,
  renderer regenerated, all five local-file scene smokes passed, and the search
  index remains 285 entries from 51 pages.
- `npm test -- src/manual.coverage.test.ts`: **27/27 passed**; G8 still reports
  88 missing editor-image references, G17 still covers all 17 how-tos, and G18
  remains **0**.
- `npm run build`: passed; the existing nonfatal warning for the main app chunk
  above 1 MB remains.
- `git diff --check` and `node --check
  scripts/manual-figures/smoke-offline-renderer.mjs`: passed.
- No real browser is installed in this workspace. Visual fidelity, keyboard and
  screen-reader checks remain unperformed; Zeis should review the live preview
  and the updated local-file page before any bulk conversion.
- No `src/**` product code or copy changed. `EDITOR_BUILD` remains
  `2026-10-03.r267`; no editor figure was replaced and no game screenshot was
  captured.

## Next

1. Ask Zeis to review all five scenes, including reopening the prototype from
   disk using the latest branch files. Check visual fidelity and note any scene
   corrections.
2. Keep the 88-figure migration stopped until that review is accepted.
3. Keep G18 at zero and leave the five other game-only names and two unlinked
   editor-panel names dormant.
