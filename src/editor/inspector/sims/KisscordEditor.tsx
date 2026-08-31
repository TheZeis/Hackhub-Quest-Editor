/**
 * The Kisscord editor: a live DM-window preview above a scripted message list.
 * Writes go through `updateNodeData`, the inspector's only node write path.
 */
import { nanoid } from "nanoid";
import { Icon } from "@/components/Icon";
import { FieldShell, NumberInput, TextArea, Toggle } from "@/editor/inspector/primitives";
import type { NodeOfType } from "@/schema/nodes";
import type { KisscordMessage } from "@/schema/nodes";
import { selectActiveQuest, useEditor } from "@/store/editor";
import { ItemCard, SimFrame, moved } from "./chrome";

export function KisscordEditor({ node }: { node: NodeOfType<"comms.kisscord"> }) {
    const quest = useEditor(selectActiveQuest);
    const updateNodeData = useEditor((s) => s.updateNodeData);
    const messages = node.data.messages;

    const write = (next: KisscordMessage[]) => updateNodeData(node.id, { messages: next });
    const patch = (id: string, p: Partial<KisscordMessage>) =>
        write(messages.map((m) => (m.id === id ? { ...m, ...p } : m)));

    const objectives = (quest?.graph.nodes ?? [])
        .filter((n) => n.type === "objective")
        .map((n) => (n.type === "objective" ? n.data.name : ""))
        .filter(Boolean);

    return (
        <div className="pt-1">
            <SimFrame app="Kisscord" caption={node.data.contactId || "no contact"}>
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto p-3">
                    {messages.length === 0 && (
                        <p className="py-2 text-center text-[11px] text-ink-4">
                            No messages yet — add the first line below.
                        </p>
                    )}
                    {messages.map((m) => (
                        <div key={m.id} className={m.isMine ? "self-end" : "self-start"}>
                            {m.unlocksAfter.length > 0 && (
                                <p className="mb-0.5 flex items-center gap-1 text-[9.5px] text-ink-4">
                                    <Icon name="lock" size={9} />
                                    appears once done: {m.unlocksAfter.join(", ")}
                                </p>
                            )}
                            <div
                                className={
                                    m.isMine
                                        ? "max-w-[85%] rounded-lg rounded-br-sm bg-accent px-2.5 py-1.5 text-[11.5px] whitespace-pre-wrap text-void"
                                        : "max-w-[85%] rounded-lg rounded-bl-sm bg-surface-3 px-2.5 py-1.5 text-[11.5px] whitespace-pre-wrap text-ink"
                                }
                            >
                                {m.content || "…"}
                            </div>
                        </div>
                    ))}
                </div>
            </SimFrame>

            <div className="mt-3 flex items-center justify-between px-3">
                <h4 className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                    Script · {messages.length} message{messages.length === 1 ? "" : "s"}
                </h4>
                <button
                    type="button"
                    className="btn-default"
                    onClick={() =>
                        write([
                            ...messages,
                            { id: nanoid(8), content: "", isMine: false, delayMs: 1000, unlocksAfter: [] },
                        ])
                    }
                >
                    <Icon name="plus" size={12} />
                    Add message
                </button>
            </div>

            <div className="grid gap-2 px-3 py-2">
                {messages.map((m, i) => (
                    <ItemCard
                        key={m.id}
                        index={i}
                        title={m.content.slice(0, 40) || "empty message"}
                        onRemove={() => write(messages.filter((x) => x.id !== m.id))}
                        onUp={() => write(moved(messages, i, -1))}
                        onDown={() => write(moved(messages, i, 1))}
                        canUp={i > 0}
                        canDown={i < messages.length - 1}
                    >
                        <TextArea
                            ariaLabel={`Message ${i + 1}`}
                            value={m.content}
                            onChange={(content) => patch(m.id, { content })}
                            rows={2}
                            placeholder="The message text"
                        />
                        <Toggle
                            label="Sent by the player"
                            hint="Shows on the right in the player's own colour."
                            checked={m.isMine}
                            onChange={(isMine) => patch(m.id, { isMine })}
                        />
                        <FieldShell label="Delay before (seconds)" hint="Paces the conversation. 0 shows the message immediately after the previous one.">
                            <NumberInput
                                value={m.delayMs / 1000}
                                onChange={(s) => patch(m.id, { delayMs: Math.round(s * 1000) })}
                                min={0}
                                step={0.5}
                            />
                        </FieldShell>
                        {objectives.length > 0 && (
                            <FieldShell
                                label="Waits for objectives"
                                hint="The chain pauses at the first gated message and resumes automatically once every ticked objective is done — reloads included. Leave all unticked for an uninterrupted chat."
                            >
                                <div className="flex flex-wrap gap-1.5">
                                    {objectives.map((name) => {
                                        const on = m.unlocksAfter.includes(name);
                                        return (
                                            <button
                                                key={name}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() =>
                                                    patch(m.id, {
                                                        unlocksAfter: on
                                                            ? m.unlocksAfter.filter((o) => o !== name)
                                                            : [...m.unlocksAfter, name],
                                                    })
                                                }
                                                className={
                                                    on
                                                        ? "rounded-full border border-accent bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent"
                                                        : "rounded-full border border-line px-2 py-0.5 text-[10.5px] text-ink-3 hover:text-ink"
                                                }
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </FieldShell>
                        )}
                    </ItemCard>
                ))}
            </div>
        </div>
    );
}
