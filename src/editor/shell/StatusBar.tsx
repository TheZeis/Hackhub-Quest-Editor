/**
 * The status bar: what is selected, graph size, and whether the draft is saved.
 */
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { selectActiveQuest, useEditor } from "@/store/editor";
import { nodeTypeDef } from "@/schema/registry";
import { EVENT_COUNT, SDK_VERSION } from "@/schema/events";

export function StatusBar() {
    const quest = useEditor(selectActiveQuest);
    const selection = useEditor((s) => s.selection);
    const past = useEditor((s) => s.past.length);
    const future = useEditor((s) => s.future.length);
    const [saved, setSaved] = useState(true);

    // The store writes through to localStorage on a debounce; mirror that state
    // so the bar is honest about whether the last edit is on disk yet.
    useEffect(() => {
        setSaved(false);
        const timer = setTimeout(() => setSaved(true), 700);
        return () => clearTimeout(timer);
    }, [quest]);

    const selectedNode =
        selection.nodeIds.length === 1
            ? quest?.graph.nodes.find((n) => n.id === selection.nodeIds[0])
            : undefined;

    const objectiveCount = quest?.graph.nodes.filter((n) => n.type === "objective").length ?? 0;

    return (
        <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-line bg-surface px-3 font-mono text-[10.5px] text-ink-4">
            <span className="flex items-center gap-1">
                <Icon name={saved ? "check" : "save"} size={11} className={saved ? "text-ok" : "text-ink-4"} />
                {saved ? "Saved" : "Saving…"}
            </span>

            <span className="h-3 w-px bg-line" aria-hidden />

            {quest ? (
                <>
                    <span>
                        {quest.graph.nodes.length} nodes · {quest.graph.edges.length} wires ·{" "}
                        {objectiveCount} objectives
                    </span>
                    <span className="h-3 w-px bg-line" aria-hidden />
                </>
            ) : null}

            {selectedNode && (
                <>
                    <span className="truncate text-ink-3">
                        {nodeTypeDef(selectedNode.type).label}
                        <span className="ml-1.5 text-ink-4">{selectedNode.id}</span>
                    </span>
                    <span className="h-3 w-px bg-line" aria-hidden />
                </>
            )}

            {selection.nodeIds.length > 1 && (
                <>
                    <span className="text-ink-3">{selection.nodeIds.length} nodes selected</span>
                    <span className="h-3 w-px bg-line" aria-hidden />
                </>
            )}

            <span className="ml-auto flex items-center gap-3">
                <span>
                    history {past}↑ {future}↓
                </span>
                <span className="h-3 w-px bg-line" aria-hidden />
                <span>
                    {EVENT_COUNT} events · SDK {SDK_VERSION}
                </span>
            </span>
        </footer>
    );
}
