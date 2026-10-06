import { Component, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlow, ReactFlowProvider, ViewportPortal } from "@xyflow/react";
import reconNgPack from "../../reference/reconng/toolpack.json";
import { GraphNode, type GraphRFNode } from "@/editor/canvas/GraphNode";
import { QuestCanvas } from "@/editor/canvas/QuestCanvas";
import { InspectorPanel } from "@/editor/inspector/InspectorPanel";
import { FloatingInspector } from "@/editor/inspector/FloatingInspector";
import { floatInspector, setInspectorFloatRect } from "@/editor/inspector/drawerLayout";
import { NodePalette } from "@/editor/palette/NodePalette";
import { Overlays } from "@/editor/shell/Overlays";
import { StatusBar } from "@/editor/shell/StatusBar";
import { TopBar } from "@/editor/shell/TopBar";
import type { ProjectDocument } from "@/schema/project";
import { createProject, createQuest } from "@/schema/project";
import type { NodeDoc, NodeType } from "@/schema/nodes";
import type { NetworkDevice, NetworkPort } from "@/schema/common";
import { useEditor } from "@/store/editor";
import { usePacks } from "@/store/packs";
import { buildFirstContact } from "@/templates/firstContact";
import { buildDataGrab } from "@/templates/harbourManifest";
import { buildByline } from "@/templates/byline";
import { buildHelpDeskLeak } from "@/templates/helpDeskLeak";
import { buildColdCall } from "@/templates/coldCall";
import { buildReference, EXAMPLES } from "@/templates/reference";
import { makeEdge, makeNode, resetIds } from "@/templates/kit";
import { isFigureSceneId, RENDERER_SCENE_CATALOGUE, type FigureScene } from "./catalogue";
import "@/index.css";
import "./manual-figures.css";

function activeQuest(project: ProjectDocument) {
    const quest = project.quests.find((item) => item.id === project.editor.activeQuestId);
    if (!quest) throw new Error("The manual figure fixture has no active quest.");
    return quest;
}

function objectiveId(project: ProjectDocument): string {
    const objective = activeQuest(project).graph.nodes.find((node) => node.type === "objective");
    if (!objective) throw new Error("The First Contact figure fixture has no Objective node.");
    return objective.id;
}

function selectedNodeId(project: ProjectDocument, type: NodeType): string {
    const node = activeQuest(project).graph.nodes.find((item) => item.type === type);
    if (!node) throw new Error(`The manual figure fixture has no ${type} node to select.`);
    return node.id;
}

function firstContactFixture(): ProjectDocument {
    const project = buildFirstContact();
    const quest = activeQuest(project);
    project.editor.viewports = { [quest.id]: { x: 0, y: 0, zoom: 0.48 } };
    return project;
}

function pairFixture(withWire: boolean, positions: { triggerX?: number; objectiveX?: number; y?: number } = {}): ProjectDocument {
    const project = buildFirstContact();
    const quest = activeQuest(project);
    const objective = quest.graph.nodes.find((node) => node.type === "objective");
    const trigger = quest.graph.nodes.find((node) => node.type === "trigger.event");
    if (!objective || !trigger) throw new Error("The First Contact fixture is missing its trigger/objective pair.");

    const y = positions.y ?? 170;
    trigger.position = { x: positions.triggerX ?? 80, y };
    objective.position = { x: positions.objectiveX ?? 460, y };
    const condition = quest.graph.edges.find(
        (edge) => edge.kind === "condition" && edge.source === trigger.id && edge.target === objective.id,
    );
    quest.graph.nodes = [trigger, objective];
    quest.graph.edges = withWire && condition ? [condition] : [];
    project.editor.viewports = { [quest.id]: { x: 0, y: 0, zoom: 0.84 } };
    return project;
}

