/**
 * The WeeChat editor: an IRC-terminal preview above the channel script.
 */
import { nanoid } from "nanoid";
import { Icon } from "@/components/Icon";
import { FieldShell, NumberInput, TextArea, TextInput, Toggle } from "@/editor/inspector/primitives";
import type { NodeOfType, WeeChatMessage } from "@/schema/nodes";
import { useEditor } from "@/store/editor";
import { ItemCard, SimFrame, moved } from "./chrome";

const stamp = (i: number) => {
    const minutes = 9 * 60 + 7 + i;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

export function WeeChatEditor({ node }: { node: NodeOfType<"comms.weechat"> }) {
    const updateNodeData = useEditor((s) => s.updateNodeData);
    const messages = node.data.messages;

    const write = (next: WeeChatMessage[]) => updateNodeData(node.id, { messages: next });
    const patch = (id: string, p: Partial<WeeChatMessage>) =>
        write(messages.map((m) => (m.id === id ? { ...m, ...p } : m)));

    return (
        <div className="pt-1">
            <SimFrame app="WeeChat" caption={node.data.host || "no server"}>
                <div className="max-h-56 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
                    <p className="text-ink-4">
                        -- Connected to {node.data.host || "…"}. Type to join the channel.
                    </p>
                    {messages.map((m, i) => (
                        <p key={m.id} className="whitespace-pre-wrap">
                            <span className="text-ink-4">[{stamp(i)}]</span>{" "}
                            {m.isMine ? (
                                <span className="text-accent">&lt;you&gt;</span>
                            ) : (
                                <span className="text-ok">&lt;{m.username || "???"}&gt;</span>
                            )}{" "}
                            <span className={m.isMine ? "text-ink" : "text-ink-2"}>{m.content || "…"}</span>
                        </p>
                    ))}
                </div>
            </SimFrame>

            <div className="mt-3 flex items-center justify-between px-3">
                <h4 className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                    Channel log · {messages.length} line{messages.length === 1 ? "" : "s"}
                </h4>
                <button
                    type="button"
                    className="btn-default"
                    onClick={() =>
                        write([
                            ...messages,
                            { id: nanoid(8), content: "", username: "informant", isMine: false, delayMs: 1000 },
                        ])
                    }
                >
                    <Icon name="plus" size={12} />
                    Add line
                </button>
            </div>

            <div className="grid gap-2 px-3 py-2">
                {messages.map((m, i) => (
                    <ItemCard
                        key={m.id}
                        index={i}
                        title={`${m.isMine ? "you" : m.username || "???"}: ${m.content.slice(0, 30) || "empty line"}`}
                        onRemove={() => write(messages.filter((x) => x.id !== m.id))}
                        onUp={() => write(moved(messages, i, -1))}
                        onDown={() => write(moved(messages, i, 1))}
                        canUp={i > 0}
                        canDown={i < messages.length - 1}
                    >
                        <TextArea
                            ariaLabel={`Line ${i + 1}`}
                            value={m.content}
                            onChange={(content) => patch(m.id, { content })}
                            rows={2}
                            placeholder="The line printed in the channel"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <FieldShell label="Username" hint="The nick speaking this line. Ignored when sent by the player.">
                                <TextInput
                                    ariaLabel={`Username ${i + 1}`}
                                    value={m.username ?? ""}
                                    onChange={(username) => patch(m.id, { username })}
                                    mono
                                    placeholder="informant"
                                />
                            </FieldShell>
                            <FieldShell label="Delay before (seconds)">
                                <NumberInput
                                    value={m.delayMs / 1000}
                                    onChange={(s) => patch(m.id, { delayMs: Math.round(s * 1000) })}
                                    min={0}
                                    step={0.5}
                                />
                            </FieldShell>
                        </div>
                        <Toggle
                            label="Sent by the player"
                            hint="Prints the line from the player's own nick."
                            checked={m.isMine}
                            onChange={(isMine) => patch(m.id, { isMine })}
                        />
                    </ItemCard>
                ))}
            </div>
        </div>
    );
}
