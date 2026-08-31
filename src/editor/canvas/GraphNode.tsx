/**
 * The single custom node component. Every node type in the registry renders
 * through it, so card chrome, socket layout and selection styling stay consistent
 * and new node types need no new component.
 */
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";
import { categoryOf, nodeTypeDef } from "@/schema/registry";
import type { NodeDoc } from "@/schema/nodes";
import { summarize } from "./summarize";

export interface GraphNodeData extends Record<string, unknown> {
    doc: NodeDoc;
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
    const def = nodeTypeDef(doc.type);
    const category = categoryOf(doc.type);
    const lines = useMemo(() => summarize(doc).filter(Boolean), [doc]);

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
            className={cn(
                "relative overflow-hidden rounded-lg border bg-surface shadow-node",
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
            {/* category accent */}
            <span
                className="absolute inset-y-0 left-0 w-[3px]"
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

            {/* target sockets (left) */}
            {def.targets.map((handle, i) => (
                <Handle
                    key={handle.id}
                    id={handle.id}
                    type="target"
                    position={Position.Left}
                    style={{ top: socketTop(i, def.targets.length) }}
                />
            ))}

            {/* source sockets (right) */}
            {def.sources.map((handle, i) => (
                <Handle
                    key={handle.id}
                    id={handle.id}
                    type="source"
                    position={Position.Right}
                    style={{ top: socketTop(i, def.sources.length) }}
                />
            ))}

            {/* socket labels */}
            {def.sources.length > 1 && (
                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex flex-col justify-center gap-1 pr-0.5">
                    {def.sources.map((h) => (
                        <span key={h.id} className="text-right font-mono text-[9px] tracking-wide text-ink-4 uppercase">
                            {h.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
