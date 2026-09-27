# Custom hacking tools — future-feature ideation

**Status: brainstorm, not scheduled.** (r236, 2026-09-27.) Zeis's prompt:
every quest is a mod, so the editor is not bound to the SDK's fixed tool
repertoire — a quest could author its **own** hacking tools. This file
records the brainstorm from that prompt, with the decisions made on it. It
is ideation, not a round plan: nothing here is committed to building, and
the README roadmap deliberately has no row for it yet.

**Decisions made (Zeis, 2026-09-27):**

- **No OSINT/query tools.** The game already ships those — `lynx`,
  `net_tree.py`, `whois`/`nslookup` — and a quest does not need to
  reinvent them. (The original brainstorm's "OSINT" section was cut on
  this call.)
- **Decode/cipher tools are faked, not real.** No real crypto code.
  Authored output is more **versatile** (any scheme the fiction wants —
  not just algorithms worth implementing in JS) and costs **far less
  compute**. A quest's "bank's proprietary cipher" is just text in, text
  out.

## The framing

Right now the player's agency is a **fixed verb list** — nmap, hydra,
john, lynx, ssh, ftp, bettercap — and the quest reacts to them. A mod can
register its **own** terminal commands, and the SDK surface (0.24,
verified against the pinned `index.d.ts`) is richer than "print a fake
output":

- `RegisterCommand` — command name, description, typed autocomplete,
  `apt-get install` semantics (or always-available via `default`), and
  **scope `local`/`remote`** — a tool that only exists on the player's own
  machine, or only inside a compromised host.
- `CommandTools` — **interactive prompts (with password masking)**, flag
  parsing, colored output, **ASCII tables**, `sleep` (pacing), `exec`
  (a tool can wrap a built-in), terminal lock/unlock.
- Plus everything a quest already carries: pack data (a per-quest
  database), Timer beats, 99 observable events, and quest state the
  emitted tool code can read directly.

The design gap: SDK tools are **verbs with no story** (nmap always just
nmaps). A quest-authored tool is a **verb with state, a condition, and a
consequence** — that is where the gameplay lives. The ideas below are
organized by the *role* a tool plays, not by the technology.

## A. Stateful tools — the biggest unlock

1. **Keylogger** — `install` on a compromised host (sets a state flag),
   then over following in-game time the quest *feeds* the player captured
   keystrokes into a log file. The question becomes *when* you installed
   it.
2. **Backdoor / persist** — install a login that survives "reboot" beats;
   the author toggles whether a "security sweep" beat can detect it,
   which is the fail-route hook. Install-and-maybe-get-caught is the core
   heist loop, and nothing in the current toolkit can do it.
3. **Honeypot / canary** — the player *plants* a trap file or fake
   credential; when an NPC "uses" it, the tool alerts the player.
   Player-run surveillance — inverts who is watching whom.
4. **Deadman switch** — schedule self-destruction of the player's own
   evidence files after N in-game days. Pairs with the `deleteable` file
   flag (r235): the quest says "clean up that log line", the tool is how.

## B. Identity & social

5. **Burner / alias** — mint a disposable identity (Twotter account,
   e-mail, phone) registered to the quest; the player switches hats
   between contacts and dialogue branches key on *who you are*. Identity
   becomes puzzle state.
6. **Spoof / mask** — set the sender identity for the next outgoing mail
   or call. The comms surfaces already exist; this is the missing switch.
7. **Fixer / contact** — a *person* as a tool: an NPC you brief and pay
   who sells info or opens a door (dialogue + pay node). A tool with a
   personality. Open SDK question: a tool that *charges* the player
   (the pay direction today is quest→player) — worth filing with the
   developers if this line is ever pursued.

## C. Decode & cipher tools (all faked — authored output)

No real algorithms. The tool performs the decoding *in the fiction*, and
the result is exactly what the author wrote. That is a feature: the
author is not limited to implementable algorithms, and the same node
powers any scheme.

8. **cipher** — "decodes" an authored ciphertext; the key (if the fiction
   wants one) lives elsewhere in the quest. The scheme can be rot,
   base64, Vigenère, a one-time pad, or "the bank's proprietary scheme" —
   it is all text in, text out.
9. **stego / extract** — reports the layers the author declared in an
   image asset (a file, a Twotter post, a website). The shipped PNG can
   be a plain image; the tool narrates what it "finds".
10. **qr / scan** — reads a code from an image asset in the fiction. The
    code need not exist in any real encoding — the author types what the
    code "says". "Find the picture, feed it the tool" is a tactile loop
    for very little machinery.

## D. Time & ops

11. **schedule / alarm** — the player queues an action for a specific
    in-game time; the Timer node is the engine, the tool is the face. The
    world reacts at 3 a.m.
12. **wiper / clean** — remove your trace from a machine, with a
    cooldown, and an optional *residue*: a clean that leaves a tell a
    later inspection finds.
13. **clock / tz** — compare timezones across devices; a log lines up
    only once you convert.

## E. GUI tools (when the App node lands — README Next up, App/PhoneApp row)

14. **Case file / board** — a home-screen app collecting every clue found
    (objectives, read files, mails) into a per-quest detective board.
15. **Identity manager** — the GUI over the burner/alias state.
16. **Radio / feed** — an app with scheduled transmissions (timer-driven)
    — ambient intel whether the player is listening or not.

## F. Product-level

17. **Toolpacks as a second template category.** If quests are mods,
    *toolboxes are mods too*: the same editor authors a reusable tool mod
    (command + pack data + docs + start-menu entry) that many quests use.
    The desktop app-checks row (isAppInstalled/getInstalledApps) gets a
    first-class use case — a quest checks for another mod's tool before
    handing out a route that depends on it. The template gallery would
    grow a "toolkits" shelf next to "quests".
18. **Install-gated tools** as a discovery beat: `PackageName` semantics
    mean a tool exists but must be found and `apt-get install`ed — the
    package name hiding in a config file or a phone note is a whole clue
    chain by itself.

## Design guardrails (if any of this is ever built)

- **One verb per tool; the tool's name is the lesson.** Scan, decode,
  spoof, plant, schedule, clean.
- **Fake by default.** Authored output keeps total author control — any
  result, any scheme, no algorithm to implement, no compute to spend.
- **Every tool optionally leaves a trace** (author toggle) — that is
  what makes tools *risky* instead of merely *useful*, and it is the plug
  for fail routes and Suspicion-style checks.
- **Tools read the same quest state** (position, files, identities,
  time) so they chain — decode → spoof → schedule — and the quest feels
  like one system.
- **Pacing is a feature**: `sleep` + colored output + tables make a scan
  *perform*. A 2-second scan feels like work; an instant one feels like
  a cheat.
- **A tool is a node**: author-facing, a small config (name, description,
  install name, scope, argument prompts, success condition, output
  template, trace, cooldown); the compiler emits the `Command` class and
  the state wiring. No code.

## If we ever had to bet

**Keylogger / backdoor / honeypot** (state + time + risk — the biggest
gap between "SDK verbs" and "gameplay"), **burner/alias** (unlocks
social-engineering depth the comms surfaces already hint at), and the
**faked decode trio** (cheapest to build — pure text in, text out — with
the biggest "I did the puzzle" feeling). Then the **toolpack template**
as the product-level unlock.

The right first feasibility round, when it comes: one generic
**Custom Tool node** with two or three exemplars (say, keylogger +
cipher + dossier-style reader) to stress-test the authoring model before
committing to the family.
