/**
 * The top-level dialogue editor: write the active quest's phone conversations
 * (branches, lines, choices) without placing a call node first. Call nodes on
 * the canvas pick one of these branches and play it.
 */
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { nanoid } from "nanoid";
import { Icon } from "@/components/Icon";
import { BranchScriptEditor } from "@/editor/inspector/sims/DialogScript";
import { SelectInput } from "@/editor/inspector/primitives";
import type { DialogBranch } from "@/schema/nodes";
import { selectActiveQuest, useEditor } from "@/store/editor";

export function DialoguesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const quest = useEditor(selectActiveQuest);
    const updateQuest = useEditor((s) => s.updateQuest);
    const [picked, setPicked] = useState<string | null>(null);

    const dialog = quest?.dialog ?? [];
    const branch = dialog.find((b) => b.name === picked) ?? dialog[0];
    const caller = quest
        ? `${quest.employer.firstName ?? "Caller"} ${quest.employer.lastName ?? ""}`.trim()
        : "Caller";

    const writeDialog = (next: DialogBranch[]) => {
        if (quest) updateQuest(quest.id, { dialog: next });
    };
    const addBranch = () => {
        const name = `branch-${dialog.length + 1}`;
        writeDialog([...dialog, { id: nanoid(8), name, lines: [] }]);
        setPicked(name);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-void/70 backdrop-blur-[2px]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex h-[82vh] w-[min(760px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel">
                    <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
                        <div>
                            <Dialog.Title className="text-[13.5px] font-semibold text-ink">
                                Dialogue editor
                            </Dialog.Title>
                            <Dialog.Description className="mt-0.5 text-[11px] leading-relaxed text-ink-3">
                                Write the phone conversations of{" "}
                                <span className="text-ink-2">{quest?.name ?? "the active quest"}</span>. A “Phone
                                call” node on the canvas picks one of these branches and plays it in-game.
                            </Dialog.Description>
                        </div>
                        <Dialog.Close className="btn-icon" aria-label="Close">
                            <Icon name="x" size={14} />
                        </Dialog.Close>
                    </div>

                    {quest ? (
                        <>
                            <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-b border-line px-4 py-2">
                                <SelectInput
                                    ariaLabel="Conversation branch"
                                    value={branch?.name ?? ""}
                                    onChange={setPicked}
                                    options={dialog.map((b) => ({
                                        value: b.name,
                                        label: `${b.name} · ${b.lines.length} line${b.lines.length === 1 ? "" : "s"}`,
                                    }))}
                                />
                                <button type="button" className="btn-default mb-0.5" onClick={addBranch}>
                                    <Icon name="plus" size={12} />
                                    New branch
                                </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto pb-3">
                                {branch ? (
                                    <BranchScriptEditor
                                        key={branch.id}
                                        branch={branch}
                                        otherBranches={dialog.map((b) => b.name)}
                                        caller={caller}
                                        onPatch={(p) =>
                                            writeDialog(dialog.map((b) => (b.id === branch.id ? { ...b, ...p } : b)))
                                        }
                                    />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-4">
                                        <Icon name="phone" size={20} />
                                        <p className="text-[12px]">No conversation yet — create a branch to start writing.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ink-4">
                            <Icon name="phone" size={20} />
                            <p className="text-[12px]">Add a quest first — dialogues live on quests.</p>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
