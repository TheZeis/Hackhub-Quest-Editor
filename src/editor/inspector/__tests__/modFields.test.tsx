/**
 * The rebuilt tag input: multi-word tags, Enter/comma commit, autocomplete
 * with Tab, and quick-add common chips. (The old single-line field ate every
 * space, so only one-word tags were possible.)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { COMMON_TAGS, TagInput } from "@/editor/inspector/ModFields";

function Harness() {
    const [tags, setTags] = useState<string[]>([]);
    return <TagInput ariaLabel="Add a tag" value={tags} onChange={setTags} />;
}

describe("tag input", () => {
    beforeEach(() => {});

    it("accepts multi-word tags and commits on Enter or comma", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const input = screen.getByLabelText("Add a tag");

        await user.type(input, "murder mystery{Enter}");
        expect(screen.getByText("murder mystery")).toBeInTheDocument();

        await user.type(input, "darknet,");
        expect(screen.getByText("darknet")).toBeInTheDocument();

        // typing a space mid-tag no longer eats it
        await user.type(input, "multiple endings");
        expect((input as HTMLInputElement).value).toBe("multiple endings");
    });

    it("suggests matching common tags and completes with Tab", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const input = screen.getByLabelText("Add a tag");

        await user.type(input, "netw");
        const suggestion = await screen.findByTitle("Add this tag (or press Tab)");
        expect(suggestion.textContent).toContain("network");
        await user.keyboard("{Tab}");
        expect(screen.getByText("network")).toBeInTheDocument();
        expect((input as HTMLInputElement).value).toBe("");
    });

    it("offers the common-tag list as quick chips and removes tags", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        expect(COMMON_TAGS).toContain("pvp-safe");

        const summary = screen.getByText(/common tags/i);
        await user.click(summary);
        await user.click(screen.getByRole("button", { name: "+ finance" }));
        expect(screen.getByText("finance")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Remove tag finance" }));
        expect(screen.queryByText("finance")).not.toBeInTheDocument();
    });
});
