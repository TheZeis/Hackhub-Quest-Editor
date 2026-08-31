/**
 * The shared dialogue script editor: a tappable phone preview plus the
 * line-by-line script (speakers, choices, jumps, branch switching). Used both
 * by the phone-call node inspector and by the top-level Dialogues dialog, so
 * conversations are writable without placing a call node first.
 */
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { Icon } from "@/components/Icon";
import {
    FieldShell,
    NumberInput,
    SelectInput,
    TextArea,
    TextInput,
    Toggle,
} from "@/editor/inspector/primitives";
import type { DialogBranch, DialogOption, DialogSpeech } from "@/schema/nodes";
import { ItemCard, SimFrame, moved } from "./chrome";

export function BranchScriptEditor({
    branch,
    otherBranches,
    caller,
    startIndex = 0,
    onPatch,
}: {
    branch: DialogBranch;
    otherBranches: string[];
    caller: string;
    startIndex?: number;
    onPatch: (p: Partial<DialogBranch>) => void;
}) {
    return (
        <>
            <CallPreview branch={branch} startIndex={startIndex} caller={caller} />

            <div className="mt-3 flex items-center justify-between px-3">
                <h4 className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                    Script · {branch.lines.length} line{branch.lines.length === 1 ? "" : "s"}
                </h4>
                <button
                    type="button"
                    className="btn-default"
                    onClick={() =>
                        onPatch({
                            lines: [
                                ...branch.lines,
                                { id: nanoid(8), speaker: "", text: "", isEnd: false, options: [] },
                            ],
                        })
                    }
                >
                    <Icon name="plus" size={12} />
                    Add line
                </button>
            </div>

            <div className="grid gap-2 px-3 py-2">
                {branch.lines.map((line, i) => (
                    <LineCard
                        key={line.id}
                        line={line}
                        index={i}
                        branch={branch}
                        otherBranches={otherBranches}
                        onPatch={(p) =>
                            onPatch({
                                lines: branch.lines.map((l) => (l.id === line.id ? { ...l, ...p } : l)),
                            })
                        }
                        onRemove={() => onPatch({ lines: branch.lines.filter((l) => l.id !== line.id) })}
                        onUp={() => onPatch({ lines: moved(branch.lines, i, -1) })}
                        onDown={() => onPatch({ lines: moved(branch.lines, i, 1) })}
                        canUp={i > 0}
                        canDown={i < branch.lines.length - 1}
                    />
                ))}
            </div>
        </>
    );
}

/* ── preview ─────────────────────────────────────────────────────────────── */

