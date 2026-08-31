/**
 * Starter templates.
 *
 * Each is a plain `ProjectDocument` factory, which means the templates are
 * themselves exercised by the compiler test suite (docs/01 §5). Ids are generated
 * deterministically so a template builds byte-identically every time and snapshot
 * tests stay stable.
 */
import { createProject, createQuest, type ProjectDocument } from "@/schema/project";
import type { NodeDoc } from "@/schema/nodes";
import type { EdgeDoc } from "@/schema/edges";
import { nodeTypeDef } from "@/schema/registry";
import type { NodeType } from "@/schema/nodes";

let counter = 0;
function resetIds() {
    counter = 0;
}
function tid(prefix: string): string {
    counter += 1;
    return `${prefix}${counter}`;
}

/* ── graph builders ──────────────────────────────────────────────────────── */

function makeNode(type: NodeType, position: { x: number; y: number }, data?: Record<string, unknown>): NodeDoc {
    const def = nodeTypeDef(type);
    return {
        id: tid(type.replace(/\./g, "-")),
        type,
        position,
        data: { ...def.create(), ...(data ?? {}) },
    } as unknown as NodeDoc;
}

function makeEdge(
    source: NodeDoc,
    sourceHandle: string,
    target: NodeDoc,
    targetHandle: string,
): EdgeDoc {
    const sourceKind = nodeTypeDef(source.type).sources.find((h) => h.id === sourceHandle)?.kind;
    const targetKind = nodeTypeDef(target.type).targets.find((h) => h.id === targetHandle)?.kind;
    if (!sourceKind || sourceKind !== targetKind) {
        throw new Error(
            `Template bug: cannot connect ${source.type}.${sourceHandle} (${sourceKind ?? "none"}) to ${target.type}.${targetHandle} (${targetKind ?? "none"})`,
        );
    }
    return {
        id: tid("edge"),
        source: source.id,
        sourceHandle,
        target: target.id,
        targetHandle,
        kind: sourceKind,
    };
}

/* ── templates ───────────────────────────────────────────────────────────── */

export interface Template {
    id: string;
    name: string;
    description: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    nodeCount: number;
    build: () => ProjectDocument;
}

/** An empty quest with the four lifecycle entry points already placed. */
function buildBlank(): ProjectDocument {
    resetIds();
    // Explicit quest ids: templates must build byte-identically every time so
    // the compiler's output (docs/01 §5) can be diffed and snapshot-tested.
    const quest = createQuest({ id: "q-blank", name: "NewQuest", title: "New Quest" });
    const start = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 140 });
    const done = makeNode("entry.complete", { x: 0, y: 420 });
    const abandon = makeNode("entry.abandon", { x: 0, y: 560 });
    quest.graph = { nodes: [start, load, done, abandon], edges: [] };
    return createProject({ quests: [quest], editor: { activeQuestId: quest.id, viewports: {} } });
}

/** One objective completed by one nmap scan, then a payout. The 60-second tour. */
function buildHelloHack(): ProjectDocument {
    resetIds();
    const quest = createQuest({
        id: "q-hello-hack",
        name: "HelloHack",
        title: "Hello Hack",
        description: "Scan a target and collect the bounty.",
        rewards: { money: 500, xp: 25 },
    });

    const start = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 150 });
    const notify = makeNode("fx.notify", { x: 280, y: 0 }, {
        message: "New job: scan 45.33.32.156 and report back.",
        variant: "toast",
        tone: "info",
    });
    const trigger = makeNode("trigger.event", { x: 280, y: 150 }, {
        event: "Terminal.NmapScan",
        conditions: [
            { id: "c1", join: "and", field: "ip", op: "equals", value: "45.33.32.156" },
        ],
    });
    const objective = makeNode("objective", { x: 580, y: 150 }, {
        name: "scan-target",
        description: "Scan 45.33.32.156 with nmap",
        hint: "nmap 45.33.32.156",
        terminalCommand: "nmap 45.33.32.156",
    });
    const done = makeNode("entry.complete", { x: 880, y: 150 });
    const pay = makeNode("fx.pay", { x: 1160, y: 150 }, {
        amount: 500,
        description: "Recon bounty",
        fromName: "Anonymous Client",
    });

    quest.graph = {
        nodes: [start, load, notify, trigger, objective, done, pay],
        edges: [
            makeEdge(start, "out", notify, "in"),
            makeEdge(trigger, "when", objective, "trigger"),
            makeEdge(done, "out", pay, "in"),
        ],
    };

    return createProject({ quests: [quest], editor: { activeQuestId: quest.id, viewports: {} } });
}

/**
 * The beginner Wi-Fi quest: recon the air, crack the passphrase with fern, join
 * the network, then get onto the device behind it.
 */
