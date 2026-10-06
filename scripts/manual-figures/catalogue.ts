import { NODE_TYPES_REGISTRY, PALETTE_HIDDEN_TYPES, nodeTypeDef } from "@/schema/registry";
import type { NodeType } from "@/schema/nodes";

export type FigureGroup = "nodes" | "howto" | "tutorial" | "guides" | "troubleshooting" | "tour";
export type FigureKind = "node-inspector" | "workspace" | "inspector" | "graph" | "palette" | "status" | "drag-wire";
export type FigureModal = "templates" | "simulator" | "export" | "dialogues" | "websites" | "toolpacks" | "settings";

export interface FigureScene {
    group?: FigureGroup;
    kind: FigureKind;
    title: string;
    description: string;
    width: number;
    height: number;
    fixture?: string;
    graph?: string;
    nodeType?: NodeType;
    selectedNodeType?: NodeType;
    inspectorTab?: "node" | "quest" | "mod";
    modal?: FigureModal;
    openEventPicker?: boolean;
    scrollTo?: string;
    floatInspector?: boolean;
    showToolbar?: boolean;
    showInspector?: boolean;
    expandNetworkTarget?: boolean;
    websiteMode?: "visual" | "preview";
    websitePagePath?: string;
    dialogue?: "first" | "second";
    stillMoment?: boolean;
    stillNote?: string;
}

