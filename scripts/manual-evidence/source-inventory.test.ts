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
const diagnosticCoverage = JSON.parse(readFileSync(resolve(ROOT, "docs/manual/diagnostic-coverage.json"), "utf8")) as {
    diagnostics: Record<string, string>;
    panelMessages: Record<string, string>;
};
const checkingHtml = readFileSync(resolve(ROOT, "public/manual/checking.html"), "utf8");
const inventoryPath = resolve(ROOT, "docs/manual/evidence-inventory.json");
const nodeInventoryPath = resolve(ROOT, "docs/manual/inventory.json");
const expected = JSON.parse(readFileSync(inventoryPath, "utf8")) as EvidenceInventory;
const expectedNodeInventory = JSON.parse(readFileSync(nodeInventoryPath, "utf8"));
const actual = collectEvidenceInventory();
const EXPECTED_UNMATCHED_UI_LABELS: string[] = [];
const EXPECTED_UI_REVIEW_CANDIDATES = ["Browse 14 templates"];
const EXPECTED_UNMENTIONED_TEMPLATE_IDS: string[] = [];
const EXPECTED_UNDOCUMENTED_OPTIONAL_OUTPUTS: string[] = [];
const EXPECTED_DIAGNOSTICS_WITHOUT_QUOTE_CANDIDATE = 2;

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

