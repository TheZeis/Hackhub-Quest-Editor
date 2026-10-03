import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { GraphNode, type GraphRFNode } from "@/editor/canvas/GraphNode";
import { QuestCanvas } from "@/editor/canvas/QuestCanvas";
import { InspectorPanel } from "@/editor/inspector/InspectorPanel";
import { NodePalette } from "@/editor/palette/NodePalette";
import { SettingsDialog } from "@/editor/shell/SettingsDialog";
import { StatusBar } from "@/editor/shell/StatusBar";
import { TopBar } from "@/editor/shell/TopBar";
import type { ProjectDocument } from "@/schema/project";
import { useEditor } from "@/store/editor";
import { buildFirstContact } from "@/templates/firstContact";
import { isFigureSceneId, SCENE_CATALOGUE, type FigureSceneId } from "./catalogue";
import "@/index.css";
import "./manual-figures.css";

function activeQuest(project: ProjectDocument) {
    const quest = project.quests.find((item) => item.id === project.editor.activeQuestId);
    if (!quest) throw new Error("The First Contact figure fixture has no active quest.");
    return quest;
}

function objectiveId(project: ProjectDocument): string {
    const objective = activeQuest(project).graph.nodes.find((node) => node.type === "objective");
    if (!objective) throw new Error("The First Contact figure fixture has no Objective node.");
    return objective.id;
}

function firstContactFixture(): ProjectDocument {
    const project = buildFirstContact();
    const quest = activeQuest(project);
    project.editor.viewports = {
        [quest.id]: { x: 0, y: 0, zoom: 0.48 },
    };
    return project;
}

function pairFixture(
    withWire: boolean,
    positions: { triggerX?: number; objectiveX?: number; y?: number } = {},
): ProjectDocument {
    const project = buildFirstContact();
    const quest = activeQuest(project);
    const objective = quest.graph.nodes.find((node) => node.type === "objective");
    const trigger = quest.graph.nodes.find((node) => node.type === "trigger.event");
    if (!objective || !trigger) throw new Error("The First Contact figure fixture is missing its trigger/objective pair.");

    const y = positions.y ?? 170;
    trigger.position = { x: positions.triggerX ?? 80, y };
    objective.position = { x: positions.objectiveX ?? 460, y };
    const condition = quest.graph.edges.find(
        (edge) => edge.kind === "condition" && edge.source === trigger.id && edge.target === objective.id,
    );
    quest.graph.nodes = [trigger, objective];
    quest.graph.edges = withWire && condition ? [condition] : [];
    project.editor.viewports = {
        [quest.id]: { x: 0, y: 0, zoom: 0.84 },
    };
    return project;
}

function installFixture(project: ProjectDocument, selectedNodeId?: string): void {
    const store = useEditor.getState();
    store.load(project, { clearHistory: true });
    store.select({ nodeIds: selectedNodeId ? [selectedNodeId] : [], edgeIds: [] });
}

function InspectorScene() {
    return (
        <main className="figure-root">
            <aside className="figure-inspector-panel">
                <InspectorPanel />
            </aside>
        </main>
    );
}

function WorkspaceScene({ settingsOpen = false }: { settingsOpen?: boolean }) {
    return (
        <ReactFlowProvider>
            <div className="figure-root figure-workspace">
                <TopBar />
                <main className="figure-workspace__main">
                    <NodePalette />
                    <section className="figure-workspace__canvas" aria-label="Quest canvas">
                        <QuestCanvas />
                    </section>
                    <aside className="figure-workspace__inspector" aria-label="Inspector">
                        <InspectorPanel />
                    </aside>
                </main>
                <StatusBar />
                {settingsOpen && <SettingsDialog open onOpenChange={() => {}} />}
            </div>
        </ReactFlowProvider>
    );
}

function HowToCanvasScene() {
    return (
        <ReactFlowProvider>
            <main className="figure-root figure-canvas">
                <QuestCanvas />
            </main>
        </ReactFlowProvider>
    );
}