const NON_NODE_SCENES: Record<string, FigureScene> = {
    "tour-workspace": {
        group: "tour",
        kind: "workspace",
        title: "First Contact in the full editor workspace",
        description: "The editor's top bar, node library, quest canvas, inspector and status bar are shown around a fixed First Contact example.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
        selectedNodeType: "objective",
    },
    "tour-empty-canvas": {
        group: "tour",
        kind: "workspace",
        title: "A new project with an empty quest canvas",
        description: "The editor workspace is shown before any nodes have been added to the new quest. This fixed component-only view does not include the first-run welcome card.",
        width: 1360,
        height: 820,
        fixture: "blank-project",
    },

    "tutorial-01-new-dialog": {
        group: "tutorial",
        kind: "workspace",
        title: "Start from a template window",
        description: "The editor's real template window is open over a fixed First Contact workspace.",
        width: 960,
        height: 720,
        fixture: "first-contact",
        modal: "templates",
    },
    "tutorial-02-first-contact": {
        group: "tutorial",
        kind: "workspace",
        title: "First Contact loaded in the editor",
        description: "The fixed First Contact template is shown in the editor workspace.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
    },
    "tutorial-03-read-the-map": {
        group: "tutorial",
        kind: "graph",
        title: "The First Contact node map",
        description: "The First Contact template's real nodes and typed wires are arranged across the canvas.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
        graph: "first-contact-map",
    },
    "tutorial-04-inspector-tabs": {
        group: "tutorial",
        kind: "workspace",
        title: "Node, Quest and Mod inspector tabs",
        description: "A real Objective is selected so the editor shows its Node, Quest and Mod inspector tabs.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
        selectedNodeType: "objective",
    },
    "tutorial-05-add-objective": {
        group: "tutorial",
        kind: "palette",
        title: "Objective in the node library",
        description: "The editor's node library lists Objective with the other available node cards.",
        width: 360,
        height: 720,
        fixture: "first-contact",
    },
    "tutorial-06-objective-inspector": {
        group: "tutorial",
        kind: "node-inspector",
        title: "Objective fields in the inspector",
        description: "The Objective inspector is rendered from the Node Reference template's fixed example.",
        width: 440,
        height: 720,
        nodeType: "objective",
    },
    "tutorial-07-drag-wire": {
        group: "tutorial",
        kind: "drag-wire",
        title: "Fixed still illustration of a wire being dragged",
        description: "A fixed editor scene depicts a When wire partway through a connection drag; it does not move.",
        width: 900,
        height: 520,
        stillMoment: true,
        stillNote: "Still illustration: the wire and cursor are a fixed snapshot, not an active drag.",
    },
    "tutorial-08-when-event-inspector": {
        group: "tutorial",
        kind: "node-inspector",
        title: "When event inspector with its event picker open",
        description: "The real When event inspector is shown with the built-in event picker open over a fixed example.",
        width: 720,
        height: 720,
        nodeType: "trigger.event",
        openEventPicker: true,
    },
    "tutorial-09-dialogue-inspector": {
        group: "tutorial",
        kind: "node-inspector",
        title: "Dialogue node inspector",
        description: "The Dialogue inspector is rendered from the Node Reference template's fixed example.",
        width: 440,
        height: 720,
        nodeType: "comms.dialogue",
    },
    "tutorial-10-pay-inspector": {
        group: "tutorial",
        kind: "node-inspector",
        title: "Pay the player inspector",
        description: "The Pay the player inspector is rendered from the Node Reference template's fixed example.",
        width: 440,
        height: 720,
        nodeType: "fx.pay",
    },
    "tutorial-11-status-clean": {
        group: "tutorial",
        kind: "status",
        title: "Saved status and graph counts",
        description: "The editor status bar shows the saved state and counts for the fixed First Contact template.",
        width: 1360,
        height: 64,
        fixture: "first-contact",
    },
    "tutorial-12-dryrun": {
        group: "tutorial",
        kind: "workspace",
        title: "Dry run window after a fixed sample trace",
        description: "The real Dry run window shows a settled trace from the fixed Harbour Manifest template, not a live game.",
        width: 1120,
        height: 820,
        fixture: "harbour-manifest",
        modal: "simulator",
        stillMoment: true,
        stillNote: "Still illustration: the fixed sample run has finished; this is not a live game trace.",
    },
    "tutorial-13-export-dialog": {
        group: "tutorial",
        kind: "workspace",
        title: "Export mod window",
        description: "The editor's real export window summarizes the fixed First Contact project.",
        width: 960,
        height: 760,
        fixture: "first-contact",
        modal: "export",
    },

    "guide-inspector-tabs": {
        group: "guides",
        kind: "inspector",
        title: "Inspector at rest on the Quest tab",
        description: "The inspector is shown on its default Quest tab with no node selected.",
        width: 440,
        height: 660,
        fixture: "first-contact",
        inspectorTab: "quest",
    },
    "guide-inspector-drawer": {
        group: "guides",
        kind: "workspace",
        title: "Floating inspector over the canvas",
        description: "The real inspector is shown as a floating drawer over the fixed First Contact canvas.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
        selectedNodeType: "objective",
        floatInspector: true,
    },
    "guide-quest-settings": {
        group: "guides",
        kind: "inspector",
        title: "Quest Behaviour controls in the inspector",
        description: "The real Quest inspector is scrolled to its Behaviour section and fixed controls.",
        width: 440,
        height: 720,
        fixture: "first-contact",
        inspectorTab: "quest",
        scrollTo: "Behaviour",
    },
    "guide-mod-settings": {
        group: "guides",
        kind: "inspector",
        title: "Mod identity and permissions in the inspector",
        description: "The real Mod inspector shows identity fields and the permissions derived from the fixed project.",
        width: 440,
        height: 720,
        fixture: "first-contact",
        inspectorTab: "mod",
    },
    "guide-dialogues": {
        group: "guides",
        kind: "workspace",
        title: "Dialogue editor with a conversation open",
        description: "The real Dialogue editor shows a fixed Kisscord conversation from the Cold Call template.",
        width: 1120,
        height: 820,
        fixture: "cold-call",
        modal: "dialogues",
        dialogue: "first",
    },
    "guide-websites": {
        group: "guides",
        kind: "workspace",
        title: "Website builder with its site and pages",
        description: "The real website builder shows the fixed Greyline Dispatch site and its pages.",
        width: 1280,
        height: 820,
        fixture: "byline",
        modal: "websites",
    },
    "guide-websites-page": {
        group: "guides",
        kind: "workspace",
        title: "Website page editor with a preview",
        description: "The website builder shows the fixed /p/night-shift page beside its preview.",
        width: 1280,
        height: 820,
        fixture: "byline-article",
        modal: "websites",
        websiteMode: "preview",
        websitePagePath: "/p/night-shift",
    },
    "guide-templates": {
        group: "guides",
        kind: "workspace",
        title: "Template gallery with difficulty and node counts",
        description: "The real template window lists the editor's current templates, difficulty labels and node counts.",
        width: 960,
        height: 720,
        fixture: "first-contact",
        modal: "templates",
    },
    "guide-dryrun": {
        group: "guides",
        kind: "workspace",
        title: "Dry run badges after a fixed sample trace",
        description: "The real Dry run window shows the fixed Harbour Manifest trace and its objective badges, not a live game.",
        width: 1120,
        height: 820,
        fixture: "harbour-manifest",
        modal: "simulator",
        stillMoment: true,
        stillNote: "Still illustration: the fixed sample run has finished; the report is not live.",
    },
    "guide-addons": {
        group: "guides",
        kind: "workspace",
        title: "Addons window in its empty state",
        description: "The real Addons window shows its empty state over a fixed editor workspace.",
        width: 960,
        height: 720,
        fixture: "first-contact",
        modal: "toolpacks",
    },
    "guide-settings": {
        group: "guides",
        kind: "workspace",
        title: "Settings sheet over the editor workspace",
        description: "The real Settings sheet is open over a fixed First Contact workspace, with theme and typography sections visible.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
        modal: "settings",
    },
    "guide-canvas-tools": {
        group: "guides",
        kind: "graph",
        title: "Canvas toolbar and issue counter",
        description: "The real canvas toolbar shows arrange controls, wire options and the issue counter over the fixed First Contact graph.",
        width: 1360,
        height: 820,
        fixture: "first-contact",
        graph: "first-contact-map",
        showToolbar: true,
    },

    "howto-01-objective": {
        group: "howto",
        kind: "graph",
        title: "When event connected to an Objective",
        description: "The real canvas shows a fixed When event connected to the Objective it can complete.",
        width: 1000,
        height: 520,
        graph: "objective-trigger",
    },
    "howto-02-npc-message": {
        group: "howto",
        kind: "graph",
        title: "Phone call node with a two-line script",
        description: "The Dialogue node is connected on the story path and selected so its real phone-call fields are visible.",
        width: 1360,
        height: 720,
        graph: "phone-message",
        selectedNodeType: "comms.dialogue",
        inspectorTab: "node",
        showInspector: true,
    },
    "howto-03-gated-message": {
        group: "howto",
        kind: "graph",
        title: "Event condition branching to a dialogue",
        description: "A When event feeds the real Branch node's condition input; its Yes and No paths lead to separate outcomes.",
        width: 1120,
        height: 620,
        graph: "event-branch-dialogue",
    },
    "howto-04-payment": {
        group: "howto",
        kind: "graph",
        title: "Payment node on the story path",
        description: "The real Pay the player node is selected on a fixed story path with its example amount and description visible.",
        width: 1280,
        height: 680,
        graph: "payment",
        selectedNodeType: "fx.pay",
        inspectorTab: "node",
        showInspector: true,
    },
    "howto-05-branch": {
        group: "howto",
        kind: "graph",
        title: "Two branch paths rejoining one shared node",
        description: "Two real Branch outputs take separate routes before both connect to one shared node.",
        width: 1120,
        height: 620,
        graph: "branch-merge",
    },
    "howto-06-passphrase": {
        group: "howto",
        kind: "graph",
        title: "Ask player node with three response routes",
        description: "The real Ask player node uses a masked exact match, with Correct, Wrong and Cancelled outputs connected to separate follow-ups.",
        width: 1360,
        height: 720,
        graph: "passphrase-routes",
        selectedNodeType: "fx.prompt",
        inspectorTab: "node",
        showInspector: true,
    },
    "howto-07-website": {
        group: "howto",
        kind: "workspace",
        title: "Website builder preview of the public clue page",
        description: "The real website builder shows the Greyline Dispatch host, the fixed /p/night-shift page and its preview.",
        width: 1280,
        height: 820,
        fixture: "byline-article",
        modal: "websites",
        websiteMode: "preview",
        websitePagePath: "/p/night-shift",
    },
    "howto-08-hidden-page": {
        group: "howto",
        kind: "workspace",
        title: "Unlisted page in the website builder",
        description: "The real website builder shows a fixed page with in-game search listing turned off.",
        width: 1280,
        height: 820,
        fixture: "hidden-page",
        modal: "websites",
    },
    "howto-09-file-drop": {
        group: "howto",
        kind: "graph",
        title: "Network and file nodes aimed at the same device",
        description: "The real Create network and Place files nodes use the same fixed device address and are connected on the story path.",
        width: 1000,
        height: 520,
        graph: "network-files",
    },
    "howto-10-scan-gate": {
        group: "howto",
        kind: "graph",
        title: "Nmap scan event wired to an Objective",
        description: "A real Terminal.NmapScan event condition matching its ip field is wired into the Objective's Trigger socket.",
        width: 1000,
        height: 520,
        graph: "scan-gate",
    },
    "howto-11-lead": {
        group: "howto",
        kind: "graph",
        title: "Whois tool response for a domain",
        description: "The real Tool response node shows a fixed whois answer for a domain, with its input and response fields in the inspector.",
        width: 1280,
        height: 680,
        graph: "whois-lead",
        selectedNodeType: "world.toolResponse",
        inspectorTab: "node",
        showInspector: true,
    },
    "howto-12-tool-match": {
        group: "howto",
        kind: "workspace",
        title: "Loaded Recon-NG addon beside an SSH network target",
        description: "The real Addons window lists Recon-NG's supported services beside a selected network with a fixed SSH port and version; this view does not prove compatibility.",
        width: 1360,
        height: 820,
        fixture: "network-target",
        selectedNodeType: "world.network",
        modal: "toolpacks",
        expandNetworkTarget: true,
    },
    "howto-13-app-check": {
        group: "howto",
        kind: "graph",
        title: "App Install Check with both outcomes connected",
        description: "The real App Install Check node has its Installed and Missing outputs connected to fixed follow-ups.",
        width: 1000,
        height: 520,
        graph: "app-check",
    },
    "howto-14-chained-talk": {
        group: "howto",
        kind: "graph",
        title: "Two phone conversations chained in order",
        description: "Two real phone-call Dialogue nodes share fixed scripts; the first continues when its call ends and flows into the second.",
        width: 1120,
        height: 620,
        graph: "chained-phone",
        selectedNodeType: "comms.dialogue",
        inspectorTab: "node",
        showInspector: true,
    },
    "howto-15-ending": {
        group: "howto",
        kind: "graph",
        title: "Story path ending with Complete quest",
        description: "A fixed message and payment lead to the real Complete quest node; On quest complete work is shown separately.",
        width: 1280,
        height: 680,
        graph: "quest-ending",
    },
    "howto-16-from-template": {
        group: "howto",
        kind: "workspace",
        title: "Template picker with save and import options",
        description: "The real template picker shows First Contact, the current templates, and its export and import controls.",
        width: 960,
        height: 720,
        fixture: "first-contact",
        modal: "templates",
    },
    "howto-17-update": {
        group: "howto",
        kind: "inspector",
        title: "Mod identity with an increased version",
        description: "The real Mod inspector shows a fixed mod id and an increased version before a new export.",
        width: 440,
        height: 720,
        fixture: "first-contact",
        inspectorTab: "mod",
    },

    "trouble-unreachable-badge": {
        group: "troubleshooting",
        kind: "graph",
        title: "Unreachable warning badge on a canvas node",
        description: "The real canvas analysis marks a fixed unconnected node with its Unreachable badge.",
        width: 900,
        height: 460,
        graph: "warning-unreachable",
    },
    "trouble-no-trigger": {
        group: "troubleshooting",
        kind: "graph",
        title: "No trigger badge on an Objective",
        description: "The real canvas analysis marks a fixed Objective with its No trigger badge.",
        width: 900,
        height: 460,
        graph: "warning-no-trigger",
    },
    "trouble-export-report": {
        group: "troubleshooting",
        kind: "workspace",
        title: "Export window with an item that needs attention",
        description: "The real export window shows the compiler's fixed Needs attention warning for a project that cannot start.",
        width: 1040,
        height: 780,
        fixture: "blank-project",
        modal: "export",
    },
};

