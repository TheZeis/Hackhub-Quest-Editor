# HANDOFF PROMPT — HackHub Quest Mod Editor

> **How to use this:** paste everything below the line as the first message to a
> fresh agent instance working in this repository. It is written to that
> instance. It was verified against the repo at the time of writing — the very
> first thing you should do is re-verify the snapshot in section 3, because the
> workspace sandbox can be reset between sessions.

---

You are taking over an ongoing, long-running project. A previous instance of
you (same agent, lost session) built most of it together with the user. Read
this fully before touching anything.

## 1. Your role and the mission

You are acting as a **Senior Full-Stack + UX/UI engineer**. Together with the
user you are building the **"Quest Mod Editor" for HackHub** — a complete,
visual, browser-based tool that lets **non-coders** build rich branching quest
mods for the game HackHub with **zero code**.

The audience is non-coding gamers. The product bar: sleek, modern, visual,
no raw JSON or code shown unless absolutely necessary.

## 2. Where things live

- Repo: `TheZeis/Hackhub-Quest-Editor`, checked out at `/home/user/Hackhub-Quest-Editor`.
- **Your session is fixed to the branch `arena/01a055fa-hackhub-quest-editor`.**
  Never create, switch to, or push any other branch.
- **The user also commits to this same branch** (README.md, Launch.bat edits,
  QA file dumps). **Always `git fetch origin` and diff against the remote tip
  before committing/pushing** — a past instance once clobbered user commits by
  skipping this. Fetch before push, every time.
- There is also a `QA-filedump` branch where the user drops in-game crash
  evidence (mod zips + project JSON). Fetch it read-only when debugging
  (`git fetch origin QA-filedump`, then `git show FETCH_HEAD:<file>`).
- `main` is the user's base; work stays on the arena branch.

### Environment setup (sandbox may reset between sessions)

```bash
npm install
npm i --no-save @hotbunny/hackhub-content-sdk   # authoritative game SDK typings; --no-save, so it vanishes on resets
node -v                                          # v22.22.3
```

If git looks rewound after a reset: `git fetch origin`, compare local vs
remote, then `git add -A && git reset --soft FETCH_HEAD` and
`git checkout HEAD -- <files>` for any files where the REMOTE side is newer.
Check which side is newer before keeping working-tree state.

### Verification commands (run before declaring anything done)

- `npx vitest run` — full suite (15 files, ~325 tests)
- `npm run typecheck` — tsc, must be 0 errors
- `npm run build` — production build (run for larger changes)

### Live preview

Start with `npm run dev -- --host 0.0.0.0 --port 5180 --strictPort` as a
background process (must bind 0.0.0.0; the preview proxies under
`https://{port}-{sandboxId}.e2b.app`). The user uses this preview to test.
After restarting it, sanity-check what it serves, e.g.
`curl -s http://localhost:5180/src/compiler/compile.ts | grep EDITOR_BUILD`.

**No browser automation is possible here** (playwright CDN blocked). QA is
done via jsdom tests, stub-SDK eval of emitted mod code, and — for real
in-game behavior — the user plays the actual game and reports back.

## 3. State snapshot (verified at time of writing — RE-VERIFY FIRST)

- HEAD = remote tip of `arena/01a055fa-hackhub-quest-editor` = **`35bcb5e`**
  ("Stamp every export with the editor build id").
- **325/325 tests green** (15 files), `npm run typecheck` clean.
- Registry: **31 node types**, 9 categories.
- Every exported `dist/mod.js` header carries a build stamp; current stamp:
  `EDITOR_BUILD = "2026-09-01.r21"` in `src/compiler/compile.ts`.
- `QA-filedump` tip: `75ddf95` ("Broken Quest v2 files").

## 4. THE OPEN LOOP — resolve this first

**The Twotter search crash.** History:

1. In-game, searching a Twotter account created in the editor crashed the game:
   moment RFC2822/ISO deprecation warning, then
   `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`.
2. **Round 20** theory (avatars must be real asset files, not data URLs/empty
   strings) shipped as `c1872db` — necessary, but **insufficient**: the user's
   crashed mod already had real asset avatars.
3. **Round 21** root cause found: the game's quest-level account converter
   cannot fill the platform record's required fields (`name`, `surname`,
   `banner`, `joinedAt`, `password`) — they stay `undefined` and the search UI
   dereferences one. Fix (`e78635b`): exported mods now register accounts via
   `Twotter.createUser()` + `Twotter.addUser()` inside `OnModPackageLoaded`
   (deduped via `getUserByUsername`); the quest-level `this.TwotterAccounts`
   assignment remains only as fallback when the Twotter API is absent.
4. User re-tested and it **still crashed** — but the new zip proved the export
   was built by **stale editor code** (empty `OnModPackageLoaded` stub, the
   unconditional quest-level assignment — strings that cannot exist in current
   builds). **The fix itself was verified against the user's exact project
   file** (compiled with current compiler, emitted mod executed against a stub
   platform: complete user record, no double registration, tweet resolves).
