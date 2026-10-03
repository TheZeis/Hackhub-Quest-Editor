# r265 — the handbook's twenty-word rule, and the ratchet that now enforces it

**Scope.** One rule the handbook has always claimed and never checked: no sentence
over twenty words. This round found how badly it had drifted, fixed the six pages
a stuck author actually reads, and put a gate in front of the rest so the number
can only come down. Also records two places where splitting a sentence breaks
something else, and two process mistakes made this round that the next one should
not repeat.

Nothing here touches the product. `src/**` was not modified except
`src/manual.coverage.test.ts`, which is the documentation suite's own file.

---

## 1. Where the rule stands

`docs/manual/README.md` §Language has listed "no sentence over twenty words"
since the handbook was first written. Nothing enforced it. `G18`, added this
round, does.

`how-do-i.html` was fixed first, while it was being rewritten, and carried **17**
violations — the longest sentence in the handbook at 43 words. The first
handbook-wide count, taken after that page was already clean, was **160 prose
sentences across 34 pages**. So 160 does not include the 17.

Six further pages are now at zero, taking the count 160 → 132 → 109 → 67:

| Page | Was | Now |
|---|---|---|
| `how-do-i.html` | 17 | 0 |
| `checking.html` | 28 | 0 |
| `guides.html` | 23 | 0 |
| `nodes/flow-timer.html` | 15 | 0 |
| `export.html` | 10 | 0 |
| `concepts.html` | 9 | 0 |
| `troubleshooting.html` | 8 | 0 |

**Remaining: 67 across 28 files.** `LONG_SENTENCE_BUDGET` in
`src/manual.coverage.test.ts` is set to that number.

Worth noting which pages went first: `checking.html` and `troubleshooting.html`
are what an author reads when the editor is complaining at them, `guides.html`
and `export.html` when they are stuck, and `how-do-i.html` because it was being
rewritten anyway. That ordering was Zeis's call and it was the right one — the
worst offenders by count were not the worst by reader pain.

---

## 2. How the ratchet works, and the one rule for maintaining it

`G18` is two tests:

1. **`how-do-i.html` is held to zero outright.** It has been fixed, so it is not
   allowed to regress.
2. **The handbook total is capped at `LONG_SENTENCE_BUDGET`.** It is not zero
   because 67 sentences across 28 files is too many to rewrite responsibly in one
   pass, and much of that prose was written by other rounds.

The rule: **fix the pages you touch, then lower `LONG_SENTENCE_BUDGET` to the
new total in the same commit. It must only ever come down.** The test's failure
message says this, so a future agent will be told.

The ratchet is not a clean gate and should not be mistaken for one. A green
`G18` means "no worse than last round", not "the rule is satisfied". Saying
otherwise in a report would be a false claim.

---

## 3. Two places where splitting a sentence breaks something else

Both were found by checking before editing. Neither is visible from the sentence
alone, and a mechanical split would have broken both silently.

### 3.1 Quoted product text is not always in a `blockquote.blurb`

`G18` excludes `blockquote.blurb` because those quote the editor's own field
hints, and `G11` pins ten panel messages to the source they came from. Rewording
either fails the build, so the exclusion is load-bearing.

But `troubleshooting.html` quotes a device-tree message inside a plain
`<span class="mono">`:

> `This router has no way in: set a model for `fern`, or enable support-mail
> recovery.`

`G18` counts that as prose. COV4 forbids changing it. The fix was to split only
the lead-in — `in plain words:` became `in plain words.` — and leave the message
byte-identical.

**Before splitting anything on `troubleshooting.html` or `checking.html`, check
whether the sentence is a quotation.** The gate will not stop you.

### 3.2 `G13` parses a sentence in `concepts.html` by its wording

`G13` checks that prose event counts match the live catalogue. It matches
phrasings including `there are (\d+) of them`. The relevant sentence is:

> Searching for something, logging into a bank, cracking a password, downloading
> a file. Each of those has a name, and there are 99 of them in 10 groups.

The split was placed *around* `there are 99 of them in 10 groups`, not through
it. Rewording that phrase to something more natural would break `G13`, and the
failure would look like a documentation bug rather than a gate that reads
phrasing.

---

## 4. The regex trap, kept here so nobody removes the fix

Counting prose sentences means matching block tags. The obvious pattern is
wrong:

```
<(p|li|dd|figcaption)[^>]*>     ← also matches <link rel="stylesheet"> in <head>
```

`<li` is a prefix of `<link`, so the match starts in the document head, swallows
the page, and table rows get counted as sentences. That reported **293**
violations where there are **160**. The fix is the boundary lookahead:

```
<(p|li|dd|figcaption)(?=[\s>])[^>]*>
```

