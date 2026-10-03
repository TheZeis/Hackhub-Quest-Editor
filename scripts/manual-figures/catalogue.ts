export const SCENE_CATALOGUE = {
    "node-objective-inspector": {
        title: "Objective node inspector",
        description: "The Objective node is selected, with its editor fields shown in the inspector.",
        width: 440,
        height: 700,
    },
    "howto-wired-canvas": {
        title: "Objective connected to a When event",
        description: "A two-node canvas scene shows a When event wire connected to an Objective.",
        width: 960,
        height: 520,
    },
    "settings-panel": {
        title: "Settings panel open over the editor workspace",
        description: "The real Settings panel is open over a fixed First Contact editor workspace.",
        width: 1360,
        height: 820,
    },
    "tour-workspace": {
        title: "First Contact in the full editor workspace",
        description: "The editor's top bar, node library, quest canvas, inspector and status bar are visible.",
        width: 1360,
        height: 820,
    },
    "tutorial-drag-wire": {
        title: "Fixed mid-drag wire illustration",
        description: "A static wire runs from a When event toward an Objective, partway through a connection drag.",
        width: 900,
        height: 520,
    },
} as const;

export type FigureSceneId = keyof typeof SCENE_CATALOGUE;

export function isFigureSceneId(value: string): value is FigureSceneId {
    return Object.prototype.hasOwnProperty.call(SCENE_CATALOGUE, value);
}
