import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES, NODE_TYPES_REGISTRY, type FieldDef } from "@/schema/registry";
import { EDGE_KINDS } from "@/schema/edges";
import { EVENT_GROUPS, EVENTS } from "@/schema/events";
import { inventory as sourceNodeInventory } from "../extract-manual-inventory.mjs";
import { collectEvidenceInventory } from "../extract-manual-evidence-inventory.mjs";

type EvidenceInventory = ReturnType<typeof collectEvidenceInventory>;

const ROOT = process.cwd();
const inventoryPath = resolve(ROOT, "docs/manual/evidence-inventory.json");
const nodeInventoryPath = resolve(ROOT, "docs/manual/inventory.json");
const expected = JSON.parse(readFileSync(inventoryPath, "utf8")) as EvidenceInventory;
const expectedNodeInventory = JSON.parse(readFileSync(nodeInventoryPath, "utf8"));
const actual = collectEvidenceInventory();
const EXPECTED_UNMATCHED_UI_LABELS = [
    "apt-get install",
    "Claim quest",
    "equals",
    "Event",
    "Exactly this answer, Contains these words or Matches a pattern",
    "Field",
    "Save the list of installed apps",
    "What to do",
];
const EXPECTED_UI_REVIEW_CANDIDATES = [
    "Browse 14 templates",
    "Claim quest",
    "Exactly this answer, Contains these words or Matches a pattern",
    "Event",
    "equals",
    "Field",
    "Save the list of installed apps",
    "What to do",
    "apt-get install",
];
const EXPECTED_UNMENTIONED_TEMPLATE_IDS = [
    "blank",
    "data-grab",
    "the-help-desk-leak",
    "bad-attachment",
    "six-tries",
    "dead-air",
    "cold-storage",
    "contract-hack",
    "long-game",
];
const EXPECTED_UNDOCUMENTED_OPTIONAL_OUTPUTS = ["mod-icon", "mod-cover", "quest-images", "desktop-widgets"];
const EXPECTED_DIAGNOSTICS_WITHOUT_QUOTE_CANDIDATE = 31;

function existsInRepo(relativePath: string): boolean {
    try {
        readFileSync(resolve(ROOT, relativePath));
        return true;
    } catch {
        return false;
    }
}

function fieldPaths(fields: FieldDef[], parentPath = ""): string[] {
    return fields.flatMap((field) => {
        if (field.kind === "row") return fieldPaths(field.fields, parentPath);
        if (field.kind === "clock") return fieldPaths([field.hour, field.minute], parentPath);
        const key = "key" in field ? field.key : undefined;
        const fieldPath = parentPath ? `${parentPath}.${key ?? field.kind}` : String(key ?? field.kind);
        const children = field.kind === "section" || field.kind === "list" ? fieldPaths(field.fields, fieldPath) : [];
        return [fieldPath, ...children];
    });
}