function buildWifiHack(): ProjectDocument {
    resetIds();
    const quest = createQuest({
        id: "q-wifi-hack",
        name: "NeighbourWifi",
        title: "The Neighbour's Wi-Fi",
        description: "Crack the access point next door and see what is on the network.",
        group: "side",
        rewards: { money: 2500, xp: 120 },
    });

    const start = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 220 });
    const complete = makeNode("entry.complete", { x: 0, y: 760 });

    const briefing = makeNode("comms.mail", { x: 300, y: 0 }, {
        from: "handler@anon.mail",
        subject: "Small job — the apartment next door",
        content:
            "<p>There is an access point called <b>NEIGHBOUR_5Ghz</b> two walls away. Get on it, then get onto the machine behind it. Payment on delivery.</p>",
        replyable: false,
    });

    const wifi = makeNode("world.wifi", { x: 300, y: 180 }, {
        ssid: "NEIGHBOUR_5Ghz",
        password: "letmein123",
        signal: 3,
        model: "TP-Link Archer C6",
    });

    const reconTrigger = makeNode("trigger.event", { x: 300, y: 420 }, {
        event: "Bettercap.WifiRecon",
        conditions: [],
    });
    const reconObjective = makeNode("objective", { x: 620, y: 420 }, {
        name: "recon",
        description: "Scan the air for access points with bettercap",
        hint: "Open bettercap and run wifi.recon",
        terminalCommand: "bettercap",
    });

    const crackTrigger = makeNode("trigger.event", { x: 300, y: 560 }, {
        event: "Fern.FindPassword",
        conditions: [
            { id: "c1", join: "and", field: "model", op: "equals", value: "TP-Link Archer C6" },
        ],
    });
    const crackObjective = makeNode("objective", { x: 620, y: 560 }, {
        name: "crack-passphrase",
        description: "Recover the WPA passphrase",
        hint: "The router model is on its admin page. fern can recover it.",
        terminalCommand: 'fern "TP-Link Archer C6"',
        unlocksAfter: [],
    });

    const joinTrigger = makeNode("trigger.event", { x: 300, y: 700 }, {
        event: "Network.WifiConnected",
        conditions: [
            { id: "c1", join: "and", field: "ssid", op: "equals", value: "NEIGHBOUR_5Ghz" },
        ],
    });
    const joinObjective = makeNode("objective", { x: 620, y: 700 }, {
        name: "join-network",
        description: "Join NEIGHBOUR_5Ghz",
        hint: "Connect with the passphrase you recovered.",
    });

    const pay = makeNode("fx.pay", { x: 300, y: 760 }, {
        amount: 2500,
        description: "Wi-Fi job",
        fromName: "Anonymous Client",
    });

    quest.graph = {
        nodes: [
            start,
            load,
            complete,
            briefing,
            wifi,
            reconTrigger,
            reconObjective,
            crackTrigger,
            crackObjective,
            joinTrigger,
            joinObjective,
            pay,
        ],
        edges: [
            makeEdge(start, "out", briefing, "in"),
            makeEdge(briefing, "out", wifi, "in"),
            makeEdge(reconTrigger, "when", reconObjective, "trigger"),
            makeEdge(crackTrigger, "when", crackObjective, "trigger"),
            makeEdge(joinTrigger, "when", joinObjective, "trigger"),
            makeEdge(reconObjective, "unlock", crackObjective, "unlocked-by"),
            makeEdge(crackObjective, "unlock", joinObjective, "unlocked-by"),
            makeEdge(complete, "out", pay, "in"),
        ],
    };

    return createProject({
        mod: {
            id: "neighbour-wifi",
            name: "The Neighbour's Wi-Fi",
            version: "1.0.0",
            author: "",
            description: "A beginner Wi-Fi cracking quest for HackHub.",
            tags: ["quest", "wifi", "beginner"],
            dependencies: [],
            minSdkVersion: "0.21.0",
            apiVersion: 1,
        },
        quests: [quest],
        editor: { activeQuestId: quest.id, viewports: {} },
    });
}

export const TEMPLATES: Template[] = [
    {
        id: "blank",
        name: "Blank quest",
        description: "The four lifecycle entry points, nothing else. Start from scratch.",
        difficulty: "Beginner",
        nodeCount: 4,
        build: buildBlank,
    },
    {
        id: "hello-hack",
        name: "Hello Hack",
        description: "One objective completed by a single nmap scan, then a payout.",
        difficulty: "Beginner",
        nodeCount: 7,
        build: buildHelloHack,
    },
    {
        id: "wifi-hack",
        name: "Simple Linear Wi-Fi Hack",
        description:
            "Briefing e-mail, a crackable access point, bettercap recon, fern passphrase recovery and joining the network.",
        difficulty: "Beginner",
        nodeCount: 12,
        build: buildWifiHack,
    },
];

export function getTemplate(id: string): Template | undefined {
    return TEMPLATES.find((t) => t.id === id);
}