const NODE_SCENES: Record<string, FigureScene> = Object.fromEntries(
    (Object.keys(NODE_TYPES_REGISTRY) as NodeType[])
        .filter((type) => !PALETTE_HIDDEN_TYPES.has(type))
        .map((type) => {
            const label = nodeTypeDef(type).label;
            const id = `node-${type.replace(/\./g, "-").toLowerCase()}-inspector`;
            return [id, {
                group: "nodes",
                kind: "node-inspector",
                title: `${label} inspector`,
                description: `The real ${label} inspector uses the Node Reference template's fixed example.`,
                width: 440,
                height: 720,
                nodeType: type,
            } satisfies FigureScene];
        }),
);

export const SCENE_CATALOGUE: Record<string, FigureScene> = {
    ...NON_NODE_SCENES,
    ...NODE_SCENES,
};

/* These three aliases belong to the approved five-scene review page only.
   They are deliberately separate from the 88 live handbook figures and G8's
   active scene count. */
export const PROTOTYPE_SCENE_CATALOGUE: Record<string, FigureScene> = {
    "tutorial-drag-wire": {
        ...SCENE_CATALOGUE["tutorial-07-drag-wire"],
        group: undefined,
        title: "Fixed illustration of a wire being dragged",
        description: "A fixed editor scene depicts a When wire partway through a connection drag; it does not move.",
        width: 900,
        height: 520,
    },
    "howto-wired-canvas": {
        ...SCENE_CATALOGUE["howto-01-objective"],
        group: undefined,
        title: "Objective connected to a When event",
        description: "A two-node canvas scene shows a When event wire connected to an Objective.",
        width: 960,
        height: 520,
    },
    "settings-panel": {
        ...SCENE_CATALOGUE["guide-settings"],
        group: undefined,
        title: "Settings panel open over the editor workspace",
        description: "The real Settings panel is open over a fixed First Contact editor workspace.",
        width: 1360,
        height: 820,
    },
};

export const RENDERER_SCENE_CATALOGUE: Record<string, FigureScene> = {
    ...SCENE_CATALOGUE,
    ...PROTOTYPE_SCENE_CATALOGUE,
};

export const PROTOTYPE_SCENE_IDS = [
    "node-objective-inspector",
    "howto-wired-canvas",
    "settings-panel",
    "tour-workspace",
    "tutorial-drag-wire",
] as const;

export type FigureSceneId = string & {};

export function isFigureSceneId(value: string): value is FigureSceneId {
    return Object.prototype.hasOwnProperty.call(RENDERER_SCENE_CATALOGUE, value);
}
