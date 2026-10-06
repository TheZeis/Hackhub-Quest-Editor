# Maintaining the handbook

The shipped reader handbook is static HTML under `public/manual/`. Node pages,
search data and evidence inventories are generated; reader-facing guides are
written by hand and checked against the editor sources.

The user approved the manual structure and static HTML source. Keep
`public/manual.html` as the entry redirect. Preserve existing page names and
anchors, local search, offline reading and print styles.

## Two inputs, and why they are separate

| File | Holds | Written by |
| --- | --- | --- |
| `docs/manual/inventory.json` | labels, hints, defaults, limits, options, sockets | `scripts/extract-manual-inventory.mjs`, from `src/schema` |
| `docs/manual/node-voice.json` | what a node is for, when you would use it, what breaks | a person |

`scripts/build-node-pages.mjs` joins them into one page per node.

The split is the point. Facts are extracted, so they cannot drift from the
registry. Prose is written, so it cannot be faked. A node with no entry in
`node-voice.json` is **skipped and reported**, never filled in with
plausible-sounding filler — a gate that goes green on invented prose is worse
than no gate.

## Adding a node page

1. Add an entry to `docs/manual/node-voice.json`. `what` and `when` are
   required; the script throws without them.
2. Add per-field `put`, `example`, `empty` and `watch` only where you have
   something the editor's own hint does not already say. The script measures the
   overlap between your `put` and the hint it sits under, and **throws above
   70%**. That guard exists because the flaw was fixed by hand once and then
   reintroduced at scale in the next two batches — 48 fields said nothing the
   hint had not already said. A machine check does not forget between rounds.
3. Run `npm run gen:manual`. That re-extracts the inventory, rebuilds the
   pages and rebuilds the search index in one go.
4. Run the coverage gate: `npx vitest run src/manual.coverage.test.ts`.

Every obtainable node now has a voice entry, including `fx.pay`. Do not keep
orphan hand-written node pages beside the generator; `npm run gen:manual` should
end with `0 awaiting prose`.

## Limits rows

A Limits row is only printed when the schema actually enforces something:
a min, a max, a step, a choice list, an on/off. Text fields get no Limits row,
because "Any text." is not a limit and a reader scanning for a real constraint
is better off not seeing it. Where a practical limit matters anyway — keep a
bank statement label short — say it in the voice entry's `limits`.

## Language

`G6` in `src/manual.coverage.test.ts` enforces the project's jargon list and
the filler list on every page, including everything in `node-voice.json`. The
rules the prose is written to: second person, present tense, active voice, no
sentence over twenty words, every how gets a why, and UI labels quoted with
`<b class="ui">` only when they really appear in the editor.

Most of that list is not machine-checkable, but the twenty-word rule is, and
`G18` now checks it. It found the rule had never been enforced: 160 prose
sentences across 34 pages ran past the limit, one of them 43 words long. That
is too many to rewrite responsibly in one pass, so `G18` is a **ratchet**:
`how-do-i.html` is held to zero outright, and the handbook total is capped at
`LONG_SENTENCE_BUDGET`. Fix pages as you touch them and lower the budget to the
new total. It must only ever come down.

Counting sentences means splitting on tag boundaries, and the obvious regex is
wrong: `<(p|li|dd|figcaption)[^>]*>` also matches `<link` in the document head,
so the match swallows the page and table rows get counted as sentences. That
reported 293 violations where there are 160. The lookahead `(?=[\s>])` after
the tag name is what makes it correct — do not remove it.

`blockquote.blurb` is excluded from the count. It quotes editor-owned wording,
including field hints and addon file errors. Keep those quotations exact; the
handbook explains them around the quote instead of rewriting product text.

## Figures

The five-scene prototype at `public/manual-figure-prototype.html` is not part of
the handbook. It tests the shared renderer before any of the 88 editor figures
are replaced. Keep every scene fixed and read-only.

For each rendered scene, keep its accessible description outside the frame:
use a descriptive iframe `title`, point `aria-describedby` to a non-empty
`<figcaption>` inside the same `<figure>`, and set `tabindex="-1"` so pressing
Tab skips the frame. The renderer document's `<body inert>` keeps
its drawn editor controls from acting as controls. Keep the frames sandboxed and
all renderer files local; the file-only `allow-same-origin` exception is needed
for local CSS and JavaScript to load from `file://`.

