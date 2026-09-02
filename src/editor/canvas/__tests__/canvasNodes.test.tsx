/**
 * Canvas behaviour that only shows up with React Flow actually mounted:
 * deleting a reroute nodule, and the sockets a Sequence node grows from its
 * own data. Both were reported from the real editor, so both are pinned here
 * against the mounted app rather than the store alone.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { createProject } from "@/schema/project";
import { useEditor } from "@/store/editor";
import { Position } from "@xyflow/react";
import { TypedEdge } from "@/editor/canvas/TypedEdge";
import { sourcesOf } from "@/schema/registry";
import { readableOn } from "@/editor/canvas/GraphNode";

const quest = () => useEditor.getState().project.quests[0];

beforeEach(() => {
    localStorage.clear();
    act(() => useEditor.getState().load(createProject(), { clearHistory: true }));
});

describe("reroute nodule", () => {
    /** a → reroute → b, with the nodule selected. */
    function wiredReroute() {
        const st = useEditor.getState();
        const a = st.addNode("fx.notify", { x: 0, y: 0 })!;
        const b = st.addNode("fx.notify", { x: 400, y: 0 })!;
        act(() => {
            useEditor.getState().connect({ source: a, sourceHandle: "out", target: b, targetHandle: "in" });
        });
        let reroute: string | null = null;
        act(() => {
            reroute = useEditor.getState().insertReroute(quest().graph.edges[0].id);
        });
        return { a, b, reroute: reroute! };
    }

    it("deleting it takes its wires with it, in one press", async () => {
        const user = userEvent.setup();
        const { reroute } = wiredReroute();
        render(<App />);

        act(() => useEditor.getState().select({ nodeIds: [reroute], edgeIds: [] }));
        await waitFor(() => expect(document.querySelector(".qe-reroute")).not.toBeNull());

        await user.keyboard("{Delete}");

        await waitFor(() => {
            expect(quest().graph.nodes.some((n) => n.id === reroute)).toBe(false);
        });
        // …and no wire is left pointing at a node that no longer exists.
        expect(quest().graph.edges.filter((e) => e.source === reroute || e.target === reroute)).toEqual([]);
    });

    it("removing it from the store alone also removes both wires", () => {
        const { reroute } = wiredReroute();
        expect(quest().graph.edges).toHaveLength(2);
        act(() => useEditor.getState().removeNodes([reroute]));
        expect(quest().graph.nodes.some((n) => n.id === reroute)).toBe(false);
        expect(quest().graph.edges).toEqual([]);
    });

    it("shows a single dot: both sockets sit on the same point", async () => {
        wiredReroute();
        render(<App />);
        await waitFor(() => expect(document.querySelector(".qe-reroute")).not.toBeNull());

        const nodule = document.querySelector(".qe-reroute")!;
        const handles = [...nodule.querySelectorAll(".react-flow__handle")] as HTMLElement[];
        expect(handles).toHaveLength(2);
        const positions = handles.map((h) => `${h.style.left}|${h.style.top}|${h.style.transform}`);
        expect(new Set(positions).size).toBe(1);
        expect(positions[0]).toBe("50%|50%|translate(-50%, -50%)");
        // one is the way in, the other the way out
        expect(handles.filter((h) => h.classList.contains("target"))).toHaveLength(1);
        expect(handles.filter((h) => h.classList.contains("source"))).toHaveLength(1);
    });
});

describe("sequence node sockets", () => {
    it("grows one output per step, named after the step", () => {
        const id = useEditor.getState().addNode("flow.sequence", { x: 0, y: 0 })!;
        act(() =>
            useEditor.getState().updateNodeData(id, {
                steps: [
                    { id: "a", label: "Lights out", delayMs: 0 },
                    { id: "b", label: "Sirens", delayMs: 800 },
                    { id: "c", label: "", delayMs: 200 },
                ],
            }),
        );
        const node = quest().graph.nodes.find((n) => n.id === id)!;
        expect(sourcesOf(node).map((h) => h.id)).toEqual(["step-a", "step-b", "step-c"]);
        expect(sourcesOf(node).map((h) => h.label)).toEqual(["Lights out", "Sirens", "Step 3"]);
        expect(sourcesOf(node).every((h) => h.kind === "flow")).toBe(true);
    });

    it("wires to a step, and drops that wire when the step is removed", () => {
        const st = useEditor.getState();
        const seq = st.addNode("flow.sequence", { x: 0, y: 0 })!;
        const notify = st.addNode("fx.notify", { x: 300, y: 0 })!;
        act(() =>
            useEditor.getState().updateNodeData(seq, {
                steps: [
                    { id: "a", label: "First", delayMs: 0 },
                    { id: "b", label: "Second", delayMs: 500 },
                ],
            }),
        );

        const ok = useEditor
            .getState()
            .connect({ source: seq, sourceHandle: "step-b", target: notify, targetHandle: "in" });
        expect(ok).toBe(true);
        expect(quest().graph.edges).toHaveLength(1);

        // A socket that no longer exists cannot be wired to.
        expect(
            useEditor
                .getState()
                .connect({ source: seq, sourceHandle: "step-zzz", target: notify, targetHandle: "in" }),
        ).toBe(false);

        // Removing the step removes its wire rather than leaving an invisible one.
        act(() =>
            useEditor.getState().updateNodeData(seq, {
                steps: [{ id: "a", label: "First", delayMs: 0 }],
            }),
        );
        expect(quest().graph.edges).toEqual([]);
    });
});

