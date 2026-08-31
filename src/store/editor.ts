/**
 * The editor store.
 *
 * One serialisable `ProjectDocument` is the only source of truth (docs/01 §4.2).
 * Every mutation goes through `mutate()`, which snapshots for undo/redo unless the
 * caller opts out — dragging and viewport moves opt out and commit once at the end
 * so a single drag is a single undo step.
 */
import { create } from "zustand";
import { original, produce } from "immer";
import { nanoid } from "nanoid";
import type { ProjectDocument, QuestDoc, ModDoc } from "@/schema/project";
import type { NodeDoc } from "@/schema/nodes";
import type { EdgeDoc } from "@/schema/edges";
import { ProjectSchema, createProject, createQuest } from "@/schema/project";
import { nodeTypeDef } from "@/schema/registry";
import { canConnect, type EdgeKind } from "@/schema/edges";
import type { NodeType } from "@/schema/nodes";
import type { Position, Viewport } from "@/schema/common";

const HISTORY_LIMIT = 120;

export type ToastTone = "info" | "ok" | "warn" | "danger";

export interface Selection {
    nodeIds: string[];
    edgeIds: string[];
}

export interface UiState {
    inspectorCollapsed: boolean;
    paletteCollapsed: boolean;
    /** Set while a modal (templates, export, settings) is open. */
    modal: null | "templates" | "mod" | "shortcuts";
    toast: { id: string; message: string; tone: ToastTone } | null;
}

export interface EditorStore {
    project: ProjectDocument;
    selection: Selection;
    ui: UiState;
    past: ProjectDocument[];
    future: ProjectDocument[];
    hydrated: boolean;
    /** A snapshot taken on drag start, committed on drag end. */
    pendingSnapshot: ProjectDocument | null;

    /* lifecycle */
    load: (project: ProjectDocument, opts?: { clearHistory?: boolean }) => void;
    reset: () => void;
    markHydrated: () => void;

    /* history */
    undo: () => void;
    redo: () => void;
    beginTransient: () => void;
    commitTransient: () => void;

    /* mod */
    updateMod: (patch: Partial<ModDoc>) => void;

    /* quests */
    addQuest: (partial?: Partial<QuestDoc>) => string;
    removeQuest: (id: string) => void;
    duplicateQuest: (id: string) => string | null;
    setActiveQuest: (id: string) => void;
    updateQuest: (id: string, patch: Partial<Omit<QuestDoc, "graph">>) => void;
    setViewport: (questId: string, viewport: Viewport) => void;

    /* nodes */
    addNode: (type: NodeType, position: Position) => string | null;
    updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
    setNodePosition: (nodeId: string, position: Position) => void;
    setNodePositions: (positions: Record<string, Position>) => void;
    removeNodes: (ids: string[]) => void;

    /* edges */
    connect: (edge: {
        source: string;
        sourceHandle: string;
        target: string;
        targetHandle: string;
    }) => boolean;
    removeEdges: (ids: string[]) => void;

