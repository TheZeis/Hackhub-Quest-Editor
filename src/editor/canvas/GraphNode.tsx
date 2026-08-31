/**
 * The single custom node component. Every node type in the registry renders
 * through it, so card chrome, socket layout and selection styling stay consistent
 * and new node types need no new component.
 */
import { Handle, Position, useConnection, type Node, type NodeProps } from "@xyflow/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";
import { categoryOf, nodeTypeDef } from "@/schema/registry";
import { HANDLE_STYLE, type EdgeKind } from "@/schema/edges";
import type { NodeDoc } from "@/schema/nodes";
import { summarize } from "./summarize";

export interface GraphNodeData extends Record<string, unknown> {
    doc: NodeDoc;
    /** The most serious problem the analysis found with this node, if any. */
    issue?: { label: string; detail: string; severity: "warn" | "danger" };
}

export type GraphRFNode = Node<GraphNodeData, "qe">;

/** Vertical placement for the nth of `count` sockets on one side. */
function socketTop(index: number, count: number): string {
    if (count === 1) return "50%";
    const span = 60; // percent of the card the sockets occupy
    const start = (100 - span) / 2;
    return `${start + (span / (count - 1)) * index}%`;
}

export function GraphNode({ data, selected }: NodeProps<GraphRFNode>) {
    const doc = data.doc;
    const issue = data.issue;
    const def = nodeTypeDef(doc.type);
    const category = categoryOf(doc.type);
    const lines = useMemo(() => summarize(doc).filter(Boolean), [doc]);
    const [hovered, setHovered] = useState(false);
    const connecting = useConnection((c) => c.inProgress);

    // Socket names are useful exactly when you are about to wire something. At
    // rest they are clutter that competes with the node's own summary, so they
    // only appear on hover, selection, or while a wire is being dragged.
    const showLabels = selected || hovered || connecting;

    const isNote = doc.type === "flow.note";

    if (isNote) {
        return (
            <div
                className={cn(
                    "rounded-md border border-dashed px-3 py-2.5",
                    "bg-warn/8 text-warn/85 shadow-none",
                    selected && "border-warn ring-2 ring-warn/40",
                )}
                style={{ width: (doc.data as { width?: number }).width ?? 240 }}
            >
                <div className="whitespace-pre-wrap break-words text-[12px] leading-relaxed">
                    {(doc.data as { text?: string }).text || "Empty note"}
                </div>
            </div>
        );
    }

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                "relative w-60 rounded-lg border bg-surface shadow-node",
                "transition-[border-color,box-shadow] duration-150",
                selected ? "border-transparent ring-2" : "border-line hover:border-line-strong",
            )}
            style={
                selected
                    ? ({
                          ["--tw-ring-color" as string]: category.color,
                          borderColor: category.color,
                      } as React.CSSProperties)
                    : undefined
            }
        >
            {/* problem badge — the shortest possible route from "something is
                wrong" to "here is what and why" */}
            {issue && (
                <span
                    title={issue.detail}
                    className={
                        "absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full border px-1.5 py-0.5 " +
                        "text-[9.5px] font-semibold tracking-wide uppercase shadow-node " +
                        (issue.severity === "danger"
                            ? "border-danger/50 bg-danger/90 text-void"
                            : "border-warn/50 bg-warn/90 text-void")
                    }
                >
                    <Icon name="alert" size={9} />
                    {issue.label}
                </span>
            )}

            {/* category accent */}
            <span
                className="absolute inset-y-0 left-0 w-[3px] rounded-l-[7px]"
                style={{ background: category.color }}
                aria-hidden
            />

            <div className="flex items-start gap-2 px-3 pt-2.5 pb-2 pl-4">
                <span
                    className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `color-mix(in srgb, ${category.color} 16%, transparent)`, color: category.color }}
                    aria-hidden
                >
                    <Icon name={def.icon} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] leading-tight font-semibold text-ink">
                        {def.label}
                    </div>
                </div>
            </div>

            {lines.length > 0 && (
                <div className="space-y-0.5 px-3 pb-2.5 pl-4">
                    {lines.slice(0, 3).map((line, i) => (
                        <div
                            key={i}
                            className={cn(
                                "truncate font-mono text-[11px] leading-snug",
                                i === 0 ? "text-ink-2" : "text-ink-4",
                            )}
                            title={line}
                        >
                            {line}
                        </div>
                    ))}
                </div>
            )}

            {/* Sockets. `data-kind` drives the colour, and each carries the
                handle's plain-English name as a native tooltip so the author
                learns what a socket means by hovering it. */}
            {def.targets.map((handle, i) => (
                <Handle
                    key={handle.id}
                    id={handle.id}
                    type="target"
                    position={Position.Left}
                    data-kind={handle.kind}
                    title={handle.label}
                    style={{ top: socketTop(i, def.targets.length) }}
                />
            ))}

            {def.sources.map((handle, i) => (
                <Handle
                    key={handle.id}
                    id={handle.id}
                    type="source"
                    position={Position.Right}
                    data-kind={handle.kind}
                    title={handle.label}
                    style={{ top: socketTop(i, def.sources.length) }}
                />
            ))}

            {/* Socket names, on the same vertical rule as their dot but OUTSIDE
                the card so they never sit on top of the node's own text. Shown
                only on hover / selection / while a wire is being dragged. */}
            {showLabels &&
                def.targets.length > 1 &&
                def.targets.map((h, i) => (
                    <SocketLabel
                        key={h.id}
                        side="left"
                        top={socketTop(i, def.targets.length)}
                        kind={h.kind}
                    >
                        {h.label}
                    </SocketLabel>
                ))}
            {showLabels &&
                def.sources.length > 1 &&
                def.sources.map((h, i) => (
                    <SocketLabel
                        key={h.id}
                        side="right"
                        top={socketTop(i, def.sources.length)}
                        kind={h.kind}
                    >
                        {h.label}
                    </SocketLabel>
                ))}
        </div>
    );
}

function SocketLabel({
    side,
    top,
    kind,
    children,
}: {
    side: "left" | "right";
    top: string;
    kind: EdgeKind;
    children: React.ReactNode;
}) {
    return (
        <span
            className={cn(
                "pointer-events-none absolute whitespace-nowrap rounded px-1 py-px",
                "font-mono text-[8.5px] leading-tight tracking-wide uppercase",
            )}
            style={{
                top,
                color: HANDLE_STYLE[kind].color,
                background: "color-mix(in srgb, var(--color-canvas) 82%, transparent)",
                // Sit in the gutter beside the card, vertically centred on the dot.
                ...(side === "left"
                    ? { right: "100%", marginRight: 10, transform: "translateY(-50%)" }
                    : { left: "100%", marginLeft: 10, transform: "translateY(-50%)" }),
            }}
        >
            {children}
        </span>
    );
}
