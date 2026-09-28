# r238 — Dynamic pages probe: plan, build, QA checklist

**Status: probe built and unit-verified; awaiting Zeis's in-game run.**
Zeis green-lit the r237 recommendation (2026-09-27): a test page to answer
the five open questions, built the way the mail-function investigation was
done — a QA mod plus a checklist.

## 1. Why a hand-made mod (not the editor export)

The editor cannot express dynamic pages yet — that is the feature under
test. So the probe is **hand-authored** the same way the QA harness
(`reference/sdk-0.24-qa/mod/`) is: a small mod that registers the Website
class directly, using exactly the patterns the editor's future emission
will use (the `registerWebsite` emitter already emits this class). The
probe is therefore a working template for the build, not a throwaway.

## 2. What is being tested

One site, `http://qe24-dyn.test`, with one static page and seven dynamic
ones. Each dynamic page answers one or more of the r237 questions:

| Page | What it is | Question(s) answered |
|------|-----------|----------------------|
| `/` | **Static control** — the same for everyone, every time | Baseline for the HTTP-event rows; bonus: do site-level exports reach a *static* page? |
| `/echo` | Prints back whatever is in the address (`?msg=…`) **and dumps the raw data the game passes to the page** | Per-request content works? What do `url` / `params` / `searchStr` actually contain? (**Q1** path-param evidence) |
| `/article/:id` | A tiny library: the address number picks an article; a number with no article makes the page **not exist** | Do path params arrive? (**Q1**) What does the player see when a page doesn't exist? (**Q5**) |
| `/state` | Shows a **visit counter** and a phase the quest flips after your first visit | Does the game re-print the page, or serve a remembered copy? (**Q3** caching) |
| `/news` | A front-page **article list**. When the quest's beat fires, a new article appears on top and the old ones drop one slot | The **bcc.com pattern** — our version vs the game's own front page, side by side |
| `/form` | A button that sends a mail **from the page itself** | Can page scripts use the SDK bridge? (**Q4**) Does the quest hear the mail? |
| `/exports` | The page carries its own little helper, built from the address you just typed, that the page's button calls | Per-page exports reach page scripts? |
| `/site-exports` | Same site-wide helper, called from a dynamic page | Site exports from a dynamic page (the static page checked it in DP-01)? |

**HTTP events** (r237 **Q2**) ride along for free: the quest ticks an
objective every time it hears `Http.Response` for this host — so every row
doubles as "did the page-view event fire for a dynamic page?", with DP-01
(static) as the control.

The **beat** (the phase flip + the new top article) fires automatically on
the first `/state` visit — no terminal, no harness command needed.

## 3. What is verified here (without the game)

`src/compiler/__tests__/dynprobeMod.test.ts` loads the probe mod against a
stub SDK and exercises each page's print-function like the game would:

- the site registers with 8 pages: 1 static + 7 dynamic;
- `/echo` prints the query value and the raw context dump;
- `/article/:id` renders a known article (via the param **and** via the raw
  address when the param is empty) and returns "no page" for an unknown
  number — **falsified**: the 404 test goes red when the fallback is
  broken;
- `/state` advances its visit counter and shows the flipped phase after
  the beat;
- `/news` lists the three articles, and after the beat the new article is
  first with the old ones dropped one slot;
- `/exports`' per-page helper returns the right value for the request;
- site exports are callable and both page kinds reference them;
- the quest carries the twelve checklist rows as objectives, in run order.

The game-side half (what the browser actually renders, events, caching,
the iframe bridge) is answered by the run below.

## 4. How to run it

1. Install `qe-sdk-024-dynprobe-1.0.0.zip` (in `delivery/`) next to the
   other QA mods; the Harness 1.0.29 can stay installed.
2. Restart the game, open Hackhub: accept the **"QA probe (r238)"** feed
   post (or claim `QEDynProbeQuest` from the sandbox group).
3. A mail arrives with the same instructions.
4. Work the quest tracker **top to bottom** — the twelve objectives are
   the checklist, each one says what to open and what to write down.
   DP-06 (first `/state` visit) fires the beat; do the rows in order so
   DP-05/DP-08 bracket it correctly.
