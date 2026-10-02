/**
 * Legacy project files, and what the editor must still do with them.
 *
 * These three fixtures are old, hand-written project shapes. They are not QA
 * scaffolding: they are the only regression coverage for `migrate.ts` against
 * real legacy files, and for the r182 fix that made an old draft open on its
 * first quest instead of an empty canvas. They lived under
 * `reference/sdk-0.24-qa/projects/` until r253 retired that folder, and moved
 * here because what they protect is schema and store behaviour, not QA.
 *
 * The QA rows they were originally written for (T-14, S-12, S-15) are recorded
 * in `docs/archive/sdk-0.24-qa/STATUS.md`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseProjectFile } from "@/templates/share";
import { useEditor } from "@/store/editor";

const FIXTURES = join(__dirname, "fixtures");

describe("legacy project fixtures", () => {
    it("keeps the r30 Twotter fixture the migration row (T-14) opens", () => {
        /* T-14 asks a person to open an old draft and check nothing was lost.
           The fixture is the r30 shape: quest-level accounts, one node per
           tweet, four different time spellings. If the fixture or the migration
           moves, the row must fail here first. */
        const parsed = parseProjectFile(
            readFileSync(join(FIXTURES, "fixture-r30-twotter.project.json"), "utf8"),
        );
        expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
        if (!parsed.ok) return;
        const project = parsed.project;

        /* Two quests declared the same handle under different ids; one account
           must come out, and both quests' nodes must point at it. */
        expect(project.twotterAccounts.map((a) => a.handle)).toEqual(["legacy_smith"]);
        const lifted = project.twotterAccounts[0];
        expect(typeof lifted.bio).toBe("string");
        const accountsUsed = project.quests.flatMap((q) =>
            q.graph.nodes.filter((n) => n.type === "comms.tweet").map((n) => (n.data as { accountId: string }).accountId),
        );
        expect(new Set(accountsUsed)).toEqual(new Set([lifted.id]));

        const nodes = project.quests[0]!.graph.nodes.filter((n) => n.type === "comms.tweet");
        expect(nodes, "the r31 exile must not delete these nodes").toHaveLength(4);
        const rows = nodes.map((n) => (n.data as { tweets: Record<string, unknown>[] }).tweets[0]!);
        expect(rows.map((r) => [r.timeMode, r.agoAmount, r.agoUnit])).toEqual([
            ["earlier", 2, "days"],
            ["earlier", 1, "months"],
            ["arrival", 2, "days"],
            ["earlier", 1, "months"],
        ]);
        expect(nodes[1]!.data).toMatchObject({ migratedDate: true });
        expect(nodes[3]!.data).toMatchObject({ migratedDate: true });
        expect(nodes[0]!.data).not.toMatchObject({ migratedDate: true });
        expect(nodes[0]!.data).toMatchObject({ tweets: [expect.objectContaining({ content: expect.stringContaining("manifest was sealed") })] });
    });

    it("keeps the legacy fixtures the migration rows tell a tester to open", () => {
        /* S-12 and S-15 ask a person to open an old draft in the editor and
           check the boxes show the same numbers. Those drafts are files in the
           project folder, so they are guarded here: a fixture that stopped
           parsing (or stopped migrating the way the checklist says) would send
           the tester looking for a bug in the editor instead of in the file. */
        const fixtures: [string, Record<string, unknown>, string][] = [
            /* pre-r176: the delay fields, mode implied. */
            ["fixture-pre-r176-after.project.json", { mode: "after", hours: 2 }, "Wait 2 hours"],
            /* r176 window: an amount plus a unit must land in the unit's box. */
            [
                "fixture-r176-coming-day.project.json",
                { mode: "daytime", offsetWeeks: 2, hour: 18, minute: 23 },
                "2 weeks at 18:23",
            ],
        ];
        for (const [file, want, label] of fixtures) {
            const parsed = parseProjectFile(
                readFileSync(join(FIXTURES, file), "utf8"),
            );
            expect(parsed.ok, `${file} no longer parses: ${parsed.ok ? "" : parsed.error}`).toBe(true);
            if (!parsed.ok) continue;
            const node = parsed.project.quests[0].graph.nodes.find((n) => n.type === "flow.timer");
            expect(node, `${file} has no Timer node`).toBeDefined();
            const data = (node?.data ?? {}) as Record<string, unknown>;
            for (const [key, value] of Object.entries(want)) {
                expect(data[key], `${file}: ${key} (${label})`).toBe(value);
            }
        }
    });

    it("opens the fixtures on their quest, not on an empty canvas", () => {
        /* S-12/S-15, 2026-09-18: the tester opened both fixtures in the editor
           and reported them broken — "No quest selected", an empty canvas and
           the first-run template hint, because neither file carries
           `editor.activeQuestId` (they are old, hand-written shapes) and the
           editor used to take that literally. `ProjectSchema` now points the
           editor at the first quest that ships, so the row is a look at the
           boxes rather than a puzzle. This asserts the whole chain the editor
           runs: parse the file → load it into the store → a quest is active. */
        for (const file of [
            "fixture-pre-r176-after.project.json",
            "fixture-r176-coming-day.project.json",
        ]) {
            const parsed = parseProjectFile(readFileSync(join(FIXTURES, file), "utf8"));
            expect(parsed.ok, `${file} no longer parses`).toBe(true);
            if (!parsed.ok) continue;
            expect(parsed.project.editor.activeQuestId, `${file} opened on no quest`).toBe(
                parsed.project.quests[0].id,
            );
            useEditor.getState().load(parsed.project, { clearHistory: true });
            const active = useEditor.getState().project.editor.activeQuestId;
            expect(active, `${file} lost its active quest in the store`).toBe(parsed.project.quests[0].id);
            expect(
                useEditor.getState().project.quests.find((q) => q.id === active)?.graph.nodes.length,
                `${file} left the canvas empty`,
            ).toBeGreaterThan(0);
        }
    });
});
