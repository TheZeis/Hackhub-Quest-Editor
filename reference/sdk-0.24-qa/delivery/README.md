# Delivery zips — ready to install

Each zip is a packaged copy of the folder beside it. **Only the current version
of each probe is kept here**: superseded builds are deleted rather than
accumulated, because a folder of near-identical zips tells a tester nothing
about which one to install. The source folder is the artifact of record; a
superseded zip can be rebuilt from it if a past run ever has to be reproduced.

| File | What it is |
|---|---|
| `qe-sdk-024-dynprobe-1.3.0.zip` | **Dynamic Page Probe 1.3.0 (r249)** — the one to run, and the only thing still owed an in-game row. `qedyn mail` sends three mails: one to a deliberately bogus address, one with **no `to:`** at all, and one to your **real** address from `Mail.getPlayerEmail()` (printed, so you can see what it returned). Only the third answers the one open question — see below. `qedyn inbox` lists what the game itself says is in the inbox. |
| `qe-sdk-0.24-qa-1.0.29.zip` | QA harness 1.0.29 — the raw terminal harness (`qe24 …`) the playtest cards drive. |
| `qe-sdk-024-modsettings-1.0.0.zip` | **ModSettings Probe (r239)** — six settings, one of every declared type. **Question answered** (the UI is in the main menu, not in game); kept only until the probe folder is retired with its tests. |
| `qe-sdk-024-modsettings-v2-1.0.0.zip` | The same probe with `apiVersion: 2` — the copy Zeis actually tested. The API version turned out not to be the gate. Kept for the same reason as above. |

## The one open row

Run 3 established that a mail addressed to a mailbox which does not exist is
accepted, given an id, and then silently dropped. It did **not** establish that
a `to:` field is fatal — the r211 mail-authoring run delivered three mails whose
`to:` the editor's own runtime filled from `Mail.getPlayerEmail()`. See
[`../../../docs/plans/r250-r237-r249-audit.md`](../../../docs/plans/r250-r237-r249-audit.md).

So mail C in `qedyn mail` is the whole remaining question: **if C arrives, the
editor's runtime is fine as it stands.** If it does not, the runtime should stop
filling the field and let the game's own default do the work.

## Retired

| Probe | Retired because |
|---|---|
| dynprobe 1.0.0 → 1.2.0 | Superseded in place by 1.3.0. |
| feed canary 1.0.2 | The feed saga closed in r225 — the r221 class rename is the cure, and exports older than r221 need re-exporting. |

Note that the retired probes' **folders** are still in this repository because
test files read them (`sdk024QaScaffold.test.ts` reads `feedcanary/`,
`modsettingsProbeMod.test.ts` reads both `modsettings*` folders). Deleting a
probe means deleting its tests in the same commit — see the QA-artifact
disposition table in `docs/plans/r251-qa-artifact-cleanup.md`.
