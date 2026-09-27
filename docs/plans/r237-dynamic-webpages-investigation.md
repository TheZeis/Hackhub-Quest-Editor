# r237 — Dynamic webpages: investigation (Next up #4)

**Status: investigated; decision pending (Zeis).** Green-lit 2026-09-27
from the r235 roadmap: "can the SDK's dynamic pages integrate with our
static page builder?" This is the feasibility answer, with the verified
surface, the no-code subset, the honest boundary, and the open in-game
unknowns that must be probed before any build. No code changed in this
round.

Background: [`r129`](r129-website-search-metadata.md) first noted the
surface ("the editor has no dynamic-page surface, and that is a design
question"), [`r172`](r172-schedule-beat.md) named the reference use case
(Rawlings' "articles pop up" Uplink flow — a page that renders posted
articles). This round answers the design question.

## 1. The verified surface (SDK 0.24, pinned `index.d.ts`)

**Static page** — what the editor ships today (`WebsitePageDefinition`):

```
{ path, title, html, seo?, description?, search? }
```

One fixed HTML string, baked into the export. The page sees nothing; it
is the same for every visitor, every time.

**Dynamic page** (`DynamicWebsitePageDefinition`):

```
{ path, seo?, metadata: (context: PageContext) => PageMetadata | null }
```

A function the engine calls **on every request**. It receives

```
PageContext = { url, params: Record<string,string>, query: Record<string,string>, searchStr? }
```

and returns per-request `PageMetadata` —

```
PageMetadata = { title, description?, html, search?, exports?: Record<string,any> }
```

— or **`null`, which makes the page not exist for that request**.

Consequences that static pages cannot do:

- **Content varies per request** — by URL, by path params, by query.
- **Title / description / search terms vary per request** — search can
  rank the "current" article, not just a fixed page.
- **Existence varies per request** — a wrong ID can be a genuine 404
  ("existence" becomes a per-request judgment).
- **Per-page `exports`** — functions callable from *that page's* inline
  `<script>`, able to capture the request (a page button can call
  `currentArticle()` and render client-side).

**The container** — `Website` class (`RegisterWebsite`):

```
Pages: (WebsitePageDefinition | DynamicWebsitePageDefinition)[]   // union — mixed
Exports?: Record<string, any>    // site-level globals callable in every page's HTML
```

Static and dynamic pages coexist in one site. Page HTML renders in a
**sandboxed iframe** with a `HackhubSDK` global (declared in the class
docs — e.g. `HackhubSDK.Mail.send(…)` from page scripts; in-game
behaviour not yet probed, see §5).

**Key architectural finding: the compiler already emits the `Website`
class** — `runtimeSource.ts` `registerWebsite` builds
`class extends sdk.Website { constructor(){ … this.Pages = pages; } }`
and calls `sdk.RegisterWebsite(cls)`. It does *not* use the declarative
`WebsiteDefinition` (which is static-only and could never carry dynamic
pages). Dynamic pages therefore need **no new registration path** — they
are additional entries in the same `Pages` array, alongside the static
ones. The emitter even has an `extraPages` push hook, currently always
called with `[]`. The emission change is small; the design work is in
what the per-request function is allowed to do.

What the emitter does not do yet: set `Exports` (site-level or
per-page), and of course emit any `metadata` function.

## 2. What a no-code subset can express (three building blocks)

Ascending capability, each usable alone:

**B1 — Token pages (cheapest).** The author writes a page template with
tokens; the emitted handler runs our existing `__QE.fill` over
`{{query.x}}` / `{{params.x}}` plus the already-shipped token scopes
(`player.username`, `data.*`, `random.*`). Use: confirmation/echo pages,
"your report, {{player.username}}", simple GET forms where the browser
carries the values in the URL.

**B2 — Data-driven pages.** The author defines a **record table** on the
site (fields + rows) and a page that picks one record by a query key
(e.g. `/uplink` + `?article=`). The handler looks up the record, fills
the template; no match → `null` (404 — the record's *existence* is a
clue mechanic: only IDs the player actually found resolve). Use:
Rawlings' article flow, directories, dossiers, market listings.
Per-request title/description let search index each resolved record.

**B3 — Interactive pages (exports + the iframe bridge).** Per-request
`exports`: the handler emits closures capturing the request
(`currentArticle()`, `nextLink()`), callable from the page's inline
scripts — interactivity without a server. Separately, page HTML has the
declared `HackhubSDK` global, so a page button can call
`HackhubSDK.Mail.send(…)` and the quest's **existing `Mail.Sent`
trigger** fires — a webpage "form" the quest already knows how to react
to, with no new plumbing. And site `Exports` (currently unemitted) can
expose quest-scoped logic — e.g. an export that writes quest Data, so
the quest's own state shapes the *next* visit (read the article → the
page changes on revisit).