function exampleNode(type: NodeType, position: { x: number; y: number }, patch: Record<string, unknown> = {}): NodeDoc {
    const example = EXAMPLES[type] ? structuredClone(EXAMPLES[type]!) : {};
    return makeNode(type, position, { ...example, ...patch });
}

function phoneBranch(id: string, name: string, speaker: string, first: string, second: string) {
    return {
        id,
        name,
        lines: [
            { id: `${id}-line-1`, speaker, text: first, isEnd: false, options: [] },
            { id: `${id}-line-2`, speaker, text: second, isEnd: true, options: [] },
        ],
    };
}

function emptyGraphProject(title = "Manual figure example"): ProjectDocument {
    const quest = createQuest({
        id: "q-manual-figure",
        name: "ManualFigure",
        title,
        autoStart: true,
    });
    return createProject({
        mod: {
            id: "manual-figure",
            name: "Manual figure",
            version: "1.0.0",
            author: "",
            description: "A fixed editor illustration example.",
            tags: [],
            dependencies: [],
            minSdkVersion: "0.21.0",
            apiVersion: 2,
        },
        quests: [quest],
        editor: { activeQuestId: quest.id, viewports: {} },
    });
}

function projectWithGraph(nodes: NodeDoc[], edges: ReturnType<typeof makeEdge>[], dialog: ProjectDocument["quests"][number]["dialog"] = []): ProjectDocument {
    const project = emptyGraphProject();
    const quest = activeQuest(project);
    quest.graph = { nodes, edges };
    quest.dialog = dialog;
    return project;
}

function phoneMessageFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 190 });
    const phone = makeNode("comms.dialogue", { x: 340, y: 190 }, {
        kind: "phone",
        phone: { branch: "default", startIndex: 0, continueMode: "onEnd" },
    });
    const next = makeNode("fx.notify", { x: 720, y: 190 }, {
        message: "The next story beat begins after the call ends.",
        variant: "toast",
        tone: "info",
    });
    const dialog = [phoneBranch(
        "briefing-call",
        "default",
        "Marta Voss",
        "I need you to look into a name for me.",
        "Start with the public record. I will wait for your reply.",
    )];
    return projectWithGraph([start, phone, next], [
        makeEdge(start, "out", phone, "in"),
        makeEdge(phone, "out", next, "in"),
    ], dialog);
}

function eventBranchDialogueFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 220 });
    const trigger = exampleNode("trigger.event", { x: 60, y: 30 }, {
        event: "Terminal.SSH.FileDownload",
        conditions: [{ id: "event-condition", join: "and", field: "name", op: "contains", value: "manifest" }],
    });
    const branch = exampleNode("flow.branch", { x: 360, y: 220 }, {
        source: "event",
        conditions: [{ id: "branch-condition", join: "and", field: "name", op: "contains", value: "manifest" }],
    });
    const yes = makeNode("comms.dialogue", { x: 720, y: 80 }, {
        kind: "phone",
        phone: { branch: "default", startIndex: 0, continueMode: "onEnd" },
    });
    const no = makeNode("fx.notify", { x: 720, y: 390 }, {
        message: "No matching file was found.",
        variant: "toast",
        tone: "info",
    });
    const dialog = [phoneBranch(
        "manifest-call",
        "default",
        "Marta Voss",
        "The manifest is ready. Take a copy, then tell me what you found.",
        "Do not remove the original file.",
    )];
    return projectWithGraph([start, trigger, branch, yes, no], [
        makeEdge(start, "out", branch, "in"),
        makeEdge(trigger, "when", branch, "trigger"),
        makeEdge(branch, "true", yes, "in"),
        makeEdge(branch, "false", no, "in"),
    ], dialog);
}

function paymentFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 180 });
    const payment = exampleNode("fx.pay", { x: 350, y: 180 }, {
        amount: 100,
        description: "Job payment",
        fromName: "A. Lindqvist",
    });
    const next = makeNode("fx.notify", { x: 720, y: 180 }, {
        message: "Payment sent.",
        variant: "toast",
        tone: "success",
    });
    return projectWithGraph([start, payment, next], [
        makeEdge(start, "out", payment, "in"),
        makeEdge(payment, "out", next, "in"),
    ]);
}

function branchMergeFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 220 });
    const trigger = exampleNode("trigger.event", { x: 80, y: 20 }, {
        event: "Terminal.SSH.FileDownload",
        conditions: [{ id: "event-condition", join: "and", field: "name", op: "contains", value: "manifest" }],
    });
    const branch = exampleNode("flow.branch", { x: 350, y: 220 }, {
        source: "event",
        conditions: [{ id: "branch-condition", join: "and", field: "name", op: "contains", value: "manifest" }],
    });
    const quiet = exampleNode("fx.setData", { x: 670, y: 60 }, { key: "route", value: "quiet" });
    const alarm = exampleNode("fx.setData", { x: 670, y: 390 }, { key: "route", value: "alarm" });
    const shared = exampleNode("fx.pay", { x: 1010, y: 220 }, { amount: 100, description: "Contract payment", fromName: "M. Voss" });
    const finish = makeNode("fx.notify", { x: 1350, y: 220 }, {
        message: "Both routes meet at the same closing beat.",
        variant: "toast",
        tone: "success",
    });
    return projectWithGraph([start, trigger, branch, quiet, alarm, shared, finish], [
        makeEdge(start, "out", branch, "in"),
        makeEdge(trigger, "when", branch, "trigger"),
        makeEdge(branch, "true", quiet, "in"),
        makeEdge(branch, "false", alarm, "in"),
        makeEdge(quiet, "out", shared, "in"),
        makeEdge(alarm, "out", shared, "in"),
        makeEdge(shared, "out", finish, "in"),
    ]);
}

function passphraseFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 240 });
    const prompt = exampleNode("fx.prompt", { x: 350, y: 240 }, {
        title: "Archive check",
        label: "Enter the passphrase:",
        placeholder: "MSKU-4471",
        defaultValue: "",
        password: true,
        storeAs: "",
        matchMode: "exact",
        expected: "MSKU-4471",
        caseSensitive: false,
    });
    const correct = makeNode("fx.notify", { x: 760, y: 40 }, { message: "Correct passphrase.", variant: "toast", tone: "success" });
    const wrong = makeNode("fx.notify", { x: 760, y: 240 }, { message: "Try another lead.", variant: "toast", tone: "warning" });
    const cancelled = makeNode("fx.notify", { x: 760, y: 440 }, { message: "The question was closed.", variant: "toast", tone: "info" });
    return projectWithGraph([start, prompt, correct, wrong, cancelled], [
        makeEdge(start, "out", prompt, "in"),
        makeEdge(prompt, "success", correct, "in"),
        makeEdge(prompt, "failure", wrong, "in"),
        makeEdge(prompt, "cancel", cancelled, "in"),
    ]);
}

function networkFilesFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 160 });
    const network = exampleNode("world.network", { x: 320, y: 20 });
    const files = exampleNode("world.files", { x: 680, y: 250 });
    return projectWithGraph([start, network, files], [
        makeEdge(start, "out", network, "in"),
        makeEdge(network, "out", files, "in"),
    ]);
}

function scanGateFixture(): ProjectDocument {
    resetIds();
    const trigger = exampleNode("trigger.event", { x: 50, y: 120 }, {
        event: "Terminal.NmapScan",
        conditions: [{ id: "scan-ip", join: "and", field: "ip", op: "equals", value: "{{data.targetIp}}" }],
    });
    const objective = exampleNode("objective", { x: 480, y: 120 }, {
        name: "scan-server",
        description: "Scan the company's server",
        hint: "Run an ordinary Nmap scan against the quest's assigned address.",
        terminalCommand: "nmap {{data.targetIp}}",
    });
    return projectWithGraph([trigger, objective], [makeEdge(trigger, "when", objective, "trigger")]);
}

function whoisFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 180 });
    const response = exampleNode("world.toolResponse", { x: 360, y: 180 }, {
        command: "whois",
        input: "greyline-dispatch.net",
        dataText: [
            "Domain:     greyline-dispatch.net",
            "IP:         10.0.0.14",
            "Registrant: The Greyline Dispatch",
            "Email:      hostmaster@greyline-dispatch.net",
            "Status:     active",
        ].join("\n"),
        removeOnComplete: true,
    });
    const next = makeNode("fx.notify", { x: 800, y: 180 }, {
        message: "The saved Whois response is returned.",
        variant: "toast",
        tone: "info",
    });
    return projectWithGraph([start, response, next], [
        makeEdge(start, "out", response, "in"),
        makeEdge(response, "out", next, "in"),
    ]);
}

function appCheckFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 220 });
    const check = makeNode("flow.appcheck", { x: 350, y: 220 }, { app: "Kisscord" });
    const installed = makeNode("fx.notify", { x: 760, y: 70 }, { message: "Open the Kisscord conversation.", variant: "toast", tone: "success" });
    const missing = makeNode("fx.notify", { x: 760, y: 370 }, { message: "Offer another way to continue.", variant: "toast", tone: "info" });
    return projectWithGraph([start, check, installed, missing], [
        makeEdge(start, "out", check, "in"),
        makeEdge(check, "true", installed, "in"),
        makeEdge(check, "false", missing, "in"),
    ]);
}

function chainedPhoneFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 190 });
    const first = makeNode("comms.dialogue", { x: 310, y: 190 }, {
        kind: "phone",
        phone: { branch: "first-call", startIndex: 0, continueMode: "onEnd" },
    });
    const second = makeNode("comms.dialogue", { x: 650, y: 190 }, {
        kind: "phone",
        phone: { branch: "second-call", startIndex: 0, continueMode: "onEnd" },
    });
    const finish = makeNode("fx.notify", { x: 990, y: 190 }, {
        message: "Both calls have ended.",
        variant: "toast",
        tone: "success",
    });
    const dialog = [
        phoneBranch("first-call-script", "first-call", "Marta Voss", "I found the first record.", "There is another lead on the company's public site."),
        phoneBranch("second-call-script", "second-call", "Marta Voss", "The second record checks out.", "Send the report when you are ready."),
    ];
    return projectWithGraph([start, first, second, finish], [
        makeEdge(start, "out", first, "in"),
        makeEdge(first, "out", second, "in"),
        makeEdge(second, "out", finish, "in"),
    ], dialog);
}

function questEndingFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 0, y: 150 });
    const message = makeNode("comms.dialogue", { x: 290, y: 150 }, {
        kind: "mail",
        mail: { from: "a.lindqvist@nullpost.io", subject: "Contract closed", content: "The report arrived. Thank you.", replyable: false },
    });
    const payment = exampleNode("fx.pay", { x: 590, y: 150 }, { amount: 900, description: "Contract payment", fromName: "A. Lindqvist" });
    const complete = makeNode("fx.completeQuest", { x: 900, y: 150 });
    const onComplete = makeNode("entry.complete", { x: 900, y: 400 });
    const followUp = makeNode("fx.notify", { x: 1200, y: 400 }, { message: "Optional work after the quest completes.", variant: "toast", tone: "info" });
    return projectWithGraph([start, message, payment, complete, onComplete, followUp], [
        makeEdge(start, "out", message, "in"),
        makeEdge(message, "out", payment, "in"),
        makeEdge(payment, "out", complete, "in"),
        makeEdge(onComplete, "out", followUp, "in"),
    ]);
}

