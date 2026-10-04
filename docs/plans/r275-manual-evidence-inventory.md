# r275 — Phase 1 manual evidence inventory

## Purpose and boundary

This is a source-audit record, not reader-facing manual text. Phase 1 now has a generated, source-cited inventory and a drift test, but semantic coverage review is still open. No new manual instructions or claims have been written. The proposed tree is in [the r275 information-architecture proposal](r275-manual-information-architecture-proposal.md); it must be approved before Phase 3, and the source-format choice must be confirmed before Phase 4.

The editor build remains `2026-10-03.r267`. This work does not change `src/**`, editor behavior, or the build stamp.

## Registry inventory

`docs/manual/inventory.json` and `docs/manual/evidence-inventory.json` record:

- 41 registered node types, with no manual exclusions;
- 10 categories;
- 164 editable fields and 187 cited field-path rows (the latter also includes notes and other non-editable schema entries);
- 80 input/output sockets;
- 99 events in 10 groups; and
- four edge kinds.

Each node, field path, socket, category, edge kind, event group, and event has a source path and structural citation. The new test compares these rows with the live registry and event catalogue, rather than trusting the generated snapshot alone.

## Messages and validation

The generator indexes 56 diagnostic emission sites: 7 graph issues, 9 field warnings, and 40 compiler/export and target-matching warnings. It also indexes 10 existing panel-message examples from the curated `PANEL_MESSAGES` list and 31 message blocks currently in the manual.

The lexical matcher found 25 *candidates* (7 matching a manual heading and 18 matching a phrase) and no quote candidate for 31 diagnostic sites. These are search leads only: neither a heading match nor a phrase match proves that the reader gets a complete, correct explanation. The full source rows, candidate anchors, and the 31 no-candidate IDs are in `docs/manual/evidence-inventory.json`. The home page says the handbook explains every node, setting, and message, and `checking.html` says it covers every editor message. Those message claims still need a semantic audit and may need qualification after the information architecture is approved.

The ten curated panel-message snippets now have source and manual line numbers, including `panel-01`. This verifies only the ten messages already listed in the existing panel-message test; it does not discover new inline messages automatically.

## Quoted UI text

The scan covers every `<b class="ui">` occurrence in manual HTML: 546 occurrences and 199 unique labels. It found 190 exact source matches, one dynamic match (`Browse {TEMPLATES.length} templates`, currently rendered as “Browse 14 templates”), and eight unmatched labels:

- `apt-get install`
- `Claim quest`
- `equals`
- `Event`
- `Exactly this answer, Contains these words or Matches a pattern`
- `Field`
- `Save the list of installed apps`
- `What to do`

The inventory includes likely source locations for review, where available. Those candidates are not confirmations that a label is current or contextually correct. Each unmatched label still needs a human decision before any manual wording is changed.

## Templates, permissions, and export files

- All 14 templates are extracted from `src/templates/index.ts`. Nine exact display names are not found anywhere in the current manual HTML: `Blank quest`, `The Harbour Manifest`, `The Help Desk Leak`, `Bad Attachment`, `Six Tries`, `Dead Air`, `Cold Storage`, `The Ledger Contract`, and `The Long Game`.
- The manual's seven permission names match the compiler-derived set: `bank`, `events`, `filesystem`, `mail`, `network`, `shell`, and `ui`.
- The manual's fixed archive-file list matches all eight current paths: `manifest.json`, `dist/manifest.json`, `dist/mod.js`, `src/index.ts`, `README.md`, `package.json`, `esbuild.config.mjs`, and `tsconfig.json`.
- Four conditional output families are source-cited but absent from the manual's output table: mod icon, mod cover, quest images, and desktop widgets.

The generator captures current feature-guide headings and stable anchors, but feature-to-source mapping is explicitly marked as not yet normalized. That remains a Phase 1 evidence gap. A separate count mismatch is also present: `public/manual/index.html` says “Sixteen walkthroughs,” while `public/manual/how-do-i.html` has 17 top-level walkthroughs and says all 17 are linked. The manual's existing headline-number test does not cover this count.

## Drift checks added

`scripts/manual-evidence/source-inventory.test.ts` contains eight tests covering the current snapshot, source-derived node inventory, live registry rows, quoted UI labels, template registry, permissions, archive paths, and diagnostic-site inventory. It is included in Vitest discovery by `vite.config.ts`. `npm run gen:manual-evidence` regenerates the evidence snapshot, and `npm run gen:manual` now calls it after the existing manual generators.

The inventory test does not yet prove that each message is semantically explained by a manual section, that every feature has been mapped to its source, or that every editor control (including unquoted controls) is documented. Those are review/content gates still to be designed after approval of the proposed structure.

## Immediate review gates

1. Review the 31 no-quote diagnostic sites and 25 candidates against the manual section by section; do not equate lexical matches with coverage.
2. Resolve the eight unmatched UI labels against their actual source and, where possible, the running editor.
3. Decide how the nine unmentioned templates and four optional archive outputs should be presented.
4. Normalize feature-to-source mapping, including shipped limits and behaviors that require running-app or in-game verification.
5. Obtain approval for the full information architecture before authoring reader-facing manual prose.
6. Confirm the proposed source-file format before Phase 4.

## Verification record

Both inventory generators passed `node --check` and were run to regenerate `docs/manual/inventory.json` and `docs/manual/evidence-inventory.json`. The focused evidence command `npm test -- scripts/manual-evidence/source-inventory.test.ts` passed all 8 tests; the existing manual coverage command `npm test -- src/manual.coverage.test.ts` passed all 27 tests and reports 88 screenshots still to capture. `npm run typecheck` and `npm run build` both passed; Vite emitted its existing large-chunk advisory. The full suite was not run because no `src/**` file or editor behavior changed.