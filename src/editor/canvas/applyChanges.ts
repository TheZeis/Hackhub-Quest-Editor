/**
 * Apply React Flow selection deltas to the store's current selection.
 *
 * Pure and exported for tests because the ordering here is exactly the bug a
 * user will feel: clicking node B while A is selected arrives as *two* changes —
 * `deselect A`, `select B` — in one batch. If each change is computed from the
 * stale starting selection (rather than the running result) the pair collapses
 * into `[A, B]`, the inspector reads index 0, and the just-clicked node never
 * opens. Folding sequentially over the running result gives `[B]`.
 */

export interface SelectionDelta {
    type: string;
    /** Present on every select change; optional so React Flow's wider change
        union (add changes carry no id) still assigns to this. */
    id?: string;
    selected?: boolean;
}

/** Fold a batch of select changes onto the current node selection. */
export function nextSelection(current: string[], changes: SelectionDelta[]): string[] {
    let result = current;
    for (const change of changes) {
        if (change.type !== "select" || !change.id) continue;
        const id = change.id;
        result = change.selected
            ? [...new Set([...result, id])]
            : result.filter((existing) => existing !== id);
    }
    return result;
}

/** True when a batch of changes alters the selection at all. */
export function altersSelection(changes: SelectionDelta[]): boolean {
    return changes.some((c) => c.type === "select");
}
