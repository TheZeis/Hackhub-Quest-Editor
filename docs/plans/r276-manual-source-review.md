# r276 — Source-backed handbook review and evidence coverage

## Outcome and scope

The user approved the handbook table of contents and static HTML source. This
checkpoint continues reader-facing documentation, evidence tooling and tests
only. It does not change `src/**`, application behavior or the editor build
stamp (`2026-10-03.r267`). The working edits are local until the checkpoint is
fetched, compared, committed and pushed to the session branch.

The shipped handbook stays in `public/manual/`; `public/manual.html` remains its
entry redirect. Existing page names, anchors, offline search, offline reading
and print styles are preserved. No editor screenshot was created and no figure
was converted.

## Source review

Reviewed the 56 diagnostic emission sites and 10 curated panel-message examples
against the cited source rows, then checked their reader explanations and next
steps in `public/manual/checking.html`. The messages cover 7 graph issues, 9
field warnings and 40 compiler/export or target-matching warnings. The curated
panel messages remain a separate list because they are ordinary panel text, not
canvas or export diagnostics.

The current evidence map records all 56 sites and 10 panel examples in
`docs/manual/diagnostic-coverage.json`. They map to 63 distinct explanation
blocks; multiple source sites can share one reader explanation. The extractor
finds a lexical quote candidate for 54 sites. The two without one are the
impossible-calendar-day field warning and the blank accepted-answer export
warning. Both still have mapped explanations reviewed against their source.
A quote match or mapped anchor alone does not prove that the explanation is
complete; the human source review remains necessary.

Reviewed the 32 feature-guide sections in `scripts/manual-evidence/feature-source-map.mjs`
against their cited source symbols, including limitations and user-facing error
surfaces. The source inventory also mechanically compares node, field, socket,
event and category records with the live schema. The generated evidence records
14 templates, 7 permissions, 8 fixed export files and 4 optional output
families.

The refreshed UI-label scan records 607 quoted UI-label occurrences and 215
distinct labels, with none unmatched. It also confirms that the manual names all
14 templates. These checks verify quoted labels and inventory references; they
do not verify every visible control, wording nuance or visual layout in a
running browser.

## Reader-facing corrections

The review clarifies that:

- the objective warning counts missing **When event** wires; it does not check
  story wires, which can also complete an objective;
- a router warning checks only the recovery routes the editor recognizes, not
  every possible way into that router;
- the login warning does not account for the game's optional stock root and
  guest accounts, so it can be a false alarm;
- an unlisted website page stays out of in-game search, but the export note's
  claim that no link points to it is an assumption—the editor does not inspect
  links, and a direct address or `dirhunter` can still reach the page;
- a missing wire or Sequence step has node-dependent effects rather than always
  stopping the whole quest;
- addon file errors name the practical recovery step, explain the short dotted
  location when shown, and describe the four-error display limit, session-only
  storage fallback, same-ID replacement and silent skipping of invalid saved
  packs; and
- “blocking” is the editor's serious-risk label, not a promise that export is
  disabled; and
- generated node guidance now renders its approved inline markup as real
  formatting. Branch choices use the exact labels “Details from the event” and
  “Quest data”; the Ask player options remain separate choices, and
  `apt-get install` is shown as a game command, not an editor control.

Terms such as addon-file location, addon ID and file version are explained in
plain language. The exact addon file error is quoted as product text; the
surrounding instructions avoid expecting the reader to edit that file.

The handbook keeps its approved captions and frame titles. The user confirmed
that Tab in Firefox from disk skips the prototype page and all five scenes.
Screen-reader output remains unverified, is lower priority by user direction,
and is not presented as a completed check. No claim is made that a test proves
visual truth for an illustration.

## Regeneration and validation

The expected current generated values are:

- `public/manual/search-index.js`: 319 entries from 51 pages;
- `docs/manual/evidence-inventory.json`: 56 diagnostic sites, 10 panel
  examples, 63 message blocks, 607 quoted UI occurrences, 215 distinct labels
  and no unmatched labels; and
- registry coverage: 41 node types, 164 editable fields, 80 wire sockets and
  99 built-in game events.

`npm run gen:manual` passed: it rebuilt the 41 node pages, the offline figure
renderer and all generated evidence; the renderer smoke opened all five local
scenes. The search index has 319 entries from 51 pages. The evidence snapshot
has 56 diagnostic sites, 10 panel examples, 63 message blocks, 607 quoted UI
occurrences, 215 distinct labels and no unmatched labels.

`npx vitest run scripts/manual-evidence/source-inventory.test.ts src/manual.coverage.test.ts`
passed **38 tests** (11 evidence checks and 27 handbook checks). The sentence
ratchet remains at zero; G8 still reports 88 missing editor figures.
`npm run typecheck`, `npm run build` and `git diff --check` passed. Vite emitted
its existing nonfatal warning that the main editor chunk exceeds 1 MB.

The full application test suite was not run because no `src/**` file or app
behavior changed. These gates establish generated consistency and structural
coverage; they do not prove visual truth or replace semantic review when a
source surface changes. The 88 uncaptured figures remain an outstanding visual
deliverable, not a test failure or screenshot claim.

`src/manual.coverage.test.ts` still has a stale introductory comment that says
G7 message coverage and G9 UI-label drift checks are not implemented. It is
left untouched because `src/**` is out of scope. Current G7/G9 evidence checks
are in `scripts/manual-evidence/source-inventory.test.ts`.

## Product-friction recommendations (no behavior changed)

1. **Router wording:** the editor's “no way in” panel message overstates a
   checker that only tests two recognized recovery routes. Consider wording it
   as “no recognized recovery route found.”
2. **Stock accounts:** the export warning checks user accounts but not whether
   stock root/guest accounts are enabled. Consider checking that setting or
   qualifying the warning in the editor.
3. **Addon file errors:** the guide can explain the exact messages, but their
   file-format terms still cost a non-coder effort. Consider a simple recovery
   instruction in the product dialog alongside the technical location.

## Remaining limits

The static handbook is searchable, offline-capable and printable. Its structural
checks pass, but generated inventories cannot replace semantic review after
source changes. No visual review of all pages in a running editor was performed
in this checkpoint; no screenshots were captured. The five-scene prototype's
Firefox keyboard result is user-reported; screen-reader output remains
unverified. All 88 editor figure references remain unconverted.

## Checkpoint record

- Branch: `arena/01a105b7-hackhub-quest-editor`.
- Read `docs/SANDBOX-RESETS.md` and ran `npm run recover` after validation. It fetched
  `origin/arena/01a105b7-hackhub-quest-editor` and realigned the checkout from
  `db56f51` to remote tip `a62d12f`; no resurrection residue was found. Compared
  the six remote commits (`3c82ca7` through `a62d12f`) before checkpointing; the
  r276 work remains as an uncommitted working-tree diff on top of `a62d12f`.
- Commit and push are the remaining checkpoint actions. No pull request was
  requested or opened.
