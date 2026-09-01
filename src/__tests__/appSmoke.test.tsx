/**
 * Whole-app UI smoke pass: mounts the real App and walks the primary
 * surfaces (canvas, templates, dialogues, websites, export), failing on any
 * console.error/warn — that catches React crashes, Radix a11y complaints
 * (missing DialogTitle, etc.) and broken handlers in one shot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import { createProject } from "@/schema/project";
import { getTemplate } from "@/templates";
import { useEditor } from "@/store/editor";

let consoleErrors: string[] = [];

beforeEach(() => {
    localStorage.clear();
    act(() => useEditor.getState().load(createProject(), { clearHistory: true }));
    consoleErrors = [];
    vi.spyOn(console, "error").mockImplementation((...args) => {
        consoleErrors.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "warn").mockImplementation((...args) => {
        consoleErrors.push(args.map(String).join(" "));
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

const openAndClose = async (user: ReturnType<typeof userEvent.setup>, buttonName: RegExp, heading: RegExp) => {
    await user.click(screen.getByRole("button", { name: buttonName }));
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("heading", { name: heading })).not.toBeInTheDocument());
};

describe("app smoke", () => {
    it("boots and walks every top-bar surface without console noise", async () => {
        const user = userEvent.setup();
        render(<App />);

        // the canvas is up
        expect(await screen.findByRole("button", { name: /export mod/i })).toBeInTheDocument();

        await openAndClose(user, /^templates$/i, /start from a template/i);
        await openAndClose(user, /dialogues/i, /dialogue editor/i);
        await openAndClose(user, /websites/i, /website builder/i);

        // export dialog opens and reports the compile
        await user.click(screen.getByRole("button", { name: /export mod/i }));
        expect(await screen.findByRole("button", { name: /download .zip/i })).toBeInTheDocument();
        await user.keyboard("{Escape}");

        const real = consoleErrors.filter(
            (m) => !/Not implemented|Error: Could not parse CSS|jsdom/i.test(m),
        );
        expect(real, `console noise:\n${real.join("\n")}`).toEqual([]);
    });

    it("renders a loaded quest graph on the canvas and undoes edits", async () => {
        const user = userEvent.setup();
        act(() => useEditor.getState().load(getTemplate("reference")!.build(), { clearHistory: true }));
        render(<App />);

        // node cards render their plain-English summaries
        expect(await screen.findByText("Runs once, when the quest begins")).toBeInTheDocument();
        expect(screen.getByText("Runs on claim and after every reload")).toBeInTheDocument();

        // an edit lands on the canvas, Ctrl+Z takes it back
        const before = useEditor.getState().project.quests[0].graph.nodes.length;
        act(() => { useEditor.getState().addNode("fx.notify", { x: 0, y: 0 }); });
        expect(useEditor.getState().project.quests[0].graph.nodes.length).toBe(before + 1);
        await user.keyboard("{Control>}z{/Control}");
        await waitFor(() =>
            expect(useEditor.getState().project.quests[0].graph.nodes.length).toBe(before),
        );

        const real = consoleErrors.filter(
            (m) => !/Not implemented|Error: Could not parse CSS|jsdom/i.test(m),
        );
        expect(real, `console noise:\n${real.join("\n")}`).toEqual([]);
    });
});
