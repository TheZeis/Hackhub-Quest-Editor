/**
 * The quest graph canvas.
 *
 * The store stays the source of truth: nodes and edges are derived from the active
 * quest's graph, and only the changes that matter (position, selection, removal)
 * are written back. React Flow's own runtime fields never reach the document.
 */
import {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlow,
    useReactFlow,
    type Connection,
    type NodeChange,
    type EdgeChange,
    type NodeTypes,
    type EdgeTypes,
} from "@xyflow/react";
import { useCallback, useMemo, useRef } from "react";
import { GraphNode, type GraphRFNode } from "./GraphNode";
import { altersSelection, nextSelection } from "./applyChanges";
import { TypedEdge, toRFEdge, type TypedRFEdge } from "./TypedEdge";
import { analyseGraph, summariseIssues } from "@/analysis/graph";
import { Icon } from "@/components/Icon";
import { useEditor, selectActiveQuest } from "@/store/editor";
import { categoryOf, nodeTypeDef, CATEGORY_HEX } from "@/schema/registry";
import { HANDLE_STYLE } from "@/schema/edges";
import type { NodeType } from "@/schema/nodes";

const NODE_TYPES: NodeTypes = { qe: GraphNode };
const EDGE_TYPES: EdgeTypes = { typed: TypedEdge };

