# Release-candidate preparation plan

**Status:** Approved plan, not yet executed

**Purpose:** Prepare the current editor for a product-only `main` branch. Quest authors download and run the repository directly from Git, so `main` is the release surface. Development branches retain the full QA, research, documentation-maintenance, and test environment.

**Final merge:** The repository owner will perform the final merge to `main` by hand. This work must not merge or push into `main`.

## Release boundary

The cleaned branch must contain what a quest author needs to clone, install, run, read, and use:

- editor source required by Vite;
- runtime data imported by the editor;
- the author-facing handbook;
- the launcher and product README;
- build configuration needed to run the editor;
- licenses;
- the compatibility reference material explicitly retained below.

It must not contain historical development records, QA probes, test suites, handbook-generation machinery, or internal maintenance notes.

The current development branch must be preserved before cleanup. Create or confirm a durable development branch at the pre-cleanup commit, push that branch, and verify it exists remotely before deleting anything. The development branch remains the authoritative home for tests, QA, research, handbook generation, and maintenance tooling.

## Preserve the complete reference directory

The `reference/` directory is intentionally retained. It contains useful compatibility material for mod authors who want their mods to work with this editor.

Keep:

```text
reference/Official-Quest/
reference/example-toolpack/
reference/reconng/
reference/generate-event-catalogue.mjs
reference/hackhub-events.json
```

Do not move or delete the event catalogue. Runtime code currently imports `reference/hackhub-events.json`, and the other files are useful reference and compatibility material for mod authors. The release README may point authors to the development branch for the full maintainer and compatibility workflow; it must not imply that the reference material is an internal QA artifact that has been removed.

## Remove from the release-candidate branch

### Historical and maintenance documentation

Delete:

```text
docs/archive/
docs/01-analysis-and-architecture.md
docs/02-editor-shell.md
docs/03-questions-for-the-developers.md
docs/04-engine-bug-quest-completion.md
docs/05-bug-report-for-hotbunny.md
docs/06-how-it-works-today.md
docs/07-dev-response-mod-sdk-bug-report-response.md
docs/Game-Patch-1.3.0-1.3.1.md
docs/HANDOFF.md
docs/In-Game-Handbook.md
docs/SANDBOX-RESETS.md
docs/ToolPack-Format.md
docs/ideas/
docs/manual/
docs/plans/
```

Delete the superseded public maintenance note:

```text
public/manual/after-the-sdk-update.md
```

Before deleting `docs/ToolPack-Format.md`, confirm that the retained `reference/` material and the handbook provide enough author-facing compatibility information. If a product error still points to that file, replace the path with a useful handbook link or plain-language explanation before deletion.

### Stale public prototype

Delete:

```text
public/manual-figure-prototype.html
```

The prototype is stale and is not part of the author-facing handbook. The current smoke script depends on it, so first replace its role with a non-public fixture or generated in-memory bootstrap. Run the smoke checks again, then delete the prototype and all references to it from current maintenance instructions. Historical development-branch records may retain historical mentions.

Keep:

```text
public/manual.html
public/manual/
public/figures/
public/fonts/
```

`public/manual.html` remains the compatibility redirect to `public/manual/index.html`. The handbook pages, local renderer, local fonts, search data, and font licenses are release content.

Review `public/fonts/README.md`; remove it only if it is purely maintainer provenance and all required licensing/attribution remains available in the retained license files.

### Tests and test configuration

Delete all test files from the release-candidate branch:

```text
src/**/__tests__/
src/__tests__/
src/manual.coverage.test.ts
vitest.setup.ts
```

Remove Vitest configuration from `vite.config.ts`, including the Vitest type reference, test environment, test setup, and test include list.

Remove test-only package dependencies after the final pre-cleanup test run:

```text
@testing-library/dom
@testing-library/jest-dom
@testing-library/react
@testing-library/user-event
jsdom
vitest
```

Review `@types/node`, `@types/react`, `@types/react-dom`, `@types/prismjs`, `typescript`, and other development dependencies individually. Keep anything needed for the production build or typecheck.

### Handbook-generation machinery

The generated handbook remains in `public/`, but its authoring and evidence machinery is development-only. Delete:

```text
vite.manual-figures.config.ts
scripts/build-manual-index.mjs
scripts/build-node-pages.mjs
scripts/extract-manual-evidence-inventory.mjs
scripts/extract-manual-inventory.mjs
scripts/manual-evidence/
scripts/manual-figures/
```

Remove these package scripts:

```text
gen:manual-evidence
gen:manual-figures
gen:manual
```

The final handbook must be generated and checked before this machinery is deleted.

### One-off QA and environment scripts

Delete:

```text
scripts/build-freeze-probes.mjs
scripts/build-mail-authoring-probe.mjs
scripts/build-naza-pages.mjs
scripts/sandbox-recover.mjs
```

The actual NAZA template pages under `src/editor/websites/naza/` remain because the editor uses them. The one-off generator does not ship.

### Development-agent instructions

Remove `.github/agents/clean-code-architect.md`. Remove `.github/` entirely only if it contains no required release automation or workflow. Do not delete a required workflow accidentally.

## Keep product source

Keep all non-test application source, including:

```text
src/App.tsx
src/main.tsx
src/index.css
src/analysis/
src/compiler/
src/components/
src/editor/
src/hooks/
src/lib/
src/schema/
src/store/
src/templates/
src/toolpacks/
```

