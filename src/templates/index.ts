/**
 * Starter templates.
 *
 * Each is a plain `ProjectDocument` factory, which means the templates are
 * themselves exercised by the compiler test suite (docs/01 §5). Ids are generated
 * deterministically so a template builds byte-identically every time and snapshot
 * tests stay stable.
 */
import { createProject, createQuest, type ProjectDocument } from "@/schema/project";
import { NODE_TYPES_REGISTRY, nodeTypeDef } from "@/schema/registry";
import type { NodeDoc, NodeType } from "@/schema/nodes";
import type { EdgeDoc } from "@/schema/edges";
import { layeredLayout } from "@/analysis/graph";

let counter = 0;
function resetIds() {
    counter = 0;
}
function tid(prefix: string): string {
    counter += 1;
    return `${prefix}${counter}`;
}

/* ── graph builders ──────────────────────────────────────────────────────── */

function makeNode(
    type: NodeType,
    position: { x: number; y: number },
    data?: Record<string, unknown>,
): NodeDoc {
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

/**
 * Run the same deterministic layered layout the canvas' "Tidy up" button uses, so
 * a template never opens with two cards on top of each other. Only applied when
 * the graph has wires — the reference sheet is a deliberate grid.
 */
function applyLayout(quest: ReturnType<typeof createQuest>): void {
    if (quest.graph.edges.length === 0) return;
    const positions = layeredLayout(quest.graph.nodes, quest.graph.edges);
    for (const node of quest.graph.nodes) {
        const position = positions[node.id];
        if (position) node.position = position;
    }
}

/** A trigger wired to the objective it completes — the most common pair. */
function triggerFor(
    objective: NodeDoc,
    event: string,
    conditions: { field: string; op: string; value: string }[],
    position: { x: number; y: number },
): { trigger: NodeDoc; edge: EdgeDoc } {
    const trigger = makeNode("trigger.event", position, {
        event,
        conditions: conditions.map((c, i) => ({ id: `c${i + 1}`, join: "and", ...c })),
    });
    return { trigger, edge: makeEdge(trigger, "when", objective, "trigger") };
}

/* ── templates ───────────────────────────────────────────────────────────── */

export interface Template {
    id: string;
    name: string;
    description: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced" | "Reference";
    nodeCount: number;
    build: () => ProjectDocument;
}

/**
 * The four lifecycle entry points and nothing else.
 *
 * They are deliberately *not* wired to each other — they are independent roots,
 * and starting from a template that already shows them unconnected teaches that
 * before it becomes a confusing bug.
 */
function buildBlank(): ProjectDocument {
    resetIds();
    const quest = createQuest({ id: "q-blank", name: "NewQuest", title: "New Quest" });
    const claim = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 150 });
    const complete = makeNode("entry.complete", { x: 0, y: 300 });
    const abandon = makeNode("entry.abandon", { x: 0, y: 450 });
    const note = makeNode("flow.note", { x: 300, y: 0 }, {
        text: "Each node on the left is an independent starting point.\n\nDrag from the palette onto the canvas, then pull from a coloured dot on the right of one node to a dot on the left of another.\n\nDelete this note when you are done reading it.",
        width: 300,
    });
    quest.graph = { nodes: [claim, load, complete, abandon, note], edges: [] };
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

    // Only the entry points this quest actually uses. An empty lifecycle node is
    // noise a beginner has to reason about.
    const claim = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 150 });
    const complete = makeNode("entry.complete", { x: 0, y: 300 });

    const notify = makeNode("fx.notify", { x: 300, y: 0 }, {
        message: "New job: scan 45.33.32.156 and report back.",
        variant: "toast",
        tone: "info",
    });
    const objective = makeNode("objective", { x: 620, y: 150 }, {
        name: "scan-target",
        description: "Scan 45.33.32.156 with nmap",
        hint: "Open a terminal and run nmap 45.33.32.156",
        terminalCommand: "nmap 45.33.32.156",
    });
    const pay = makeNode("fx.pay", { x: 300, y: 300 }, {
        amount: 500,
        description: "Recon bounty",
        fromName: "Anonymous Client",
    });

    const scan = triggerFor(
        objective,
        "Terminal.NmapScan",
        [{ field: "ip", op: "equals", value: "45.33.32.156" }],
        { x: 300, y: 150 },
    );

    quest.graph = {
        nodes: [claim, load, complete, notify, objective, pay, scan.trigger],
        edges: [
            makeEdge(claim, "out", notify, "in"),
            makeEdge(complete, "out", pay, "in"),
            scan.edge,
        ],
    };

    applyLayout(quest);

    return createProject({ quests: [quest], editor: { activeQuestId: quest.id, viewports: {} } });
}

