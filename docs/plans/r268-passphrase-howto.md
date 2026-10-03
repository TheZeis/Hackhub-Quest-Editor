# r268 — the first remaining how-to: passphrase and wrong-answer route

## Scope

Continue the manual backlog from [r267](r267-manual-sentence-ratchet.md), using the order in [r265](r265-manual-sentence-ratchet.md). The next unwritten walkthrough is **Ask the player for a passphrase, with a wrong-answer route**. Documentation only: no `src/**` product-copy or behavior changes are authorized for this round.

The manual workflow requires ground-truth extraction before prose. That extraction is complete before editing `how-do-i.html`.

## Ground truth

| Claim needed for the walkthrough | Evidence |
|---|---|
| **Ask player** is an Effects node for one line of text. It has `Title`, `Question`, optional example/default text, `Mask typing`, optional `Save answer as`, and `Accept` fields. | `src/schema/registry.ts:1165-1198`; `src/schema/nodes.ts:514-527` |
| `Mask typing` is off by default and passes the password flag to the prompt UI when enabled. | `src/schema/nodes.ts:517-527`; `src/compiler/runtimeSource.ts:2260-2271`; `src/compiler/__tests__/compile.test.ts:1894-1943` |
| `Accept` offers Any submitted text, Exactly this answer, Contains these words, or Matches a pattern. Checked modes show `Answer to accept` and `Case sensitive`; the latter defaults off. | `src/schema/registry.ts:1185-1198`; `src/schema/nodes.ts:517-527` |
| Any mode shows Submitted and Cancelled. A checked mode shows Correct, Wrong and Cancelled. | `src/schema/registry.ts:282-285, 1700-1703`; `src/compiler/runtimeSource.ts:2281-2286` |
| Closing the question follows Cancelled, not Wrong. A submitted empty string is still a submitted answer. | `src/compiler/runtimeSource.ts:2272-2286`; `src/compiler/__tests__/compile.test.ts:1945-1999` |
| Exact matching checks the typed answer against the accepted text; matching ignores letter case unless `Case sensitive` is on. A blank accepted answer cannot match and produces an author warning. | `src/compiler/runtimeSource.ts:212-224`; `src/compiler/compile.ts:483-490`; `src/compiler/__tests__/compile.test.ts:2001-2026` |
| Dry run does not open a real question box. It uses the node's default answer or the placeholder `simulated answer`. | `src/compiler/simulate.ts:212-220` |
| The passphrase shot is already declared. | `docs/plans/r164-manual-screenshots.md:202` |

The existing `public/manual/nodes/fx-prompt.html` provides the non-coder vocabulary and explains when to choose **Ask player** instead of **Manual input**. The latter expects a terminal command first, so this walkthrough uses **Ask player**.

## Planned edits

1. Turn the passphrase row in `public/manual/how-do-i.html#howto-list` into a link and add its walkthrough section.
2. Explain the exact-match setup, masked typing, the Correct/Wrong/Cancelled routes, and the separate close-box path.
3. Keep the prose under G18's twenty-word sentence limit. Link the existing `howto-06-passphrase.png` capture slot; do not fabricate a screenshot.
4. Refresh generated manual search data, then run manual coverage, the full test suite, typecheck/build, and `git diff --check`.
5. Update the handoff and README roadmap, archive the displaced sixth roadmap row, and keep the editor stamp at `2026-10-03.r267` because no editor source changes are planned.

## Capture constraint

This environment has no Chromium, Firefox, Playwright, or Puppeteer available. No reliable screenshot capture or browser visual review is possible here. Leave all captures pending and record the coverage count after the new figure reference is added.

## Result

The walkthrough is live at `public/manual/how-do-i.html#howto-passphrase`, and its title now links from the how-to index. It uses the checked-answer mode, masks typing, and routes Correct, Wrong and Cancelled separately. The screenshot reference is present, but no image was captured.

| Check | Result |
|---|---|
| `npm run gen:manual` | 41 node pages written; zero awaiting prose; 285 search entries from 51 pages |
| `npx vitest run src/manual.coverage.test.ts` | **27 passed**; G18 remains zero; 17 how-to rows; G8 reports **78** missing screenshots |
| `npm test` | **1,834 passed across 89 files**; the standalone retry completed in 313 seconds after a first attempt reached the 180-second tool limit |
| `npm run build` | Passed, including `tsc --noEmit` |
| `git diff --check` | Passed after the final edits |
| Browser / in-game review | Not performed; this environment has no browser binary or Playwright/Puppeteer package |

This is documentation only. No `src/**` files changed, and `EDITOR_BUILD` remains `2026-10-03.r267`. Eleven how-tos remain; website is next. G8's pending count increased from 77 to 78 because this newly written walkthrough now references its declared screenshot slot.
