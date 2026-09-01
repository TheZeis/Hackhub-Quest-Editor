/**
 * Sharing must round-trip losslessly and reject bad files loudly — an imported
 * half-document would wedge the editor the same way a corrupt autosave would.
 */
import { describe, expect, it } from "vitest";
import { parseProjectFile, projectFileName, serializeProject } from "@/templates/share";
import { TEMPLATES } from "@/templates";
import { createProject } from "@/schema/project";

describe("serialize / parse round-trip", () => {
    it.each(TEMPLATES)("%s: round-trips through a file unchanged", (template) => {
        const project = template.build();
        const text = serializeProject(project);
        const parsed = parseProjectFile(text);
        expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
        if (parsed.ok) expect(parsed.project).toEqual(project);
    });

    it("names the file from the mod id, sanitised", () => {
        const project = createProject();
        project.mod.id = "My Cool Mod!!";
        expect(projectFileName(project)).toBe("my-cool-mod-.quest-editor.json");
    });
});

describe("parseProjectFile rejects bad input", () => {
    it("rejects non-JSON", () => {
        const result = parseProjectFile("this is not json");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/JSON/i);
    });

    it("rejects JSON that is not a project, naming the offending path", () => {
        const result = parseProjectFile(JSON.stringify({ mod: { id: 42 } }));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/problem at/i);
    });

    it("rejects a project with no quests", () => {
        const project = createProject();
        const text = serializeProject({ ...project, quests: [] });
        expect(parseProjectFile(text).ok).toBe(false);
    });
});
