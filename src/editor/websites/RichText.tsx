/**
 * The WYSIWYG page editor: a contentEditable surface styled like the rendered
 * page, with a small formatting toolbar. Content is stored as HTML — the same
 * HTML the game will serve, so what you see is what the player gets.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const BLOCKS = [
    { cmd: "formatBlock", arg: "p", label: "¶", title: "Paragraph" },
    { cmd: "formatBlock", arg: "h1", label: "H1", title: "Heading" },
    { cmd: "formatBlock", arg: "h2", label: "H2", title: "Subheading" },
    { cmd: "formatBlock", arg: "blockquote", label: "❝", title: "Quote" },
] as const;

const INLINE = [
    { cmd: "bold", label: "B", title: "Bold", className: "font-bold" },
    { cmd: "italic", label: "I", title: "Italic", className: "italic" },
    { cmd: "underline", label: "U", title: "Underline", className: "underline" },
] as const;

export function RichText({
    value,
    onChange,
    ariaLabel,
}: {
    value: string;
    onChange: (html: string) => void;
    ariaLabel: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    // The parent re-mounts us per page (key=page.id), so the initial content is
    // written once and never clobbers the caret afterwards.
    useEffect(() => {
        if (ref.current && ref.current.innerHTML !== value) {
            ref.current.innerHTML = value;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const emit = () => onChange(ref.current?.innerHTML ?? "");

    const exec = (cmd: string, arg?: string) => {
        ref.current?.focus();
        if (cmd === "createLink") {
            const url = window.prompt("Link address (URL or page path):", "/");
            if (!url) return;
            document.execCommand(cmd, false, url);
        } else {
            document.execCommand(cmd, false, arg);
        }
        emit();
    };

    return (
        <div className="overflow-hidden rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-1.5 py-1">
                {INLINE.map((b) => (
                    <button
                        key={b.cmd}
                        type="button"
                        title={b.title}
                        aria-label={b.title}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => exec(b.cmd)}
                        className={cn(
                            "size-6 rounded text-[11px] text-ink-3 hover:bg-surface-3 hover:text-ink",
                            b.className,
                        )}
                    >
                        {b.label}
                    </button>
                ))}
                <span className="mx-1 h-4 w-px bg-line" aria-hidden />
                {BLOCKS.map((b) => (
                    <button
                        key={b.label}
                        type="button"
                        title={b.title}
                        aria-label={b.title}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => exec(b.cmd, b.arg)}
                        className="size-6 rounded text-[10px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                    >
                        {b.label}
                    </button>
                ))}
                <span className="mx-1 h-4 w-px bg-line" aria-hidden />
                <button
                    type="button"
                    title="Bulleted list"
                    aria-label="Bulleted list"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("insertUnorderedList")}
                    className="size-6 rounded text-[11px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                    •≡
                </button>
                <button
                    type="button"
                    title="Numbered list"
                    aria-label="Numbered list"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("insertOrderedList")}
                    className="size-6 rounded text-[10px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                    1.
                </button>
                <button
                    type="button"
                    title="Insert link"
                    aria-label="Insert link"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("createLink")}
                    className="size-6 rounded text-[11px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                    🔗
                </button>
                <button
                    type="button"
                    title="Clear formatting"
                    aria-label="Clear formatting"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => exec("removeFormat")}
                    className="size-6 rounded text-[10px] text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                    ⌫
                </button>
            </div>
            <div
                ref={ref}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label={ariaLabel}
                onInput={emit}
                className="webpage richtext max-h-[46vh] min-h-[220px] overflow-y-auto"
            />
        </div>
    );
}