5. **`35bcb5e`** added the build stamp so stale exports are detectable at a
   glance.

**Next step:** ask the user whether they re-exported (hard-refresh Ctrl+Shift+R
first, or `git pull` if they run `Launch.bat` locally) and whether in-game
search works now. If they report another crash, fetch their zip from
`QA-filedump` and **grep `dist/mod.js` for the build stamp first** — if the
stamp is missing/old, it's a stale export again, not a code bug.

The moment deprecation warning is the game parsing `postedAgo: "2 days"` —
harmless noise, not the crash.

## 5. User constraints and working agreements (do not drop these)

- **SMS/text-message editor is DROPPED** ("ignore the SMS requirement if it is
  not natively available" — it isn't).
- **Delivery form: browser app with ZIP export.** No Tauri/Electron.
- Generated TypeScript is editor-owned; **always regenerate** from
  `project.json`; never ask the user to edit it.
- One mod may contain many quests; new projects default to a single quest.
- No raw JSON/code exposed unless absolutely necessary.
- **Selection must switch, not stack.**
- **All hints/copy must be advice, not commandments** — suggestions, never
  hard rules; written for non-coding gamers; fixed-set fields → dropdown;
  free-form fields → the hint must say so plainly.
- Node names must not mislead about when they fire; in-game behavior claims
  must be verified against the real SDK, never guessed.
- Connected node pairs render adjacent; needless separation or crossed wires
  are rejected.
- Visual claims require real verification — never claim a UI fix without
  evidence.
- Templates must be discoverable at the point of need (buried templates =
  broken feature), and website templates must look like real generic websites.
- **The user explicitly wants you to pause and ask** when a screenshot or
  clarification would help: "If you require a screenshot, clarification, or
  have questions, ALWAYS ask."
- The user reviews via screenshots; they expect you to self-review for
  further issues.
- The user runs the real game (Windows, Steam) and tests exports in-game; you
  cannot. Treat them as QA.

## 6. What has been delivered (all verified in-repo)

- **Visual node editor** (React + @xyflow/react v12 + Zustand + Immer):
  31 node types in 9 categories, marquee select, clipboard (copy/cut/paste/
  duplicate), reroute nodes, group frames (drag moves children, zIndex −1),
  animated flow dashes, minimap, layout tools.
- **Inspector panel** with hints on every field (enforced by a QA test),
  sliders for bounded numerics, image pickers (data URLs in-editor).
- **WYSIWYG website builder** with hidden-clue subdirectories (for the game's
  `dirhunter` tool), code/HTML view toggle, "Load HTML" import, image loading
  in the editor; pages self-contained (the in-game WebView has no internet).
  6 site templates + 15 page templates (incl. the user's "naza" public-agency
  HTML as the Public agency site; Substack/Reddit/recipe clones).
- **Dialogue editor** (top-bar "Dialogues" button): one general Dialogue node
  replaces four comms node types; Phone, Kisscord, E-Mail, WeeChat.
- **Tweet node**: quest-account picker (`questAccount` field kind) + post
  image (`image` field kind).
- **Twotter accounts** managed on the Quest tab (username, displayName,
  avatar, bio, verified; ids via nanoid(8)).
- **Reply mechanics**: hackertyper (`/qe/ht/<nodeId>`, seo:false) + manual
  input moments emitting `QE.<id>.ok/.wrong` commands.
- **One-click ZIP export**: `manifest.json` (apiVersion 1, computed
  permissions, icon/cover as real files, tags), `dist/mod.js` (PROJECT JSON +
  ES2020 CJS interpreter with manual `sdk.Register*` calls — decorators are
  TS-only), `src/index.ts` scaffolding (same code), `assets/` (all images
  decoded to real PNG/JPG files).
- **Template library**, LLM website-prompt popout, HTML scan in plain
  language, duplicate/delete rows, syntax highlight + format.
- Full history lives in `docs/02-editor-shell.md` (has addenda through
  Round 21) and in git log messages ("Round N: ...").

Delivered verdicts (don't re-litigate): mail `from` works via
`sendMail(index, from, to)`; **suspicion system / minigames / hack-player are
NOT exposed by the SDK** (verified by exhaustive grep of the d.ts); tweet
images ship as assets; percentage bank charge via `getBalance`; wait nodes are
in seconds; `Bank.transfer` does NOT exist.

## 7. Architecture map

- `src/compiler/compile.ts` — project → zip files. `EDITOR_BUILD` stamp;
  `DEFAULT_AVATAR_PNG` + `imageAsset()` (data URL → real zip binary, placeholder
  when missing); accounts get `assets/twotter/account-<id>.png`; tweet images
  → `assets/twotter/tweet-<nodeId>.png`; unlock edges → `unlocksAfter`;
  dangling triggers → `Events.on`.
- `src/compiler/runtimeSource.ts` — the entire shipped interpreter as a
  `String.raw` template (plain ES2020, no backticks/`${`). Anchors:
  `var Mod = class extends sdk.Bootstrap` with the `OnModPackageLoaded`
  Twotter registration; quest-level fallback guarded by
  `!(sdk.Twotter && sdk.Twotter.addUser)`; tweet mapping has
  `n.data.accountId || TwotterAccounts[0].id` fallback.
- `src/schema/nodes.ts` — 31 zod node-type schemas (TDZ-sensitive ordering;
  explicit defaults).
- `src/schema/project.ts` — `TwotterAccountSchema` ~line 104
  {id, username, displayName, avatar?, bio?, followers?, following?, verified};
  no exported alias — use `QuestDoc["twotterAccounts"][number]`.
- `src/editor/inspector/InspectorPanel.tsx` + `Field.tsx` — inspector incl.
  `image` and `questAccount` field kinds.
- `src/store/editor.ts` — Zustand+Immer store (impls end with `}),` — anchor
  carefully when scripting edits; tests must build a fresh `createProject()`
  then `load()` because of Immer freezing).
- `src/templates/index.ts` — templates incl. reference template.
- Tests: `src/compiler/__tests__/compile.test.ts` (stub-SDK `new Function`
  eval of emitted code, `__registered` capture, settle loops), schema/store/
  templates/clipboard tests.
- Hardcoded counts that must be updated together when adding/removing node
  types: schema.test "has 31 node types"; templates.test
  `new Set(types).size === 31`; reference template `nodeCount` values
  (30 and 40). Every editable field needs a hint or the hint-QA test fails.
  templates.test requires every type's `summarize()` to return ≥1 line.

## 8. SDK ground truth (`@hotbunny/hackhub-content-sdk@0.21.0` d.ts is authoritative)

- **Twotter namespace**: `createUser(options?)` (fills sensible defaults —
  this is what the crash fix uses), `addUser(user)`, `postTweet`,
  `removeTweet`, `getUserByUsername`, `getUserById`, `toggleLike`.
- **Platform `TwotterUser`** requires `id, username, name, surname, avatar,
  banner, joinedAt, followers, following, password` (optional `bio, verified,
  isMine`). **Quest-level `TwotterAccountDefinition`** {id, username,
  displayName, avatar(required), bio?, followers?, following?, verified?} —
  cannot express name/surname/banner/joinedAt/password (the crash root cause).
- **`TwotterCreateUserOptions`**: id?, username?, firstName?, lastName?,
  avatar?, banner?, bio?, gender?, verified?, password?, followers?,
  following?, isMine?.
- **Platform `TwotterTweet`**: {id, userId, content, sendedAt?,
  interaction:{comments,share,likes,views}, showInTimeline?}. Quest-level
  `TweetDefinition`: {accountId, content, image?, likes?, comments?, shares?,
  views?, postedAgo?}.
- Network: `createSubnetNetwork` only (no Wi-Fi creation); WifiNetwork is
  read-only. Quest mail: `Quest.Mails` {title, content, replyable?,
  attachment?} + `this.sendMail(index, from?, to?)`.
- Bank: transaction/withdraw, `getPlayerAccount()`, `getBalance()`; **no
  `transfer`**. No SMS API. No suspicion/minigame/hack-player API.
- Router: `model` → fern route; `accessable` → support-mail; `seo:false` hides
  from dirhunter. 7 permissions total. Decorators are TS-only — emitted JS
  must call `sdk.Register*` manually.

## 9. Pitfalls (each of these cost a past instance real time)

- **Never write files via bash heredocs** — unquoted/trailing-command heredocs
  corrupted files twice. Use the write/edit file tools.
- `NodeDragHandler` is **not** exported by @xyflow/react v12 → use
  `OnNodeDrag<NodeType>`.
- eslint is unavailable in this sandbox; `npm run typecheck` has
  `noUnusedLocals` on.
- `fx.pay` and `fx.withdraw` have SEPARATE registry field lists.
- Icon.tsx has no "layout" icon (use "layers").
- Sandbox resets wipe `node_modules` (including the --no-save SDK) and can
  rewind git; /tmp files may vanish — re-run section 2 setup.
- Emitted-code tests must instantiate AND invoke (constructors alone prove
  little); stub SDK needs `__registered` capture + settle loops; explicit
  awaited sleeps for real timers; smoke test asserts zero console.error/warn.
- When verifying a crash report: **first check the zip's `dist/mod.js` build
  stamp** — the user has twice exported from stale editor code (browser tab or
  local checkout).

## 10. Tone with this user

They are technical enough to read logs and use git, but they are building
*for* non-coders and hold the product to that standard. Be concrete, show
evidence (numbers, greps, test output), admit wrong theories plainly (the
round-20 avatar theory was wrong and they proved it), and ask before guessing
when a screenshot or clarification would settle something.

**Your first message to the user** should confirm you're oriented (branch,
HEAD, tests), then immediately ask for the status of the open loop in
section 4: did they re-export with a refreshed editor, and does searching
`qatester` in-game work now?
