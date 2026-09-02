/**
 * The two "do the obvious thing" wiring gestures, decided in one place:
 * dropping a wire on a node's body, and dropping it on nothing.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    nodeIdUnderPointer,
    soleEdgeInto,
    soleMatchingInput,
    soleMatchingOutput,
} from "@/editor/canvas/wiring";
import { createProject } from "@/schema/project";
import { useEditor } from "@/store/editor";

const quest = () => useEditor.getState().project.quests[0];
const nodeOf = (id: string) => quest().graph.nodes.find((n) => n.id === id)!;

beforeEach(() => {
    localStorage.clear();
    useEditor.getState().load(createProject(), { clearHistory: true });
});

describe("dropping a wire on a node's body", () => {
    it("finds the node's one matching input", () => {
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const b = st.addNode("fx.shell", { x: 300, y: 0 })!;
        expect(soleMatchingInput(nodeOf(a), "out", nodeOf(b))).toBe("in");
    });

    it("still finds it when the node has other inputs of other kinds", () => {
        // An objective takes flow, a trigger and an unlock — three inputs, but
        // only one of them is a flow input, so a flow wire has one home.
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const obj = st.addNode("objective", { x: 300, y: 0 })!;
        expect(soleMatchingInput(nodeOf(a), "out", nodeOf(obj))).toBe("in");
    });

    it("does nothing when the node has no input of that kind", () => {
        const st = useEditor.getState();
        const obj = st.addNode("objective", { x: 0, y: 0 })!;
        const notify = st.addNode("fx.notify", { x: 300, y: 0 })!;
        // "Unlocks" leaves an objective; a notify node has no unlock input.
        expect(soleMatchingInput(nodeOf(obj), "unlocks", nodeOf(notify))).toBeNull();
    });

    it("refuses to guess for an unknown socket, or a node dropped on itself", () => {
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const b = st.addNode("fx.notify", { x: 300, y: 0 })!;
        expect(soleMatchingInput(nodeOf(a), "no-such-socket", nodeOf(b))).toBeNull();
        expect(soleMatchingInput(nodeOf(a), "out", nodeOf(a))).toBeNull();
    });
});

describe("finding the node under the pointer", () => {
    /** jsdom has no hit testing, so stand one in. */
    function pointsAt(el: Element | null) {
        Object.defineProperty(document, "elementFromPoint", {
            configurable: true,
            writable: true,
            value: () => el,
        });
    }
    afterEach(() => {
        delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
    });

    it("reads the node id off the card the pointer is over", () => {
        document.body.innerHTML = `
            <div class="react-flow__node" data-id="node-7">
                <div id="inner">a card body</div>
            </div>`;
        pointsAt(document.getElementById("inner"));

        expect(nodeIdUnderPointer(new MouseEvent("mouseup", { clientX: 10, clientY: 10 }))).toBe(
            "node-7",
        );
    });

    it("is null over empty canvas — which is what deletes a dragged-off wire", () => {
        document.body.innerHTML = `<div class="react-flow__pane"></div>`;
        pointsAt(document.querySelector(".react-flow__pane"));
        expect(nodeIdUnderPointer(new MouseEvent("mouseup"))).toBeNull();
    });

    it("follows a finger, not just a mouse", () => {
        document.body.innerHTML = `<div class="react-flow__node" data-id="node-9"></div>`;
        pointsAt(document.querySelector(".react-flow__node"));
        const touch = new Event("touchend") as unknown as TouchEvent;
        Object.defineProperty(touch, "changedTouches", {
            value: [{ clientX: 5, clientY: 5 }],
        });
        expect(nodeIdUnderPointer(touch)).toBe("node-9");
    });

    it("says nothing rather than guessing where hit testing is unavailable", () => {
        document.body.innerHTML = `<div class="react-flow__node" data-id="node-9"></div>`;
        expect(nodeIdUnderPointer(new MouseEvent("mouseup"))).toBeNull();
    });
});

describe("pulling a wire out of an input", () => {
    /** a → c and b → c, both into c's flow input. */
    function twoInto() {
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const b = st.addNode("fx.notify", { x: 0, y: 200 })!;
        const c = st.addNode("fx.shell", { x: 300, y: 0 })!;
        st.connect({ source: a, sourceHandle: "out", target: c, targetHandle: "in" });
        st.connect({ source: b, sourceHandle: "out", target: c, targetHandle: "in" });
        return { a, b, c };
    }

    it("picks up the one wire arriving at that socket", () => {
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const b = st.addNode("fx.shell", { x: 300, y: 0 })!;
        st.connect({ source: a, sourceHandle: "out", target: b, targetHandle: "in" });

        const held = soleEdgeInto(quest().graph.edges, b, "in");
        expect(held?.source).toBe(a);
    });

    it("picks up nothing when the socket is empty, or when several wires meet there", () => {
        const { b, c } = twoInto();
        expect(soleEdgeInto(quest().graph.edges, c, "in")).toBeNull(); // ambiguous
        expect(soleEdgeInto(quest().graph.edges, b, "in")).toBeNull(); // nothing arrives
    });

    it("finds the one output that could feed the socket in hand", () => {
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const b = st.addNode("fx.shell", { x: 300, y: 0 })!;
        // Wire held by its input end, dropped on a's body: a has one output.
        expect(soleMatchingOutput(nodeOf(a), nodeOf(b), "in")).toBe("out");
    });

    it("refuses to guess when the node offers several outputs of that kind", () => {
        const st = useEditor.getState();
        const branch = st.addNode("flow.branch", { x: 0, y: 0 })!; // true / false
        const shell = st.addNode("fx.shell", { x: 300, y: 0 })!;
        expect(soleMatchingOutput(nodeOf(branch), nodeOf(shell), "in")).toBeNull();
        // …and it never wires a node to itself.
        expect(soleMatchingOutput(nodeOf(shell), nodeOf(shell), "in")).toBeNull();
    });
});