describe("manual evidence inventory", () => {
    it("keeps the node and field inventory equal to live schema sources", () => {
        expect(sourceNodeInventory).toEqual(expectedNodeInventory);
    });

    it("matches the current source and manual snapshot", () => {
        expect(actual).toEqual(expected);
    });

    it("cites every registry node, field, socket, event and category", () => {
        const registry = actual.nodeInventory;
        const nodeTypes = Object.keys(NODE_TYPES_REGISTRY) as (keyof typeof NODE_TYPES_REGISTRY)[];
        expect(registry.counts.nodeTypes).toBe(nodeTypes.length);
        expect(registry.counts.categories).toBe(CATEGORIES.length);
        expect(registry.counts.events).toBe(EVENTS.length);
        expect(registry.counts.eventGroups).toBe(EVENT_GROUPS.length);
        expect(registry.nodeTypeCitations.map((row) => row.type).sort()).toEqual([...nodeTypes].sort());
        expect(registry.nodeTypeCitations.map((row) => row.label).sort()).toEqual(nodeTypes.map((type) => NODE_TYPES_REGISTRY[type].label).sort());
        expect(registry.socketCitations).toHaveLength(registry.counts.sockets);
        expect(registry.events.map((event) => event.name)).toEqual(EVENTS.map((event) => event.name));
        expect(registry.categories.map(({ id, label, hex }) => ({ id, label, hex }))).toEqual(
            CATEGORIES.map(({ id, label, hex }) => ({ id, label, hex })),
        );
        expect(registry.edgeKinds.map((row) => row.kind)).toEqual(EDGE_KINDS);
        expect(registry.eventGroups.map((group) => group.id)).toEqual(EVENT_GROUPS.map((group) => group.id));

        const expectedFieldPaths = nodeTypes.flatMap((type) =>
            fieldPaths(NODE_TYPES_REGISTRY[type].fields).map((fieldPath) => `${type}:${fieldPath}`),
        ).sort();
        expect(registry.fieldCitations.map((row) => `${row.node}:${row.path}`).sort()).toEqual(expectedFieldPaths);

        const expectedSockets = nodeTypes.flatMap((type) => [
            ...NODE_TYPES_REGISTRY[type].targets.map((socket) => `${type}:input:${socket.id}:${socket.kind}:${socket.label}`),
            ...NODE_TYPES_REGISTRY[type].sources.map((socket) => `${type}:output:${socket.id}:${socket.kind}:${socket.label}`),
        ]).sort();
        expect(registry.socketCitations.map((socket) => `${socket.node}:${socket.direction}:${socket.id}:${socket.kind}:${socket.label}`).sort()).toEqual(expectedSockets);

        const citations = [
            ...registry.nodeTypeCitations.map((row) => row.source),
            ...registry.fieldCitations.map((row) => row.source),
            ...registry.socketCitations.map((row) => row.source),
            ...registry.categories.map((row) => row.source),
            ...registry.edgeKinds.map((row) => row.source),
            ...registry.eventGroups.map((row) => row.source),
            ...registry.events.map((row) => row.source),
        ];
        expect(citations.every((citation) => existsInRepo(citation.path))).toBe(true);
        expect(registry.fieldCitations.length).toBeGreaterThan(registry.counts.editableFields);
    });

    it("keeps quoted manual UI labels tied to source or on the explicit review list", () => {
        expect(actual.uiLabels.occurrences).toBeGreaterThan(500);
        expect(actual.uiLabels.uniqueLabels).toBeGreaterThan(150);
        expect(actual.uiLabels.dynamicSourceMatches).toBe(1);
        expect(actual.uiLabels.unmatchedLabels).toEqual(EXPECTED_UNMATCHED_UI_LABELS);
        expect(actual.uiLabels.reviewCandidates).toEqual(EXPECTED_UI_REVIEW_CANDIDATES);

        const dynamic = actual.uiLabels.rows.find((row) => row.matchStatus === "dynamic-source-match");
        expect(dynamic?.dynamicSource).toMatchObject({
            path: "src/App.tsx",
            pattern: "Browse {TEMPLATES.length} templates",
            renderedCount: actual.templates.count,
        });
    });

    it("extracts the complete template registry and records which names the manual mentions", () => {
        expect(actual.templates.count).toBe(14);
        expect(new Set(actual.templates.rows.map((row) => row.id)).size).toBe(actual.templates.count);
        expect(new Set(actual.templates.rows.map((row) => row.name)).size).toBe(actual.templates.count);
        expect(actual.templates.namesNotMentionedInManual).toEqual(EXPECTED_UNMENTIONED_TEMPLATE_IDS);
        for (const template of actual.templates.rows) {
            expect(template.source.path).toBe("src/templates/index.ts");
            expect(template.source.line).toBeGreaterThan(0);
        }
    });

    it("compares the permission list with the compiler-derived set", () => {
        expect(actual.permissions.rows.map((row) => row.name)).toEqual([
            "bank",
            "events",
            "filesystem",
            "mail",
            "network",
            "shell",
            "ui",
        ]);
        expect(actual.permissions.manual.missing).toEqual([]);
        expect(actual.permissions.manual.stale).toEqual([]);
        expect(actual.permissions.rows.every((row) => row.producers.length > 0)).toBe(true);
    });

    it("compares fixed archive paths and keeps conditional output families visible", () => {
        expect(actual.exportOutputs.fixed.map((row) => row.path).sort()).toEqual([
            "README.md",
            "dist/manifest.json",
            "dist/mod.js",
            "esbuild.config.mjs",
            "manifest.json",
            "package.json",
            "src/index.ts",
            "tsconfig.json",
        ]);
        expect(actual.exportOutputs.manual.missingFixed).toEqual([]);
        expect(actual.exportOutputs.manual.staleFixed).toEqual([]);
        expect(actual.exportOutputs.manual.undocumentedOptionalFamilies).toEqual(EXPECTED_UNDOCUMENTED_OPTIONAL_OUTPUTS);
    });

    it("indexes all diagnostic emission sites and keeps the current evidence gaps explicit", () => {
        expect(actual.diagnostics.evidenceCounts).toMatchObject({
            sourceSites: 56,
            graphIssues: 7,
            fieldWarnings: 9,
            exportWarnings: 40,
            panelMessages: 10,
            manualMessageBlocks: 31,
        });
        expect(new Set(actual.diagnostics.sites.map((row) => row.id)).size).toBe(56);
        expect(actual.diagnostics.sites.every((row) => existsInRepo(row.source.path) && row.source.line > 0)).toBe(true);
        expect(actual.diagnostics.evidenceCounts.sourceSitesWithoutQuoteCandidate).toBe(
            EXPECTED_DIAGNOSTICS_WITHOUT_QUOTE_CANDIDATE,
        );
        expect(actual.diagnostics.noQuoteCandidateSites).toEqual(
            actual.diagnostics.sites
                .filter((row) => row.manualQuoteEvidence.status === "no-quote-candidate")
                .map((row) => row.id),
        );
    });
});
