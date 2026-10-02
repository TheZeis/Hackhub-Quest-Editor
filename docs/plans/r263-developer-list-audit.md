# r263 — audit of the developer list before it goes to SteelWaffe

**Scope.** Every claim in `docs/03-questions-for-the-developers.md` (25 sections),
checked against the two evidence classes we actually have: the pinned SDK
declarations and the in-game QA record. Nothing here re-tests anything in game.

**Sources used.**

- `node_modules/@hotbunny/hackhub-content-sdk/index.d.ts` — pinned `0.24.0`
  (`package.json:41`, installed `package.json` version `0.24.0`), 4,180 lines.
- `reference/hackhub-events.json` — the generated catalogue.
- `docs/archive/sdk-0.24-qa/*` — the transcripts and the `STATUS.md` ledger.
- `docs/plans/r166-sdk-0.24-ingame-qa.md` — the r166 QA grid, which is the
  evidence for §1, §3 and §7 (not the transcripts the header names first).
- `QE24-TestResults-Twotter-6.md` and `QE24-TestResults-Extras.md` on the
  `QA-filedump` branch (`git fetch origin QA-filedump`), since §11 cites one of
  them.
- `docs/07-dev-response-mod-sdk-bug-report-response.md` — his earlier answers,
  which two of our open sections re-ask.

---

## 1. Claims that check out as written

| § | Claim | Where it is backed |
|---|---|---|
| 1 | `curl` returns command-not-found | `STATUS.md:880` — `Command "curl http://qe24-http.test/" not found.`; also `:841`. Game 1.3.0 / build 25341308 |
| 2 | Bettercap prints `SSID: undefined` for an SDK-created AP, but deauth + hashcat still work | `QE24-TestResults - 3.md:138`, verbatim, including the pcap path |
| 9 | A planted `bio: undefined` record survives save → quit → reload unrepaired | `QE24-TestResults - Twotter.md:40` (before) and `:52` (after the reload) — same record, `bio: undefined` both times |
| 10 | `TwotterTweet` has no picture/media field and `postTweet` takes no options bag | `index.d.ts:1943-1950` and `:3630` (`postTweet(tweet: TwotterTweet): void`); the in-game half at `QE24-TestResults-Twotter.md:19` — "None of the tweets carry a picture - not even when opening the detailed tweet" |
| 11 | The three SDK doc comments we quote | `removeUser` `index.d.ts:3624-3626`, `Mail.remove` `:3148-3151`, `OnModPackageUnloaded` `:2072` — all verbatim |
| 11 | `[PruneOrphanQuests] Dropping "QESdk024TwotterQa" (Se8JDmyGoK): no installed content defines it.` | `QE24-TestResults-Twotter-6.md:895` (QA-filedump), quest name and id exact |
| 11 | A plain quit calls no unload hook | same file: the word `unloading` occurs **0** times in 1,009 lines, and the session that created `@qe24_editor` and its five tweets ends at `APPLICATION CLOSING` 14:55:26 |
| 12 | `claim`/`unclaim` are `void`; no state read, no quest list | `index.d.ts:2253`, `:2261`; the only `static` members on `Quest` in the whole file |
| 13 | A disabled mod stays disabled across folder deletion, a newer version and a fresh save | `STATUS.md:387-389` and `:660-675` |
| 14 | The click-handler refusal block, verbatim | `editor-export.notes.md:135-145` |
| 14 | The same refusal from `OnModPackageUnloaded`, and `Mail.remove` working at quest end | `QE24-TestResults-Mail.md:292-328` (all five quoted lines) and `:265` — `mail QA OnAbandon mail sweep: remove id 4y45WyROh1 -> true` |
| 16 | `replyable`'s doc promises `repliedTo`; the event does not carry it | promise at `index.d.ts:1797-1801`; `MailEvent` `:726-734` has no such field; payload verbatim at `QE24-TestResults-Mail.md:172`, and a second reply at `:235` |
| 17 | `MailInfo` declares `subject`, the engine leaves it empty | declaration `index.d.ts:1820-1827`; `QE24-TestResults-Mail.md:87/130/208` — 28, 27 and 30 entries; `:88` finds the probe **by id**; `:89/133/209` — "Probe mails in the inbox by subject: 0" |
| 18 | No `Hackhub.removePost`; the once-claimed rule is documented | `removePost` appears nowhere in `index.d.ts`; `HackhubPost` doc comment at `:2156-2161`, quoted correctly |
| 19 | The SDK's own scaffold and README still ship `apiVersion: 1` | `build.mjs:106` (`REQUIRED_MANIFEST_FIELDS = { apiVersion: 1 }`) and `README.md:426` — both in the pinned 0.24.0 |
| 20 | A comment's `author.name` is required; a post's `author` is optional with the documented fallback | `index.d.ts:92-96` and `:110-112`, quoted correctly |
| 23 | Settings live in the main menu, the `number` widget over-draws underscores, no reset control, values persist and read back | `QE24-TestResults-DynProbe-ModSettings.md:12-15`, rows MS-01/02/07, and MS-06's exact values (`select:"violet", number:1, slider:80`) |
| 24 | Double render, and zero `Http.Response` offered | `QE24-TestResults-DynProbe-ModSettings.md:52`, `:118` (visits 2 → 4) and `:121` ("0 `Http.Response` events offered to the mod") |
| 25 | `MailDefinition.to` is undocumented while `Mail.send` says "the player's inbox" | `index.d.ts:1794` (bare `to?: string`) and `:3138` |
| 5, 6 | No Suspicion and no SMS surface | `suspicion`, `sms`, `textmessage`, `shortmessage`: **0** hits in `index.d.ts` and **0** in `reference/hackhub-events.json` |