function DragWireScene() {
    const quest = activeQuest(useEditor.getState().project);
    const nodes: GraphRFNode[] = quest.graph.nodes.map((doc) => ({
        id: doc.id,
        type: "qe",
        position: doc.position,
        data: { doc },
        draggable: false,
        selectable: false,
    }));

    return (
        <ReactFlowProvider>
            <main className="figure-root figure-drag-stage">
                <ReactFlow
                    nodes={nodes}
                    edges={[]}
                    nodeTypes={{ qe: GraphNode }}
                    defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                    fitView={false}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnDrag={false}
                    panOnScroll={false}
                    zoomOnScroll={false}
                    zoomOnDoubleClick={false}
                    proOptions={{ hideAttribution: true }}
                />
                <svg
                    className="figure-drag-wire"
                    viewBox="0 0 900 520"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <path
                        d="M 320 209 C 384 209 452 275 540 209"
                        fill="none"
                        stroke="var(--color-cat-trigger)"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <circle cx="540" cy="209" r="7" fill="var(--color-canvas)" stroke="var(--color-cat-trigger)" strokeWidth="3" />
                    <path
                        d="M 550 201 L 560 193 L 558 207 L 554 204 L 551 211 Z"
                        fill="var(--color-ink)"
                        stroke="var(--color-canvas)"
                        strokeWidth="1"
                        strokeLinejoin="round"
                    />
                </svg>
                <div className="figure-drag-label" aria-hidden="true">
                    Fixed mid-drag illustration
                </div>
            </main>
        </ReactFlowProvider>
    );
}

function SceneErrorFallback() {
    return (
        <main className="figure-root flex items-center justify-center p-6">
            <div className="max-w-sm rounded-lg border border-line bg-surface p-5 text-ink">
                <h1 className="text-sm font-semibold">This illustration could not load.</h1>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">
                    The surrounding manual page still contains the written explanation and caption.
                </p>
            </div>
        </main>
    );
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    override state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    override render() {
        return this.state.failed ? <SceneErrorFallback /> : this.props.children;
    }
}

function MissingScene({ requested }: { requested: string }) {
    return (
        <main className="figure-root flex items-center justify-center p-6">
            <div className="max-w-sm rounded-lg border border-warn/40 bg-surface p-5 text-ink">
                <h1 className="text-sm font-semibold">Illustration not found</h1>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">
                    “{requested || "(no scene id)"}” is not in the local scene catalogue.
                </p>
            </div>
        </main>
    );
}

function renderScene(sceneId: FigureSceneId) {
    switch (sceneId) {
        case "node-objective-inspector": {
            const project = firstContactFixture();
            installFixture(project, objectiveId(project));
            return <InspectorScene />;
        }
        case "howto-wired-canvas": {
            installFixture(pairFixture(true));
            return <HowToCanvasScene />;
        }
        case "settings-panel": {
            const project = firstContactFixture();
            installFixture(project, objectiveId(project));
            return <WorkspaceScene settingsOpen />;
        }
        case "tour-workspace": {
            const project = firstContactFixture();
            installFixture(project, objectiveId(project));
            return <WorkspaceScene />;
        }
        case "tutorial-drag-wire": {
            installFixture(pairFixture(false, { objectiveX: 540 }));
            return <DragWireScene />;
        }
    }
}

const container = document.getElementById("root");
if (container) {
    const requestedScene = new URLSearchParams(window.location.search).get("scene") ?? "";
    const root = createRoot(container);
    document.documentElement.dataset.figureScene = isFigureSceneId(requestedScene) ? requestedScene : "missing";

    if (!isFigureSceneId(requestedScene)) {
        document.title = "Quest editor illustration not found";
        root.render(<MissingScene requested={requestedScene} />);
    } else {
        const scene = SCENE_CATALOGUE[requestedScene];
        document.title = `Quest editor illustration — ${scene.title}`;
        document.documentElement.dataset.figureDescription = scene.description;
        root.render(<SceneErrorBoundary>{renderScene(requestedScene)}</SceneErrorBoundary>);
    }
}
