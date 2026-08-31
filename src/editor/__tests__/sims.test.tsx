/**
 * The Step 3 communication editors: live previews plus scripted-list editing,
 * all writing through the store like the rest of the inspector.
 */
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CallEditor } from "@/editor/inspector/sims/CallEditor";
import { KisscordEditor } from "@/editor/inspector/sims/KisscordEditor";
import { MailSim } from "@/editor/inspector/sims/MailSim";
import { WeeChatEditor } from "@/editor/inspector/sims/WeeChatEditor";
import { createProject } from "@/schema/project";
import type { NodeDoc, NodeType } from "@/schema/nodes";
import { useEditor } from "@/store/editor";

beforeEach(() => {
    localStorage.clear();
    act(() => useEditor.getState().load(createProject(), { clearHistory: true }));
});

function addNode(type: NodeType): NodeDoc {
    let id = "";
    act(() => {
        id = useEditor.getState().addNode(type, { x: 0, y: 0 })!;
    });
    return useEditor.getState().project.quests[0].graph.nodes.find((n) => n.id === id)!;
}

const nodeNow = (id: string) =>
    useEditor.getState().project.quests[0].graph.nodes.find((n) => n.id === id)!;

/** Re-selects the node each render, like the real NodeInspector does. */
function LiveNode({ id, children }: { id: string; children: (node: never) => ReactNode }) {
    const node = useEditor((s) => s.project.quests[0].graph.nodes.find((n) => n.id === id));
    return node ? <>{children(node as never)}</> : null;
}

describe("Kisscord editor", () => {
    it("scripts a DM chain with previews, gating and ordering", async () => {
        const user = userEvent.setup();
        act(() => {
            const objective = useEditor.getState().addNode("objective", { x: 0, y: 0 })!;
            useEditor.getState().updateNodeData(objective, { name: "grab-ledger" });
        });
        const node = addNode("comms.kisscord");

        render(
            <LiveNode id={node.id}>
                {(n) => <KisscordEditor node={n} />}
            </LiveNode>,
        );
        expect(screen.getByText(/No messages yet/)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /add message/i }));
        await user.type(screen.getByLabelText("Message 1"), "got the files?");

        const stored = nodeNow(node.id);
        expect(stored.type === "comms.kisscord" && stored.data.messages[0].content).toBe("got the files?");
        // The preview bubble shows what the player will read.
        expect(screen.getAllByText("got the files?").length).toBeGreaterThan(0);

        // Gate it behind the objective with the chip picker.
        await user.click(screen.getByRole("button", { name: "grab-ledger" }));
        const gated = nodeNow(node.id);
        expect(gated.type === "comms.kisscord" && gated.data.messages[0].unlocksAfter).toEqual(["grab-ledger"]);
        expect(screen.getByText(/appears once done: grab-ledger/)).toBeInTheDocument();

        // Second message + reorder.
        await user.click(screen.getByRole("button", { name: /add message/i }));
        await user.type(screen.getByLabelText("Message 2"), "second");
        const upButtons = screen.getAllByRole("button", { name: "Move earlier" });
        await user.click(upButtons[upButtons.length - 1]);
        const reordered = nodeNow(node.id);
        expect(reordered.type === "comms.kisscord" && reordered.data.messages[0].content).toBe("second");
    });
});

describe("WeeChat editor", () => {
    it("renders an IRC log and edits lines", async () => {
        const user = userEvent.setup();
        const node = addNode("comms.weechat");

        render(
            <LiveNode id={node.id}>
                {(n) => <WeeChatEditor node={n} />}
            </LiveNode>,
        );
        await user.click(screen.getByRole("button", { name: /add line/i }));
        await user.type(screen.getByLabelText("Line 1"), "bring the drive");

        expect(screen.getAllByText(/bring the drive/).length).toBeGreaterThan(0);
        expect(screen.getAllByText("<informant>").length).toBeGreaterThan(0);

        const switches = screen.getAllByRole("switch");
        await user.click(switches[switches.length - 1]);
        const stored = nodeNow(node.id);
        expect(stored.type === "comms.weechat" && stored.data.messages[0].isMine).toBe(true);
        expect(screen.getByText("<you>")).toBeInTheDocument();
    });
});

describe("phone call editor", () => {
    it("creates branches on the quest and scripts lines with choices", async () => {
        const user = userEvent.setup();
        const node = addNode("comms.call");

        render(
            <LiveNode id={node.id}>
                {(n) => <CallEditor node={n} />}
            </LiveNode>,
        );
        expect(screen.getByText(/no conversation yet/i)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /new branch/i }));
        const quest = useEditor.getState().project.quests[0];
        expect(quest.dialog).toHaveLength(1);
        expect(quest.dialog[0].name).toBe("branch-1");

        await user.click(screen.getByRole("button", { name: /add line/i }));
        await user.type(screen.getByLabelText("Line 1"), "We don't have long.");
        expect(screen.getAllByText("We don't have long.").length).toBeGreaterThan(0);

        // A player choice appears as a tappable button in the phone preview.
        await user.click(screen.getByRole("button", { name: /add choice/i }));
        await user.type(screen.getByLabelText("Choice 1 label"), "Who is this?");
        expect(screen.getByRole("button", { name: "Who is this?" })).toBeInTheDocument();
    });

    it("lets the preview play through lines", async () => {
        const user = userEvent.setup();
        const node = addNode("comms.call");
        act(() => {
            useEditor.getState().updateQuest(useEditor.getState().project.quests[0].id, {
                dialog: [
                    {
                        id: "b1",
                        name: "default",
                        lines: [
                            { id: "l1", speaker: "", text: "First.", isEnd: false, options: [] },
                            { id: "l2", speaker: "", text: "Second.", isEnd: true, options: [] },
                        ],
                    },
                ],
            });
        });

        render(
            <LiveNode id={node.id}>
                {(n) => <CallEditor node={n} />}
            </LiveNode>,
        );
        expect(screen.getAllByText("First.").length).toBeGreaterThan(0);
        await user.click(screen.getByRole("button", { name: /continue/i }));
        expect(screen.getAllByText("Second.").length).toBeGreaterThan(0);
        expect(screen.getByText(/call ends/i)).toBeInTheDocument();
    });
});

describe("mail preview", () => {
    it("shows the reading view above the fields", () => {
        const node = addNode("comms.mail");
        act(() => {
            useEditor.getState().updateNodeData(node.id, {
                from: "handler@anon.mail",
                subject: "The job",
                content: "<p>Details enclosed.</p>",
            });
        });
        const updated = nodeNow(node.id) as NodeDoc & { type: "comms.mail" };

        render(<MailSim node={updated} />);
        expect(screen.getByText("The job")).toBeInTheDocument();
        expect(screen.getByText("Details enclosed.")).toBeInTheDocument();
        expect(screen.getByText(/handler@anon\.mail/)).toBeInTheDocument();
    });
});