function messageBlock(anchor: string): string {
    const start = checkingHtml.indexOf(`<h3 id="${anchor}"`);
    if (start < 0) return "";
    const remainder = checkingHtml.slice(start);
    const nextHeading = remainder.slice(1).search(/<h[23]\b/);
    const pageFoot = remainder.indexOf('<div class="pagefoot">');
    const candidates = [nextHeading < 0 ? -1 : nextHeading + 1, pageFoot].filter((index) => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : remainder.length;
    return remainder.slice(0, end);
}


function manualFeatureBlock(path: string, anchor: string): string {
    const html = readFileSync(resolve(ROOT, path), "utf8");
    const id = anchor.slice(1);
    const idAt = html.indexOf(`id="${id}"`);
    if (idAt < 0) return "";
    const start = html.lastIndexOf("<h", idAt);
    if (start < 0) return "";
    const remainder = html.slice(start);
    const heading = remainder.startsWith("<h2") ? "2" : remainder.startsWith("<h3") ? "3" : "";
    const candidates = [
        remainder.indexOf("<h2", 1),
        ...(heading === "2" ? [] : [remainder.indexOf("<h3", 1)]),
        remainder.indexOf('<div class="pagefoot">'),
    ].filter((index) => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : remainder.length;
    return remainder.slice(0, end);
}

describe("manual evidence inventory", () => {
    it("keeps the node and field inventory equal to live schema sources", () => {
        expect(sourceNodeInventory).toEqual(expectedNodeInventory);
    });

    it("matches the current source and manual snapshot", () => {
        expect(actual).toEqual(expected);
    });


    it("normalizes and source-checks every feature-guide section", () => {
        const mapping = actual.featureReference.sourceMapping;
        expect(mapping.schemaVersion).toBe(1);
        expect(mapping.manualSectionCount).toBe(32);
        expect(mapping.rows).toHaveLength(32);

        const route = (row: { manual: { path: string; anchor: string } }) => row.manual.path + row.manual.anchor;
        expect(mapping.rows.map(route).sort()).toEqual(actual.featureReference.manualSections.map(route).sort());
        expect(new Set(mapping.rows.map(route)).size).toBe(32);

        for (const row of mapping.rows) {
            expect(row.sources.length, "no source mapped for " + route(row)).toBeGreaterThan(0);
            const block = manualFeatureBlock(row.manual.path, row.manual.anchor);
            expect(block, "missing manual section " + route(row)).toContain('id="' + row.manual.anchor.slice(1) + '"');
            for (const source of row.sources) {
                expect(existsInRepo(source.path), "missing source file " + source.path).toBe(true);
                const sourceText = readFileSync(resolve(ROOT, source.path), "utf8");
                for (const symbol of source.symbols) {
                    expect(sourceText, source.path + " no longer contains " + symbol).toContain(symbol);
                }
            }
            for (const surface of row.errorSurfaces ?? []) {
                const sourceText = row.sources
                    .map((source) => readFileSync(resolve(ROOT, source.path), "utf8"))
                    .join("\\n");
                expect(sourceText, "source surface " + surface.id).toContain(surface.sourceText);
                expect(block, "manual explanation for " + surface.id).toContain(surface.manualText);
            }
        }

        const translation = mapping.rows.find((row) => route(row) === "public/manual/guides.html#translated-words");
        expect(translation?.status).toBe("limitation");
        expect(translation?.reviewNote).toContain("missing editor workflow");
    });

    it("renders source-matched UI names as labels rather than literal markup", () => {
        const branch = readFileSync(resolve(ROOT, "public/manual/nodes/flow-branch.html"), "utf8");
        expect(branch).toContain('<b class="ui">Details from the event</b>');
        expect(branch).toContain('<b class="ui">Quest data</b>');
        expect(branch).not.toContain('&lt;b class="ui"&gt;Details from the event');

        const prompt = readFileSync(resolve(ROOT, "public/manual/nodes/fx-prompt.html"), "utf8");
        expect(prompt).toContain('<b class="ui">Exactly this answer</b>');
        expect(prompt).toContain('<b class="ui">Contains these words</b>');
        expect(prompt).toContain('<b class="ui">Matches a pattern</b>');
        expect(prompt).not.toContain('<b class="ui">Exactly this answer, Contains these words or Matches a pattern</b>');

        const appCheck = readFileSync(resolve(ROOT, "public/manual/nodes/flow-appcheck.html"), "utf8");
        expect(appCheck).toContain("<code>apt-get install</code>");
        expect(appCheck).not.toContain('<b class="ui">apt-get install</b>');
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
        expect(actual.exportOutputs.manual.documentedOptionalFamilies).toEqual([
            "mod-icon",
            "mod-cover",
            "quest-images",
            "desktop-widgets",
        ]);
        expect(actual.exportOutputs.manual.undocumentedOptionalFamilies).toEqual(EXPECTED_UNDOCUMENTED_OPTIONAL_OUTPUTS);
        expect(actual.exportOutputs.manual.staleOptionalFamilies).toEqual([]);
    });

    it("indexes all diagnostic emission sites and keeps the current evidence gaps explicit", () => {
        expect(actual.diagnostics.evidenceCounts).toMatchObject({
            sourceSites: 56,
            graphIssues: 7,
            fieldWarnings: 9,
            exportWarnings: 40,
            panelMessages: 10,
            manualMessageBlocks: 63,
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

    it("maps every diagnostic source and curated panel message to an explained manual anchor", () => {
        expect(Object.keys(diagnosticCoverage.diagnostics).sort()).toEqual(
            actual.diagnostics.sites.map((row) => row.id).sort(),
        );
        expect(Object.keys(diagnosticCoverage.panelMessages).sort()).toEqual(
            actual.diagnostics.panelMessages.map((row) => row.id).sort(),
        );

        const mappedAnchors = [
            ...Object.values(diagnosticCoverage.diagnostics),
            ...Object.values(diagnosticCoverage.panelMessages),
        ];
        const messageAnchors = [...checkingHtml.matchAll(/<h3\b[^>]*\bid="(msg-[^"]+)"/g)].map((match) => match[1]);
        expect(new Set(messageAnchors).size).toBe(messageAnchors.length);
        expect([...new Set(mappedAnchors)].sort()).toEqual(messageAnchors.sort());

        for (const anchor of new Set(mappedAnchors)) {
            const block = messageBlock(anchor);
            expect(block, `missing explanation block for #${anchor}`).toContain('<blockquote class="blurb">');
            expect(block, `missing next-step notes for #${anchor}`).toContain('<dl class="facts-list">');
        }
    });
});