/**
 * The beginner Wi-Fi quest: recon the air, crack the passphrase with fern, join
 * the network, then get paid. A straight line with no branches, so the shape of
 * the graph matches the shape of the story.
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

    const claim = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 300 });
    const complete = makeNode("entry.complete", { x: 0, y: 600 });

    const briefing = makeNode("comms.mail", { x: 300, y: 0 }, {
        from: "handler@anon.mail",
        subject: "Small job — the apartment next door",
        content:
            "<p>There is an access point called <b>NEIGHBOUR_5Ghz</b> two walls away. Get on it, then get onto the machine behind it. Payment on delivery.</p>",
        replyable: false,
    });

    const wifi = makeNode("world.wifi", { x: 600, y: 0 }, {
        ssid: "NEIGHBOUR_5Ghz",
        password: "letmein123",
        signal: 3,
        model: "TP-Link Archer C6",
    });

    const recon = makeNode("objective", { x: 900, y: 150 }, {
        name: "recon",
        description: "Scan the air for access points with bettercap",
        hint: "Open bettercap and run wifi.recon",
        terminalCommand: "bettercap",
    });
    const crack = makeNode("objective", { x: 900, y: 300 }, {
        name: "crack-passphrase",
        description: "Recover the WPA passphrase",
        hint: "The router model is printed on its admin page. fern can recover a passphrase from it.",
        terminalCommand: 'fern "TP-Link Archer C6"',
    });
    const join = makeNode("objective", { x: 900, y: 450 }, {
        name: "join-network",
        description: "Join NEIGHBOUR_5Ghz",
        hint: "Connect with the passphrase you recovered.",
    });

    const pay = makeNode("fx.pay", { x: 300, y: 600 }, {
        amount: 2500,
        description: "Wi-Fi job",
        fromName: "Anonymous Client",
    });

    const t1 = triggerFor(recon, "Bettercap.WifiRecon", [], { x: 600, y: 150 });
    const t2 = triggerFor(
        crack,
        "Fern.FindPassword",
        [{ field: "model", op: "equals", value: "TP-Link Archer C6" }],
        { x: 600, y: 300 },
    );
    const t3 = triggerFor(
        join,
        "Network.WifiConnected",
        [{ field: "ssid", op: "equals", value: "NEIGHBOUR_5Ghz" }],
        { x: 600, y: 450 },
    );

    quest.graph = {
        nodes: [
            claim,
            load,
            complete,
            briefing,
            wifi,
            recon,
            crack,
            join,
            pay,
            t1.trigger,
            t2.trigger,
            t3.trigger,
        ],
        edges: [
            makeEdge(claim, "out", briefing, "in"),
            makeEdge(briefing, "out", wifi, "in"),
            // Prerequisites: each objective unlocks the next.
            makeEdge(recon, "unlock", crack, "unlocked-by"),
            makeEdge(crack, "unlock", join, "unlocked-by"),
            makeEdge(complete, "out", pay, "in"),
            t1.edge,
            t2.edge,
            t3.edge,
        ],
    };

    applyLayout(quest);

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

/**
 * The flagship: a branching investigation across a corporate network, a website
 * with a hidden page, four communication channels, and a real decision point.
 *
 * Two objectives can be completed in either order; a branch then splits on what
 * the player actually found, and a manual passphrase gates the ending.
 */
