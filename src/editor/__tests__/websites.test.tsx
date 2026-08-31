/**
 * Step 3 website builder: store actions plus the builder dialog end to end —
 * first site, templated pages, the dirhunter "unlisted" toggle, and the
 * WYSIWYG surface.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichText } from "@/editor/websites/RichText";
import { WebsiteBuilderDialog } from "@/editor/websites/WebsiteBuilder";
import { createPage, createProject, createWebsite } from "@/schema/project";
import { useEditor } from "@/store/editor";

beforeEach(() => {
    localStorage.clear();
    act(() => useEditor.getState().load(createProject(), { clearHistory: true }));
});

describe("website store actions", () => {
    it("adds, updates and removes sites and pages with history", () => {
        const site = createWebsite({ host: "leak.example" });
        act(() => useEditor.getState().addWebsite(site));
        expect(useEditor.getState().project.websites).toHaveLength(1);

        const page = createPage({ path: "/hidden", seo: false });
        act(() => useEditor.getState().addPage(site.id, page));
        expect(useEditor.getState().project.websites[0].pages).toHaveLength(2);

        act(() => useEditor.getState().updatePage(site.id, page.id, { title: "The goods" }));
        expect(useEditor.getState().project.websites[0].pages.find((p) => p.id === page.id)!.title).toBe(
            "The goods",
        );

        act(() => useEditor.getState().updateWebsite(site.id, { host: "other.example" }));
        expect(useEditor.getState().project.websites[0].host).toBe("other.example");

        // One undo per action.
        act(() => useEditor.getState().undo());
        expect(useEditor.getState().project.websites[0].host).toBe("leak.example");

        act(() => useEditor.getState().removePage(site.id, page.id));
        expect(useEditor.getState().project.websites[0].pages).toHaveLength(1);

        act(() => useEditor.getState().removeWebsite(site.id));
        expect(useEditor.getState().project.websites).toHaveLength(0);
    });
});

describe("website builder dialog", () => {
    it("walks from no sites to a hidden clue page", async () => {
        const user = userEvent.setup();
        render(<WebsiteBuilderDialog open onOpenChange={() => {}} />);

        expect(screen.getByText("No websites yet.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /create your first website/i }));

        // The starter site ships a home page.
        expect(screen.getByLabelText("Site host")).toHaveValue("meridian-capital.net");
        expect(screen.getByText("/")).toBeInTheDocument();

        // Add a ready-made hidden clue page.
        await user.click(screen.getByRole("button", { name: "New page" }));
        await user.click(screen.getByRole("button", { name: "Hidden clue page" }));

        const site = useEditor.getState().project.websites[0];
        const hidden = site.pages.find((p) => p.path === "/files/internal/q3-audit")!;
        expect(hidden.seo).toBe(false);
        expect(hidden.template).toBe("hidden-leak");

        // Unlisted by template: the toggle is off and the hint explains dirhunter.
        const listing = screen.getByRole("switch");
        expect(listing).not.toBeChecked();

        // The preview shows the in-game browser with the hidden-page banner.
        await user.click(screen.getByRole("button", { name: "preview" }));
        expect(screen.getByText(/not in search results/i)).toBeInTheDocument();
        expect(screen.getByText(/http:\/\/meridian-capital\.net\/files\/internal\/q3-audit/)).toBeInTheDocument();
        expect(screen.getByText(/offshore batch settles through/)).toBeInTheDocument();

        // Flip it listed and the banner goes away.
        await user.click(screen.getByRole("button", { name: "edit" }));
        await user.click(screen.getByRole("switch"));
        expect(useEditor.getState().project.websites[0].pages.find((p) => p.id === hidden.id)!.seo).toBe(true);
    });

    it("edits page meta fields", async () => {
        const user = userEvent.setup();
        const site = createWebsite();
        act(() => useEditor.getState().addWebsite(site));

        render(<WebsiteBuilderDialog open onOpenChange={() => {}} />);
        await user.clear(screen.getByLabelText("Page path"));
        await user.type(screen.getByLabelText("Page path"), "/about");
        expect(useEditor.getState().project.websites[0].pages[0].path).toBe("/about");
    });
});

describe("rich text surface", () => {
    it("renders existing content and routes the toolbar through execCommand", async () => {
        const user = userEvent.setup();
        const exec = vi.fn(() => true);
        Object.defineProperty(document, "execCommand", { value: exec, configurable: true });

        const onChange = vi.fn();
        render(<RichText value="<p>hello</p>" onChange={onChange} ariaLabel="Page body" />);

        const surface = screen.getByRole("textbox", { name: "Page body" });
        expect(surface.innerHTML).toBe("<p>hello</p>");

        await user.click(screen.getByRole("button", { name: "Bold" }));
        expect(exec).toHaveBeenCalledWith("bold", false, undefined);
        expect(onChange).toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Heading" }));
        expect(exec).toHaveBeenCalledWith("formatBlock", false, "h1");
    });

    it("emits typed content", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<RichText value="" onChange={onChange} ariaLabel="Page body" />);
        await user.type(screen.getByRole("textbox", { name: "Page body" }), "clue");
        expect(onChange.mock.calls.at(-1)![0]).toContain("clue");
    });
});
