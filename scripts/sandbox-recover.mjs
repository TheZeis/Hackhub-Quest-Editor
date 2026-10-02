#!/usr/bin/env node
/**
 * Re-aligns the checkout after a sandbox re-provision. See
 * `docs/SANDBOX-RESETS.md` for why this exists.
 *
 * The sandbox is re-created from a fresh `git clone` at the branch's fork
 * point, then the persisted workspace snapshot is overlaid on top. That
 * leaves three symptoms every time: HEAD points at the fork point instead of
 * the pushed tip, `node_modules` is gone, and directories deleted by a later
 * commit come back if they were gitignored — the snapshot does not record
 * their deletion, and `git status` cannot see them either.
 *
 * Safe to run on a healthy tree: every step is a no-op there. It never
 * discards work — HEAD moves with `--soft`, so the working tree and index are
 * left exactly as they were. Residue is only ever reported unless `--clean`
 * is passed.
 *
 * Usage: node scripts/sandbox-recover.mjs [--clean] [--skip-install]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const CLEAN = process.argv.includes("--clean");
const SKIP_INSTALL = process.argv.includes("--skip-install");

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();
const gitOk = (...args) =>
  spawnSync("git", args, { encoding: "utf8" }).status === 0;

const notes = [];
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const local = git("rev-parse", "HEAD");
const remoteRef = `refs/heads/${branch}`;
const remote = git("ls-remote", "origin", remoteRef).split("\t")[0] || "";

// 1. HEAD realignment ------------------------------------------------------
if (!remote) {
  notes.push(`no remote branch ${remoteRef} — nothing to align to`);
} else if (local === remote) {
  notes.push(`HEAD already at ${remote.slice(0, 7)}`);
} else if (!gitOk("merge-base", "--is-ancestor", local, remote)) {
  // Unpushed local commits would be unstaged by the reset. Leave them alone
  // and let a human decide rather than silently rewriting history.
  notes.push(
    `HEAD ${local.slice(0, 7)} has commits not on ${remote.slice(0, 7)} — left alone`,
  );
} else {
  git("fetch", "-q", "origin", branch);
  git("reset", "--soft", "FETCH_HEAD");
  git("reset", "-q");
  notes.push(`HEAD realigned ${local.slice(0, 7)} -> ${remote.slice(0, 7)}`);
}

// 2. Resurrection residue --------------------------------------------------
// Gitignored paths on disk that HEAD does not track. Zero on a healthy tree.
const residue = git("ls-files", "--others", "--ignored", "--exclude-standard")
  .split("\n")
  .filter((p) => p && !p.startsWith("node_modules/"));

if (residue.length === 0) {
  notes.push("no resurrection residue");
} else if (CLEAN) {
  for (const path of residue) {
    spawnSync("rm", ["-rf", "--", path]);
    // Deleting the file leaves the directory husk behind, and a husk still
    // makes `test -e <dir>` true — the check that reports whether a retired
    // folder is really gone. Prune upward, stopping at the repo root.
    let dir = path.slice(0, path.lastIndexOf("/"));
    while (dir && dir.includes("/") && spawnSync("rmdir", ["--", dir]).status === 0) {
      dir = dir.slice(0, dir.lastIndexOf("/"));
    }
  }
  notes.push(`removed ${residue.length} resurrected path(s)`);
} else {
  notes.push(
    `${residue.length} resurrected path(s), invisible to git status:\n  ` +
      residue.slice(0, 20).join("\n  ") +
      (residue.length > 20 ? `\n  ...and ${residue.length - 20} more` : "") +
      `\n  re-run with --clean to delete`,
  );
}

// 3. Dependencies ----------------------------------------------------------
if (SKIP_INSTALL) {
  notes.push("--skip-install");
} else if (existsSync("node_modules/vite")) {
  notes.push("node_modules present");
} else {
  process.stdout.write("node_modules wiped — installing...\n");
  const r = spawnSync("npm", ["install", "--no-audit", "--no-fund"], {
    stdio: "inherit",
  });
  notes.push(r.status === 0 ? "npm install ok" : "npm install FAILED");
}

console.log(`sandbox-recover [${branch}]\n  ` + notes.join("\n  "));
