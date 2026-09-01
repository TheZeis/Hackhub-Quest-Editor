/**
 * Step 4 export UI: the top-bar "Export mod" flow opens the compile dialog,
 * which reports permissions, contents, and offers the zip download.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ExportDialog } from "@/editor/shell/ExportDialog";
import { createProject } from "@/schema/project";
import { useEditor } from "@/store/editor";

beforeEach(() => {
    localStorage.clear();
    act(() => useEditor.getState().load(createProject(), { clearHistory: true }));
});

describe("export dialog", () => {
    it("opens from the top bar and shows what the mod contains", () => {
        // a network node forces the "network" permission into the compile
        act(() => {
            useEditor.getState().addNode("world.network", { x: 0, y: 0 });
        });
        render(<ExportDialog open onOpenChange={() => {}} />);
        expect(screen.getByText("Export mod")).toBeInTheDocument();
        expect(screen.getByText("Permissions requested")).toBeInTheDocument();
        expect(screen.getByText("network")).toBeInTheDocument();
        expect(screen.getByText("manifest.json")).toBeInTheDocument();
        expect(screen.getByText("dist/mod.js")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /download .zip/i })).toBeEnabled();
    });

    it("lists websites and hints about unlisted pages", () => {
        const p = createProject();
        p.websites.push({
            id: "wx",
            host: "hidden.example",
            name: "Hidden",
            pages: [
                { id: "hp", path: "/notes", title: "Notes", seo: false, content: "<html></html>" },
            ],
        });
        act(() => useEditor.getState().load(p, { clearHistory: true }));
        render(<ExportDialog open onOpenChange={() => {}} />);
        expect(screen.getAllByText(/hidden\.example/).length).toBeGreaterThan(0);
        expect(screen.getByText(/unlisted page/i)).toBeInTheDocument();
    });
});