function buildInvestigation(): ProjectDocument {
    resetIds();
    const quest = createQuest({
        id: "q-investigation",
        name: "LedgerJob",
        title: "The Ledger Job",
        description:
            "A whistleblower wants a set of books out of Meridian Capital's internal network. Two ways in, and only one of them is quiet.",
        group: "side",
        rewards: { money: 18000, xp: 640 },
        dataKeys: [
            { key: "targetIp", type: "string" },
            { key: "route", type: "string" },
        ],
    });

    /* ── lifecycle ──────────────────────────────────────────────────────── */
    const claim = makeNode("entry.start", { x: 0, y: 0 });
    const load = makeNode("entry.load", { x: 0, y: 450 });
    const complete = makeNode("entry.complete", { x: 0, y: 900 });
    const abandon = makeNode("entry.abandon", { x: 0, y: 1050 });

    /* ── world, built once at claim ─────────────────────────────────────── */
    const network = makeNode("world.network", { x: 320, y: 0 }, {
        ipMode: "random",
        destroyOnComplete: true,
        device: {
        id: "router1",
        ip: "10.0.0.1",
        type: "ROUTER",
        model: "Netgear Nighthawk R7000",
        vulnerabilities: [{ id: "v1", type: "SQL_INJECTION", version: "Apache 2.4.41" }],
        users: [
            { id: "u1", username: "admin", password: "changeme", firstName: "Site", lastName: "Admin", emailAddress: "admin@meridian-capital.net" },
        ],
        ports: [
            { id: "p1", external: 22, internal: 22, active: true, service: "ssh", version: "OpenSSH 8.9" },
            { id: "p2", external: 80, internal: 80, active: true, service: "http", version: "Apache 2.4.41" },
        ],
        rules: [],
        rootFiles: [],
        children: [
            {
                id: "dev1",
                ip: "10.0.0.14",
                type: "DEVICE",
                vulnerabilities: [],
                users: [
                    { id: "u2", username: "dockmaster", password: "forklift", firstName: "Dock", lastName: "Master" },
                ],
                ports: [{ id: "p3", external: 3306, internal: 3306, active: true, service: "mysql" }],
                rules: [],
                rootFiles: [
                    { id: "f1", name: "manifest-14", extension: "txt", isFolder: false, hidden: false, data: "CONTAINER MSKU-4471 — 14th, 02:40 — sealed, unsigned." },
                ],
                children: [],
            },
        ],
    },
    });
    const firewall = makeNode("world.firewall", { x: 640, y: 0 }, {
        ip: "{{data.targetIp}}",
        removeOnComplete: true,
        rule: { id: "r1", allowed: false, port: 3306, source: "*", destination: "*" },
    });
    const domain = makeNode("world.domain", { x: 640, y: 160 }, {
        domain: "intranet.meridian-capital.net",
        ip: "{{data.targetIp}}",
        removeOnComplete: true,
    });
    const dropFiles = makeNode("world.files", { x: 640, y: 320 }, {
        target: "device",
        ip: "{{data.targetIp}}",
        parentPath: "/var/www/intranet/",
    });
    const storeIp = makeNode("fx.setData", { x: 320, y: 160 }, {
        key: "targetIp",
        value: "{{network.routerIp}}",
    });

    /* ── briefing, re-sent on every load ────────────────────────────────── */
    const mail = makeNode("comms.mail", { x: 320, y: 450 }, {
        from: "r.okafor@protonmail.com",
        subject: "You were recommended to me",
        content:
            "<p>I work in compliance at Meridian Capital. There is a set of books on the intranet that my employers would prefer stayed private.</p><p>The intranet is at <b>intranet.meridian-capital.net</b>. Find your own way in — I cannot be seen helping.</p>",
        replyable: true,
        attachment: { name: "shift-roster", extension: "txt", content: "Night shift: 02:00-06:00. Badge logs disabled during maintenance windows." },
    });
    const kisscord = makeNode("comms.kisscord", { x: 640, y: 450 }, {
        contactId: "r.okafor",
        messages: [
            {
                id: "m1",
                content: "Did you get my mail? Keep it off the company channel.",
                isMine: false,
                delayMs: 0,
            },
            {
                id: "m2",
                content: "I'm not asking you to steal anything. Just the ledger export.",
                isMine: false,
                delayMs: 2200,
            },
            {
                id: "m3",
                content: "There's a maintenance page on the intranet. It isn't linked from anywhere. That's your way in.",
                isMine: false,
                delayMs: 2600,
                locked: true,
                unlocksAfter: ["recon"],
            },
        ],
    });
    const weechat = makeNode("comms.weechat", { x: 640, y: 700 }, {
        host: "irc.meridian-capital.net",
        password: "guest",
        registerServer: true,
        messages: [
            { id: "w1", content: "nightly batch starts at 02:00, logs purge at 06:00", username: "sysop", isMine: false, delayMs: 0 },
            { id: "w2", content: "reminder: maintenance window = badge logs off", username: "sysop", isMine: false, delayMs: 1800 },
        ],
    });
    const call = makeNode("comms.call", { x: 320, y: 700 }, { branch: "default", startIndex: 0 });

    /* ── objectives ─────────────────────────────────────────────────────── */
    const recon = makeNode("objective", { x: 980, y: 150 }, {
        name: "recon",
        description: "Map the intranet host",
        hint: "nmap the address intranet.meridian-capital.net resolves to.",
        terminalCommand: "nmap intranet.meridian-capital.net",
    });
    const findPage = makeNode("objective", { x: 980, y: 320 }, {
        name: "find-maintenance-page",
        description: "Find the unlinked maintenance page",
        hint: "Something on that host is not in the search index. dirhunter finds paths by guessing them.",
        terminalCommand: "dirhunter intranet.meridian-capital.net",
    });
    const exfil = makeNode("objective", { x: 1620, y: 560 }, {
        name: "exfil-ledger",
        description: "Download the ledger export",
        hint: "It is on the host you got into. Look under /var/www/intranet/exports/.",
        hidden: true,
    });

    /* ── the branch ─────────────────────────────────────────────────────── */
    const branch = makeNode("flow.branch", { x: 1300, y: 320 }, {
        source: "event",
        conditions: [{ id: "b1", join: "and", field: "results", op: "contains", value: "/maintenance" }],
    });
    const quietPath = makeNode("fx.setData", { x: 1620, y: 200 }, { key: "route", value: "quiet" });
    const loudPath = makeNode("fx.setData", { x: 1620, y: 400 }, { key: "route", value: "loud" });
    const tipQuiet = makeNode("fx.notify", { x: 1900, y: 200 }, {
        message: "The maintenance page accepts no credentials at all. Nobody noticed you were here.",
        variant: "notify",
        tone: "success",
    });
    const tipLoud = makeNode("fx.notify", { x: 1900, y: 400 }, {
        message: "You brute-forced your way in. The badge logs will show it — move fast.",
        variant: "notify",
        tone: "warning",
    });

    /* ── the passphrase gate ────────────────────────────────────────────── */
    const passphrase = makeNode("reply.input", { x: 1900, y: 560 }, {
        commandName: "decrypt",
        commandDescription: "Decrypt the ledger export",
        prompt: "Archive passphrase >",
        mask: true,
        matchMode: "exact",
        expected: "MERIDIAN-02-06",
        caseSensitive: false,
        successMessage: "Archive decrypted. 214 records recovered.",
        failureMessage: "Wrong passphrase. The archive is still sealed.",
    });
    const hintCall = makeNode("fx.handbook", { x: 1620, y: 700 }, {
        articleId: "night-shift",
        category: "Meridian Capital",
    });
    const decrypted = makeNode("fx.notify", { x: 2200, y: 480 }, {
        message: "Archive decrypted. 214 records recovered. Okafor has them.",
        variant: "notify",
        tone: "success",
    });
    const sealed = makeNode("fx.notify", { x: 2200, y: 640 }, {
        message: "The archive is still sealed. The passphrase is somewhere in what you have already read.",
        variant: "notify",
        tone: "warning",
    });

    /* ── rewards ────────────────────────────────────────────────────────── */
    const pay = makeNode("fx.pay", { x: 320, y: 900 }, {
        amount: 18000,
        description: "Ledger job",
        fromIBAN: "DE89370400440532013000",
        fromName: "R. Okafor",
    });
    const cleanup = makeNode("fx.notify", { x: 320, y: 1050 }, {
        message: "Okafor has deleted the thread. You were never here.",
        variant: "toast",
        tone: "info",
    });

    /* ── triggers ───────────────────────────────────────────────────────── */
    const tRecon = triggerFor(
        recon,
        "Terminal.NmapScan",
        [{ field: "ip", op: "notEmpty", value: "" }],
        { x: 660, y: 150 },
    );
    const tDirhunter = triggerFor(findPage, "Terminal.Dirhunter", [], { x: 660, y: 320 });
    const tDownload = triggerFor(
        exfil,
        "Files.Downloaded",
        [{ field: "name", op: "contains", value: "ledger" }],
        { x: 1300, y: 560 },
    );

    /* ── phone dialog lives on the quest, not the node ──────────────────── */
    quest.dialog = [
        {
            id: "d1",
            name: "default",
            lines: [
                {
                    id: "l1",
                    speaker: "R. Okafor",
                    text: "You found the page. Good. I can't talk long.",
                    isEnd: false,
                    options: [
                        { id: "o1", label: "What's the passphrase?", text: "The archive is sealed. What's the passphrase?", nextIndex: 1, isEnd: false },
                        { id: "o2", label: "Who else knows?", text: "Who else knows about this?", nextIndex: 2, isEnd: false },
                    ],
                },
                {
                    id: "l2",
                    speaker: "R. Okafor",
                    text: "It's the maintenance window, written the way the badge system writes it. You'll have seen it somewhere.",
                    isEnd: true,
                    options: [],
                },
                {
                    id: "l3",
                    speaker: "R. Okafor",
                    text: "Nobody. That's rather the point. Don't make it not nobody.",
                    isEnd: true,
                    options: [],
                },
            ],
        },
    ];

    quest.graph = {
        nodes: [
            claim, load, complete, abandon,
            network, firewall, domain, dropFiles, storeIp,
            mail, kisscord, weechat, call,
            recon, findPage, exfil,
            branch, quietPath, loudPath, tipQuiet, tipLoud,
            passphrase, hintCall, decrypted, sealed,
            pay, cleanup,
            tRecon.trigger, tDirhunter.trigger, tDownload.trigger,
        ],
        edges: [
            // Claim: build the world once.
            makeEdge(claim, "out", network, "in"),
            makeEdge(network, "out", storeIp, "in"),
            makeEdge(storeIp, "out", firewall, "in"),
            makeEdge(firewall, "out", domain, "in"),
            makeEdge(domain, "out", dropFiles, "in"),

            // Every load: make sure the player can still reach the story.
            makeEdge(load, "out", mail, "in"),
            makeEdge(mail, "out", kisscord, "in"),
            makeEdge(kisscord, "out", weechat, "in"),
            makeEdge(weechat, "out", call, "in"),
            makeEdge(call, "out", hintCall, "in"),

            // Objectives and the order they unlock in.
            makeEdge(recon, "unlock", findPage, "unlocked-by"),
            tRecon.edge,
            tDirhunter.edge,

            // The split: did the player find the quiet way in?
            makeEdge(findPage, "done", branch, "in"),
            makeEdge(branch, "true", quietPath, "in"),
            makeEdge(branch, "false", loudPath, "in"),
            makeEdge(quietPath, "out", tipQuiet, "in"),
            makeEdge(loudPath, "out", tipLoud, "in"),
            makeEdge(tipQuiet, "out", exfil, "in"),
            makeEdge(tipLoud, "out", exfil, "in"),
            tDownload.edge,

            // The ending is gated on a passphrase the player has to piece
            // together from the mail, the IRC log and the phone call.
            makeEdge(exfil, "done", passphrase, "in"),
            makeEdge(passphrase, "success", decrypted, "in"),
            makeEdge(passphrase, "failure", sealed, "in"),

            makeEdge(complete, "out", pay, "in"),
            makeEdge(abandon, "out", cleanup, "in"),
        ],
    };

    applyLayout(quest);

    return createProject({
        mod: {
            id: "the-ledger-job",
            name: "The Ledger Job",
            version: "1.0.0",
            author: "",
            description:
                "A branching corporate-intrusion investigation: two routes in, a decision point, and a passphrase the player has to piece together from four channels.",
            tags: ["quest", "investigation", "branching", "network", "advanced"],
            dependencies: [],
            minSdkVersion: "0.21.0",
            apiVersion: 1,
        },
        quests: [quest],
        editor: { activeQuestId: quest.id, viewports: {} },
    });
}

