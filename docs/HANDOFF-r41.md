# Handoff — r41: the permission/manifest bug

## Status
r40 is committed and pushed (`d292947`) on `arena/01a06274-hackhub-quest-editor`.
483 tests green, typecheck + build clean. Sandbox died mid-session; three tasks
were agreed but NOT started.

## THE BUG (highest priority — blocks everything in-game)

Zeis's game log for a fresh r40 export of the "contract-hack" template
("The Ledger Contract4 v4.0.0"):

    [quest-editor] The Ledger Contract4 v4.0.0 loaded (editor build 2026-09-03.r40).
    [quest-editor] node world-network4 (world.network) failed and was skipped:
      [ContentSDK] Mod "null" tried to use Network.createSubnetNetwork without
      "network" permission. Add "network" to the permissions array in your manifest.json.
    [quest-editor] node world-toolResponse5 (world.toolResponse) failed and was skipped:
      ... Shell.addCommandData without "shell" permission ...
    [quest-editor] node world-toolResponse6 (world.toolResponse) failed and was skipped:
      ... Shell.addCommandData without "shell" permission ...
    [quest-editor] Mail.send failed for "One file, one man, no trace":
      ... Mail.send without "mail" permission ...
    [quest-editor] mail "One file, one man, no trace" sent via Quest.sendMail(0)

### What this means
1. **`Mod "null"`** — the SDK does not know our mod's name at permission-check
   time. This is probably the ROOT CAUSE: if the mod is not registered under a
   name, the permission lookup cannot match the manifest whatever it contains.
   Investigate `RegisterModPackage` / the Bootstrap class / `manifest.json`
   `name` + `id` fields and how the game pairs `dist/mod.js` with
   `manifest.json` in the installed zip.
2. The network is never created → no target machine → every later objective
   (whois/nmap/metasploit/delete) could never work regardless of triggers.
3. `Mail.send` fails and falls back to `Quest.sendMail(0)` (the r37 fallback),
   which is why the mail is visible in-game despite the permission error. The
   fallback MASKED this bug for three rounds.

### Do NOT chase these (already ruled out)
- The mail body / htmlToText: **CONFIRMED FIXED IN-GAME** (screenshot: clean
  prose, blank-line paragraphs).
- The `(?)` icon next to the objective: that is just the hint marker. Clicking
  shows "It is in your mailbox." Normal behaviour, not a fault.
- "0/1 completed" showing only one objective: the rest are hidden until
  unlocked. Normal. An earlier hypothesis that five objectives were dropped was
  WRONG — do not pursue it.

### Why the r39/r40 test harness passed while the game fails
`/tmp/q3/load2.mjs` and the vitest `stubSdk` have **no permission system**, so
they cannot reproduce this. Any new harness must simulate permission denial.

## Next steps, in order
1. **Fix the permission/manifest bug.** Check `computePermissions` in
   `src/compiler/compile.ts` (it exists) — is its output actually written to
   `manifest.json`, with the right key name and shape? Compare against the
   Nemesis manifest and the SDK's `RegisterModPackage` declaration. Fix
   `Mod "null"` first; the permissions may resolve with it.
2. **Compare triggers against Nemesis** (Zeis explicitly asked). Nemesis calls
   `Events.on` exactly ONCE. Check: namespace-level `Events.on` vs our
   instance-level `this.Events.on`, and which lifecycle method it sits in. We
   register in `OnObjectivesStart`; consider also registering in `OnStart`
   (the log proves `OnStart` runs) while keeping the declarative `trigger`.
3. **Add `[quest-editor] listening for <event>` at registration time.** We
   currently cannot distinguish "never registered" from "registered, never
   fired". This gap cost a whole round.
4. **Add the SDK as a devDependency.** `@hotbunny/hackhub-content-sdk` is NOT in
   `package.json`; it vanishes on every sandbox reset. Install with
   `npm install --no-save @hotbunny/hackhub-content-sdk` to restore it now.
5. **Website page `description` + `search[]`.** SDK's `WebsitePageDefinition`
   supports both; Nemesis uses both; we emit only `path`/`title`/`html`/`seo`.
   Add to `WebPageSchema` (`src/schema/project.ts`), the page inspector, and
   `registerWebsite`'s page mapping in `src/compiler/runtimeSource.ts`.
6. **GPU/perf issue.** Zeis: fans spin up on an RTX 4090 within ~1-2 min of
   having the editor open, lag worsens over time, stops INSTANTLY on tab switch.
   That last detail = a permanent `requestAnimationFrame`/CSS animation loop
   (browsers throttle rAF in background tabs); a memory leak would not stop so
   cleanly. Suspects: animated wire/noodle rendering, always-on CSS animations,
   React re-render storms on mousemove. **An idle Firefox performance capture is on the
   `QA-filedump` branch — fetch and read it.**
7. Then the queued backlog: wire/noodle physics, contact-driven story template,
   branching-consequence template.

## Standing constraints (do not lose)
- Twotter removed in r31, stays removed.
- No log-cleaning node — fully engine-side.
- Port version strings: plain numbers only (`7.2p2` broke metasploit).
- SDK declarations = ground truth; Zeis's in-game testing = second; community
  wikis = unverified.
- Templates must survive being hand-rearranged by Zeis/other users.
- `src/compiler/runtimeSource.ts` is a `String.raw` template: write regexes with
  SINGLE backslashes. Doubling them emits `\\s` and throws at `new Function`
  time (~63 tests fail at once).
- Convert HTML→text exactly ONCE, in the `Mails` array builder. Not in
  `sendQuestMail`.
- Session is fixed to branch `arena/01a06274-hackhub-quest-editor`.

## Useful commands
    npm install --no-save @hotbunny/hackhub-content-sdk   # restore SDK types
    npx vitest run && npm run typecheck && npm run build
    git fetch origin QA-filedump && git show FETCH_HEAD:Nemesis/mod.js > /tmp/nem.js
