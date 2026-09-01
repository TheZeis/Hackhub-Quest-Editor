/**
 * Edges are coloured and dashed by kind, so the difference between "then this
 * runs", "when this event fires" and "this unlocks that" is visible without
 * reading a tooltip.
 */
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type Edge,
    type EdgeProps,
} from "@xyflow/react";
import { HANDLE_STYLE, type EdgeDoc, type EdgeKind } from "@/schema/edges";
import { cn } from "@/lib/cn";

export interface TypedEdgeData extends Record<string, unknown> {
    kind: EdgeKind;
    label?: string;
    /** Socket label shown mid-edge when the source has several outputs. */
    socketLabel?: string;
}

export type TypedRFEdge = Edge<TypedEdgeData, "typed">;

export function toRFEdge(edge: EdgeDoc, socketLabel?: string): TypedRFEdge {
    return {
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: "typed",
        data: { kind: edge.kind, label: edge.label, socketLabel },
    };
}

export function TypedEdge(props: EdgeProps<TypedRFEdge>) {
    const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } =
        props;
    const [path, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.28,
    });

    const kind = data?.kind ?? "flow";
    const style = HANDLE_STYLE[kind];
    const text = data?.label || data?.socketLabel;

    return (
        <>
            <BaseEdge
                id={props.id}
                path={path}
                className={kind === "flow" ? "qe-flow-anim" : undefined}
                style={{
                    stroke: selected ? "var(--color-accent)" : style.color,
                    strokeDasharray: kind === "flow" ? "8 6" : style.dash,
                    strokeWidth: selected ? 2.5 : 1.75,
                    opacity: selected ? 1 : 0.85,
                }}
            />
            {text && (
                <EdgeLabelRenderer>
                    <div
                        className={cn(
                            "nodrag nopan pointer-events-none absolute rounded border px-1.5 py-px",
                            "font-mono text-[9.5px] tracking-wide uppercase",
                            selected
                                ? "border-accent/50 bg-accent/15 text-accent"
                                : "border-line bg-surface text-ink-4",
                        )}
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        }}
                    >
                        {text}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