function unreachableFixture(): ProjectDocument {
    resetIds();
    const start = makeNode("entry.start", { x: 40, y: 160 });
    const orphan = makeNode("fx.notify", { x: 440, y: 160 }, {
        message: "This node is not connected to the quest.",
        variant: "toast",
        tone: "info",
    });
    return projectWithGraph([start, orphan], []);
}

function noTriggerFixture(): ProjectDocument {
    resetIds();
    const objective = exampleNode("objective", { x: 290, y: 140 }, {
        name: "find-the-record",
        description: "Find the missing record",
        hint: "The objective needs a matching game event.",
    });
    return projectWithGraph([objective], []);
}

function graphFixture(graphId: string): ProjectDocument {
    switch (graphId) {
        case "first-contact-map":
            return firstContactFixture();
        case "objective-trigger":
            return pairFixture(true);
        case "phone-message":
            return phoneMessageFixture();
        case "event-branch-dialogue":
            return eventBranchDialogueFixture();
        case "payment":
            return paymentFixture();
        case "branch-merge":
            return branchMergeFixture();
        case "passphrase-routes":
            return passphraseFixture();
        case "network-files":
            return networkFilesFixture();
        case "scan-gate":
            return scanGateFixture();
        case "whois-lead":
            return whoisFixture();
        case "app-check":
            return appCheckFixture();
        case "chained-phone":
            return chainedPhoneFixture();
        case "quest-ending":
            return questEndingFixture();
        case "warning-unreachable":
            return unreachableFixture();
        case "warning-no-trigger":
            return noTriggerFixture();
        default:
            throw new Error(`Unknown graph fixture: ${graphId}`);
    }
}

function networkTargetFixture(): ProjectDocument {
    const project = buildReference();
    const quest = activeQuest(project);
    const network = quest.graph.nodes.find((node) => node.type === "world.network") as Extract<NodeDoc, { type: "world.network" }> | undefined;
    if (!network) throw new Error("The Node Reference fixture has no Create network node.");

    const data = network.data as { device: NetworkDevice };
    const root = structuredClone(data.device);
    const child = structuredClone(root.children[0]);
    const sshPort: NetworkPort = {
        id: "target-ssh",
        external: 22,
        internal: 22,
        active: true,
        locked: false,
        service: "ssh",
        version: "OpenSSH 8.9.0",
    };
    root.ports = [];
    root.children = [{
        ...child,
        id: "target-device",
        ip: "10.0.0.14",
        name: "ledger-server",
        type: "DEVICE",
        ports: [sshPort],
        children: [],
    }];
    network.data = { ...network.data, device: root };

    const packEvent = quest.graph.nodes.find((node) => node.type === "trigger.event");
    if (packEvent) packEvent.data = { ...packEvent.data, event: "ReconNg.Breach.FileDownloaded", conditions: [] };
    return project;
}

function blankProjectFixture(): ProjectDocument {
    const project = createProject();
    const quest = activeQuest(project);
    quest.autoStart = false;
    quest.graph = { nodes: [], edges: [] };
    return project;
}

function projectForFixture(fixture?: string): ProjectDocument {
    switch (fixture) {
        case "blank-project":
            return blankProjectFixture();
        case "first-contact":
            return firstContactFixture();
        case "reference":
            return buildReference();
        case "harbour-manifest":
            return buildDataGrab();
        case "byline":
            return buildByline();
        case "byline-article": {
            const project = buildByline();
            const site = project.websites[0];
            const article = site?.pages.find((page) => page.path === "/p/night-shift");
            const home = site?.pages.find((page) => page.path === "/");
            if (!site || !article || !home) {
                throw new Error("The Byline fixture needs both its / page and /p/night-shift article.");
            }
            site.pages = [article, home];
            return project;
        }
        case "hidden-page": {
            const project = buildHelpDeskLeak();
            const site = project.websites[0];
            const hidden = site?.pages.find((page) => !page.seo && page.path === "/it/helpdesk");
            if (!site || !hidden) throw new Error("The Help Desk Leak fixture has no unlisted help-desk page.");
            site.pages = [hidden];
            return project;
        }
        case "cold-call":
            return buildColdCall();
        case "network-target":
            return networkTargetFixture();
        default:
            return firstContactFixture();
    }
}