`npm run gen:manual-figures` checks these markup rules and boots every scene in
JSDOM. It does **not** verify pixels, browser focus behavior, or what a screen
reader announces. Zeis checked the prototype from disk in Firefox and reported
that Tab skips the page and all five scenes. The screen-reader output remains
unverified; Zeis does not have a screen reader and has set that check below the
manual's plain-language, number-clarity and colour-accessibility priorities.
Keep the captions meaningful on their own, and do not claim an assistive-
technology test that did not happen.

## Colour

Colours are never invented here. They come from the editor's own palette, via
`manual.css`'s `:root`: ten category hues, `ok`/`warn`/`danger`, and four wire
kinds copied from `HANDLE_STYLE` in `src/schema/edges.ts`. If the editor
changes a hue, the manual follows by editing that one block.

## Messages come from four places, not three

`checking.html` documents four sources, and the fourth was missing until the
audit found it:

| Source | Count | Extracted how |
|---|---:|---|
| Canvas (`src/analysis/graph.ts`) | 7 | `label`/`detail`/`nextStep`/`severity` objects |
| Inspector fields (`src/analysis/fields.ts`) | 9 | same shape |
| Export and target matching (`src/compiler/compile.ts`, `src/compiler/targetWarnings.ts`) | 40 | emitted warning sites |
| **Panel editors (10 files)** | **10** | **hand-curated examples, gate G11** |

The first three share a machine-readable shape, which is why a regex finds
them. The fourth does not: those messages are plain JSX text inside whichever
editor is describing the thing in front of you — the quest's **Health**
section, the device tree, a database's tables, an addon card, the website
builder. They never reach a node badge or the export report.

The 56 source sites and 10 curated panel messages map to 63 explanation blocks;
several sites share one reader-facing explanation. The mapping lives in
`docs/manual/diagnostic-coverage.json`. The evidence test compares it against
the extracted source rows and checks every mapped anchor. This proves structural
coverage, not that the wording is semantically correct. The quote matcher finds
candidates for 54 of the 56 sites; the two without a quote candidate still have
mapped explanations. Quote matching is a search aid, not a meaning check.

The current scan also finds 607 quoted UI-label occurrences and 215 distinct
labels, with none unmatched. All 14 templates, seven permissions, eight fixed
archive files and four optional output families are accounted for.

### Why G11 is a curated list and not a scan

Scanning for them was tried and rejected. Walking outward from a
`text-warn`/`text-danger` class to the next JSX text node returned **7**
messages at a 400-character window, **9** at 900 and **10** at 1600, because
source indentation moves the closing tag. A gate whose count depends on line
wrapping reports drift that is not there and hides drift that is.

So G11 holds a known set and checks it in both directions: it fails when a
listed message is reworded or deleted in `src/`, and when one is dropped from
`checking.html`. Both directions were verified to fire.

**The cost is stated plainly: G11 will not notice a brand-new inline
message.** When you add a warning to an inspector editor, add it to
`PANEL_MESSAGES` and to `checking.html`. A third test asserts that
`StatusBar.tsx` still mentions no issues at all — the handbook once claimed the
status bar carried the issue count, and the counter actually lives on the
canvas.

## Feature-to-source map

`scripts/manual-evidence/feature-source-map.mjs` links each of the 32 curated
feature-guide sections to the shipped source symbols that support it. The
normalizer writes those rows into `docs/manual/evidence-inventory.json` and
rejects missing or stale anchors. The test checks the source paths, symbols and
listed error surfaces. A matching symbol does not prove that the prose is right;
read the source and review the whole section before signing it off.

## Regenerating and checking evidence

Run `node scripts/build-manual-index.mjs` after editing manual prose. It rebuilds
the local, offline search index. Run `npm run gen:manual-evidence` to refresh the
source-cited registry, UI-label, diagnostic, template, permission, export-file
and feature-map inventory. Then run:

```sh
npx vitest run scripts/manual-evidence/source-inventory.test.ts
npx vitest run src/manual.coverage.test.ts
```

The first test checks the evidence snapshot and all 56 diagnostic sites, 10
panel examples and 32 feature sections. The second checks node pages, field
anchors, internal links, figure references, language rules and other handbook
invariants. The screenshot gate still reports missing images; neither test can
verify that an illustration matches the running editor.