Clean broken references in source comments and user-visible product messages. In particular, inspect references to removed paths such as `docs/ToolPack-Format.md` and `docs/03-questions-for-the-developers.md`. A released warning must not send a quest author to a file that no longer exists.

## Package and configuration changes

The product-only `package.json` should retain only supported product workflows, likely:

```json
{
  "scripts": {
    "dev": "vite optimize --logLevel error && vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "typecheck": "tsc --noEmit"
  }
}
```

Remove `test`, `test:watch`, `gen:events`, handbook-generation scripts, and `recover` from the release-candidate `package.json`. Keep the event generator in `reference/`, but do not advertise it as a normal quest-author command on `main`.

Update `tsconfig.json` to remove development-only includes for test setup, manual-figure tooling, and other deleted files. The retained `reference/` data remains available to runtime imports and should not be removed from the project configuration if TypeScript needs it.

Update `package-lock.json` using the package manager after editing `package.json`. Confirm removed packages are absent and the production build still installs cleanly.

## README rewrite

Rewrite `README.md` as a product README. It should explain:

- what the editor does;
- the Node.js prerequisite;
- how to clone and launch it;
- how to update the checkout;
- how to open the handbook;
- how to save, export, and install a quest mod;
- basic troubleshooting;
- the license;
- where compatibility reference material lives, if useful.

Remove roadmap history, round reports, QA results, SDK investigations, internal architecture notes, sandbox recovery instructions, test commands, handbook-generation commands, and links to deleted `docs/` paths.

If authors need the complete development and maintenance workflow, point them to the preserved development branch rather than adding development documentation to `main`.

## Safe execution order

### 1. Freeze and verify the current development branch

Before deleting anything:

```bash
npm ci --no-audit --no-fund
npm run gen:manual
npm test
npm run typecheck
npm run build
npm audit
npm run gen:manual-evidence
npx vitest run src/manual.coverage.test.ts scripts/manual-evidence/source-inventory.test.ts
npm run gen:manual-figures
git diff --check
```

Record the passing baseline, handbook counts, editor build stamp, and any known human-only verification gaps. Do not prune dependencies or delete the test/generation machinery until this baseline has passed.

### 2. Preserve the development branch

Create or confirm the definitive development branch at the verified pre-cleanup commit. Push it and verify the remote branch before cleanup begins. Do not switch this session to another branch and do not merge to `main`.

### 3. Make the generated handbook independent of the public prototype

Replace the smoke-test fixture, regenerate the handbook, run the handbook gates, delete the public prototype, and remove current references to it.

### 4. Remove development-only content

Delete the approved docs, tests, scripts, handbook generators, test configuration, and development agent instructions. Preserve `reference/` and all product source and handbook assets.

### 5. Simplify the package and build configuration

Remove test and generation scripts, prune only dependencies proven unnecessary for `dev`, `build`, `preview`, and `typecheck`, update the lockfile, and remove stale configuration includes.

### 6. Rewrite the README and remove dead references

Search the whole retained tree for links, literal paths, comments, and user-visible strings referring to deleted files. Remove those references or replace them with valid handbook or development-branch references. Pay special attention to user-visible errors in source code. Also search the retained `reference/` material before deciding that a deleted compatibility document is unnecessary.

### 7. Validate the cleaned release candidate

From a clean install of the cleaned branch:

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run build
git diff --check
npm audit
```

Then verify manually that the editor starts, templates load, the event picker works, websites and dialogues work, a project saves and loads, and export produces a usable mod archive. Open `public/manual.html` and confirm the handbook, search, figures, relative links, and print layout work.

Confirm that the cleaned repository contains no:

```text
docs/
src/**/__tests__/
src/manual.coverage.test.ts
vitest.setup.ts
vite.manual-figures.config.ts
scripts/
public/manual-figure-prototype.html
public/manual/after-the-sdk-update.md
```

The `reference/` directory is intentionally exempt from this list and must remain.

### 8. Final handoff for manual merge

Do not merge to `main`. Report:

- the preserved development branch name and commit;
- the exact files removed;
- the retained reference material;
- the pre-cleanup test results;
- the post-cleanup build results;
- manual verification performed;
- anything still requiring human confirmation.

The repository owner will inspect the diff and perform the final merge by hand.

## Trapfalls to check explicitly

- Deleting `docs/` can leave dead paths in user-visible warnings and README links.
- Deleting manual-generation code before regenerating the handbook can leave stale generated pages or search data.
- Removing `jsdom` or testing libraries before the full suite completes prevents the final baseline from being reproduced.
- Removing `@hotbunny/hackhub-content-sdk` is safe only if no retained build or runtime path imports it; the event JSON and event generator must be treated separately.
- Deleting `.github/` without checking for workflows can remove release automation.
- Removing the public prototype without replacing its smoke-test role weakens the only existing renderer bootstrap check.
- Deleting tests from `main` means future changes to `main` no longer have local automated gates. The preserved development branch must remain the test-bearing source of truth.
- The final cleanup must not change editor behavior while removing development material. Any product-copy change needed to eliminate a dead documentation path must be identified and verified separately.
- `reference/` is intentionally retained for mod-author compatibility and must not be treated as disposable QA data.

## End state

The release-candidate branch is a clean Git-distributed product. Quest authors see the editor source, runtime data, launcher, README, handbook, licenses, and retained compatibility references. Developers retain the full QA and maintenance environment on the preserved development branch. The final merge to `main` is performed manually by the repository owner.
