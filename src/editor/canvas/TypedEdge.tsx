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

/** Distance between two travelling dots, in pixels. */
const DOT_GAP = 14;
/** Seconds for a dot to travel one gap: 10px/s, half the old marching dashes. */
const DOT_PERIOD_S = 1.4;

/**
 * True when the OS asks for less motion. Read once per render (cheap) and
 * guarded for jsdom, which has no matchMedia.
 */
function usePrefersReducedMotion(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

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
    const color = selected ? "var(--color-accent)" : style.color;
    const reducedMotion = usePrefersReducedMotion();
    const width = selected ? 2.5 : 1.75;

    return (
        <>
            {/* The wire itself: one solid stroke in the colour of the socket it
                leaves from. */}
            <BaseEdge
                id={props.id}
                path={path}
                style={{
                    stroke: color,
                    strokeWidth: width,
                    opacity: selected ? 1 : 0.85,
                }}
            />
            {/* Direction: round dots, a touch fatter than the wire, drifting
                from the source towards the target. Driven by SVG's own
                animation rather than a CSS keyframe — that is the one form of
                motion that cannot be defeated by stylesheet order, and it is
                visible in the DOM, so it can be tested. Purely decorative, so
                it never intercepts clicks meant for the wire underneath. */}
            <path
                d={path}
                fill="none"
                className="qe-flow-dots"
                style={{
                    stroke: color,
                    strokeWidth: width + 1.4,
                    strokeLinecap: "round",
                    strokeDasharray: `0.1 ${DOT_GAP}`,
                    pointerEvents: "none",
                }}
            >
                {!reducedMotion && (
                    <animate
                        attributeName="stroke-dashoffset"
                        values={`0;-${DOT_GAP}`}
                        dur={`${DOT_PERIOD_S}s`}
                        repeatCount="indefinite"
                    />
                )}
            </path>
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