    /* ui */
    select: (selection: Selection) => void;
    setUi: (patch: Partial<UiState>) => void;
    toast: (message: string, tone?: ToastTone) => void;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function clone<T>(value: T): T {
    return structuredClone(value);
}

function activeQuestOf(project: ProjectDocument): QuestDoc | undefined {
    return project.quests.find((q) => q.id === project.editor.activeQuestId);
}

/**
 * Write a possibly-nested key such as `attachment.name` or `messages.2.content`.
 * Intermediate containers are created as an array when the next segment is a
 * numeric index, so list editors can address rows by position.
 */
export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split(".");
    let cursor: Record<string, unknown> = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const existing = cursor[key];
        if (typeof existing !== "object" || existing === null) {
            cursor[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
        }
        cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = value;
}

/** Read a possibly-nested key. Returns `undefined` when any segment is missing. */
export function getPath(source: unknown, path: string): unknown {
    let cursor: unknown = source;
    for (const part of path.split(".")) {
        if (typeof cursor !== "object" || cursor === null) return undefined;
        cursor = (cursor as Record<string, unknown>)[part];
    }
    return cursor;
}

/* ── store ───────────────────────────────────────────────────────────────── */

export const useEditor = create<EditorStore>()((set, get) => {
    /** Apply a recipe to the project, snapshotting for undo unless told not to. */
    const mutate = (
        recipe: (project: ProjectDocument) => void,
        opts: { history?: boolean } = {},
    ) => {
        set(
            produce((state: EditorStore) => {
                if (opts.history !== false) {
                    const base = original(state)?.project ?? state.project;
                    state.past.push(clone(base));
                    if (state.past.length > HISTORY_LIMIT) state.past.shift();
                    state.future = [];
                }
                recipe(state.project);
            }),
        );
    };

    return {
        project: createProject(),
        selection: { nodeIds: [], edgeIds: [] },
        ui: { inspectorCollapsed: false, paletteCollapsed: false, modal: null, toast: null },
        past: [],
        future: [],
        hydrated: false,
        pendingSnapshot: null,

        load: (project, opts) =>
            set(
                produce((state: EditorStore) => {
                    state.project = ProjectSchema.parse(project);
                    if (opts?.clearHistory !== false) {
                        state.past = [];
                        state.future = [];
                    }
                    state.selection = { nodeIds: [], edgeIds: [] };
                }),
            ),

        reset: () =>
            set(
                produce((state: EditorStore) => {
                    state.project = createProject();
                    state.past = [];
                    state.future = [];
                    state.selection = { nodeIds: [], edgeIds: [] };
                }),
            ),

        markHydrated: () => set({ hydrated: true }),

        undo: () =>
            set(
                produce((state: EditorStore) => {
                    const previous = state.past.pop();
                    if (!previous) return;
                    // `original()` first: structuredClone cannot handle an immer
                    // draft proxy, and inside `produce` that is what state is.
                    state.future.push(clone(original(state)!.project));
                    state.project = previous;
                    state.selection = { nodeIds: [], edgeIds: [] };
                }),
            ),

        redo: () =>
            set(
                produce((state: EditorStore) => {
                    const next = state.future.pop();
                    if (!next) return;
                    state.past.push(clone(original(state)!.project));
                    state.project = next;
                    state.selection = { nodeIds: [], edgeIds: [] };
                }),
            ),

        beginTransient: () => set({ pendingSnapshot: clone(get().project) }),

        commitTransient: () =>
            set(
                produce((state: EditorStore) => {
                    if (!state.pendingSnapshot) return;
                    state.past.push(state.pendingSnapshot);
                    if (state.past.length > HISTORY_LIMIT) state.past.shift();
                    state.future = [];
                    state.pendingSnapshot = null;
                }),
            ),

        updateMod: (patch) => mutate((project) => Object.assign(project.mod, patch)),

        addQuest: (partial) => {
            const quest = createQuest(partial);
            mutate((project) => {
                project.quests.push(quest);
                project.editor.activeQuestId = quest.id;
            });
            return quest.id;
        },

        removeQuest: (id) => {
            const project = get().project;
            if (project.quests.length <= 1) {
                get().toast("A mod needs at least one quest.", "warn");
                return;
            }
            mutate((next) => {
                next.quests = next.quests.filter((q) => q.id !== id);
                if (next.editor.activeQuestId === id) {
                    next.editor.activeQuestId = next.quests[0]!.id;
                }
            });
        },

        duplicateQuest: (id) => {
            const source = get().project.quests.find((q) => q.id === id);
            if (!source) return null;
            const copy: QuestDoc = clone(source);
            // Re-key every node and edge so the copy is fully independent, and
            // rewire edges to the new node ids.
            const idMap = new Map<string, string>();
            copy.id = nanoid(10);
            copy.name = `${source.name}Copy`;
            copy.title = `${source.title} (copy)`;
            copy.graph.nodes = copy.graph.nodes.map((n) => {
                const next = nanoid(10);
                idMap.set(n.id, next);
                return { ...n, id: next, position: { x: n.position.x + 48, y: n.position.y + 48 } };
            });
            copy.graph.edges = copy.graph.edges
                .filter((e) => idMap.has(e.source) && idMap.has(e.target))
                .map((e) => ({
                    ...e,
                    id: nanoid(10),
                    source: idMap.get(e.source)!,
                    target: idMap.get(e.target)!,
                }));
            mutate((project) => {
                project.quests.push(copy);
                project.editor.activeQuestId = copy.id;
            });
            return copy.id;
        },

        setActiveQuest: (id) =>
            mutate((project) => {
                project.editor.activeQuestId = id;
            }, { history: false }),

        updateQuest: (id, patch) =>
            mutate((project) => {
                const quest = project.quests.find((q) => q.id === id);
                if (quest) Object.assign(quest, patch);
            }),

        setViewport: (questId, viewport) =>
            mutate((project) => {
                project.editor.viewports[questId] = viewport;
            }, { history: false }),

        addNode: (type, position) => {
            const quest = activeQuestOf(get().project);
            if (!quest) return null;
            const def = nodeTypeDef(type);
            const id = nanoid(10);
            const node = { id, type, position, data: def.create() } as unknown as NodeDoc;
            mutate((project) => {
                const q = project.quests.find((x) => x.id === quest.id);
                q?.graph.nodes.push(node);
            });
            set({ selection: { nodeIds: [id], edgeIds: [] } });
            return id;
        },

        updateNodeData: (nodeId, patch) =>
            mutate((project) => {
                const quest = project.quests.find((q) => q.id === project.editor.activeQuestId);
                const node = quest?.graph.nodes.find((n) => n.id === nodeId);
                if (!node) return;
                for (const [path, value] of Object.entries(patch)) {
                    setPath(node.data as unknown as Record<string, unknown>, path, value);
                }
            }),

        setNodePosition: (nodeId, position) =>
            mutate((project) => {
                const quest = project.quests.find((q) => q.id === project.editor.activeQuestId);
                const node = quest?.graph.nodes.find((n) => n.id === nodeId);
                if (node) node.position = position;
            }, { history: false }),

        setNodePositions: (positions) =>
            mutate((project) => {
                const quest = project.quests.find((q) => q.id === project.editor.activeQuestId);
                if (!quest) return;
                for (const node of quest.graph.nodes) {
                    const next = positions[node.id];
                    if (next) node.position = next;
                }
            }, { history: false }),

        removeNodes: (ids) =>
            mutate((project) => {
                const quest = project.quests.find((q) => q.id === project.editor.activeQuestId);
                if (!quest) return;
                const doomed = new Set(ids);
                quest.graph.nodes = quest.graph.nodes.filter((n) => !doomed.has(n.id));
                quest.graph.edges = quest.graph.edges.filter(
                    (e) => !doomed.has(e.source) && !doomed.has(e.target),
                );
            }),

        connect: ({ source, sourceHandle, target, targetHandle }) => {
            const project = get().project;
            const quest = project.quests.find((q) => q.id === project.editor.activeQuestId);
            if (!quest) return false;
            if (source === target) return false;

            const sourceNode = quest.graph.nodes.find((n) => n.id === source);
            const targetNode = quest.graph.nodes.find((n) => n.id === target);
            if (!sourceNode || !targetNode) return false;

            const sourceKind = nodeTypeDef(sourceNode.type).sources.find(
                (h) => h.id === sourceHandle,
            )?.kind;
            const targetKind = nodeTypeDef(targetNode.type).targets.find(
                (h) => h.id === targetHandle,
            )?.kind;
            if (!canConnect(sourceKind as EdgeKind | undefined, targetKind as EdgeKind | undefined)) {
                return false;
            }

            const duplicate = quest.graph.edges.some(
                (e) =>
                    e.source === source &&
                    e.sourceHandle === sourceHandle &&
                    e.target === target &&
                    e.targetHandle === targetHandle,
            );
            if (duplicate) return false;

            const edge: EdgeDoc = {
                id: nanoid(10),
                source,
                sourceHandle,
                target,
                targetHandle,
                kind: sourceKind as EdgeKind,
            };
            mutate((p) => {
                const q = p.quests.find((x) => x.id === quest.id);
                q?.graph.edges.push(edge);
            });
            return true;
        },

        removeEdges: (ids) =>
            mutate((project) => {
                const quest = project.quests.find((q) => q.id === project.editor.activeQuestId);
                if (!quest) return;
                const doomed = new Set(ids);
                quest.graph.edges = quest.graph.edges.filter((e) => !doomed.has(e.id));
            }),

        select: (selection) => set({ selection }),
        setUi: (patch) => set((state) => ({ ui: { ...state.ui, ...patch } })),
        toast: (message, tone = "info") =>
            set({ ui: { ...get().ui, toast: { id: nanoid(6), message, tone } } }),
    };
});

/* ── selectors ───────────────────────────────────────────────────────────── */

export const selectProject = (s: EditorStore) => s.project;
export const selectActiveQuest = (s: EditorStore) =>
    s.project.quests.find((q) => q.id === s.project.editor.activeQuestId) ?? null;
export const selectActiveGraph = (s: EditorStore) => selectActiveQuest(s)?.graph ?? { nodes: [], edges: [] };
export const selectCanUndo = (s: EditorStore) => s.past.length > 0;
export const selectCanRedo = (s: EditorStore) => s.future.length > 0;
export const selectSelectedNode = (s: EditorStore) => {
    const id = s.selection.nodeIds[0];
    if (!id) return null;
    return selectActiveGraph(s).nodes.find((n) => n.id === id) ?? null;
};