export interface CandidateConnection {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export const DND_MIME = "application/x-qe-node-type";

function CanvasInner() {
    const quest = useEditor(selectActiveQuest);
    const addNode = useEditor((s) => s.addNode);
    const connect = useEditor((s) => s.connect);
    const removeNodes = useEditor((s) => s.removeNodes);
    const removeEdges = useEditor((s) => s.removeEdges);
    const setNodePositions = useEditor((s) => s.setNodePositions);
    const beginTransient = useEditor((s) => s.beginTransient);
    const commitTransient = useEditor((s) => s.commitTransient);
    const select = useEditor((s) => s.select);
    const selection = useEditor((s) => s.selection);
    const setViewport = useEditor((s) => s.setViewport);
    const applyLayout = useEditor((s) => s.applyLayout);
    const { screenToFlowPosition } = useReactFlow();

    // Analysis is cheap and pure, so it can run on every render.
    const analysis = useMemo(
        () => analyseGraph(quest?.graph.nodes ?? [], quest?.graph.edges ?? []),
        [quest],
    );
    const issuesByNode = useMemo(() => {
        const map = new Map<string, { label: string; detail: string; severity: "warn" | "danger" }>();
        for (const issue of analysis.issues) {
            // Worst issue wins if a node has several.
            const existing = map.get(issue.nodeId);
            if (!existing || (existing.severity === "warn" && issue.severity === "danger")) {
                map.set(issue.nodeId, issue);
            }
        }
        return map;
    }, [analysis]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const nodes = useMemo<GraphRFNode[]>(
        () =>
            (quest?.graph.nodes ?? []).map((doc) => ({
                id: doc.id,
                type: "qe" as const,
                position: doc.position,
                data: { doc, issue: issuesByNode.get(doc.id) },
                selected: selection.nodeIds.includes(doc.id),
            })),
        [quest, selection.nodeIds, issuesByNode],
    );

    const edges = useMemo<TypedRFEdge[]>(() => {
        const list = quest?.graph.edges ?? [];
        return list.map((e) => {
            const sourceNode = quest?.graph.nodes.find((n) => n.id === e.source);
            const label = sourceNode
                ? nodeTypeDef(sourceNode.type).sources.find((h) => h.id === e.sourceHandle)?.label
                : undefined;
            // Only label sockets when the source actually has several outputs,
            // otherwise every edge gets a redundant "Out" tag.
            const multi = sourceNode ? nodeTypeDef(sourceNode.type).sources.length > 1 : false;
            return toRFEdge(e, multi ? label : undefined);
        });
    }, [quest]);

    const selectedEdges = useMemo(
        () => edges.map((e) => (selection.edgeIds.includes(e.id) ? { ...e, selected: true } : e)),
        [edges, selection.edgeIds],
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            const ok = connect({
                source: connection.source,
                sourceHandle: connection.sourceHandle ?? "",
                target: connection.target,
                targetHandle: connection.targetHandle ?? "",
            });
            if (!ok) {
                useEditor.getState().toast("Those sockets are different kinds of connection.", "warn");
            }
        },
        [connect],
    );

    /**
     * Reject mismatched socket kinds up front so the connect cursor turns red.
     * Typed loosely on purpose: React Flow hands this a `Connection` while the
     * prop is generic over the edge type, and the two differ on optionality.
     */
    const isValidConnection = useCallback((connection: CandidateConnection) => {
        const q = useEditor.getState().project.quests.find(
            (x) => x.id === useEditor.getState().project.editor.activeQuestId,
        );
        if (!q) return false;
        if (connection.source === connection.target) return false;
        const sourceNode = q.graph.nodes.find((n) => n.id === connection.source);
        const targetNode = q.graph.nodes.find((n) => n.id === connection.target);
        if (!sourceNode || !targetNode) return false;
        const sourceKind = nodeTypeDef(sourceNode.type).sources.find(
            (h) => h.id === connection.sourceHandle,
        )?.kind;
        const targetKind = nodeTypeDef(targetNode.type).targets.find(
            (h) => h.id === connection.targetHandle,
        )?.kind;
        return !!sourceKind && sourceKind === targetKind;
    }, []);

    const onNodesChange = useCallback(
        (changes: NodeChange<GraphRFNode>[]) => {
            const positions: Record<string, { x: number; y: number }> = {};
            const removed: string[] = [];

            for (const change of changes) {
                if (change.type === "position" && change.position) {
                    positions[change.id] = change.position;
                } else if (change.type === "remove") {
                    removed.push(change.id);
                }
            }

            if (Object.keys(positions).length > 0) setNodePositions(positions);
            if (removed.length > 0) removeNodes(removed);
            // Fold the whole batch onto the running selection — see applyChanges.
            if (altersSelection(changes)) {
                select({ nodeIds: nextSelection(selection.nodeIds, changes), edgeIds: [] });
            }
        },
        [removeNodes, select, selection.nodeIds, setNodePositions],
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange<TypedRFEdge>[]) => {
            const removed: string[] = [];
            for (const change of changes) {
                if (change.type === "remove") removed.push(change.id);
            }
            if (removed.length > 0) removeEdges(removed);
            if (altersSelection(changes)) {
                select({ nodeIds: [], edgeIds: nextSelection(selection.edgeIds, changes) });
            }
        },
        [removeEdges, select, selection.edgeIds],
    );

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData(DND_MIME) as NodeType | "";
            if (!type) return;
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            // Nudge left so the pointer lands on the card, not its left socket.
            addNode(type, { x: position.x - 20, y: position.y - 24 });
        },
        [addNode, screenToFlowPosition],
    );

    if (!quest) {
        return (
            <div className="flex flex-1 items-center justify-center text-ink-4">
                No quest selected.
            </div>
        );
    }

    return (
        <div ref={wrapperRef} className="relative h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={selectedEdges}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStart={() => beginTransient()}
                onNodeDragStop={() => commitTransient()}
                onDrop={onDrop}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                }}
                onPaneClick={() => select({ nodeIds: [], edgeIds: [] })}
                onMoveEnd={(_, viewport) => setViewport(quest.id, viewport)}
                defaultViewport={
                    quest.id in (useEditor.getState().project.editor.viewports ?? {})
                        ? useEditor.getState().project.editor.viewports[quest.id]
                        : { x: 0, y: 0, zoom: 0.85 }
                }
                deleteKeyCode={["Backspace", "Delete"]}
                selectionKeyCode={null}
                multiSelectionKeyCode={["Meta", "Shift", "Control"]}
                fitView={nodes.length > 0}
                fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
                minZoom={0.15}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                className="bg-canvas"
            >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1c2029" />
                <Controls position="bottom-left" showInteractive={false} />
                <MiniMap
                    position="bottom-right"
                    pannable
                    zoomable
                    nodeColor={(n) => {
                        const doc = (n.data as { doc?: { type: NodeType } })?.doc;
                        // Hex, not var(): the minimap paints SVG `fill` attributes,
                        // where CSS variables never resolve (see CATEGORY_HEX).
                        return doc ? CATEGORY_HEX[categoryOf(doc.type).id] : "#333";
                    }}
                    nodeStrokeWidth={0}
                    maskColor="rgba(8, 9, 13, 0.72)"
                />
            </ReactFlow>

            {/* Canvas actions */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <button
                    type="button"
                    className="btn-default pointer-events-auto"
                    onClick={applyLayout}
                    disabled={!quest || quest.graph.nodes.length === 0}
                    title="Arrange the graph left to right, by how far each node sits from its entry point"
                >
                    <Icon name="branch" size={13} />
                    Tidy up
                </button>
                <span
                    className={
                        "pointer-events-none rounded-md border px-2 py-1 text-[10.5px] " +
                        (analysis.issues.some((i) => i.severity === "danger")
                            ? "border-danger/40 bg-danger/10 text-danger"
                            : analysis.issues.length > 0
                              ? "border-warn/40 bg-warn/10 text-warn"
                              : "border-line bg-surface/90 text-ink-4")
                    }
                    title={analysis.issues.map((i) => i.detail).join("\n\n") || "Nothing looks wrong."}
                >
                    {summariseIssues(analysis)}
                </span>
            </div>

            {/* Socket legend */}
            <div className="pointer-events-none absolute top-3 right-3 flex flex-col gap-1 rounded-md border border-line bg-surface/90 px-2.5 py-2 backdrop-blur">
                {(["flow", "condition", "unlock", "data"] as const).map((kind) => (
                    <div key={kind} className="flex items-center gap-2">
                        <span
                            className="block h-0 w-5 rounded"
                            style={{
                                borderTop: `2px ${HANDLE_STYLE[kind].dash ? "dashed" : "solid"} ${HANDLE_STYLE[kind].color}`,
                            }}
                        />
                        <span className="text-[10px] tracking-wide text-ink-4 uppercase">
                            {HANDLE_STYLE[kind].label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * The canvas itself.
 *
 * Deliberately *not* wrapped in its own `ReactFlowProvider`: `App` hoists a
 * single provider above the palette, the canvas and the inspector so that all
 * three share one React Flow store. The palette needs `getViewport()` to know
 * where the canvas centre is, and a nested provider would hand it an empty one.
 */
export function QuestCanvas() {
    return <CanvasInner />;
}