/* ── The reference quest ─────────────────────────────────────────────────── */

/**
 * Example data for the fields whose defaults would not teach anything. Anything
 * not listed here uses the registry's own seed, which is already sensible.
 */
const EXAMPLES: Partial<Record<NodeType, Record<string, unknown>>> = {
    objective: {
        name: "example-objective",
        description: "Retrieve the shipping manifest from the warehouse host.",
        hint: "The manifest is a file. You will need to be on the machine first.",
        info: "Manifests are regenerated nightly; the copy you want is dated the 14th.",
        terminalCommand: "scp dockmaster@10.0.0.14:/var/log/manifest-14.txt .",
        hidden: false,
    },
    "trigger.event": {
        event: "Files.Downloaded",
        conditions: [{ id: "c1", join: "and", field: "name", op: "contains", value: "manifest" }],
    },
    "world.network": {
        ipMode: "random",
        destroyOnComplete: true,
        device: {
        id: "router1",
        ip: "10.0.0.1",
        type: "ROUTER",
        model: "Netgear Nighthawk R7000",
        vulnerabilities: [{ id: "v1", type: "SQL_INJECTION", version: "Apache 2.4.41" }],
        users: [
            { id: "u1", username: "admin", password: "changeme", firstName: "Site", lastName: "Admin", emailAddress: "admin@meridian-capital.net" },
        ],
        ports: [
            { id: "p1", external: 22, internal: 22, active: true, service: "ssh", version: "OpenSSH 8.9" },
            { id: "p2", external: 80, internal: 80, active: true, service: "http", version: "Apache 2.4.41" },
        ],
        rules: [],
        rootFiles: [],
        children: [
            {
                id: "dev1",
                ip: "10.0.0.14",
                type: "DEVICE",
                vulnerabilities: [],
                users: [
                    { id: "u2", username: "dockmaster", password: "forklift", firstName: "Dock", lastName: "Master" },
                ],
                ports: [{ id: "p3", external: 3306, internal: 3306, active: true, service: "mysql" }],
                rules: [],
                rootFiles: [
                    { id: "f1", name: "manifest-14", extension: "txt", isFolder: false, hidden: false, data: "CONTAINER MSKU-4471 — 14th, 02:40 — sealed, unsigned." },
                ],
                children: [],
            },
        ],
    },
    },
    "world.wifi": {
        ssid: "DOCKNET-5G",
        password: "forklift",
        signal: 2,
        model: "TP-Link Archer C6",
    },
    "world.firewall": {
        ip: "10.0.0.1",
        removeOnComplete: true,
        rule: { id: "r1", allowed: false, port: 22, source: "*", destination: "*" },
    },
    "world.port": {
        ip: "10.0.0.14",
        action: "open",
        port: { id: "p1", external: 22, internal: 22, service: "ssh", active: true },
        restoreOnComplete: true,
    },
    "world.domain": {
        domain: "docknet.internal",
        ip: "10.0.0.14",
        removeOnComplete: true,
    },
    "world.database": {
        host: "10.0.0.14",
        user: "dockmaster",
        password: "forklift",
        removeOnComplete: true,
    },
    "world.files": {
        target: "device",
        ip: "10.0.0.14",
        parentPath: "/var/log/",
        files: [
            {
                id: "f1",
                name: "manifest-14",
                extension: "txt",
                isFolder: false,
                hidden: false,
                data: "CONTAINER MSKU-4471 — 14th, 02:40 — sealed, unsigned.",
            },
        ],
    },
    "world.toolResponse": {
        command: "nmap",
        input: "10.0.0.14",
        dataText:
            "Starting Nmap 7.94 ( https://nmap.org )\nNmap scan report for 10.0.0.14\nHost is up (0.0021s latency).\nPORT   STATE SERVICE VERSION\n22/tcp open  ssh     OpenSSH 8.9\n80/tcp open  http    Apache 2.4.41\n\nNmap done: 1 IP address (1 host up) scanned in 1.84 seconds",
        removeOnComplete: true,
    },
    "comms.mail": {
        from: "shift.foreman@docknet.internal",
        to: "player@mail.local",
        subject: "Re: container MSKU-4471",
        content:
            "<p>That container was never logged. Do not ask about it on the company channel.</p>",
        replyable: true,
        attachment: {
            name: "shift-roster",
            extension: "txt",
            content: "Night shift 02:00-06:00. Badge logs disabled during maintenance.",
        },
    },
    "comms.call": { branch: "default", startIndex: 0 },
    "comms.kisscord": {
        contactId: "shift.foreman",
        messages: [
            { id: "m1", content: "You're asking about 4471. Stop.", isMine: false, delayMs: 0 },
            { id: "m2", content: "Fine. The manifest is in /var/log/. You didn't get it from me.", isMine: false, delayMs: 2400 },
        ],
    },
    "comms.weechat": {
        host: "irc.docknet.internal",
        password: "guest",
        registerServer: true,
        messages: [
            { id: "w1", content: "nightly batch at 02:00, logs purge at 06:00", username: "sysop", isMine: false, delayMs: 0 },
        ],
    },
    "comms.tweet": {
        accountId: "dockwatch",
        content: "Something moved on the night of the 14th that isn't in any manifest.",
        likes: 42,
        comments: 7,
        shares: 11,
        views: 3180,
        postedAgo: "3h",
    },
    "reply.hackertyper": {
        surface: "website",
        targetRef: "docknet.internal",
        text: "ACCESS GRANTED\nDecrypting manifest MSKU-4471…\n214 records recovered.",
        heading: "MANIFEST TERMINAL",
        charsPerKeypress: 4,
        eventName: "",
    },
    "reply.input": {
        commandName: "decrypt",
        commandDescription: "Decrypt a sealed manifest archive",
        prompt: "Archive passphrase >",
        mask: true,
        matchMode: "exact",
        expected: "MSKU-4471",
        caseSensitive: false,
        successMessage: "Archive decrypted.",
        failureMessage: "Wrong passphrase.",
    },
    "fx.pay": { amount: 4200, description: "Consulting fee", fromName: "Dock Workers' Union" },
    "fx.withdraw": { amount: 250, description: "Equipment rental" },
    "fx.notify": {
        message: "Badge log shows an entry at 02:40 with no matching exit.",
        variant: "toast",
        tone: "info",
    },
    "fx.setData": { key: "containerId", value: "MSKU-4471" },
    "fx.claimQuest": { questName: "NextQuest" },
    "fx.shell": { command: "echo 'manifest retrieved' >> ~/notes.txt" },
    "fx.handbook": { articleId: "night-shift", category: "Dock Operations" },
    "flow.branch": {
        source: "data",
        conditions: [{ id: "c1", join: "and", field: "containerId", op: "equals", value: "MSKU-4471" }],
    },
    "flow.delay": { ms: 2500 },
    "flow.random": {
        options: [
            { id: "o1", label: "MSKU-4471" },
            { id: "o2", label: "MSKU-4472" },
        ],
        storeAs: "containerId",
    },
    "flow.note": {
        text: "This quest is a reference sheet, not a story.\n\nEvery node type is here once, filled with example input. Select any node and hover the ⓘ next to a field label to read what it does.",
        width: 300,
    },
};

