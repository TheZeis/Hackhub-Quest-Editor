/**
 * Node-card copy and the small pieces of editor memory around it: the tweet
 * card resolving its account, and tags the author invents being offered back
 * in the next mod.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { summarize } from "@/editor/canvas/summarize";
import { createQuest } from "@/schema/project";
import { nodeTypeDef } from "@/schema/registry";
import { forgetTag, rememberTags, rememberedTags } from "@/lib/tagMemory";
import type { NodeDoc } from "@/schema/nodes";

function tweetNode(patch: Record<string, unknown>): NodeDoc {
    return {
        id: "t1",
        type: "comms.tweet",
        position: { x: 0, y: 0 },
        data: { ...(nodeTypeDef("comms.tweet").create() as object), ...patch },
    } as NodeDoc;
}

describe("tweet card", () => {
    it("shows the handle of the account picked in the inspector", () => {
        const quest = createQuest();
        // The picker stores the account's id; the card must show the @handle.
        quest.twotterAccounts = [
            { id: "acc_9f2", username: "dockwatch", displayName: "Dock Watch", avatar: "", verified: false },
        ];
        const lines = summarize(tweetNode({ accountId: "acc_9f2", content: "Something moved." }), quest);
        expect(lines[0]).toBe("@dockwatch");
        expect(lines[1]).toBe("Something moved.");
    });

    it("still says so when no account has been picked", () => {
        const quest = createQuest();
        quest.twotterAccounts = [
            { id: "acc_9f2", username: "dockwatch", displayName: "Dock Watch", avatar: "", verified: false },
        ];
        expect(summarize(tweetNode({ accountId: "" }), quest)[0]).toBe("no account yet");
    });

    it("flags an account that was deleted from the quest", () => {
        const quest = createQuest();
        quest.twotterAccounts = [];
        expect(summarize(tweetNode({ accountId: "acc_gone" }), quest)[0]).toContain("not in this quest");
    });
});

describe("sequence card", () => {
    it("reads out the outputs and the total run time", () => {
        const node = {
            id: "s1",
            type: "flow.sequence",
            position: { x: 0, y: 0 },
            data: {
                steps: [
                    { id: "a", label: "Lights out", delayMs: 0 },
                    { id: "b", label: "Sirens", delayMs: 1500 },
                ],
            },
        } as NodeDoc;
        const lines = summarize(node);
        expect(lines[0]).toBe("2 outputs, in order");
        expect(lines[1]).toBe("Lights out → Sirens");
        expect(lines[2]).toBe("1500 ms end to end");
    });

    it("says plainly when it has no outputs yet", () => {
        const node = {
            id: "s2",
            type: "flow.sequence",
            position: { x: 0, y: 0 },
            data: { steps: [] },
        } as NodeDoc;
        expect(summarize(node)).toEqual(["no outputs yet"]);
    });
});

describe("tag memory", () => {
    beforeEach(() => localStorage.clear());

    it("remembers tags across projects, most recent first", () => {
        rememberTags(["dockyards", "night shift"]);
        rememberTags(["heist"]);
        expect(rememberedTags()).toEqual(["heist", "dockyards", "night shift"]);
    });

    it("never stores a tag twice and can forget one", () => {
        rememberTags(["heist", "heist", " heist "]);
        expect(rememberedTags()).toEqual(["heist"]);
        expect(forgetTag("heist")).toEqual([]);
        expect(rememberedTags()).toEqual([]);
    });

    it("survives storage being unavailable", () => {
        const original = localStorage.setItem;
        localStorage.setItem = () => {
            throw new Error("quota");
        };
        expect(() => rememberTags(["boom"])).not.toThrow();
        localStorage.setItem = original;
    });
});
