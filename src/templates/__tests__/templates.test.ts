/**
 * Templates are shipped content, so they have to satisfy the same invariants a
 * user's project would: parse against the schema, only wire compatible handles,
 * and keep every node reachable from a lifecycle entry point.
 */
import { describe, expect, it } from "vitest";
import { ProjectSchema } from "@/schema/project";
import { NodeSchema, type NodeDoc, type NodeType } from "@/schema/nodes";
import { EdgeSchema, canConnect, type EdgeKind } from "@/schema/edges";
import { nodeTypeDef, NODE_TYPES_REGISTRY } from "@/schema/registry";
import { summarize } from "@/editor/canvas/summarize";
import { getTemplate, TEMPLATES } from "@/templates";

describe("template registry", () => {
    it("ships the templates named in the plan", () => {
        expect(TEMPLATES.map((t) => t.id)).toEqual(["blank", "hello-hack", "wifi-hack"]);
        expect(getTemplate("wifi-hack")?.name).toBe("Simple Linear Wi-Fi Hack");
        expect(getTemplate("nope")).toBeUndefined();
    });

    it.each(TEMPLATES)("%s: parses against the project schema", (template) => {
        const result = ProjectSchema.safeParse(template.build());
        expect(result.success, JSON.stringify(result.success ? null : result.error.issues)).toBe(true);
    });

    it.each(TEMPLATES)("%s: has the node count it advertises", (template) => {
        const project = template.build();
        const total = project.quests.reduce((n, q) => n + q.graph.nodes.length, 0);
        expect(total).toBe(template.nodeCount);
    });

    it.each(TEMPLATES)("%s: builds deterministically", (template) => {
        // Ids are generated from a counter rather than randomness, so two builds
        // are byte-identical. That is what makes snapshots and the export diff
        // stable.
        expect(JSON.stringify(template.build())).toBe(JSON.stringify(template.build()));
    });

    it.each(TEMPLATES)("%s: has unique node ids", (template) => {
        for (const quest of template.build().quests) {
            const ids = quest.graph.nodes.map((n) => n.id);
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    it.each(TEMPLATES)("%s: every node validates on its own", (template) => {
        for (const quest of template.build().quests) {
            for (const node of quest.graph.nodes) {
                const result = NodeSchema.safeParse(node);
                expect(result.success, `${node.type}: ${JSON.stringify(result.success ? null : result.error.issues)}`).toBe(
                    true,
                );
            }
        }
    });

    it.each(TEMPLATES)("%s: only wires compatible handles", (template) => {
        for (const quest of template.build().quests) {
            const byId = new Map(quest.graph.nodes.map((n) => [n.id, n]));
            for (const edge of quest.graph.edges) {
                const source = byId.get(edge.source);
                const target = byId.get(edge.target);
                expect(source, `edge ${edge.id} references missing source ${edge.source}`).toBeDefined();
                expect(target, `edge ${edge.id} references missing target ${edge.target}`).toBeDefined();

                const sourceSpec = nodeTypeDef(source!.type).sources.find((h) => h.id === edge.sourceHandle);
                const targetSpec = nodeTypeDef(target!.type).targets.find((h) => h.id === edge.targetHandle);
                expect(sourceSpec, `${source!.type} has no source handle "${edge.sourceHandle}"`).toBeDefined();
                expect(targetSpec, `${target!.type} has no target handle "${edge.targetHandle}"`).toBeDefined();
                expect(
                    canConnect(sourceSpec!.kind as EdgeKind, targetSpec!.kind as EdgeKind),
                    `${source!.type}.${edge.sourceHandle} → ${target!.type}.${edge.targetHandle}`,
                ).toBe(true);
                expect(edge.kind).toBe(sourceSpec!.kind);

                expect(EdgeSchema.safeParse(edge).success).toBe(true);
            }
        }
    });

    it.each(TEMPLATES)("%s: has no duplicate wires", (template) => {
        for (const quest of template.build().quests) {
            const keys = quest.graph.edges.map(
                (e) => `${e.source}|${e.sourceHandle}|${e.target}|${e.targetHandle}`,
            );
            expect(new Set(keys).size).toBe(keys.length);
        }
    });

    it.each(TEMPLATES)("%s: reaches every node from an entry point", (template) => {
        for (const quest of template.build().quests) {
            const starts = quest.graph.nodes
                .filter((n) => n.type.startsWith("entry."))
                .map((n) => n.id);
            // Triggers and standalone declarative nodes are legal to leave
            // unwired, so only flow-reachable types are required to be reached.
            const reachable = new Set<string>();
            const queue = [...starts];
            while (queue.length > 0) {
                const id = queue.pop()!;
                if (reachable.has(id)) continue;
                reachable.add(id);
                for (const edge of quest.graph.edges) {
                    if (edge.source === id) queue.push(edge.target);
                }
            }
            for (const node of quest.graph.nodes) {
                const def = nodeTypeDef(node.type);
                const isIslandAllowed =
                    node.type.startsWith("trigger.") ||
                    node.type === "objective" ||
                    def.targets.length === 0;
                expect(
                    isIslandAllowed || reachable.has(node.id),
                    `${node.type} (${node.id}) is unreachable from any entry point`,
                ).toBe(true);
            }
        }
    });
});

describe("node summaries", () => {
    it.each(TEMPLATES)("%s: summarises every node without throwing", (template) => {
        for (const quest of template.build().quests) {
            for (const node of quest.graph.nodes) {
                const lines = summarize(node);
                expect(Array.isArray(lines)).toBe(true);
                for (const line of lines) expect(typeof line).toBe("string");
            }
        }
    });

    it.each(Object.keys(NODE_TYPES_REGISTRY) as NodeType[])(
        "%s: summarises its default state",
        (type) => {
            const node = {
                id: "n1",
                type,
                position: { x: 0, y: 0 },
                data: nodeTypeDef(type).create(),
            } as unknown as NodeDoc;

            const lines = summarize(node);
            expect(Array.isArray(lines)).toBe(true);
            expect(lines.length).toBeGreaterThan(0);
            for (const line of lines) {
                expect(line.trim().length).toBeGreaterThan(0);
                expect(line.length).toBeLessThanOrEqual(80);
            }
        },
    );

    it("renders the Wi-Fi template's access point with its SSID", () => {
        const wifi = TEMPLATES[2]
            .build()
            .quests[0].graph.nodes.find((n) => n.type === "world.wifi")!;
        expect(summarize(wifi).join(" ")).toContain("NEIGHBOUR_5Ghz");
    });
});
