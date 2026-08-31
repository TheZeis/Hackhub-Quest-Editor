/**
 * The phone-call node editor: pick which quest dialog branch plays and where
 * it starts. The script itself is edited with the shared BranchScriptEditor —
 * the same one the top-level Dialogues dialog uses.
 */
import { nanoid } from "nanoid";
import { Icon } from "@/components/Icon";
import { FieldShell, SelectInput } from "@/editor/inspector/primitives";
import type { DialogBranch, NodeOfType } from "@/schema/nodes";
import { selectActiveQuest, useEditor } from "@/store/editor";
import { BranchScriptEditor } from "./DialogScript";

export function CallEditor({ node }: { node: NodeOfType<"comms.call"> }) {
    const quest = useEditor(selectActiveQuest);
    const updateNodeData = useEditor((s) => s.updateNodeData);
    const updateQuest = useEditor((s) => s.updateQuest);
    if (!quest) return null;

    const dialog = quest.dialog;
    const branch = dialog.find((b) => b.name === node.data.branch) ?? dialog[0];

    const writeDialog = (next: DialogBranch[]) => updateQuest(quest.id, { dialog: next });
    const patchBranch = (id: string, p: Partial<DialogBranch>) =>
        writeDialog(dialog.map((b) => (b.id === id ? { ...b, ...p } : b)));

    const addBranch = () => {
        const name = `branch-${dialog.length + 1}`;
        writeDialog([...dialog, { id: nanoid(8), name, lines: [] }]);
        updateNodeData(node.id, { branch: name });
    };

    return (
        <div className="pt-1">
            <div className="grid grid-cols-[1fr_auto] items-end gap-2 px-3 pt-2">
                <FieldShell
                    label="Conversation"
                    hint="Dialog branches live on the quest, so several call nodes can share one script."
                >
                    <SelectInput
                        ariaLabel="Conversation branch"
                        value={branch?.name ?? ""}
                        onChange={(name) => updateNodeData(node.id, { branch: name })}
                        options={dialog.map((b) => ({ value: b.name, label: b.name }))}
                    />
                </FieldShell>
                <button type="button" className="btn-default mb-2" onClick={addBranch}>
                    <Icon name="plus" size={12} />
                    New branch
                </button>
            </div>

            {branch ? (
                <BranchScriptEditor
                    key={branch.id}
                    branch={branch}
                    otherBranches={dialog.map((b) => b.name)}
                    startIndex={node.data.startIndex}
                    caller={`${quest.employer.firstName ?? "Caller"} ${quest.employer.lastName ?? ""}`.trim()}
                    onPatch={(p) => patchBranch(branch.id, p)}
                />
            ) : (
                <p className="px-3 py-4 text-center text-[11.5px] text-ink-4">
                    This quest has no conversation yet — create a branch to start scripting the call.
                </p>
            )}
        </div>
    );
}