function installPackFixture(scene: FigureScene): void {
    const state = usePacks.getState();
    for (const pack of [...state.packs]) state.removePack(pack.id);
    if (scene.fixture === "network-target") {
        const result = usePacks.getState().loadPack(reconNgPack);
        if (!result.ok) throw new Error(`The checked-in Recon-NG pack fixture did not load: ${result.error}`);
    }
}

function installSceneState(scene: FigureScene): ProjectDocument {
    let project: ProjectDocument;
    if (scene.graph) project = graphFixture(scene.graph);
    else if (scene.nodeType) project = projectForFixture(scene.fixture ?? "reference");
    else project = projectForFixture(scene.fixture);

    const selected = scene.selectedNodeType
        ? selectedNodeId(project, scene.selectedNodeType)
        : scene.nodeType
          ? selectedNodeId(project, scene.nodeType)
          : scene.kind === "node-inspector"
            ? objectiveId(project)
            : undefined;

    installPackFixture(scene);
    const editor = useEditor.getState();
    editor.load(project, { clearHistory: true });
    editor.select({ nodeIds: selected ? [selected] : [], edgeIds: [] });

    const quest = activeQuest(project);
    const dialogueNodes = quest.graph.nodes.filter((node) => node.type === "comms.dialogue");
    const dialogueNode = scene.dialogue === "second" ? dialogueNodes[1] : dialogueNodes[0];
    const modal = scene.modal === "export" ? "mod" : scene.modal ?? null;
    editor.setUi({
        modal,
        dialogueNode: scene.modal === "dialogues" ? dialogueNode?.id ?? null : null,
        inspectorCollapsed: false,
        paletteCollapsed: false,
    });

    if (scene.floatInspector) {
        setInspectorFloatRect({ x: 920, y: 120, width: 340, height: 620 });
        floatInspector();
    }

    return project;
}

function InspectorScene({ scene }: { scene: FigureScene }) {
    return (
        <main className="figure-root">
            <aside className="figure-inspector-panel">
                <InspectorPanel />
            </aside>
            <SceneEnhancer scene={scene} />
        </main>
    );
}

function WorkspaceScene({ scene }: { scene: FigureScene }) {
    return (
        <ReactFlowProvider>
            <div className="figure-root figure-workspace">
                <TopBar />
                <main className="figure-workspace__main">
                    <NodePalette />
                    <section className="figure-workspace__canvas" aria-label="Quest canvas">
                        <QuestCanvas />
                        {scene.floatInspector && <FloatingInspector />}
                    </section>
                    {!scene.floatInspector && (
                        <aside className="figure-workspace__inspector" aria-label="Inspector">
                            <InspectorPanel />
                        </aside>
                    )}
                </main>
                <StatusBar />
                <Overlays />
                <SceneEnhancer scene={scene} />
            </div>
        </ReactFlowProvider>
    );
}

function GraphScene({ scene }: { scene: FigureScene }) {
    const canvasClass = scene.showToolbar ? "figure-canvas figure-canvas--tools" : "figure-canvas";
    return (
        <ReactFlowProvider>
            <main className={`figure-root figure-graph-scene${scene.showInspector ? " figure-graph-scene--inspector" : ""}`}>
                <section className={`figure-graph-scene__canvas ${canvasClass}`} aria-label="Quest canvas">
                    <QuestCanvas />
                </section>
                {scene.showInspector && (
                    <aside className="figure-graph-scene__inspector" aria-label="Inspector">
                        <InspectorPanel />
                    </aside>
                )}
                <SceneEnhancer scene={scene} />
            </main>
        </ReactFlowProvider>
    );
}

