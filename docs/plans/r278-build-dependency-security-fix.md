# r278 — Update the flagged build dependency

**Status: fixed on 2026-10-06.** `npm audit` identified a high-severity issue
in the development-only transitive package `source-map-js@1.2.1`: a specially
crafted indexed source map could make a process reading it stop responding.
The package is used through the build tooling; it is not a direct application
feature.

`npm audit fix` updated the lockfile entry to `source-map-js@1.2.2`. No direct
dependency declaration or editor code changed. The full verification passed:

- `npm audit`: **0 vulnerabilities**.
- `npm run typecheck`: passed.
- `npm test`: **1,848 tests across 90 files passed**.
- `npm run build`: passed; Vite printed its existing large-app-chunk warning.

No product behavior, author-facing copy, or editor build stamp changed.
`EDITOR_BUILD` remains `2026-10-03.r267`.