**The honest boundary.** What this subset *cannot* express without a
code-authoring surface: arbitrary per-request logic — branching
conditions over quest state, computation, stateful sessions beyond what
tokens + records + exports carry. That is the line where a no-code
editor meets "the author writes JS". The subset deliberately stops
there; if a quest outgrows it, that is the argument for a future
code-view escape hatch — a scope decision for Zeis, not something this
round assumes.

## 3. What that buys gameplay-wise

- **The website becomes world state, not a static prop.** Content can
  differ per player, per quest progress, per in-game time (the handler
  is mod code — it can consult the same state our runtime does).
- **404 as a mechanic.** The first surface where a resource's existence
  is a per-request judgment.
- **Personalization.** Greet the player by name; show *their* case-file
  page (quest Data → HTML).
- **Forms that the quest already hears.** Page → `HackhubSDK.Mail.send`
  → `Mail.Sent` trigger → objective — with only B3's wiring.

## 4. Cost, if built

- **Schema** — `WebPageSchema` is static-only; a dynamic page is a new
  sibling shape (or an optional `dynamic` block: token list / record
  table / query key / template). Website docs are project-level, **not
  canvas nodes** — so no node-count churn, no template invariants.
- **Builder UI** — the WYSIWYG `WebsiteBuilder` gets a "dynamic" mode:
  the same HTML editor plus the token/record fields.
- **Emission** — `registerWebsite` pushes `{path, seo, metadata: fn}`;
  `fn` = fill + lookup + null fallback (+ optional exports). Reuses
  `__QE.fill`, `dataScope`, the guarded-SDK-call discipline already in
  the runtime.
- **Permissions (AR17)** — today permissions are computed from graph
  nodes and pack steps (`events/shell/network/mail/bank/ui/filesystem`).
  A handler that reads e.g. the player's identity needs the right
  permission string; the build round must decide the mapping (probably:
  a declared capability set on the dynamic page, mapped onto existing
  strings).
- **QA** — extend the `qe24-website.test` scaffold (see §5).
- **Manual + README** — new website-builder section; counts unchanged
  (no new node type, no new fields on nodes).

## 5. Open unknowns — probe in game before building (never guess)

All verified against the declarations; none of these can be answered
from `index.d.ts` alone.

1. **Path-param syntax.** `params: Record<string,string>` is declared,
   but the path *pattern* syntax (e.g. `/article/:id`?) is not documented
   in the declarations. Probe: one dynamic page with a pattern path;
   record what lands in `params`. (Candidate for a docs/03 question if
   the probe is ambiguous.)
2. **HTTP events for dynamic pages.** Every HTTP event QA row (r166:
   `http-request` / `http-response` / `http-intercepted`) ran against
   **static** pages. The dynamic handler inserts a mod-code step in the
   request path — the events may differ. Probe: the existing
   `o-http-request` / `o-http-response` objectives against one dynamic
   page on `qe24-website.test`.
3. **Caching.** Does the browser/game cache a dynamic response? A page
   that should change after a quest beat must actually re-request.
   Probe: a page whose output depends on a quest Data value, visit
   before/after the beat.
4. **`HackhubSDK` inside page iframes.** Declared in the class docs; the
   surface available to page scripts (which namespaces, whether quest
   state is reachable) is unverified. Probe: a button that calls
   `HackhubSDK.Mail.send` on a dynamic page; watch `Mail.Sent`.
5. **`null` → 404 behaviour.** The declaration says `null` = no page;
   confirm the browser's actual behaviour (error page? empty frame?) so
   the manual can state what the player sees.

**Proposed phase 0** (evidence before design, r234-style): one hand
dynamic page in the QA scaffold answering 1–5, plus its STATUS rows.
Small, no editor surface — it can ride the next build round or stand
alone.

## 6. Recommended phasing (for the decision)

- **Phase 0** — QA probe page (answers §5; one scaffold edit + STATUS
  rows).
- **Phase 1** — **B1 token pages**: the smallest real feature; ships the
  dynamic-page *shape* end to end.
- **Phase 2** — **B2 record tables**: Rawlings' article flow becomes
  authorable (the r172 "missing half").
- **Phase 3** — **B3 exports/forms**: personalization from quest Data,
  page forms heard via existing triggers.

The faked-decode philosophy from
[`docs/ideas/custom-hacking-tools.md`](../ideas/custom-hacking-tools.md)
applies: the page's *behaviour* is authored data (tokens, records,
exports config), and the emitted handler is the thin, predictable
mechanism — no per-quest JS from authors.

## 7. Decision asked of Zeis

1. Approve the phased shape (0 → 1 → 2 → 3), all of it, or a prefix?
2. Confirm the no-code boundary in §2 (no per-request JS from authors)
   — or start the code-escape-hatch conversation.
3. Where the probe goes: ride the next build round, or a standalone
   micro-round now.