**Two things we can add that strengthen the report**, both from the pinned 0.24.0:

- §10: `QuestHackhubPostDefinition.media?: string` (`index.d.ts:107`, "Optional
  image shown under the content (mod asset path or URL)") — the engine already
  has an image field on feed posts, so the tweet ask is a gap in one surface, not
  a missing concept.
- §14: our own captured logs carry the identical refusal from a **bundled** mod —
  `[synthetik-wallet] tickPrices:challenges failed: [ContentSDK] Mod "null" tried
  to use UI.toast without "ui" permission` (`QE24-TestResults - Timer-Rows.md:240`
  and `:808`, `QE24-TestResults-Timer_Rows_2.md:361`), stack ending in
  `SynthetikWallet.tickPricesInner`. Not our registration code, and not a click
  handler — so the caller-resolution failure reaches further than §14 currently
  says.

---

## 2. Things that would cost him time

Ordered by how much they matter.

### 2.1 §5 and §6 re-ask questions he has already answered

`docs/07` Q5 is his own answer on suspicion: *"Raising or lowering suspicion is
not possible at all… Exposing `Suspicion.AddValue` and `SetValue` plus an event
would be the fix… It is on the list with Q1, not in this patch."* §5 opens by
asking *"Is suspicion/log-forensics participation planned for a later SDK?"* —
he answered that, and also told us log seeding already works via `rootFiles`,
which is half of §5's example list.

§6 asks *"Is native SMS planned for a later SDK?"* Our own fence note in
`docs/07` records that he **verbally agreed on Discord** to expose SMS, with no
timeline.

**Fix:** keep both sections, but reframe as a status check plus the design
questions he has *not* answered (what shape, what event surface), and quote his
earlier answer so he does not repeat himself.

### 2.2 §21's first two bullets are stale — our own runs answered them

The bullets ask whether `HackhubPost` and `author.name`/`author.avatar` still
reach the feed renderer, and whether a bare `content`-only post is the only
supported shape. Both are answered in our own evidence:

- `QE24-Playtest-HackhubPosting.md:94-100` — HF-1…HF-10 all rendered, including
  named posters, file avatars, likes and named comments;
- `:182` — H-12/v7: uploaded poster avatar + named comment, "everything
  rendered", named poster visible pre-accept;
- `QE24-TestResults-DynProbe-ModSettings.md:122` — DP-15, "The quest DID appear
  on the Hackhub feed on a fresh save".

The same section already says this at the bottom ("All five harness variants
rendered… so `HackhubPost` itself still works"), so the top asks contradict the
section's own conclusion. What is genuinely still open and worth his time: the
`[Scheduler] Holding job "Queue.HandleQuestHackhubPosts": no handler registered.`
line (which we can now cite exactly — `QE24-TestResults-Twotter-6.md:889`, game
1.3.1, 2026-09-19), and whether the anonymous-class emission is a real trip-wire
in his pipeline.

### 2.3 §22 item 2 is stale — HF-5 measured it

The section says the employer fallback is "unmeasured… being measured right now
(harness 1.0.28, row HF-5)". HF-5 ran:
`QE24-Playtest-HackhubPosting.md:95` — *"rendered ('Hidden User' pre-accept —
normal); on accept the poster REVEALED as 'Ada Bakker' (with a broken avatar —
the employer's file avatar doesn't resolve on the revealed card)."* So the
fallback **does** fire and the employer's avatar **does not** come along. That is
a concrete, answerable bug report; as written we would be asking him about a test
we have already done.

### 2.4 §11's disable-route log lines have no transcript behind them

§11 quotes *"unloading: removing the Twotter accounts this mod declared"* and
*"twotter: removeUser(qe-tw-account) -> true (mod unloaded)"*, and
`STATUS.md:474` (row T-15c) names `QE24-TestResults-Twotter-6.md` as the
evidence. That file (fetched from `QA-filedump`, 1,009 lines) contains **zero**
occurrences of `unloading` and **zero** of `removeUser`. The other Twotter
transcript in the repo (`QE24-TestResults-Twotter.md`, T-08…T-15) also has zero
`unloading`. The lines exist only inside `STATUS.md:448-449` itself.

The *behaviour* is recorded as measured in three places (`STATUS.md:474`,
`editor-export.notes.md:278`, README's Known limitations), so this is most likely
a transcript that was pasted somewhere else and never committed. But if he asks
for the log — the reasonable thing to ask for — we cannot produce it.

### 2.5 §8 points at a transcript that does not contain the finding

§8 says "Transcript: `docs/archive/sdk-0.24-qa/QE24-TestResults - Twotter.md`".
That file is the T-01/T-02 crash probe; `AccountCreated` appears nowhere in it.
The finding itself is solidly recorded — `STATUS.md:596-599`,
`docs/plans/r180-…:27`, `docs/plans/r185-…:33` ("the objective stayed open while
`PostSeen` ticked") — but as a summary, not as a raw log. Point at `STATUS.md`
or attach the probe's log.

### 2.6 §4 and §24 are the same fence, filed twice

§4 (static sites do not fire `Http.Request`/`Http.Response`) is a subset of §24
(dynamic pages do not either), and §24 already says so. Two sections means he may
answer one and think he is done. Merge, and keep §24's honest caveat that our own
listener filtered before logging — the re-run probe that would separate
"never raised" from "filtered out" (`QE24-TestResults-DynProbe-ModSettings.md:203`)
has not been run.

### 2.7 §7 is one unrepeatable sighting, 40 exports ago

The evidence is real but thin: `docs/plans/r166-sdk-0.24-ingame-qa.md:222` and
rows W-07/W-09 (`:261`, `:263`), all 2026-09-16, editor export **1.0.2**, game
1.3.0. Nothing since. Either drop it, or keep it with the date and the export
version attached so he can weigh it.

### 2.8 The version stamps do not agree

The header promises "Game evidence: HackHub `1.3.0`, Steam build `25341308`", but
the items were measured on three configurations:

| Items | Game / build | Source |
|---|---|---|
| §1–§4, §7 | 1.3.0 / 25341308 | `STATUS.md:827`, `r166` plan |
| §8–§18, §20–§22 | 1.3.1 / 25388883 | transcript log headers; `QE24-TestResults - Twotter.md:5` |
| §23, §24 | **1.3.13** | `QE24-TestResults-DynProbe-ModSettings.md:3`, `STATUS.md:40`, `r238` plan |

"Several of these were measured on three different builds" is the first thing he
will want to know, and right now the document says something else. (The `1.3.13`
string is consistent across three of our files, so it is what the game reported —
but see the questions below.)

---

## 3. Smaller wording fixes

- **§3** is fine on evidence — `r166` plan `:220` and row H-07 `:278` record
  Zeis minting `cwejw2ox.qe24-collab.test`, `nslookup` returning `No results
  found`, and `qe24 history` gaining no `kind=dns` entry (2026-09-16). Two
  additions would make it land better: the SDK declares `kind: "dns"` as *"a
  lookup with nothing behind it"* (`index.d.ts:577`), so the shape is intended;
  and his `docs/07` Q6 answer says `Terminal.DnsHistory` fires **only in
  multiplayer and only when the lookup returns records**. Our lookup returned
  nothing, so his caveat may already explain it — worth saying so and asking
  whether `Http.CollaboratorHit`'s dns kind is expected to work single-player.
- **§15** does not mention that `Handbook.open(id?, category?)` takes a category
  (`index.d.ts:3969`), and that the namespace is documented for *mod-registered*
  entries, whose example ids look like `mymod-getting-started` (`:3948`). We
  passed a base-game article **title** with no category. One cheap in-game test
  separates "wrong id" from "deep links are broken": register our own entry and
  `open()` it by that id.
- **§13** could cite the one line that proves the flag is not in the save or the
  folder: `QE24-TestResults-Twotter-6.md:577-582`, where the harness tells the
  tester an old disabled copy "stays disabled even after a new version replaces
  it, and that survives a fresh save".
- **§25** is withdrawn and correct; nothing to change, but it is worth keeping
  the retraction visible — it is the reason to trust the rest.

---

## 4. Zeis's answers, and what changed in `docs/03`

Asked 2026-10-02, answered the same day.

| Question | Answer | Effect |
|---|---|---|
| The §11 / §8 logs — do they still exist? | *"They're gone, but keep the quoted log lines, they came from an actual log I do not have anymore."* | The quotes stay. Only the **pointers** changed: both sections now say the lines are verbatim from a session log we no longer hold, instead of naming a file that does not contain them. `STATUS.md` row T-15c was corrected the same way. |
| §3: retest, send as-is, or drop? | *"If you're 100% sure that DNS collaborator/history/etc. stuff is multiplayer-only, then drop it. Otherwise, keep it as is."* | **Kept as is.** The multiplayer-only caveat is not safe to generalise: it was his answer about `Terminal.DnsHistory` (a different event), while `Http.CollaboratorHit.kind` is declared as *"dns" for a lookup with nothing behind it* (`index.d.ts:577`) with no such caveat. Not 100% sure ⇒ not dropped. |
| §7: keep or drop? | Keep — *"§7 is real, we just circumvented it immediately, that's why it didn't pop up again."* | Kept, now dated (2026-09-16, export 1.0.2, rows W-07/W-09) and stating plainly that we worked around our own side, so we have no later observation. |
| How far to go on the document? | *"Patch the 8 issues in place"*, minus §11/§8 which are not issues, plus: *"remove things that don't need his input, like bugs that were ours."* | See below. |

**Patched into `docs/03`** (section numbers untouched — 143 cross-references
across the repo point at them):

- Header: one build → a table of the three configurations the items were
  measured on; §2, §3, §12 and §20 gained the stamps they were missing.
- New **Current summary** that separates *closed* (§4, §19, §21, §23, §25) from
  *needs your input*, ordered by how much each blocks an author.
- **§4** folded into §24 as a pointer, measurement kept.
- **§5** and **§6** reframed around his own earlier answers (docs/07 Q5, and the
  verbal SMS agreement) — only the unanswered parts are asked now, plus the
  `NetworkFileMap` typing gap he pointed at himself.
- **§7** dated and scoped as above.
- **§8**, **§11** pointers corrected.
- **§10** now cites `QuestHackhubPostDefinition.media` (`index.d.ts:107`).
- **§14** now carries the bundled-mod corroboration (`[synthetik-wallet]`,
  `QE24-TestResults - Timer-Rows.md:240`, 2026-09-18).
- **§18** dropped the author-fields bullet we have since measured and the
  once-claimed clause the d.ts already documents.
- **§19** and **§23** compressed to the answer plus the live remainder; the
  superseded original questions point at git history.
- **§21** rewritten: our own bug stated once, in one paragraph, then the three
  engine notes. The falsification matrix, the attempt table and the
  author/avatar findings are gone — they were ours or already measured. Its
  "vanilla runs included" claim was dropped: no log we hold shows that warning
  with zero mods installed, so the section now cites the one session that is
  verifiable (2026-09-19 14:56:57, our pack removed, other mods loaded).
- **§22** item 2 replaced with the HF-5 measurement: the employer fallback fires
  and reveals the employer's name on accept, and the employer's file avatar does
  not resolve.

## 5. Not for sending

`docs/04-engine-bug-quest-completion.md` and `docs/05-bug-report-for-hotbunny.md`
are both marked superseded at the top (`docs/04:3`, `docs/05:3`) and were answered
in `docs/07`. They stay as history.
