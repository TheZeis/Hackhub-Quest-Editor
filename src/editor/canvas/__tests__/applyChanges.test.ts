/**
 * The reported bug, encoded: clicking node B while A is selected delivers the
 * pair [deselect A, select B] in one batch. Folding over the stale starting
 * selection (the old bug) yields [A, B] and the inspector never opens B. Folding
 * sequentially yields [B].
 */
import { describe, expect, it } from "vitest";
import { altersSelection, nextSelection } from "@/editor/canvas/applyChanges";

describe("nextSelection", () => {
    it("switches to a newly clicked node, dropping the previous one", () => {
        const changes = [
            { type: "select", id: "a", selected: false },
            { type: "select", id: "b", selected: true },
        ];
        expect(nextSelection(["a"], changes)).toEqual(["b"]);
    });

    it("works when the changes arrive in the opposite order", () => {
        const changes = [
            { type: "select", id: "b", selected: true },
            { type: "select", id: "a", selected: false },
        ];
        expect(nextSelection(["a"], changes)).toEqual(["b"]);
    });

    it("adds to the selection with a modifier held", () => {
        const changes = [{ type: "select", id: "b", selected: true }];
        expect(nextSelection(["a"], changes)).toEqual(["a", "b"]);
    });

    it("clears when the only selected node is deselected", () => {
        expect(nextSelection(["a"], [{ type: "select", id: "a", selected: false }])).toEqual([]);
    });

    it("ignores non-select changes and changes without an id", () => {
        const changes = [
            { type: "position", id: "a" },
            { type: "select", selected: true },
            { type: "add" as string, id: "c" },
        ];
        expect(nextSelection(["a"], changes)).toEqual(["a"]);
    });

    it("does not duplicate an id that is re-selected", () => {
        const changes = [
            { type: "select", id: "a", selected: false },
            { type: "select", id: "a", selected: true },
        ];
        expect(nextSelection(["a"], changes)).toEqual(["a"]);
    });
});

describe("altersSelection", () => {
    it("is true only when a select change is present", () => {
        expect(altersSelection([{ type: "select", id: "a", selected: true }])).toBe(true);
        expect(altersSelection([{ type: "position", id: "a" }])).toBe(false);
        expect(altersSelection([])).toBe(false);
    });
});
