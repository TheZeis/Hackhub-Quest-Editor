# r270 — finish the ten remaining how-tos

## Scope

Write and link every remaining walkthrough in `public/manual/how-do-i.html`:

1. Hide a page from search so `dirhunter` can find it.
2. Put a file on a remote device.
3. Gate progress on an Nmap scan.
4. Give the player a lead to look up.
5. Match a tool add-on to its target.
6. Route on whether an app is installed.
7. Chain conversations together.
8. End with **Complete quest**.
9. Customize a template.
10. Update an exported quest.

The user asked to complete all ten without a confirmation pause after each, with commits and pushes as checkpoints. This is documentation-only. No `src/**` product-copy or behavior changes are authorized. No editor-build bump is needed.

Ground-truth extraction was completed before editing any walkthrough prose. The table below records the evidence and the limits each how-to must respect.

## Ground truth

| Walkthrough | Evidence and supported claims |
|---|---|
| Hidden page | `WebPageSchema.seo` defaults on. The Websites editor labels it **Listed in the in-game search**; turning it off removes the page from search while preserving its URL (`src/schema/project.ts:55-65`; `src/editor/websites/WebsiteBuilder.tsx:579-607`). The export warning says an unlisted page is reachable by typing its address or running `dirhunter`; it is not private (`src/compiler/compile.ts:607-614`). `Terminal.Dirhunter` carries `host` and a `results` list (`src/schema/eventDocs.ts:45-49`). The Help Desk template matches `results` against its hidden path and separately detects opening that path (`src/templates/helpDeskLeak.ts:167-170`). |
| Remote file | **Place files** offers **A remote device**, a **Device IP**, **Parent folder**, and file rows (`src/schema/registry.ts:798-826`; `src/schema/nodes.ts:299-305`). Remote files are folded into the matching network device at compile time and placed under the account the player lands in (`src/compiler/seedRemoteFiles.ts:18-35,54-65,73-103,205-220`). The tests cover the same `{{data.targetIp}}` token on a random-address network, nested devices, account choice, and unplaced files (`src/compiler/__tests__/seedRemoteFiles.test.ts:26-64,67-80,91-115`). A missing network/device produces an export warning; the compiler removes successfully placed nodes from the runtime graph (`src/compiler/compile.ts:899-929,951-957`). The network must still offer the player a route in (`public/manual/nodes/world-network.html:57-74`). |
| Nmap gate | `Terminal.NmapScan` carries the scanned `ip`; `versionScan` says whether versions were probed (`src/schema/eventDocs.ts:39`). Condition values accept `{{data.targetIp}}` (`src/schema/nodes.ts:60-71`). Shipped templates match Nmap's `ip` to that token and route an objective's completion to the next beat (`src/templates/deadAir.ts:343-350,582-592`; `src/templates/ledgerContract.ts:232-287`). The walkthrough can require the target address without requiring `-sV`. |
| Lookup lead | **Tool response** overrides one named tool for an exact **Keyed by** input; `whois` can return labeled `Domain`, `IP`, `Registrant`, and `Email` lines (`src/schema/registry.ts:862-906`; `src/schema/nodes.ts:307-338`). `Terminal.Whois` carries `domain`; `Terminal.Nslookup` carries the domain and resolved address (`src/schema/eventDocs.ts:38-43`). The Harbour Manifest and Ledger Contract register a scripted Whois answer and trigger on the matching domain (`src/templates/harbourManifest.ts:180-191,209-211`; `src/templates/ledgerContract.ts:180-191,272-274`). **Register domain** separately maps a hostname to an address for `nslookup` (`public/manual/nodes/world-domain.html:56-80`). |
| Tool-pack target | The **Addons** window accepts `.json` pack files and shows any declared game-mod requirement (`src/toolpacks/ToolPackManagerDialog.tsx:40-67,77-110,154-170`). Packs are stored in browser-local storage, not inside the project (`src/store/packs.ts:1-8,16-66`). Target warnings run only when that pack is loaded, the quest uses its event/data/node, and the quest declares targets (`src/compiler/targetWarnings.ts:5-17,97-179`). They appear in Export and Dry run (`src/editor/shell/ExportDialog.tsx:24-28,110-123`; `src/editor/simulator/SimulatorDialog.tsx:54-89`). The Recon-NG example accepts listed services and aliases, requires a nonblank version, and checks domain weaknesses; its actual version match needs a substring the editor cannot verify (`reference/reconng/toolpack.json:369-401`; `reference/reconng/NOTES.md:18-32`; `src/compiler/targetWarnings.ts:115-156`). A green target warning check is not proof that a particular module matches. |
| App check | **App Install Check** has **Installed** and **Missing** outputs. It checks desktop apps, not terminal commands; the node reference lists nine supported desktop names and explains the list-saving option (`src/schema/registry.ts:300-339,1333-1361`; `public/manual/nodes/flow-appcheck.html:56-82,118-151`). The runtime calls `Desktop.isAppInstalled` and routes on its result (`src/compiler/runtimeSource.ts:1812-1828`). Terminal commands such as Lynx are not part of this check (`src/schema/registry.ts:319-325`). |
| Chained conversations | Dialogue has **Out** and **Wrong** outputs (`src/schema/registry.ts:911-921`). Phone **Out fires** can wait for **When the call ends** or run **Right after starting the call** (`src/editor/inspector/sims/DialogueNodeEditor.tsx:44-65`; `src/editor/shell/DialoguesDialog.tsx:259-274`). The runtime waits for an ending callback in the first mode (`src/compiler/runtimeSource.ts:2203-2229`). A typed answer reaches **Wrong** only when its **On a wrong answer** setting selects **Node's Wrong output** (`src/editor/inspector/sims/DialogScript.tsx:254-327`; `src/compiler/runtimeSource.ts:3288-3307`). `Cold Call` shows sequential conversation nodes and flow edges (`src/templates/coldCall.ts:119-130`). |
| Complete quest | **Complete quest** is terminal and has no flow output. Its source note says to put closing mail, payments, and notifications before it, or under **On quest complete** (`src/schema/registry.ts:1235-1247`; `public/manual/nodes/fx-completequest.html:56-62,90-96`). **On quest complete** runs after the completion node, auto-complete, or the manual button (`src/schema/registry.ts:534-544`; `src/compiler/runtimeSource.ts:3183-3207`). Quest **Money** and **XP** are paid for finishing; **Pay the player** is a separate mid-story transfer. **Complete automatically** and the manual button are separate behavior settings (`public/manual/guides.html:109-128`; `src/schema/project.ts:193-204`). |
| Customize a template | The picker offers fourteen entries, including two **Reference** sheets. `Node Reference` and `Quest Cookbook` carry the **Reference** label and are excluded from the playable-template tests (`src/templates/index.ts:31-157`; `src/templates/__tests__/templates.test.ts:66-68,102-122`). **Start from a template** replaces the current project, clears history, and warns that autosave is not versioned. It also offers **Export current quest** and **Import a quest file** (`src/editor/shell/Overlays.tsx:132-166,191-214`). The tutorial's present phrase “Templates are the harmless route” is therefore inaccurate and will be corrected (`public/manual/tutorial.html:98-103`). |
| Update an export | **Save** downloads the editable project JSON; **Load** reopens a saved project file (`src/editor/shell/TopBar.tsx:31-45,178-206`; `src/templates/share.ts:15-18`). The `.zip` is game output, not an editable project (`public/manual/export.html:134-147`). The Mod tab has **Mod id** and **Version**; its hint says to increase the version before each Workshop upload (`src/editor/inspector/InspectorPanel.tsx:656-668`). The download filename uses both values, while the archive contains a folder named for the mod ID (`src/editor/shell/ExportDialog.tsx:15-19,34-42`). The game reads an extracted folder in `mods/`, not the `.zip`; the exported folder replaces the old one (`public/manual/export.html:117-147`). |

