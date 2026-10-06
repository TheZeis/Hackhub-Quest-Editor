# Manual information architecture — approved

**Status:** Approved by the user on 2026-10-06. The table of contents and static HTML under `public/manual/` are approved for authoring. This file records the accepted structure; it is not reader-facing copy.

## Entry and reading paths

Keep `public/manual.html` as the entry point and keep its existing redirect to `public/manual/index.html`, so old bookmarks continue to work. Preserve the static, local manual delivery and every existing page/anchor. Add or reorganize content without removing stable destinations.

The home page should offer three clear routes:

1. **Learn by doing:** the first-quest tutorial, then the short quest-concepts guide.
2. **Look up one thing:** searchable node, field, feature, event, message, permission, and export-file references.
3. **Fix a problem:** symptom-led troubleshooting, then the relevant message explanation.

Keep the local search index, styles, scripts, offline behavior, and print stylesheet. Do not add a remote service or require a network connection to read the manual.

## Proposed page tree

### Start here — `index.html`

- What the editor makes and who this handbook is for.
- The three reading paths above, with direct links.
- A small, source-checked set of headline facts and the editor build stamp.
- How to find a control, a node, or an exact warning.
- Honest scope: what is covered, what is still a known limit, and where to start when something goes wrong.

The approved content work corrected the count: `index.html` now says seventeen walkthroughs, matching the 17 linked recipes in `how-do-i.html`.

### Learn the editor

1. **Your first quest — `tutorial.html`**
   - Find the main screen regions.
   - Load a starter template and read its map.
   - Add an objective and connect its trigger.
   - Add a reward and ending.
   - Check, export, install, and play.
   - Each step stays numbered, short, and testable in the running app.
2. **How a quest works — `concepts.html`**
   - Project, quest map, and what node position does and does not mean.
   - Quest start and lifecycle.
   - Wire kinds and matching sockets.
   - Objectives, events, and completion.
   - Export, permissions, and the difference between a project and a finished mod.

### Feature guides — `guides.html`

Keep the current stable anchors and organize around visible parts of the editor:

1. **The screen and its controls:** welcome panel; top bar; project/quest tabs; node palette and filter; canvas and canvas tools; status bar; inspector; search and template picker.
2. **Inspector tabs:** Node, Quest, and Mod. Explain which selection opens each tab and the visible groups within Quest settings: Identity, Hackhub feed post, Rewards, Behaviour, Employer, and Health.
3. **Mod settings and local editor settings:** what is saved in the project, what stays on this device, and which controls are available.
4. **Dialogues:** authoring, ordering, replies, and timing, with shipped limits clearly separated from expected game behavior.
5. **Websites:** domains, pages, search visibility, and preview; distinguish editor preview from verified in-game behavior.
6. **Templates and reference sheets:** cover all 14 current entries, sourced from the registry. Make clear which are the 12 quest templates and which are the two reference sheets:
   - Blank quest
   - First Contact
   - The Byline
   - Cold Call
   - The Harbour Manifest
   - The Help Desk Leak
   - Bad Attachment
   - Six Tries
   - Dead Air
   - Cold Storage
   - The Ledger Contract
   - The Long Game
   - Node Reference (reference sheet)
   - Quest Cookbook (reference sheet)

   For each entry, show only current source-backed facts (name, purpose, difficulty, node count, and what loading it replaces); explain how to preview, load, save, and avoid losing current work.
7. **Dry run:** what it can and cannot verify; how to read its trace and messages.
8. **Addons and tool packs:** installing/importing, loaded versus missing packs, target matching, and what an addon author must disclose to quest players.
9. **Canvas tools and Settings.**
10. **Things outside a quest:** start-menu entries, desktop widgets, right-click entries, translated words, handbook links, and generated tags. State clearly which surfaces ship and their verified limits.

### How do I… — `how-do-i.html`

Keep all 17 existing recipe anchors. Group the index by the player's job, without changing current section IDs:

**Build the quest spine**

1. Give the player an objective, and make it tick.
2. Branch the story on something the player did.
3. Ask the player for a passphrase, with a wrong-answer route.
4. End the story cleanly with Complete quest.

**Write and time conversations**

5. Send the player a message from an NPC.
6. Make a message arrive only after something else happens.
7. Chain conversations together.

**Create a place or clue to investigate**

8. Build a website the player has to find.
9. Hide a page from in-game search.
10. Place a file on a remote device.
11. Give the player a lead to look up.
12. Gate progress on a target scan.

**Add systems, rewards, and updates**

13. Pay the player, and charge them.
14. Match a tool addon to its target.
15. Route on whether a supported app is installed.
16. Customize a template safely.
17. Update an exported quest.

