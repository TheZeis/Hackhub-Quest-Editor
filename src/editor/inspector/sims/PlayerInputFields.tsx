/**
 * Shared fields for a "the player types a free answer" moment: what counts as
 * correct, what happens when it isn't. Used by phone lines, Kisscord and
 * WeeChat messages alike.
 */
import { FieldShell, SelectInput, TextInput, Toggle } from "@/editor/inspector/primitives";
import type { PlayerInput } from "@/schema/nodes";

export function PlayerInputFields({
    value,
    onChange,
    index,
}: {
    value: PlayerInput;
    onChange: (next: PlayerInput) => void;
    index: number;
}) {
    return (
        <div className="grid gap-2 rounded-md border border-line/70 bg-surface p-2">
            <FieldShell
                label="Expected answer"
                hint="What counts as correct — a password, a code name, anything the quest plants somewhere. Leave blank to accept whatever they type."
            >
                <TextInput
                    ariaLabel={`Expected answer ${index + 1}`}
                    value={value.expected}
                    onChange={(expected) => onChange({ ...value, expected })}
                    mono
                    placeholder="e.g. treyes3419"
                />
            </FieldShell>
            <div className="grid grid-cols-2 gap-2">
                <FieldShell label="Matching">
                    <SelectInput
                        ariaLabel={`Matching ${index + 1}`}
                        value={value.matchMode}
                        onChange={(matchMode) =>
                            onChange({ ...value, matchMode: matchMode as PlayerInput["matchMode"] })
                        }
                        options={[
                            { value: "exact", label: "Exact match" },
                            { value: "contains", label: "Contains" },
                            { value: "regex", label: "Pattern (regex)" },
                        ]}
                    />
                </FieldShell>
                <FieldShell label="Case">
                    <Toggle
                        label="Case sensitive"
                        hint="Ignore case by default — players rarely hold Shift mid-heist."
                        checked={value.caseSensitive}
                        onChange={(caseSensitive) => onChange({ ...value, caseSensitive })}
                    />
                </FieldShell>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <FieldShell
                    label="On a wrong answer"
                    hint="Try again lets them retry, end stops the conversation, Wrong fires this node's Wrong output so the quest can branch."
                >
                    <SelectInput
                        ariaLabel={`Wrong answer route ${index + 1}`}
                        value={value.wrongRoute}
                        onChange={(wrongRoute) =>
                            onChange({ ...value, wrongRoute: wrongRoute as PlayerInput["wrongRoute"] })
                        }
                        options={[
                            { value: "retry", label: "Let them try again" },
                            { value: "end", label: "End the conversation" },
                            { value: "wrong", label: "Node's Wrong output" },
                        ]}
                    />
                </FieldShell>
                <FieldShell label="Wrong-answer line" hint="Said to the player when the answer doesn't match.">
                    <TextInput
                        ariaLabel={`Wrong answer line ${index + 1}`}
                        value={value.failureText}
                        onChange={(failureText) => onChange({ ...value, failureText })}
                        placeholder="Sorry, that's not it."
                    />
                </FieldShell>
            </div>
        </div>
    );
}
