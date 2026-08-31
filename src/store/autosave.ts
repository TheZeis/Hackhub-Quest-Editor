/**
 * Autosave to localStorage.
 *
 * The project document is the single source of truth, so persistence is a
 * debounced write of that one object. Anything unparseable on load is discarded
 * rather than half-applied — a corrupt draft must never wedge the editor.
 */
import { ProjectSchema, type ProjectDocument } from "@/schema/project";
import { PROJECT_SCHEMA_VERSION } from "@/schema/common";
import { useEditor } from "./editor";

const KEY = "hackhub-quest-editor:draft:v1";
const DEBOUNCE_MS = 600;

export function loadDraft(): ProjectDocument | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        const result = ProjectSchema.safeParse(parsed);
        if (!result.success) {
            console.warn("[quest-editor] discarded an invalid draft:", result.error.issues);
            return null;
        }
        if (result.data.schemaVersion !== PROJECT_SCHEMA_VERSION) {
            console.warn(
                `[quest-editor] draft schema v${result.data.schemaVersion} ≠ current v${PROJECT_SCHEMA_VERSION}; discarded.`,
            );
            return null;
        }
        return result.data;
    } catch (error) {
        console.warn("[quest-editor] could not read draft:", error);
        return null;
    }
}

export function saveDraft(project: ProjectDocument): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(project));
    } catch (error) {
        // Quota exceeded or storage disabled — the editor keeps working in memory.
        console.warn("[quest-editor] autosave failed:", error);
    }
}

export function clearDraft(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* nothing to do */
    }
}

/** Hydrate on mount, then persist on every change. Returns a disposer. */
export function startAutosave(): () => void {
    const draft = loadDraft();
    if (draft) {
        useEditor.getState().load(draft, { clearHistory: true });
    }
    useEditor.getState().markHydrated();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useEditor.subscribe((state, previous) => {
        if (state.project === previous.project) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => saveDraft(state.project), DEBOUNCE_MS);
    });

    return () => {
        unsubscribe();
        if (timer) clearTimeout(timer);
        // Flush whatever is pending so a reload right after an edit keeps it.
        saveDraft(useEditor.getState().project);
    };
}
