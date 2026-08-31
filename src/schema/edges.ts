/**
 * Edge model.
 *
 * Edges are *typed*. The kind is derived from the handles being connected, and
 * the canvas rejects a connection whose kinds differ — so an author cannot wire a
 * trigger's condition into an execution-flow socket by accident.
 */
import { z } from "zod";

export const EDGE_KINDS = ["flow", "condition", "unlock", "data"] as const;
export const EdgeKindSchema = z.enum(EDGE_KINDS);
export type EdgeKind = z.infer<typeof EdgeKindSchema>;

export const EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    sourceHandle: z.string(),
    target: z.string(),
    targetHandle: z.string(),
    kind: EdgeKindSchema,
    /** Optional author note rendered on the edge. */
    label: z.string().optional(),
});
export type EdgeDoc = z.infer<typeof EdgeSchema>;

/** A socket on a node. `id` is stable and appears in the persisted document. */
export interface HandleSpec {
    id: string;
    kind: EdgeKind;
    label: string;
}

export const HANDLE_STYLE: Record<EdgeKind, { color: string; label: string; dash?: string }> = {
    flow: { color: "var(--color-ink-4)", label: "Then" },
    condition: { color: "var(--color-cat-trigger)", label: "When" },
    unlock: { color: "var(--color-cat-objective)", label: "Unlocks", dash: "6 4" },
    data: { color: "var(--color-cat-entry)", label: "Data", dash: "2 4" },
};

/**
 * Connection validity. Deliberately a pure function so it can be unit-tested
 * without a React Flow instance, and reused by the analysis layer.
 */
export function canConnect(
    sourceKind: EdgeKind | undefined,
    targetKind: EdgeKind | undefined,
): boolean {
    if (!sourceKind || !targetKind) return false;
    return sourceKind === targetKind;
}