## Planned edits

1. Link all ten rows in `how-do-i.html#howto-list` and add ten complete sections with exact, source-grounded steps. Soften the hidden-page title so it does not promise that direct URLs are blocked.
2. Use the ten filenames already declared in `docs/plans/r164-manual-screenshots.md`, from `howto-08-hidden-page.png` through `howto-17-update.png`. Leave missing-image placeholders in place; do not fabricate captures.
3. Correct the stale template-picker count in `guides.html` and the destructive-template warning in `tutorial.html`, without changing any editor copy.
4. Regenerate the manual index; run manual coverage, `npm run typecheck`, `npm run build`, and `git diff --check`. Do not run the full suite because no `src/**` files change.
5. Update `README.md` and `docs/HANDOFF.md`; move the displaced sixth **Done recently** entry into `docs/archive/round-265.md`. Keep the editor stamp at `2026-10-03.r267`.
6. Commit and push the plan before prose. Then write the walkthroughs in two batches, commit and push each checkpoint, and finish with a pushed delivery record. Do not pause for approval between how-tos.

## Capture constraint

The r269 baseline reports 79 screenshot files still pending. This workspace has no browser binary or Playwright/Puppeteer package, and `public/manual/img/` does not exist. Ten new figure references therefore raise the expected pending count to 89. No screenshot or visual review will be claimed.

## Verification targets

- G17: all 17 walkthrough sections link from the index.
- G18: zero how-to sentences exceed twenty words; keep the handbook-wide budget at zero.
- G8: every new image reference matches the existing r164 shot manifest; expected pending count is 89.
- `npm run gen:manual`, `npx vitest run src/manual.coverage.test.ts`, `npm run typecheck`, `npm run build`, and `git diff --check` all pass.
- No `src/**` files change, and `EDITOR_BUILD` remains `2026-10-03.r267`.

## Result

All ten how-tos are now written and linked. `how-do-i.html` has 17 linked walkthroughs. The hidden-page guide says direct URLs still work and `dirhunter` can find an unlisted path. The tool-pack guide limits target warnings to loaded, used packs and states that version checks do not prove compatibility. The template guide warns that loading a template replaces the project. The update guide separates the editable project from the exported archive.

Corrected the stale template-picker count in `guides.html` and replaced the tutorial's “harmless route” warning. The template picker has fourteen entries: twelve templates and two Reference sheets. The ten new figure references use the filenames declared in r164; no images were fabricated.

The work remained documentation-only. No `src/**` files changed, and the build stamp stays `2026-10-03.r267`. The manual generator wrote 41 node pages, with zero awaiting prose, and rebuilt 285 search entries from 51 pages. The final coverage run passed all 27 tests: G17 covers all 17 walkthroughs, G18 remains zero, and G8 reports 89 screenshots still pending.

`npm run typecheck` passed. `npm run build` passed, including typecheck; Vite emitted its existing nonfatal warning for a JavaScript chunk over 1 MB. `git diff --check` passed after the delivery edits. No full suite ran because no source files changed. Screenshot, browser visual and in-game reviews were not performed because no capture environment is available.

Plan and content checkpoints were pushed as `c62db60`, `1218d07`, `074e876` and `e70ee01` to `arena/01a1013d-hackhub-quest-editor`. The final handoff and roadmap update is committed and pushed separately.