describe("group frame", () => {
    it("paints a title bar in the author's colour, with readable text", async () => {
        const id = useEditor.getState().addNode("layout.group", { x: 0, y: 0 })!;
        act(() =>
            useEditor.getState().updateNodeData(id, { label: "Act 1: recon", color: "#fbbf24" }),
        );
        render(<App />);

        const bar = await waitFor(() => {
            const el = [...document.querySelectorAll("div")].find(
                (d) => d.textContent === "Act 1: recon" && d.style.background !== "",
            );
            expect(el).toBeTruthy();
            return el!;
        });
        expect(bar.style.background).toBe("rgb(251, 191, 36)");
        // amber is a light colour, so the name has to be dark to stay legible
        const label = bar.querySelector("span:last-child") as HTMLElement;
        expect(label.style.color).toBe("rgb(8, 9, 13)");
    });

    it("falls back to slate for frames made before colours existed", () => {
        const id = useEditor.getState().addNode("layout.group", { x: 0, y: 0 })!;
        const node = quest().graph.nodes.find((n) => n.id === id)!;
        expect((node.data as { color: string }).color).toBe("#64748b");
    });

    it("gives the resize corners a bigger grab target than React Flow's 5px default", async () => {
        const id = useEditor.getState().addNode("layout.group", { x: 0, y: 0 })!;
        render(<App />);
        act(() => useEditor.getState().select({ nodeIds: [id], edgeIds: [] }));

        const handle = await waitFor(() => {
            const el = document.querySelector(".react-flow__resize-control.handle") as HTMLElement;
            expect(el).toBeTruthy();
            return el;
        });
        expect(parseFloat(handle.style.width)).toBeGreaterThanOrEqual(6.5); // 5px + 30%
        expect(parseFloat(handle.style.height)).toBeGreaterThanOrEqual(6.5);
    });
});

describe("dark-on-light contrast helper", () => {
    it("picks dark ink on light frames and light ink on dark ones", () => {
        expect(readableOn("#fbbf24")).toBe("#08090d");
        expect(readableOn("#64748b")).toBe("#f5f7fa");
        expect(readableOn("not a colour")).toBe("#08090d");
    });
});

describe("wires", () => {
    it("draws a solid line plus a fatter dotted overlay that flows to the target", () => {
        // React Flow only mounts edges once handles have been measured, which
        // jsdom never does — so the edge component is rendered on its own.
        render(
            <svg>
                <TypedEdge
                    id="e1"
                    source="a"
                    target="b"
                    sourceX={0}
                    sourceY={0}
                    targetX={200}
                    targetY={80}
                    sourcePosition={Position.Right}
                    targetPosition={Position.Left}
                    data={{ kind: "flow" }}
                />
            </svg>,
        );

        const base = document.querySelector("path.react-flow__edge-path") as SVGPathElement;
        expect(base).toBeTruthy();
        // solid: no dash pattern on the wire itself
        expect(base.style.strokeDasharray).toBe("");
        expect(base.style.stroke).toBe("var(--color-cat-effect)"); // the source socket's colour

        const dots = document.querySelector("path.qe-flow-dots") as SVGPathElement;
        expect(dots).toBeTruthy();
        expect(dots.style.strokeLinecap).toBe("round");
        expect(dots.style.strokeDasharray).toBe("0.1 14"); // dots, not dashes
        expect(dots.style.stroke).toBe(base.style.stroke); // same colour as the wire
        expect(parseFloat(dots.style.strokeWidth)).toBeGreaterThan(parseFloat(base.style.strokeWidth));
        // both share the same path, so the dots ride the wire exactly
        expect(dots.getAttribute("d")).toBe(base.getAttribute("d"));
        // and they never steal a click meant for the wire
        expect(dots.style.pointerEvents).toBe("none");
    });

    it("takes its colour from the kind of socket it leaves", () => {
        for (const [kind, color] of [
            ["condition", "var(--color-cat-trigger)"],
            ["unlock", "var(--color-cat-objective)"],
            ["data", "var(--color-cat-entry)"],
        ] as const) {
            const { unmount } = render(
                <svg>
                    <TypedEdge
                        id={`e-${kind}`}
                        source="a"
                        target="b"
                        sourceX={0}
                        sourceY={0}
                        targetX={100}
                        targetY={0}
                        sourcePosition={Position.Right}
                        targetPosition={Position.Left}
                        data={{ kind }}
                    />
                </svg>,
            );
            const base = document.querySelector("path.react-flow__edge-path") as SVGPathElement;
            expect(base.style.stroke).toBe(color);
            unmount();
        }
    });
});
