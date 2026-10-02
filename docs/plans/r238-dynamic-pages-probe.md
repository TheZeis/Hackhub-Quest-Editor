# r238 — Dynamic pages probe: plan, build, QA checklist

**Status: RUN (2026-09-28, game 1.3.13). The content half is green; the
HTTP-event half is still unrun and needs one more pass with the quest claimed
*first*. Details in `reference/sdk-0.24-qa/STATUS.md` and
`docs/03` §24.**

Headline results from Zeis's write-up (`QE24-TestResults-DynProbe+ModSettings.md`,
`QA-filedump` branch):

| Question | Answer |
|---|---|
| Per-request content | **Green** — `/echo?msg=zeis` printed the value back |
| Path params | **Green** — `/article/1` received `{"id":"1"}` |
| The null/404 look | **Answered** — the browser's own error: *"404 / This site cannot be reached / Firebear can't find the server at https://…/article/99"* (black page, white text) |
| Caching | **Green** — no caching: the visit counter climbs on every open |
| The iframe `HackhubSDK` bridge | **Green** — "HackhubSDK global in this iframe: yes", and the page's button sent a mail (`sent (no error thrown)`) |
| Exports (per-page + site-level, static + dynamic) | **Green** — all four combinations worked |
| HTTP events per page | **Red — and already known.** The quest *was* claimed first (16:42:36, before every page visit — I misread this at first and Zeis corrected me). No `http-response` line ever appeared. This folder's own blocked-rows table already records from r166 that mod-hosted **static** sites don't tick `Http.Request`/`Http.Response`; this run confirms the same fence for dynamic ones |

Two things the re-run must watch: **each page view renders twice** (the
handler logs twice a second apart; the counter went 2 → 4 on one revisit), and
the **beat never fired**, because it was wired to an `Http.Response` that never
comes — so **DP-06/07/08 only ran their "before" half and the bcc.com A/B is
still unverified in game**. Filed as `docs/03` §24.

Both are **probe** faults, not game faults, and both are fixable without the
developers: log every `Http.Response` *before* filtering (so "no event" and
"unexpected host" stop looking identical), and fire the beat from something
that demonstrably works — a terminal command or an objective the player ticks
— instead of an event this folder had already fenced.

---
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

## 5. QA checklist (1.1.0 — the rows the quest carries)

For each row: **do** the thing, **record** what is asked, and tick the
objective (or tick it by hand with `qedyn tick <row>` — most rows cannot tick
themselves, because `Http.Response` never reaches the mod).

| Row | Do | Record | Green means |
|-----|----|--------|-------------|
| **DP-01** control | Open `http://qe24-dyn.test/` | The site-export line: a greeting, or an error? | Site exports reach a *static* page (DP-12 checks a dynamic one) |
| **DP-02** echo | Open `/echo?msg=zeis` | **Copy the whole raw-context box** (url, params, query, searchStr) | The path-param syntax evidence |
| **DP-03** article hit | Open `/article/1` | The title renders; copy the "params as passed" line | Path params arrive (or the URL fallback worked — the page says which) |
| **DP-04** article miss | Open `/article/99` | **Exactly** what the browser shows | Settles what "no page" looks like to a player |
| **DP-05** news before | Open `/news` **before** the beat | The three titles and their order | Baseline for the A/B |
| **DP-06** fire the beat | Type **`qedyn beat`** in the terminal | The log line `beat fired (source=qedyn beat)` | The beat works at all — 1.0.0 could never fire it |
| **DP-07** news after | Open `/news` **again** | The UPDATE article is #1, the old three dropped a slot; compare with **bcc.com** if you have a questline save | **The headline question**: the bcc pattern is reproducible by a mod |
| **DP-08** state twice | Open `/state` twice | The counter must climb — expect **+2 per open** (the double render); phase reads `beat-fired` | Confirms the double render, and that nothing is cached |
| **DP-09** direct mail | On `/form`, click **button A** | **What `Mail.send` returned**: `null` = refused, an id = accepted. Then check the inbox | **RUN 2: returned the id `yD1oMYYHUX` — accepted — and no mail arrived.** Not the §14 refusal; a delivery bug. Now docs/03 §25 |
| **DP-10** bridge mail | Click **button B** | Did *this* mail arrive? | **RUN 2: returned the id `ra1DgwPOsB` — also accepted — and also never arrived.** The bridge does not rescue delivery either |
| **DP-16** the `to:` test | Type **`qedyn mail`** in the terminal | It sends three mails: one **with** `to: "player@gomail.com"`, one **without** any `to`, and one with **your real address**, and prints all three ids plus your address. Report which ones land in the inbox | **RUN 3: only B (no `to`) arrived — the `to:` field is what loses a mail.** Whether that is a wrong address or any `to:` at all is what mail C decides |
| **DP-11** page exports | Open `/exports?article=2` | The span must read `article-2` | Per-page exports reach page scripts |
| **DP-12** site exports | Open `/site-exports` | A greeting for "zeis" | Site exports from a *dynamic* page (DP-01 was the static one) |
| **DP-13** event roll-call | Type **`qedyn status`** | How many `Http.Response` events the mod was offered, and every one of them | **Zero is the expected result** — it confirms the r166 fence now covers dynamic pages too |
| **DP-17** inbox roll-call (1.3.0) | Type **`qedyn inbox`** | Every mail the game says is in the inbox, each with its `to:` field | If a mail that never showed up **is** in this list, it was never dropped — the inbox screen is not drawing it |
| **DP-15** claiming it | Did the quest appear on your Hackhub feed? | Yes/no — and if not, whether `qedyn claim` got it | Mod quest posts have stopped surfacing game-side (docs/03 §21); this row records whether that is still true |