5. File the written-down values in this file's table below (or a new
   `QE24-Playtest-DynProbe.md` in this folder), then we read the results
   together and pick the phase-1 shape.

## 5. QA checklist

For each row: **do** the thing, **record** what is asked, and tick the
objective. "Green" = the thing works as the declarations promise.

| Row | Do | Record | Green means |
|-----|----|--------|-------------|
| **DP-01** control | Open `http://qe24-dyn.test/` | The site-export line: a greeting, or an error text? | The site loads at all; objective ticks (HTTP event fires for a static page); bonus: site exports reach static pages |
| **DP-02** echo | Open `http://qe24-dyn.test/echo?msg=zeis` | The page must say "You asked for: zeis". **Copy the whole raw-context box** (url, params, query, searchStr, allKeys) | Per-request content works; the box is the Q1 evidence for the param syntax |
| **DP-03** article hit | Open `http://qe24-dyn.test/article/1` | The article title renders. Copy the "params as passed" line | Q1: params arrive (or the fallback worked — the page says which) |
| **DP-04** article miss | Open `http://qe24-dyn.test/article/99` | **Exactly** what the browser shows — error page? blank frame? the site's own 404? | Q5 settled: what "no page" looks like to a player |
| **DP-05** news before | Open `http://qe24-dyn.test/news` **before** touching `/state` | The three article titles and their order | The list renders; baseline for the A/B |
| **DP-06** state first | Open `http://qe24-dyn.test/state` | phase + visits line (expect `claimed` / `1`). The debug log shows "beat fired" | The beat mechanism works in game |
| **DP-07** state second | Open `/state` **again** | visits must now be **2**; phase must be **beat-fired** | Q3: **visits still 1 = the game cached the page** — everything stateful needs the re-request workaround |
| **DP-08** news after | Open `/news` **again** | The "UPDATE" article is #1; the old three dropped one slot. If you have a questline save: compare with **bcc.com's** front page | The bcc pattern is reproducible by a mod |
| **DP-09** talk-back | Open `http://qe24-dyn.test/form`; note the "HackhubSDK global" line; **click the button** | The Result line: `sent (no error thrown)` / `NO HackhubSDK…` / `NO Mail.send` / `ERR: …` | Q4: the iframe bridge exists (or not — the line says which) |
| **DP-10** mail from page | Automatic — ticks when the DP-09 mail arrives | Nothing to do; just note whether it ticked at all | The quest hears page-sent mail → the "forms that the quest already hears" building block works |
| **DP-11** page exports | Open `http://qe24-dyn.test/exports?article=2` | The span must read `article-2` | Per-page exports reach page scripts (the request-capturing interactivity block) |
| **DP-12** site exports | Open `http://qe24-dyn.test/site-exports` | The line shows the greeting for "zeis" | Site exports from a dynamic page (complements DP-01's static check) |

**Reading reds** (what each failure changes in the r237 plan):

- DP-02/03 raw boxes show **no params** and no usable syntax → Q1 needs a
  docs/03 question; token pages (phase 1) still work via `query` only,
  path params wait.
- DP-04 "no page" renders as something confusing (blank frame) → the
  manual must state it; the 404-as-clue mechanic gets a warning.
- DP-07 **cached** → stateful pages (beat-driven news, /state) need the
  cache-buster pattern (the future emitter appends a changing token to the
  links it prints) — a build detail, not a blocker.
- DP-09/10 the bridge is **absent** → the talk-back building block falls
  out of scope; forms would need the export-only route (DP-11/12).
- DP-11/12 exports **absent** → phase 3 shrinks to server-side
  rendering only (no client-side interactivity).

## 6. Files

- `reference/sdk-0.24-qa/dynprobe/` — the probe mod (manifest + dist/mod.js)
- `reference/sdk-0.24-qa/delivery/qe-sdk-024-dynprobe-1.0.0.zip` — installable
- `src/compiler/__tests__/dynprobeMod.test.ts` — the unit verification above
