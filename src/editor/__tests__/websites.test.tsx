/**
 * Step 3 website builder: store actions, the builder dialog end to end, the
 * code view, Load HTML, the isolated visual editor, and template quality.
 */
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodePageEditor, VisualPageEditor } from "@/editor/websites/pageEditor";
import { isFullDocument, joinDocument, splitDocument, wrapFragment } from "@/editor/websites/pageDoc";
import { WebsiteBuilderDialog } from "@/editor/websites/WebsiteBuilder";
import { createPage, createProject, createWebsite } from "@/schema/project";
import { PAGE_TEMPLATES, SITE_TEMPLATES } from "@/templates/pages";
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

        act(() => useEditor.getState().undo());
        expect(useEditor.getState().project.websites[0].host).toBe("leak.example");

        act(() => useEditor.getState().removePage(site.id, page.id));
        expect(useEditor.getState().project.websites[0].pages).toHaveLength(1);

        act(() => useEditor.getState().removeWebsite(site.id));
        expect(useEditor.getState().project.websites).toHaveLength(0);
    });
});

describe("page documents", () => {
    it("splits full documents and rejoins without touching the head", () => {
        const doc = `<!doctype html><html><head><style>h1{color:red}</style></head><body><h1>Hi</h1></body></html>`;
        expect(isFullDocument(doc)).toBe(true);
        const parts = splitDocument(doc);
        expect(parts.head).toContain("<style>h1{color:red}</style>");
        expect(parts.body).toBe("<h1>Hi</h1>");
        expect(joinDocument(parts, "<h1>Bye</h1>")).toContain("<h1>Bye</h1>");
        expect(joinDocument(parts, "<h1>Bye</h1>")).toContain("<style>h1{color:red}</style>");
    });

    it("wraps fragments into a styled base document", () => {
        expect(isFullDocument("<p>clue</p>")).toBe(false);
        const wrapped = wrapFragment("<p>clue</p>", "Clue");
        expect(wrapped).toContain("<!doctype html>");
        expect(wrapped).toContain("<title>Clue</title>");
        expect(wrapped).toContain("<p>clue</p>");
        expect(splitDocument(wrapped).body).toContain("<p>clue</p>");
    });
});

