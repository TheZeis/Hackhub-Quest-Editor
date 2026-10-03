# r269 — a public website with a clue in plain sight

## Scope

Continue the manual backlog after [r268](r268-passphrase-howto.md). The r265 order makes **Build a website the player has to find** the next how-to. Screenshot capture is still blocked in this environment, so proceed with the next feasible documentation item. No `src/**` product-copy or behavior changes are authorized.

Ground-truth extraction is complete before editing `how-do-i.html`.

## Ground truth

| Claim needed for the walkthrough | Evidence |
|---|---|
| The **Websites** button opens the builder. The site list is on the left, and a site's pages are beside it. | `public/manual/guides.html:181-197` |
| A blank site starts at `example.net` with a Home page at `/`; its starter text is editable. The builder offers **Blank website** in both the empty state and **Add website** picker. | `src/editor/websites/WebsiteBuilder.tsx:112-142,183-210`; `src/schema/project.ts:279-284`; `src/editor/websites/pageEditor.tsx:188-203` |
| The page builder offers **New page**; **Path**, **Browser tab title** and **Listed in the in-game search** are visible page fields. **Newsletter article** is a public page template. | `src/editor/websites/WebsiteBuilder.tsx:313-316,579-607`; `src/templates/pages.ts:308-315` |
| **Host** is the address players type in the in-game browser. A site name is optional author-side labeling. | `src/editor/websites/WebsiteBuilder.tsx:275-301`; `src/schema/project.ts:83-87` |
| A host must be distinctive. Reusing one host for two sites creates an export error, and `example.net` triggers a placeholder warning. | `src/compiler/compile.ts:640-647` |
| **Listed in the in-game search** starts on. Turning it off removes the page from search but leaves its URL reachable. Keep it on for this public clue. | `src/schema/project.ts:55-65`; `src/editor/websites/WebsiteBuilder.tsx:600-607` |
| The page editor has **visual**, **code** and **preview** views. The visual view lets the author edit visible page text; Preview shows the site and page address. | `src/editor/websites/WebsiteBuilder.tsx:442-480,758-789,874-956`; `src/editor/websites/pageEditor.tsx:172-194`; `public/manual/guides.html:188-197` |
| Give the player the site's host in an earlier clue. The built-in Byline project does this and registers its site in project websites without a `Register domain` node. | `src/templates/byline.ts:13-14,50-64,114-150` |
| Optional visit-gating can use **Browser.WebsiteOpened** and match `Url` to a page. That event proves the page opened, not that it was read. | `src/schema/eventDocs.ts:49`; `src/templates/byline.ts:73-75` |
| The screenshot slot is already declared. | `docs/plans/r164-manual-screenshots.md:203` |

The next how-to covers a hidden page. This walkthrough therefore keeps the clue page visible and listed in search; `seo: false` is not the pattern here.

## Planned edits

1. Turn the website row in `public/manual/how-do-i.html#howto-list` into a link and add its section after the passphrase walkthrough.
2. Use the blank-site workflow: replace the placeholder host, edit the public home page, leave it listed in search, preview it, and give the player its address through the story.
3. Explain optional visit-gating without claiming it detects reading. Keep every sentence under G18's twenty-word limit.
4. Reference the declared `howto-07-website.png` slot; do not fabricate a screenshot.
5. Refresh manual generation, run manual coverage plus the docs-only typecheck/build tier, and run `git diff --check`. Do not run the full suite because no `src/**` files will change.
6. Update the handoff and README roadmap, archive the displaced r264 row, and leave `EDITOR_BUILD` at `2026-10-03.r267`.

## Capture constraint

No Chromium, Firefox, Playwright or Puppeteer is available. `public/manual/img/` is absent. No screenshot or visual review is possible here; record the coverage count after the new figure reference lands.

## Result

The website row now links to `public/manual/how-do-i.html#howto-website`. The walkthrough builds a blank, searchable home page on a distinctive host, places the clue on that page, previews the address, and gives the player the host in an earlier message. It links the optional visit objective pattern to the existing objective walkthrough and states that opening a page does not prove reading. The separate `Register domain` node is presented only for a `whois` lookup.

The manual remains documentation-only. The new figure references `howto-07-website.png`; no screenshot was fabricated or visually reviewed. The index now has seven written and ten unwritten how-tos. `EDITOR_BUILD` remains `2026-10-03.r267`.

| Check | Result |
|---|---|
| `npm run recover` | Healthy at the pre-round checkpoint; no recovery residue; dependencies present. |
| `npm run gen:manual` | 41 node pages written; zero awaiting prose; 285 search entries from 51 pages. |
| `npx vitest run src/manual.coverage.test.ts` | **27 passed**; G18 remains zero; the index covers all 17 how-tos; G8 reports **79** missing screenshots. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed, including typecheck. Vite emitted its nonfatal warning that the main JavaScript chunk exceeds 1 MB. |
| `git diff --check` | Passed after the final documentation changes. |
| Screenshot / visual / in-game review | Not performed; this environment has no browser binary or Playwright/Puppeteer package. |

No full suite was run because no `src/**` files changed. Origin was fetched immediately before the documentation commit; the session branch had no remote-only commits. No pull request was requested.