/**
 * Every node type, once, filled with example data.
 *
 * This is the "what am I even supposed to type here" answer. It is deliberately
 * laid out by category rather than wired into a story: the point is to read the
 * fields, not to follow a plot.
 */
function buildReference(): ProjectDocument {
    resetIds();
    const quest = createQuest({
        id: "q-reference",
        name: "NodeReference",
        title: "Node Reference",
        description: "Every node type, filled with example input. Not a playable quest.",
        rewards: { money: 0, xp: 0 },
        dataKeys: [{ key: "containerId", type: "string" }],
    });

    const groups = [
        { id: "entry", title: "Quest lifecycle — four independent starting points" },
        { id: "objective", title: "Objectives" },
        { id: "trigger", title: "Triggers" },
        { id: "world", title: "World building" },
        { id: "comms", title: "Communication" },
        { id: "reply", title: "Player replies" },
        { id: "effect", title: "Effects" },
        { id: "flow", title: "Flow control" },
    ];

    const nodes: NodeDoc[] = [];
    const ROW_HEIGHT = 200;
    const COL_WIDTH = 250;

    groups.forEach((group, row) => {
        const types = (Object.keys(NODE_TYPES_REGISTRY) as NodeType[]).filter(
            (t) => nodeTypeDef(t).category === group.id,
        );
        const y = row * (ROW_HEIGHT + 120);

        nodes.push(
            makeNode("flow.note", { x: 0, y }, {
                text: group.title,
                width: 220,
            }),
        );

        types.forEach((type, col) => {
            nodes.push(
                makeNode(type, { x: 280 + col * COL_WIDTH, y }, EXAMPLES[type]),
            );
        });
    });

    quest.graph = { nodes, edges: [] };
    quest.dialog = [
        {
            id: "d1",
            name: "default",
            lines: [
                {
                    id: "l1",
                    speaker: "Shift foreman",
                    text: "You're asking about 4471. Stop.",
                    isEnd: false,
                    options: [
                        { id: "o1", label: "Why?", text: "Why should I stop?", nextIndex: 1, isEnd: false },
                    ],
                },
                { id: "l2", speaker: "Shift foreman", text: "Because I'm asking you to.", isEnd: true, options: [] },
            ],
        },
    ];

    return createProject({
        mod: {
            id: "node-reference",
            name: "Node Reference",
            version: "1.0.0",
            author: "",
            description: "A reference sheet: every node type with example input.",
            tags: ["reference", "documentation"],
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
        description: "The four lifecycle entry points and an explanatory note. Start from scratch.",
        difficulty: "Beginner",
        nodeCount: 5,
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
            "Briefing e-mail, a crackable access point, bettercap recon, fern passphrase recovery and joining the network — all in a straight line.",
        difficulty: "Beginner",
        nodeCount: 12,
        build: buildWifiHack,
    },
    {
        id: "investigation",
        name: "Complex Branching Investigation",
        description:
            "A corporate network behind a firewall, a website with an unlinked page, mail / Kisscord / WeeChat / a phone call, a branch on how the player got in, and a passphrase ending.",
        difficulty: "Advanced",
        nodeCount: 30,
        build: buildInvestigation,
    },
    {
        id: "reference",
        name: "Node Reference",
        description:
            "Every node type on one canvas, filled with example input. Open it to see what a field expects before you build your own.",
        difficulty: "Reference",
        nodeCount: 40,
        build: buildReference,
    },
];

export function getTemplate(id: string): Template | undefined {
    return TEMPLATES.find((t) => t.id === id);
}