describe("template quality", () => {
    it("every page template is a complete, self-contained styled document", () => {
        for (const t of PAGE_TEMPLATES) {
            const made = t.make();
            expect(made.content, t.id).toContain("<!doctype html>");
            expect(made.content, t.id).toContain("<style>");
            expect(made.content, t.id).toContain("</html>");
            // No external requests: the game's web views have no internet.
            expect(made.content, t.id).not.toMatch(/https?:\/\//);
        }
        for (const s of SITE_TEMPLATES) {
            const made = s.make();
            expect(made.pages.length, s.id).toBeGreaterThan(0);
        }
    });
});

describe("website builder dialog", () => {
    it("walks from no sites to a hidden clue page", async () => {
        const user = userEvent.setup();
        render(<WebsiteBuilderDialog open onOpenChange={() => {}} />);

        expect(screen.getByText("No websites yet.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /blank website/i }));

        expect(screen.getByLabelText("Site host")).toHaveValue("example.net");

        // Add a ready-made hidden clue page.
        await user.click(screen.getByRole("button", { name: "New page" }));
        await user.click(screen.getByRole("button", { name: /hidden internal memo/i }));

        const site = useEditor.getState().project.websites[0];
        const hidden = site.pages.find((p) => p.path === "/files/internal/q3-audit")!;
        expect(hidden.seo).toBe(false);
        expect(hidden.template).toBe("hidden-leak");

        const listing = screen.getByRole("switch");
        expect(listing).not.toBeChecked();

        // The visual editor is an iframe running the page's own document.
        const visual = screen.getByTitle("Visual editor for /files/internal/q3-audit");
        expect(visual.getAttribute("srcdoc")).toContain("INTERNAL — DO NOT DISTRIBUTE");

        // The preview shows the in-game browser with the hidden-page banner.
        await user.click(screen.getByRole("button", { name: "preview" }));
        expect(screen.getByText(/not in search results/i)).toBeInTheDocument();
        expect(screen.getAllByText(/example\.net\/files\/internal\/q3-audit/).length).toBeGreaterThan(0);
        const preview = screen.getByTitle("Page preview");
        expect(preview.getAttribute("srcdoc")).toContain("router 10.9.4.2");

        // Flip it listed and the banner goes away.
        await user.click(screen.getByRole("button", { name: "visual" }));
        await user.click(screen.getByRole("switch"));
        expect(useEditor.getState().project.websites[0].pages.find((p) => p.id === hidden.id)!.seo).toBe(true);
    });

    it("offers whole-site templates on the empty state", async () => {
        const user = userEvent.setup();
        render(<WebsiteBuilderDialog open onOpenChange={() => {}} />);

        const corp = screen.getByRole("button", { name: /corporate site/i });
        expect(corp).toBeInTheDocument();
        expect(screen.getByText(/hidden internal memo/i)).toBeInTheDocument();
        expect(screen.getByText(/5 pages · 1 hidden/)).toBeInTheDocument();

        await user.click(corp);

        const site = useEditor.getState().project.websites[0];
        expect(site.host).toBe("meridian-capital.net");
        expect(site.pages).toHaveLength(5);
        expect(site.pages.filter((p) => !p.seo)).toHaveLength(1);
        expect(site.pages.find((p) => !p.seo)!.path).toBe("/files/internal/q3-audit");
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

    it("code view exposes the full document for copy-paste", async () => {
        const user = userEvent.setup();
        const site = createWebsite();
        act(() => useEditor.getState().addWebsite(site));

        render(<WebsiteBuilderDialog open onOpenChange={() => {}} />);
        await user.click(screen.getByRole("button", { name: "code" }));

        const code = screen.getByLabelText("HTML code for /") as HTMLTextAreaElement;
        expect(code.value).toContain("<style>");

        await user.type(code, "<!-- planted clue: 74 68 65 -->");
        expect(useEditor.getState().project.websites[0].pages[0].content).toContain("planted clue");
    });

    it("loads a finished html file, wrapping bare fragments", async () => {
        const user = userEvent.setup();
        const site = createWebsite();
        act(() => useEditor.getState().addWebsite(site));

        render(<WebsiteBuilderDialog open onOpenChange={() => {}} />);

        const full = new File(
            ["<!doctype html><html><head><style>body{background:#000}</style></head><body><h1>leak</h1></body></html>"],
            "leak.html",
            { type: "text/html" },
        );
        await user.upload(screen.getByLabelText("Load HTML file"), full);
        expect(useEditor.getState().project.websites[0].pages[0].content).toContain("<h1>leak</h1>");

        const fragment = new File(["<p>just a body</p>"], "body.html", { type: "text/html" });
        await user.upload(screen.getByLabelText("Load HTML file"), fragment);
        const content = useEditor.getState().project.websites[0].pages[0].content;
        expect(content).toContain("<!doctype html>");
        expect(content).toContain("<p>just a body</p>");
    });
});

describe("visual and code editors in isolation", () => {
    it("visual editor is an isolated iframe with a toolbar and image inserter", () => {
        render(
            <VisualPageEditor doc="<p>y</p>" onChange={() => {}} ariaLabel="Visual editor for /" />,
        );
        const frame = screen.getByTitle("Visual editor for /");
        expect(frame.getAttribute("srcdoc")).toBe("<p>y</p>");
        expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
        expect(screen.getByLabelText("Image file to insert")).toBeInTheDocument();
        expect(screen.getByText(/images are embedded/)).toBeInTheDocument();
    });

    it("code editor is a plain textarea over the document", async () => {
        const user = userEvent.setup();
        function Harness() {
            const [value, setValue] = useState("<p>a</p>");
            return <CodePageEditor doc={value} onChange={setValue} ariaLabel="code" />;
        }
        render(<Harness />);
        const code = screen.getByLabelText("code") as HTMLTextAreaElement;
        await user.type(code, "more");
        expect(code.value).toBe("<p>a</p>more");
    });
});