function PaletteScene() {
    return (
        <ReactFlowProvider>
            <main className="figure-root figure-palette">
                <NodePalette />
            </main>
        </ReactFlowProvider>
    );
}

function StatusScene({ scene }: { scene: FigureScene }) {
    return (
        <main className="figure-root figure-status">
            <StatusBar />
            <SceneEnhancer scene={scene} />
        </main>
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
                    fitView
                    fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
                    minZoom={0.2}
                    maxZoom={1}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnDrag={false}
                    panOnScroll={false}
                    zoomOnScroll={false}
                    zoomOnDoubleClick={false}
                    proOptions={{ hideAttribution: true }}
                >
                    <ViewportPortal>
                        <svg className="figure-drag-wire" viewBox="0 0 900 520" aria-hidden="true">
                            <path
                                d="M 320 209 C 356 209 376 260 425 260"
                                fill="none"
                                stroke="var(--color-cat-trigger)"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <circle cx="425" cy="260" r="7" fill="var(--color-canvas)" stroke="var(--color-cat-trigger)" strokeWidth="3" />
                            <path
                                className="figure-drag-cursor"
                                d="M 421 258 L 441 272 L 433 273 L 438 284 L 433 286 L 428 275 L 422 281 Z"
                                fill="var(--color-ink)"
                                stroke="var(--color-canvas)"
                                strokeWidth="1"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </ViewportPortal>
                </ReactFlow>
                <div className="figure-drag-label" aria-hidden="true">Fixed mid-drag illustration</div>
            </main>
        </ReactFlowProvider>
    );
}

function SceneEnhancer({ scene }: { scene: FigureScene }) {
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const root = document.getElementById("root");
            if (!root) return;

            if (scene.inspectorTab && scene.inspectorTab !== "node" && scene.inspectorTab !== "quest") {
                const tab = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]')).find(
                    (item) => item.textContent?.trim() === (scene.inspectorTab === "mod" ? "Mod" : "Quest"),
                );
                if (tab?.getAttribute("aria-selected") !== "true") tab?.click();
            }

            if (scene.scrollTo) {
                const target = Array.from(document.querySelectorAll<HTMLElement>("h3")).find(
                    (item) => item.textContent?.trim() === scene.scrollTo,
                );
                const pane = target?.closest(".min-h-0.flex-1.overflow-y-auto.bg-surface");
                if (target && pane) {
                    if (typeof target.scrollIntoView === "function") target.scrollIntoView({ block: "start" });
                    pane.scrollTop = target.offsetTop;
                }
            }

            if (scene.openEventPicker) {
                const trigger = Array.from(root.querySelectorAll<HTMLButtonElement>("button.field-input")).find(
                    (item) => item.textContent?.includes("Terminal."),
                );
                trigger?.click();
            }

            if (scene.expandNetworkTarget) {
                const deviceExpander = Array.from(root.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")).find(
                    (item) => item.textContent?.trim() === "Devices behind this (1)",
                );
                if (deviceExpander?.getAttribute("aria-expanded") !== "true") deviceExpander?.click();
                window.setTimeout(() => {
                    const portExpander = Array.from(root.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")).find(
                        (item) => item.textContent?.trim() === "Ports (1)",
                    );
                    if (portExpander?.getAttribute("aria-expanded") !== "true") portExpander?.click();
                    window.setTimeout(() => {
                        const portRow = Array.from(root.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")).find(
                            (item) => item.textContent?.trim() === "22/ssh",
                        );
                        if (portRow?.getAttribute("aria-expanded") !== "true") portRow?.click();
                        window.setTimeout(() => {
                            const version = Array.from(root.querySelectorAll<HTMLInputElement>("input")).find(
                                (item) => item.value === "OpenSSH 8.9.0",
                            );
                            const pane = version?.closest(".min-h-0.flex-1.overflow-y-auto.bg-surface");
                            if (version && pane) {
                                if (typeof version.scrollIntoView === "function") version.scrollIntoView({ block: "center" });
                                pane.scrollTop = version.offsetTop;
                            }
                        }, 50);
                    }, 50);
                }, 50);
            }

            if (scene.websiteMode) {
                const openWebsiteMode = () => {
                    const modeButton = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button')).find(
                        (item) => item.textContent?.trim().toLowerCase() === scene.websiteMode,
                    );
                    modeButton?.click();
                };
                if (scene.websitePagePath) {
                    const pageButton = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button')).find(
                        (item) => item.textContent?.trim().startsWith(scene.websitePagePath!),
                    );
                    pageButton?.click();
                    window.setTimeout(openWebsiteMode, 50);
                } else {
                    openWebsiteMode();
                }
            }
        }, 40);
        return () => window.clearTimeout(timer);
    }, [scene]);

    return null;
}

