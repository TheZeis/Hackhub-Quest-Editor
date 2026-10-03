# r266 — the handbook's next five pages, and a generator that stays in sync

**Scope.** Continue the sentence ratchet from [r265](r265-manual-sentence-ratchet.md): clear the next five highest-count pages, keep `how-do-i.html` at zero, and lower the whole-manual budget in the same change. This was documentation work only. The only `src/` edit was the documentation gate in `src/manual.coverage.test.ts`; no editor behavior or in-app copy changed.

---

## 1. Sentence counts

The five pages named at the end of r265 are now clear:

| Page | Before | After |
|---|---:|---:|
| `appendices.html` | 7 | 0 |
| `nodes/comms-tweet.html` | 7 | 0 |
| `tutorial.html` | 7 | 0 |
| `nodes/flow-appcheck.html` | 6 | 0 |
| `index.html` | 5 | 0 |
| `nodes/flow-timer.html` | 15 after stale prose was regenerated | 0 |
| `how-do-i.html` | 0 | 0 |

The whole-manual count fell from **67 to 29**, across **21 pages**. `LONG_SENTENCE_BUDGET` in `src/manual.coverage.test.ts` is now **29**. G18 still holds `how-do-i.html` to zero and caps the manual total; the budget was lowered, never raised.

One useful catch from the gate: a newly reworded Timer example briefly reached 21 words. G18 reported 30 total, named the affected page, and failed. The example was shortened to 18 words; the final total returned to 29 and the test passed.

---

## 2. Keep the generated pages tied to their source

A manual regeneration had restored old Timer sentences because `docs/manual/node-voice.json` still held longer prose than the hand-edited `flow-timer.html`. The Timer entries in the source file are now synced with the clear page copy. Regeneration writes the shortened source instead of restoring the stale wording.

`scripts/build-node-pages.mjs` now renders each linked message label as a complete sentence, followed by a capitalized explanation: `Label. Explanation`. The 43 message explanations in the voice file are capitalized in generated output. This replaces the old dash-separated fragments without changing the messages themselves.

The final `npm run gen:manual` wrote **41 node pages**, reported **zero pages awaiting prose**, and rebuilt `public/manual/search-index.js` with **285 entries from 51 pages**.

---

## 3. Copy corrections grounded in the shipped editor

The tutorial said there were thirteen templates and suggested using **New** if the welcome panel had been closed. The source says otherwise:

- `src/templates/index.ts` registers **14** templates, including **Blank quest** and the 36-node **The Long Game**.
- `src/App.tsx:155–158` displays `Browse 14 templates` on the welcome panel.
- `src/editor/shell/TopBar.tsx:171–172` sends **New** to the separate blank-project dialog. The title says it clears everything.
- `src/editor/shell/TopBar.tsx:210–212` sends **Templates** to the template picker.

The tutorial now says **14**, and directs readers to **Templates** after closing the welcome panel. This was verified against source, not by a visual or in-game walkthrough.

The tutorial's comparison to tool prices was removed because this round did not verify in-game prices. It now says the payment amount starts at **100**, matching `src/schema/registry.ts:1099`. The amount can then be adjusted to fit the job.

---

## 4. Current remaining work and product recommendation

The largest remaining counts are `nodes/reply-input.html` (**3**), followed by six pages tied at **2**: `nodes/flow-beat.html`, `nodes/flow-branch.html`, `nodes/flow-sequence.html`, `nodes/fx-prompt.html`, `nodes/world-network.html`, and `nodes/world-wifi.html`. Fourteen pages have one each. Choose the next pages by reader need as well as count; do not invent an order for tied pages.

`how-do-i.html` remains at zero. The twelve walkthroughs still unwritten there, including **passphrase** and **website**, remain outside this round's scope.

**Prioritized product recommendation carried forward:** P7 remains open. The Pay and Charge field hints say “Credits” (`src/schema/registry.ts:1090,1121`), while the manual describes the game's money in dollars. No in-app text or behavior was changed here.

---

## 5. Verification and handoff

| Check | Result |
|---|---|
| `npm run recover` | Healthy tree; no residue; dependencies present |
| `npm run gen:manual` | 41 node pages; zero awaiting prose; 285 search entries from 51 pages |
| `npx vitest run src/manual.coverage.test.ts` | 27 passed; all five target pages, Timer, and `how-do-i.html` at zero |
| G18 audit using the gate's counting rule | 29 total across 21 pages |
| Full `npm test` | 1,834 passed across 89 files |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; Vite reports the main JavaScript chunk is over 1 MB |
| `git diff --check` | Passed |
| Screenshot coverage | **77 screenshots still to capture**; none were captured in this round |

The full suite ran after the only `src/` change (the G18 budget). The later edits were manual prose only; the targeted manual gate, typecheck, and production build were rerun after them. No visual browser review or in-game install/play test was performed, so this handoff makes no claim about either.

The manual-content checkpoint is commit `645801b` on `arena/01a1013d-hackhub-quest-editor`, pushed to origin. `EDITOR_BUILD` remains `2026-10-02.r260`: application behavior was not changed.

**Next:** continue G18 with the highest remaining pages, capture the 77 missing screenshots, and finish the remaining how-tos. Keep product recommendations separate from documentation edits; P7 still needs an approved product-copy change.
