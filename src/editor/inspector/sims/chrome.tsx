/**
 * Shared chrome for the in-inspector simulators. Each comms node gets a live,
 * game-styled preview above its editing controls so authors see what the player
 * will see while they write.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";

/** A titled preview panel styled after the in-game surface it simulates. */
export function SimFrame({
    app,
    caption,
    children,
    className,
}: {
    /** The in-game app being simulated, shown as a window title. */
    app: string;
    caption: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className="mx-3 mt-3 overflow-hidden rounded-lg border border-line">
            <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-2.5 py-1.5">
                <span className="flex gap-1" aria-hidden>
                    <i className="size-2 rounded-full bg-danger/70" />
                    <i className="size-2 rounded-full bg-warn/70" />
                    <i className="size-2 rounded-full bg-ok/70" />
                </span>
                <span className="ml-1 text-[10.5px] font-semibold tracking-wide text-ink-3 uppercase">
                    {app}
                </span>
                <span className="ml-auto truncate text-[10px] text-ink-4">{caption}</span>
            </div>
            <div className={cn("bg-[#0b0d12]", className)}>{children}</div>
        </div>
    );
}

/** Header row for one editable item in a scripted list (message, line, option). */
export function ItemCard({
    index,
    title,
    onRemove,
    onUp,
    onDown,
    canUp,
    canDown,
    children,
}: {
    index: number;
    title: string;
    onRemove: () => void;
    onUp: () => void;
    onDown: () => void;
    canUp: boolean;
    canDown: boolean;
    children: ReactNode;
}) {
    return (
        <div className="rounded-md border border-line bg-surface-2/50">
            <div className="flex items-center gap-1 border-b border-line/70 px-2 py-1">
                <span className="font-mono text-[10px] text-ink-4">{index + 1}</span>
                <span className="truncate text-[11px] font-medium text-ink-2">{title}</span>
                <span className="ml-auto flex items-center">
                    <button
                        type="button"
                        className="btn-icon text-ink-4 hover:text-ink"
                        disabled={!canUp}
                        onClick={onUp}
                        title="Move earlier"
                        aria-label="Move earlier"
                    >
                        <Icon name="chevronDown" size={12} className="rotate-180" />
                    </button>
                    <button
                        type="button"
                        className="btn-icon text-ink-4 hover:text-ink"
                        disabled={!canDown}
                        onClick={onDown}
                        title="Move later"
                        aria-label="Move later"
                    >
                        <Icon name="chevronDown" size={12} />
                    </button>
                    <button
                        type="button"
                        className="btn-icon text-ink-4 hover:text-danger"
                        onClick={onRemove}
                        title="Remove"
                        aria-label="Remove"
                    >
                        <Icon name="trash" size={12} />
                    </button>
                </span>
            </div>
            <div className="grid gap-2 p-2">{children}</div>
        </div>
    );
}

/** Move an entry in an array immutably; no-op at the edges. */
export function moved<T>(list: T[], index: number, dir: -1 | 1): T[] {
    const to = index + dir;
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    return next;
}