**Reading reds** (what each failure changes in the r237 plan):

- DP-02/03 raw boxes show **no params** and no usable syntax → Q1 needs a
  docs/03 question; token pages (phase 1) still work via `query` only,
  path params wait.
- DP-04 "no page" renders as something confusing (blank frame) → the
  manual must state it; the 404-as-clue mechanic gets a warning.
- DP-08 **counter does not climb** → the page is cached after all; stateful
  pages need a re-request trick (a changing token in the links the emitter
  prints) — a build detail, not a blocker.
- DP-09 **an id returned but no mail** → the call was accepted and lost in
  delivery; a different bug from the refusal, and one to file.
  *(Run 2: this is what happened — see §7.)*
- DP-10 **the bridge mail also fails** → the documented workaround does not
  work for mail, and a no-code editor cannot offer page-driven actions at
  all without a new game-side surface.
- DP-09/10 the bridge is **present but not permitted** → the talk-back building block needs the `Events.emit()` → top-level `Events.on()` bridge (r243), not a direct call
  out of scope; forms would need the export-only route (DP-11/12).
- DP-11/12 exports **absent** → phase 3 shrinks to server-side
  rendering only (no client-side interactivity).

## 6. What the third run changed (2026-10-02, probe 1.3.0)

- **`to:` is confirmed as the culprit.** Only the mail with no `to:` arrived;
  the one addressed to `player@gomail.com` was accepted and vanished. Two
  explanations remain — *that address does not exist* versus *any `to:` sends
  the mail away from the player's inbox* — and they need different fixes, so
  `qedyn mail` now sends a third mail to the player's real address
  (`Mail.getPlayerEmail()`), which the command prints.
- **`Mail.getInbox()` separates "dropped" from "not drawn".** A mail that is
  in the data but missing from the inbox screen is a display bug, not a
  delivery bug, and the two look identical from the player's chair. `qedyn
  inbox` prints the list so the run can tell them apart.

## 6b. What the second run changed (2026-09-28, probe 1.2.0)

- **`to:` became the prime suspect.** DP-09 and DP-10 both returned real mail
  ids, so the page's mail is *permitted* — it is lost afterwards. The one mail
  that has ever arrived from this mod (the `OnStart()` startup mail) is the
  only one carrying no `to` field. Hence **DP-16 / `qedyn mail`**: one mail of
  each shape, sent from a context that already works, so the inbox decides.
- **Two bugs in my own command, both silent.** `qedyn status` wrote only to the
  game log and never to the terminal, so it looked broken; and `qedyn tick 1`
  demanded a full row name and said nothing when it got anything else. Both
  fixed — `out()` now prints *and* logs, and `tick` takes a number or a name
  and says when the quest is not claimed. A tester must never be left guessing.

## 7. Files

- `reference/sdk-0.24-qa/dynprobe/` — the probe mod (manifest + dist/mod.js)
- `reference/sdk-0.24-qa/delivery/qe-sdk-024-dynprobe-1.2.0.zip` — installable
- `src/compiler/__tests__/dynprobeMod.test.ts` — the unit verification above