Retain the existing pattern for each recipe: what it makes, what is needed, numbered steps, variations, and what to check if it fails. Link each step to the relevant node/feature reference. Verify visible labels and actions against the running app when possible; never use an illustration as proof of behavior.

### Node reference — `nodes.html` and `nodes/*.html`

Keep one page for every one of the 41 registry node types, grouped by the ten current palette categories:

- Quest lifecycle (4)
- Objectives (1)
- Triggers (1)
- World building (8)
- Communication (2)
- Custom terminal (1)
- Effects (11)
- Community addons (2)
- Flow control (8)
- Layout (3)

Each node page should make these easy to find:

- What the node does, in ordinary words.
- Every editable field, including nested list fields, with its actual label, purpose, default, empty behavior, valid choices, and numeric units/range where applicable.
- Every input and output socket, the wire it accepts or sends, and dynamic-port behavior when present.
- Relevant source-backed warnings, shipped limitations, and a concrete link to a recipe when one exists.

Keep all existing field anchors. The checked inventory currently has 164 editable fields, 187 cited field-path rows including non-editable schema entries, and 80 sockets. Do not invent a setting or imply that position on the canvas changes execution order.

### Checking your quest — `checking.html`

1. Where messages appear: node badges, selected-node field warnings, panel messages, and export report.
2. What each level means, with words and distinct visual shapes/labels as well as colour; never rely on hue alone.
3. **Complete message index**, grouped by where a message appears:
   - Graph and quest-flow issues.
   - Field-level warnings.
   - Messages written inside editor panels.
   - Compiler/export warnings, including target-matching messages.
4. Give every current message variant a stable anchor and a trace to its source-inventory row. Explain where it appears, what it means, and a concrete next action only when supported by the product.
5. Include exact searchable wording where useful, but do not treat a similar sentence as proof that a different diagnostic is covered.

The source inventory has 56 diagnostic sites and 10 curated panel-message examples, mapped to 63 unique message blocks. The 56 sites include 7 graph issues, 9 field warnings, and 40 export or target-matching warnings. `docs/manual/diagnostic-coverage.json` preserves the source-to-anchor mapping. Source citations and semantic review are recorded in the r276 follow-up; lexical matches alone do not prove a correct explanation.

### Exporting and installing — `export.html`

1. Read the export window and distinguish blocking problems, warnings, and informational messages using verified product wording.
2. Explain all seven current permissions in plain language.
3. List all eight fixed archive paths and all four conditional output families (mod icon, mod cover, quest images, and desktop widgets), including the condition for each.
4. Install the downloaded archive and distinguish it from the editable project file.
5. Explain the editor build stamp and how to check it.

### When something goes wrong — `troubleshooting.html`

Keep the symptom-first decision trees for: nothing runs; an objective never ticks; the player cannot get into a machine; and an export report has a problem. Keep the FAQ, and link every suggested fix to the exact node field, message, or export step. Do not promise that an editor preview reproduces game behavior.

### Appendices — `appendices.html`

1. Glossary, with one plain definition per term.
2. Keyboard and mouse reference.
3. Known shipped limits and deliberate boundaries, separated from bugs and unverified behavior.
4. All 99 current game events, in their ten source-backed groups.
5. Handbook/editor build-stamp information and how to identify stale documentation.
6. A short reading/accessibility note: captions and descriptive frame titles remain; screen-reader behavior has not been tested and must not be claimed as verified.

## Whole-manual quality rules

- Short paragraphs, one task or idea at a time, active verbs, plain terms, and numbered steps for procedures.
- Write numbers with units and show what they mean. Do not rely on colour or hue alone: pair status and wire distinctions with words, labels, patterns, or shapes.
- Preserve semantic headings, real lists and tables with headers, useful link text, meaningful alt text, and captions/titles for illustrations.
- Keep local search, stable anchors, offline reading, and print styles working. Test search and print after content changes.
- Keep editor screenshots/illustrations truthful to the running app. Any visual claim that cannot be checked in the app stays unillustrated or is labelled as unverified.
- Keep screen-reader output explicitly unverified until it is actually tested; this is not a reason to block the work.

## Approved authoring source and delivery

Keep the existing delivery mechanism and use static HTML under `public/manual/` as the prose source. Keep `public/manual.html` as the redirecting entry point. Continue generating registry-backed node pages and indexes from the checked inventories. Keep CSS, search data and scripts local so the manual stays offline-capable. Do not add Markdown conversion, a new site generator or a new delivery framework in this work.

This preserves current URLs, stable anchors, printing and offline search. The user confirmed this source format together with the approved table of contents.