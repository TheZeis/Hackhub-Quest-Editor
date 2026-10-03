# r267 — clear the final long sentences and call money dollars

**Scope.** Continue the handbook sentence ratchet from [r266](r266-manual-sentence-ratchet-followup.md), starting with `reply-input.html` as requested. The user also explicitly confirmed that the game calls its money dollars, not credits, and directed that the Pay and Charge hints use that wording. All remaining long sentences were cleared; the product-copy correction changes no quest behavior.

---

## 1. G18 is now at zero

At r266, G18 counted **29** sentences over 20 words across **21** pages. This round cleared all of them, including the three on `nodes/reply-input.html`. `how-do-i.html` remains at zero. `LONG_SENTENCE_BUDGET` is now **0**, so the whole-manual gate will fail on any overlong sentence.

| Page | Sentences cleared |
|---|---:|
| `nodes/entry-abandon.html` | 1 |
| `nodes/entry-load.html` | 1 |
| `nodes/flow-beat.html` | 2 |
| `nodes/flow-branch.html` | 2 |
| `nodes/flow-debug.html` | 1 |
| `nodes/flow-note.html` | 1 |
| `nodes/flow-random.html` | 1 |
| `nodes/flow-sequence.html` | 2 |
| `nodes/fx-handbook.html` | 1 |
| `nodes/fx-prompt.html` | 2 |
| `nodes/fx-setdata.html` | 1 |
| `nodes/fx-shell.html` | 1 |
| `nodes/layout-group.html` | 1 |
| `nodes/reply-input.html` | 3 |
| `nodes/world-files.html` | 1 |
| `nodes/world-firewall.html` | 1 |
| `nodes/world-network.html` | 2 |
| `nodes/world-packdata.html` | 1 |
| `nodes/world-toolresponse.html` | 1 |
| `nodes/world-wifi.html` | 2 |
| `nodes.html` | 1 |
| **Total** | **29** |

The prose changes preserve the original behavior claims while breaking them into shorter sentences. `flow-beat` still says its card is removed and its wires are spliced; `layout-group` still says its name and comment ship as comments. The node index now says **41** node types, matching the 41 obtainable types in the generated inventory.

---

## 2. P7 resolved: the money is dollars

Zeis confirmed: **the game never calls its money credits; use dollars.** The two in-app hints now read:

- Pay: “Dollars deposited into the player's bank account.”
- Charge: “Dollars taken from the player's account.”

The manual already describes the amounts in dollars. `npm run gen:manual` refreshed the inventory and generated node pages, so the quoted hints now agree with the editor. This is wording only; no runtime or quest behavior changed.

Because the editor itself changed, `EDITOR_BUILD` and the handbook stamp are now `2026-10-03.r267`. All **51** manual HTML pages, the generated inventory, and the search index carry the new stamp.

---

## 3. Generated output and verification

`npm run gen:manual` wrote **41 node pages**, reported **zero awaiting prose**, and rebuilt the search index with **285 entries from 51 pages**.

| Check | Result |
|---|---|
| `npm run recover` | Healthy; no residue; dependencies present |
| `npm test` | **1,834 passed across 89 files** |
| `npx vitest run src/manual.coverage.test.ts` | **27 passed**; G18 total is zero; `how-do-i.html` remains zero |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; Vite reports the main JavaScript chunk is over 1 MB |
| `git diff --check` | Passed |
| Screenshot coverage | **77 screenshots still to capture**; none were captured |

The full suite ran after the `registry.ts`, build-stamp, and G18 gate changes. Later adjustments touched documentation prose only; the targeted manual gate was rerun. No browser visual review or in-game install/play test was performed.

---

## 4. Remaining work

- Capture the **77** missing manual screenshots.
- Write the **12** how-tos still missing from `how-do-i.html`; passphrase and website are next in the r265 plan.
- P7 is resolved; no further money-unit recommendation remains open.
