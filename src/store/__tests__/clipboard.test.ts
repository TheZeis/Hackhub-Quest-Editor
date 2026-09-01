/**
 * Phase-2 canvas operations at the store level: multi-node copy/cut/paste/
 * duplicate, and the double-click reroute that splits a wire in two.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { act } from "@testing-library/react";
import { createProject } from "@/schema/project";
import { useEditor } from "@/store/editor";

function setup() {
    act(() => useEditor.getState().load(createProject(), { clearHistory: true }));
    const st = useEditor.getState();
    const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
    const b = st.addNode("fx.notify", { x: 300, y: 0 })!;
    useEditor.getState().updateNodeData(a, { message: "one" });
    useEditor.getState().updateNodeData(b, { message: "two" });
    useEditor.getState().connect({ source: a, sourceHandle: "out", target: b, targetHandle: "in" });
    return { a, b };
}

const nodesNow = () => useEditor.getState().project.quests[0].graph.nodes;
const edgesNow = () => useEditor.getState().project.quests[0].graph.edges;

beforeEach(() => localStorage.clear());

describe("clipboard", () => {
    it("copy → paste clones nodes and their internal wires with fresh ids", () => {
        const { a, b } = setup();
        act(() => useEditor.getState().select({ nodeIds: [a, b], edgeIds: [] }));
        act(() => useEditor.getState().copySelection());
        act(() => useEditor.getState().pasteClipboard());

        const nodes = nodesNow();
        expect(nodes).toHaveLength(4);
        const pasted = nodes.filter((n) => n.id !== a && n.id !== b);
        expect(new Set(pasted.map((n) => n.id)).size).toBe(2);
        // offset so the copies do not sit exactly on top of the originals
        expect(pasted[0].position.x).toBe(32);
        // the internal edge came along, rewired to the copies
        const edges = edgesNow();
        expect(edges).toHaveLength(2);
        const copy = edges.find((e) => e.source !== a)!;
        expect(pasted.some((n) => n.id === copy.source)).toBe(true);
        expect(pasted.some((n) => n.id === copy.target)).toBe(true);
        // data survived the clone
        const messages = pasted.map((n) => (n.data as { message?: string }).message).sort();
        expect(messages).toEqual(["one", "two"]);
    });

    it("cut removes the originals; duplicate keeps them", () => {
        const { a, b } = setup();
        act(() => useEditor.getState().select({ nodeIds: [a, b], edgeIds: [] }));
        act(() => useEditor.getState().cutSelection());
        expect(nodesNow()).toHaveLength(0);
        act(() => useEditor.getState().pasteClipboard());
        expect(nodesNow()).toHaveLength(2);

        act(() => useEditor.getState().select({ nodeIds: nodesNow().map((n) => n.id), edgeIds: [] }));
        act(() => useEditor.getState().duplicateSelection());
        expect(nodesNow()).toHaveLength(4);
    });
});

describe("reroute", () => {
    it("double-clicking a wire splits it through a new reroute node", () => {
        const { a, b } = setup();
        const edgeId = edgesNow()[0].id;
        let id: string | null = null;
        act(() => {
            id = useEditor.getState().insertReroute(edgeId);
        });
        expect(id).toBeTruthy();

        const nodes = nodesNow();
        const reroute = nodes.find((n) => n.id === id)!;
        expect(reroute.type).toBe("flow.reroute");
        expect(reroute.position.x).toBeGreaterThan(0);

        const edges = edgesNow();
        expect(edges).toHaveLength(2);
        expect(edges.some((e) => e.source === a && e.target === id)).toBe(true);
        expect(edges.some((e) => e.source === id && e.target === b)).toBe(true);
        expect(edges.some((e) => e.id === edgeId)).toBe(false);
    });
});