function SceneReady({ sceneId, status = "ready" }: { sceneId: string; status?: "ready" | "error" }) {
    useEffect(() => {
        const timer = window.setTimeout(() => {
            window.parent.postMessage({ type: "manual-figure-ready", scene: sceneId, status }, "*");
        }, status === "ready" ? 250 : 0);
        return () => window.clearTimeout(timer);
    }, [sceneId, status]);
    return null;
}

function SceneErrorFallback() {
    return (
        <main className="figure-root flex items-center justify-center p-6">
            <div className="max-w-sm rounded-lg border border-line bg-surface p-5 text-ink">
                <h1 className="text-sm font-semibold">This illustration could not load.</h1>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">
                    The surrounding manual page still contains the description and caption.
                </p>
            </div>
        </main>
    );
}

class SceneErrorBoundary extends Component<{ children: ReactNode; sceneId: string }, { failed: boolean }> {
    override state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    override render() {
        return this.state.failed
            ? <><SceneErrorFallback /><SceneReady sceneId={this.props.sceneId} status="error" /></>
            : this.props.children;
    }
}

function MissingScene({ requested }: { requested: string }) {
    return (
        <>
            <main className="figure-root flex items-center justify-center p-6">
                <div className="max-w-sm rounded-lg border border-warn/40 bg-surface p-5 text-ink">
                    <h1 className="text-sm font-semibold">Illustration not found</h1>
                    <p className="mt-2 text-xs leading-relaxed text-ink-3">
                        “{requested || "(no scene id)"}” is not in the local scene catalogue.
                    </p>
                </div>
            </main>
            <SceneReady sceneId={requested} status="error" />
        </>
    );
}

function Scene({ scene }: { scene: FigureScene }) {
    switch (scene.kind) {
        case "node-inspector":
        case "inspector":
            return <InspectorScene scene={scene} />;
        case "workspace":
            return <WorkspaceScene scene={scene} />;
        case "graph":
            return <GraphScene scene={scene} />;
        case "palette":
            return <PaletteScene />;
        case "status":
            return <StatusScene scene={scene} />;
        case "drag-wire":
            return <DragWireScene />;
    }
}

const container = document.getElementById("root");
if (container) {
    const requestedScene = new URLSearchParams(window.location.search).get("scene") ?? "";
    const root = createRoot(container);
    const known = isFigureSceneId(requestedScene);
    document.documentElement.dataset.figureScene = known ? requestedScene : "missing";

    if (!known) {
        document.title = "Quest editor illustration not found";
        root.render(<MissingScene requested={requestedScene} />);
    } else {
        const scene = RENDERER_SCENE_CATALOGUE[requestedScene];
        installSceneState(scene);
        document.title = `Quest editor illustration — ${scene.title}`;
        document.documentElement.dataset.figureDescription = scene.description;

        root.render(
            <SceneErrorBoundary sceneId={requestedScene}>
                <><Scene scene={scene} /><SceneReady sceneId={requestedScene} /></>
            </SceneErrorBoundary>,
        );
    }
}