export function CallPreview({
    branch,
    startIndex,
    caller,
}: {
    branch: DialogBranch;
    startIndex: number;
    caller: string;
}) {
    const [index, setIndex] = useState(Math.min(startIndex, Math.max(branch.lines.length - 1, 0)));
    const [ended, setEnded] = useState(false);
    useEffect(() => {
        setIndex(Math.min(startIndex, Math.max(branch.lines.length - 1, 0)));
        setEnded(false);
    }, [branch.id, startIndex, branch.lines.length]);

    const line = branch.lines[index];

    const choose = (option: DialogOption) => {
        if (option.isEnd) return setEnded(true);
        if (option.switchBranch) return setEnded(true); // other branches play from their own node
        setIndex((i) => Math.min(option.nextIndex ?? i + 1, branch.lines.length - 1));
    };

    const replay = () => {
        setIndex(Math.min(startIndex, Math.max(branch.lines.length - 1, 0)));
        setEnded(false);
    };

    return (
        <SimFrame
            app="Phone"
            caption="call preview — tap to play"
            className="p-3"
            action={
                <button
                    type="button"
                    className="btn-icon size-5 shrink-0 rounded"
                    title="Restart the preview from the first line"
                    aria-label="Replay preview"
                    onClick={replay}
                >
                    <Icon name="refresh" size={11} />
                </button>
            }
        >
            <div className="mx-auto flex max-h-64 w-full max-w-60 flex-col items-center gap-2 overflow-y-auto rounded-xl border border-line/60 bg-[#12151d] p-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Icon name="phone" size={16} />
                </span>
                <p className="text-[11px] font-medium text-ink-2">{caller || "Unknown caller"}</p>
                {ended || !line ? (
                    <p className="py-2 text-[10.5px] text-ink-4">— call ended —</p>
                ) : (
                    <>
                        <p className="text-center text-[11px] leading-relaxed whitespace-pre-wrap text-ink">
                            <span className="text-ink-4">{line.speaker || caller || "Caller"}: </span>
                            {line.text || "…"}
                        </p>
                        <div className="grid w-full gap-1.5 pt-1">
                            {line.options.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => choose(o)}
                                    className="rounded-md border border-accent/50 bg-accent-soft px-2 py-1 text-[10.5px] text-accent hover:bg-accent hover:text-void"
                                >
                                    {o.label || "…"}
                                </button>
                            ))}
                            {line.options.length === 0 && !line.isEnd && index < branch.lines.length - 1 && (
                                <button
                                    type="button"
                                    onClick={() => setIndex((i) => i + 1)}
                                    className="rounded-md border border-line px-2 py-1 text-[10.5px] text-ink-3 hover:text-ink"
                                >
                                    Continue ▸
                                </button>
                            )}
                            {(line.isEnd || index === branch.lines.length - 1) && line.options.length === 0 && (
                                <p className="text-[10px] text-ink-4">— call ends —</p>
                            )}
                            {line.input && (
                                <div className="w-full rounded-md border border-line/70 bg-surface-2 px-2 py-1 text-center text-[10px] text-ink-4">
                                    ✍ the call waits for the player's typed answer
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </SimFrame>
    );
}

/* ── one scripted line ───────────────────────────────────────────────────── */

export function LineCard({
    line,
    index,
    branch,
    otherBranches,
    onPatch,
    onRemove,
    onUp,
    onDown,
    canUp,
    canDown,
}: {
    line: DialogSpeech;
    index: number;
    branch: DialogBranch;
    otherBranches: string[];
    onPatch: (p: Partial<DialogSpeech>) => void;
    onRemove: () => void;
    onUp: () => void;
    onDown: () => void;
    canUp: boolean;
    canDown: boolean;
}) {
    const patchOption = (id: string, p: Partial<DialogOption>) =>
        onPatch({ options: line.options.map((o) => (o.id === id ? { ...o, ...p } : o)) });

    const thenValue = (o: DialogOption) =>
        o.isEnd ? "end" : o.switchBranch ? `branch:${o.switchBranch}` : o.nextIndex != null ? `line:${o.nextIndex}` : "next";

    const setThen = (o: DialogOption, value: string) => {
        const base: Partial<DialogOption> = { isEnd: false, switchBranch: undefined, nextIndex: undefined };
        if (value === "end") patchOption(o.id, { ...base, isEnd: true });
        else if (value.startsWith("branch:")) patchOption(o.id, { ...base, switchBranch: value.slice(7) });
        else if (value.startsWith("line:")) patchOption(o.id, { ...base, nextIndex: Number(value.slice(5)) });
        else patchOption(o.id, base);
    };

    return (
        <ItemCard
            index={index}
            title={line.text.slice(0, 40) || "silent line"}
            onRemove={onRemove}
            onUp={onUp}
            onDown={onDown}
            canUp={canUp}
            canDown={canDown}
        >
            <div className="grid grid-cols-2 gap-2">
                <FieldShell label="Speaker" hint="Whose voice this line is. Left blank, the caller speaks.">
                    <TextInput
                        ariaLabel={`Speaker ${index + 1}`}
                        value={line.speaker}
                        onChange={(speaker) => onPatch({ speaker })}
                        placeholder="Caller"
                    />
                </FieldShell>
                <FieldShell label="Timeout (seconds)" hint="If the player picks nothing in time, the call moves on. Blank for no timeout.">
                    <NumberInput
                        value={line.timeout ?? 0}
                        onChange={(s) => onPatch({ timeout: s > 0 ? s : undefined })}
                        min={0}
                    />
                </FieldShell>
            </div>
            <TextArea
                ariaLabel={`Line ${index + 1}`}
                value={line.text}
                onChange={(text) => onPatch({ text })}
                rows={2}
                placeholder="What is said on the call"
            />
            <Toggle
                label="Ends the call"
                hint="The call hangs up after this line."
                checked={line.isEnd}
                onChange={(isEnd) => onPatch({ isEnd })}
            />
            <Toggle
                label="Player types a reply"
                hint="After this line the call waits for a typed answer — a password, a code name, anything. Wrong answers follow the route you pick below."
                checked={line.input != null}
                onChange={(on) =>
                    onPatch({
                        input: on
                            ? { expected: "", matchMode: "exact", caseSensitive: false, failureText: "", wrongRoute: "retry" }
                            : undefined,
                    })
                }
            />
            {line.input && (
                <div className="grid gap-2 rounded-md border border-line/70 bg-surface p-2">
                    <FieldShell
                        label="Expected answer"
                        hint="What counts as correct. Leave blank to accept anything (the call just moves on)."
                    >
                        <TextInput
                            ariaLabel={`Expected answer ${index + 1}`}
                            value={line.input.expected}
                            onChange={(expected) => onPatch({ input: { ...line.input!, expected } })}
                            mono
                            placeholder="e.g. treyes3419"
                        />
                    </FieldShell>
                    <div className="grid grid-cols-2 gap-2">
                        <FieldShell label="Matching">
                            <SelectInput
                                ariaLabel={`Matching ${index + 1}`}
                                value={line.input.matchMode}
                                onChange={(matchMode) =>
                                    onPatch({ input: { ...line.input!, matchMode: matchMode as "exact" | "contains" | "regex" } })
                                }
                                options={[
                                    { value: "exact", label: "Exact match" },
                                    { value: "contains", label: "Contains" },
                                    { value: "regex", label: "Pattern (regex)" },
                                ]}
                            />
                        </FieldShell>
                        <FieldShell label="Case">
                            <SelectInput
                                ariaLabel={`Case ${index + 1}`}
                                value={line.input.caseSensitive ? "sensitive" : "ignore"}
                                onChange={(v) => onPatch({ input: { ...line.input!, caseSensitive: v === "sensitive" } })}
                                options={[
                                    { value: "ignore", label: "Ignore case" },
                                    { value: "sensitive", label: "Case sensitive" },
                                ]}
                            />
                        </FieldShell>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <FieldShell
                            label="On a wrong answer"
                            hint="Retry lets the player try again, end hangs up, and Wrong fires this node's Wrong output so the quest can branch."
                        >
                            <SelectInput
                                ariaLabel={`Wrong answer route ${index + 1}`}
                                value={line.input.wrongRoute}
                                onChange={(wrongRoute) =>
                                    onPatch({ input: { ...line.input!, wrongRoute: wrongRoute as "retry" | "end" | "wrong" } })
                                }
                                options={[
                                    { value: "retry", label: "Let them try again" },
                                    { value: "end", label: "Hang up" },
                                    { value: "wrong", label: "Node's Wrong output" },
                                ]}
                            />
                        </FieldShell>
                        <FieldShell label="Wrong-answer line" hint="Said to the player when the answer doesn't match.">
                            <TextInput
                                ariaLabel={`Wrong answer line ${index + 1}`}
                                value={line.input.failureText}
                                onChange={(failureText) => onPatch({ input: { ...line.input!, failureText } })}
                                placeholder="Sorry, that's not it."
                            />
                        </FieldShell>
                    </div>
                </div>
            )}

            <div className="rounded-md border border-line/70 bg-surface p-2">
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                        Player choices
                    </span>
                    <button
                        type="button"
                        className="btn-default"
                        onClick={() =>
                            onPatch({
                                options: [
                                    ...line.options,
                                    { id: nanoid(8), label: "", text: "", isEnd: false },
                                ],
                            })
                        }
                    >
                        <Icon name="plus" size={11} />
                        Add choice
                    </button>
                </div>
                {line.options.length === 0 && (
                    <p className="text-[10.5px] text-ink-4">
                        No choices — the call simply continues to the next line.
                    </p>
                )}
                <div className="grid gap-2">
                    {line.options.map((o, oi) => (
                        <div key={o.id} className="grid gap-1.5 rounded border border-line/60 p-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-ink-4">{oi + 1}</span>
                                <TextInput
                                    ariaLabel={`Choice ${oi + 1} label`}
                                    value={o.label}
                                    onChange={(label) => patchOption(o.id, { label })}
                                    placeholder="Button the player sees"
                                />
                                <button
                                    type="button"
                                    className="btn-icon text-ink-4 hover:text-danger"
                                    onClick={() =>
                                        onPatch({ options: line.options.filter((x) => x.id !== o.id) })
                                    }
                                    aria-label="Remove choice"
                                >
                                    <Icon name="trash" size={12} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <TextInput
                                    ariaLabel={`Choice ${oi + 1} reply`}
                                    value={o.text}
                                    onChange={(text) => patchOption(o.id, { text })}
                                    placeholder="Optional reply when picked"
                                />
                                <SelectInput
                                    ariaLabel={`Choice ${oi + 1} then`}
                                    value={thenValue(o)}
                                    onChange={(v) => setThen(o, v)}
                                    options={[
                                        { value: "next", label: "→ next line" },
                                        ...branch.lines.map((_, li) => ({
                                            value: `line:${li}`,
                                            label: `→ jump to line ${li + 1}`,
                                        })),
                                        ...otherBranches
                                            .filter((name) => name !== branch.name)
                                            .map((name) => ({
                                                value: `branch:${name}`,
                                                label: `→ switch to “${name}”`,
                                            })),
                                        { value: "end", label: "→ hang up" },
                                    ]}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ItemCard>
    );
}
