# r272 — Direct-from-disk renderer boot failure

**Status: both boot blockers have fixes; waiting for Zeis to retry the local
prototype.** Bulk conversion of the 88 current editor figures remains gated on
that review.

## Report and scope

After r271 was pushed, Zeis opened `public/manual-figure-prototype.html` from a
downloaded repository. Every frame stayed on the static message “This editor
illustration could not load.” A later Firefox console log was added to
`manual-console-error-msgs.md` on the `QA-filedump` branch. The log was decisive:
Firefox assigned the sandboxed frame a `moz-nullprincipal` origin and refused
the local `renderer.js` and `renderer.css` files.

The report calls for a working local-file prototype before review. It does not
authorize migrating figures, changing product behavior or changing product
copy. The game-only tutorial image stays removed, its useful prose stays, the
five unlinked game-only names and two unlinked editor-panel names stay dormant,
and no screenshot is introduced.

## Diagnosis

There were two independent startup blockers, both of which leave the same static
fallback visible:

1. The generated IIFE retained `process.env.NODE_ENV` checks from React. The
   standalone Vite library build had not replaced them; browsers have no Node
   `process` global, so the script threw before a scene rendered. This was
   reproduced by loading `renderer.html` and its local bundle from a `file://`
   URL in JSDOM.
2. After that bundle fix, Firefox's console showed that the iframe's
   `sandbox="allow-scripts"` gave the file document an opaque
   `moz-nullprincipal` origin. Firefox then blocked the renderer's sibling JS
   and CSS assets. The earlier JSDOM smoke did not expose this because JSDOM
   does not enforce browser iframe sandbox origins.

## Fix

`vite.manual-figures.config.ts` defines `process.env.NODE_ENV` as `"production"`
for this fixed, standalone renderer build. React's environment checks are folded
into the browser bundle instead of looking for a Node global. Regenerating the
asset reduces `renderer.js` from roughly 1.63 MB to 1.23 MB (375.61 KB gzip);
the stylesheet remains 95.57 KB.

The prototype page now delays assigning each iframe's `src` until its inline
bootstrap has set the sandbox policy. A page opened from `file://` gets
`allow-scripts allow-same-origin`, so Firefox can load the local sibling assets;
a page served over HTTP keeps the stricter `allow-scripts` sandbox. This
same-origin permission is limited to the trusted, static local prototype. The
frame remains inert, uses the no-op storage shim, and does not mount `App` or
autosave. This is a deliberate relaxation of the frame-origin boundary only
for offline review; it is not a sandbox for untrusted content.

The `gen:manual-figures` command runs
`scripts/manual-figures/smoke-offline-renderer.mjs`. The smoke verifies that the
prototype bootstraps all five frame URLs locally and selects the expected
sandbox policy for both `file://` and HTTP, then loads the real renderer HTML,
stylesheet and script over `file://` for every scene. It rejects unresolved
`process.env.NODE_ENV` references and runtime/fallback errors. JSDOM has no
browser layout engine or `ResizeObserver`, so the scene boot smoke provides a
minimal `ResizeObserver` stub. It verifies the URL/bootstrap policy and local
asset path, not Firefox security enforcement or rendered pixels.

## Verification

- `npm run gen:manual`: passed; 41 node pages written, zero awaiting prose,
  renderer regenerated, both protocol-policy checks passed, all five local-file
  scene smokes passed, and the search index remains 285 entries from 51 pages.
- `npm test -- src/manual.coverage.test.ts`: **27/27 passed**; G8 still reports
  88 missing editor-image references, G17 still covers all 17 how-tos, and G18
  remains **0**.
- `npm run build`: passed; the existing nonfatal warning for the main app chunk
  above 1 MB remains.
- `git diff --check` and `node --check
  scripts/manual-figures/smoke-offline-renderer.mjs`: passed.
- The Firefox console log confirms the sandbox-origin failure; its resolution is
  now addressed in the parent page. No Firefox or other real browser is
  installed here, so Zeis must retry the latest local file. Visual fidelity,
  keyboard and screen-reader checks also remain unperformed.
- No `src/**` product code or copy changed. `EDITOR_BUILD` remains
  `2026-10-03.r267`; no editor figure was replaced and no game screenshot was
  captured.

## Next

1. Ask Zeis to reopen the latest `public/manual-figure-prototype.html` from disk
   in Firefox. Confirm that all five frames render without a running editor or
   network connection; capture any new console errors if they do not.
2. Review the scenes visually in the live preview and locally. Keep the
   88-figure migration stopped until that review is accepted.
3. Keep G18 at zero and leave the five other game-only names and two unlinked
   editor-panel names dormant.
