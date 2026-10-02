# Sandbox re-provisioning — what it does and how to work with it

Neither the agent nor Zeis can stop this, and Zeis has no settings to change:
the only controls he has are the chat window and file upload. So the workflow
is built to survive it instead.

## What actually happens

The sandbox is not "reset" — the whole VM is re-created. Observed directly on
2026-10-02, four times in one session:

- `/proc/uptime` reads **0 minutes** at the moment of discovery
- `git reflog` shows `clone: from https://github.com/zeisontwitch/Hackhub-Quest-Editor.git`
  timestamped seconds before the command that found it
- `/home/user` contains only base-image dotfiles plus a repo directory dated
  a few seconds ago

It also fires **between individual tool calls inside a single turn**, not just
between turns. Recovery therefore cannot be a separate step that a later
command assumes has happened.

## Why the signature is identical every time

Three storage layers with different lifetimes:

| Layer | Survives? | Consequence |
|---|---|---|
| `.git` — from the fresh clone, checked out at the branch's fork point | replaced | `HEAD` rewinds to the **same commit every time** (`65fc798` on this branch), never a random one |
| Working tree — overlaid from a persisted snapshot | restored | Uncommitted edits survive, which is why a reset costs minutes rather than work |
| `node_modules`, `dist/` — excluded from the snapshot | dropped | `npm install` is needed again; and directories deleted by a later commit **come back** if they were gitignored |

The third row is the trap. The snapshot records the deletion of tracked files
but not of ignored ones, so gitignored leftovers survive from the clone — and
`git status` cannot see them either, because the ignore rule that made them
invisible in the first place still applies. On 2026-10-02 this produced a
confident, wrong report that `reference/sdk-0.24-qa/` was gone while seven
`dist/` files were still sitting in it.

**Never conclude a path is deleted from `git status` alone.** Use
`test -e <path>`, or `git ls-files --others --ignored --exclude-standard`.
That command lists the project's own `dist/` build output as well, so it has
to be read against what the build legitimately produces — the distinction
`npm run recover` makes for you.

## The one command

```
npm run recover          # report
npm run recover -- --clean   # report and delete the residue
```

`scripts/sandbox-recover.mjs` realigns `HEAD` to the pushed tip with
`reset --soft` (so the working tree and index are never touched), prunes
resurrected gitignored residue including the empty directory husks, and runs
`npm install` if `node_modules` is gone. Every step is a no-op on a healthy
tree, so it is safe to run at the start of any turn — and it refuses to move
`HEAD` if the local branch holds commits the remote does not have.

## Workflow rules

1. **Push at every checkpoint, not at the end of the round.** Resets land
   mid-turn; an end-of-round push risks the entire turn. A pushed commit makes
   a reset cosmetic, because the fresh clone re-fetches it.
2. **Any command that needs dependencies must install them itself.** Combine
   `npm install` with the test or build command in a single call — the next
   call may be in a fresh VM.
3. **Verify artifacts, not just the log.** After recovering, confirm a
   generated file's *content* is the current version; an earlier reset restored
   a stale artifact whose superseded content had already been corrected.
4. **Uploaded files are ephemeral too.** Anything Zeis uploads must be
   committed to a branch in the same turn it arrives. This is why the QA
   playtest transcripts live on the `QA-filedump` branch rather than in the
   working tree.

## Gate tiers after a reset

The full suite takes ~290s. Re-running it on content that did not change buys
nothing, so:

| Situation | Run | Cost |
|---|---|---|
| Reset, content unchanged | `npm run recover`, then `npm run typecheck` and `npm run build` | ~40s |
| Docs-only change | `npm run typecheck`, `npm run build` | ~25s |
| Any change under `src/` | full `npm test` (1,815 tests / 89 files) | ~290s |

State plainly which tier was run and why. Claiming a full suite ran when only
a targeted file did is worse than saying the suite was skipped.