It is in `longSentences()` in `src/manual.coverage.test.ts` with a comment. Do
not remove it, and do not "simplify" the pattern without re-measuring.

Two smaller notes from writing it:

- A `<b>` label inside a sentence counts toward the limit. Splitting
  "About the game-generated persona: every field…" at the colon left 22 words,
  because the label's four words are part of the sentence.
- A hand-written checker and the gate disagreed (159 vs 160) until both used the
  same pattern. If a count is worth gating, measure it once, in the gate.

---

## 5. Two process mistakes this round

### 5.1 Recovery was hand-rolled instead of using `npm run recover`

`docs/SANDBOX-RESETS.md` documents `npm run recover`, which realigns `HEAD` with
`reset --soft` so the working tree is never touched, prunes resurrected
gitignored residue, and reinstalls dependencies. This round ran
`git reset --hard FETCH_HEAD` by hand instead, four times over.

That is the riskier command. It worked only because every change had already
been pushed — `git status` came back empty afterwards, which is what proved
nothing was lost. On a tree with uncommitted work it would have destroyed it.

**Use `npm run recover`.** It is a no-op on a healthy tree and refuses to move
`HEAD` when the local branch holds unpushed commits.

### 5.2 The full suite was run on documentation-only changes, and `npm run build` was skipped

`docs/SANDBOX-RESETS.md` §"Gate tiers after a reset" says a docs-only change
needs `npm run typecheck` and `npm run build` (~25s), and reserves the ~290s
full suite for changes under `src/`. This round ran the full suite three times
for manual prose and never ran `npm run build` at all.

The build has since been run and passes. Going forward, follow the tier table
and say which tier was run and why.

---

## 6. What is left

67 sentences, 28 files. In the order a reader would hit them:

| Count | Page |
|---|---|
| 7 | `appendices.html` |
| 7 | `nodes/comms-tweet.html` |
| 7 | `tutorial.html` |
| 6 | `nodes/flow-appcheck.html` |
| 5 | `index.html` |
| 3 | `nodes/flow-branch.html`, `nodes/flow-sequence.html`, `nodes/reply-input.html` |
| 2 | `flow-beat`, `flow-debug`, `flow-random`, `fx-prompt`, `world-network`, `world-wifi` |
| 1 | `nodes.html`, `entry-abandon`, `entry-load`, `flow-delay`, `flow-note`, `flow-reroute`, `fx-handbook`, `fx-setdata`, `fx-shell`, `layout-group`, `world-files`, `world-firewall`, `world-packdata`, `world-toolresponse` |

The one-word-per-file tail is most of the remaining work and least of the
remaining value. Getting the five pages at 5+ to zero would take the total from
67 to 35 and cover everything a reader is likely to be looking at.

**Method that worked.** Dump the offending blocks with their raw markup, plan
each split against the word count, then apply with a whitespace-insensitive
replace that asserts exactly one match. Two asserts fired this round and both
caught real problems: a fragment whose line break did not match the source, and
a phrase written identically in two different how-tos.

---

## 7. Verification record

Branch `arena/01a0a7a9-hackhub-quest-editor`, commits `2bb2d9c` → `f7ec66a`.

| Check | Result |
|---|---|
| `npm run recover` | clean — HEAD at tip, no residue, node_modules present |
| `npm run typecheck` | 0 errors |
| `npm run build` | built in 1.80s |
| `src/manual.coverage.test.ts` | 27 passed |
| Full suite | 1834 passed / 89 files |
| Tag balance, six edited pages | no errors, nothing unclosed |

`G18`'s two tests were each falsified and restored: a long sentence in a how-to
fails, and pushing the total past the budget fails and names the worst pages.
`G17`, added in the same round, was falsified three ways — a scaffolding marker,
a gutted list, and an unlinked walkthrough.

Quoted product text verified byte-identical before and after: `checking.html`'s
32 `msg-*` anchors and every `blockquote.blurb`, plus the device-tree message in
`troubleshooting.html`.

---

## 8. Not done, and not attempted

- The 67 remaining sentences.
- The 12 how-tos still unwritten on `how-do-i.html` (5 of 17 exist: objective,
  NPC message, gated message, payment, branch). Next in order is passphrase,
  then website.
- Screenshots: none captured. `public/manual/img/` does not exist, while the
  manual already carries 36 `<img>` tags pointing into it and
  `r164-manual-screenshots.md` declares 96 filenames. `G8` passes because every
  referenced file is in `DECLARED_SHOTS`; the slots are placeholders by design.
- Advocacy **P7** is still open: the **Pay the player** and **Charge the player**
  hints say "Credits" (`registry.ts:1090` and `:1121`) while the game's money is
  dollars and the manual says dollars. Product copy, so it stays a proposal.
