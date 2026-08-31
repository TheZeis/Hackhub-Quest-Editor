/**
 * The node-type registry.
 *
 * One entry per node type, carrying everything the UI needs: palette metadata,
 * socket layout, default data, and the inspector's field descriptors. Adding a
 * node type means adding an entry here — the palette, the canvas and the
 * inspector all read from it.
 *
 * The descriptors are hand-authored per node type (docs/01 §4.1 deliberately
 * rejects a JSON-schema-driven form generator), but rendered by one shared
 * inspector engine so every node gets consistent, accessible controls.
 */
import { z } from "zod";
import { nanoid } from "nanoid";
import type { EdgeKind, HandleSpec } from "./edges";
import {
    BranchNodeDataSchema,
    CallNodeDataSchema,
    ClaimQuestNodeDataSchema,
    DatabaseNodeDataSchema,
    DelayNodeDataSchema,
    DomainNodeDataSchema,
    EntryStartData,
    FilesNodeDataSchema,
    FirewallNodeDataSchema,
    HandbookNodeDataSchema,
    HackertyperNodeDataSchema,
    KisscordNodeDataSchema,
    MailNodeDataSchema,
    ManualInputNodeDataSchema,
    NetworkNodeDataSchema,
    NotifyNodeDataSchema,
    ObjectiveDataSchema,
    PayNodeDataSchema,
    PortNodeDataSchema,
    RandomPickNodeDataSchema,
    SetDataNodeDataSchema,
    ShellExecNodeDataSchema,
    ToolResponseNodeDataSchema,
    TriggerEventDataSchema,
    TweetNodeDataSchema,
    WeeChatNodeDataSchema,
    WifiNodeDataSchema,
    NoteNodeDataSchema,
    type NodeDoc,
    type NodeType,
} from "./nodes";
import { VULNERABILITY_TYPES } from "./common";

/* ── Inspector field descriptors ─────────────────────────────────────────── */

export type FieldDef =
    | {
          kind: "text";
          key: string;
          label: string;
          hint?: string;
          placeholder?: string;
          mono?: boolean;
          /** Offer the `{{data.targetIp}}` token menu. */
          tokens?: boolean;
      }
    | {
          kind: "textarea";
          key: string;
          label: string;
          hint?: string;
          placeholder?: string;
          mono?: boolean;
          tokens?: boolean;
          rows?: number;
      }
    | { kind: "number"; key: string; label: string; hint?: string; min?: number; max?: number; step?: number }
    | { kind: "toggle"; key: string; label: string; hint?: string }
    | {
          kind: "select";
          key: string;
          label: string;
          hint?: string;
          options: readonly { value: string; label: string; hint?: string }[];
      }
    | { kind: "event"; key: string; label: string; hint?: string }
    | { kind: "conditions"; key: string; label: string; hint?: string }
    | {
          kind: "list";
          key: string;
          label: string;
          hint?: string;
          addLabel: string;
          /** Text shown for a row when it has no meaningful title yet. */
          itemTitle: (item: Record<string, unknown>, index: number) => string;
          fields: FieldDef[];
          newItem: () => Record<string, unknown>;
      }
    | { kind: "deviceTree"; key: string; label: string; hint?: string }
    | { kind: "section"; label: string; hint?: string; fields: FieldDef[] }
    | { kind: "note"; text: string; tone?: "info" | "warn" };

/* ── Categories ──────────────────────────────────────────────────────────── */

export const CATEGORIES = [
    { id: "entry", label: "Quest lifecycle", color: "var(--color-cat-entry)", icon: "play" },
    { id: "objective", label: "Objectives", color: "var(--color-cat-objective)", icon: "target" },
    { id: "trigger", label: "Triggers", color: "var(--color-cat-trigger)", icon: "zap" },
    { id: "world", label: "World building", color: "var(--color-cat-world)", icon: "globe" },
    { id: "comms", label: "Communication", color: "var(--color-cat-comms)", icon: "message" },
    { id: "reply", label: "Player replies", color: "var(--color-cat-reply)", icon: "keyboard" },
    { id: "effect", label: "Effects", color: "var(--color-cat-effect)", icon: "sparkle" },
    { id: "flow", label: "Flow control", color: "var(--color-cat-flow)", icon: "branch" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/* ── Socket presets ──────────────────────────────────────────────────────── */

const inFlow: HandleSpec = { id: "in", kind: "flow", label: "In" };
const outFlow: HandleSpec = { id: "out", kind: "flow", label: "Out" };
const whenOut: HandleSpec = { id: "when", kind: "condition", label: "When" };
const triggerIn: HandleSpec = { id: "trigger", kind: "condition", label: "Trigger" };
const unlockOut: HandleSpec = { id: "unlock", kind: "unlock", label: "Unlocks" };
const unlockIn: HandleSpec = { id: "unlocked-by", kind: "unlock", label: "Unlocked by" };
const doneOut: HandleSpec = { id: "done", kind: "flow", label: "On complete" };
const successOut: HandleSpec = { id: "success", kind: "flow", label: "Correct" };
const failureOut: HandleSpec = { id: "failure", kind: "flow", label: "Wrong" };
const trueOut: HandleSpec = { id: "true", kind: "flow", label: "Yes" };
const falseOut: HandleSpec = { id: "false", kind: "flow", label: "No" };

const io = { targets: [inFlow], sources: [outFlow] };

/* ── Reusable field groups ───────────────────────────────────────────────── */

const portFields: FieldDef[] = [
    { kind: "number", key: "external", label: "External port", min: 0, max: 65535 },
    { kind: "number", key: "internal", label: "Internal port", min: 0, max: 65535 },
    { kind: "text", key: "service", label: "Service", placeholder: "ssh", mono: true },
    { kind: "text", key: "version", label: "Version", placeholder: "OpenSSH 8.9", mono: true },
    { kind: "toggle", key: "active", label: "Open", hint: "Closed ports show as filtered to nmap." },
];

const userFields: FieldDef[] = [
    { kind: "text", key: "username", label: "Username", mono: true },
    { kind: "text", key: "password", label: "Password", mono: true, hint: "Leave blank to let the game pick one." },
    { kind: "text", key: "firstName", label: "First name" },
    { kind: "text", key: "lastName", label: "Last name" },
    { kind: "text", key: "emailAddress", label: "E-mail", mono: true },
    { kind: "toggle", key: "acceptReverseTCP", label: "Accepts reverse TCP" },
];

const vulnFields: FieldDef[] = [
    {
        kind: "select",
        key: "type",
        label: "Type",
        options: VULNERABILITY_TYPES.map((t) => ({ value: t, label: t })),
    },
    { kind: "text", key: "version", label: "Version", placeholder: "optional", mono: true },
];

const ruleFields: FieldDef[] = [
    { kind: "number", key: "port", label: "Port", min: 0, max: 65535 },
    { kind: "toggle", key: "allowed", label: "Allowed", hint: "Off means the port is blocked by the firewall." },
    { kind: "text", key: "source", label: "Source", placeholder: "*", mono: true },
    { kind: "text", key: "destination", label: "Destination", placeholder: "*", mono: true },
    { kind: "toggle", key: "locked", label: "Locked", hint: "The player cannot remove a locked rule." },
];

const fileFields: FieldDef[] = [
    { kind: "text", key: "name", label: "Name", mono: true },
    { kind: "text", key: "extension", label: "Extension", placeholder: "txt", mono: true },
    { kind: "toggle", key: "isFolder", label: "Folder" },
    { kind: "toggle", key: "hidden", label: "Hidden" },
    { kind: "textarea", key: "data", label: "Contents", mono: true, rows: 4 },
];

const kisscordMsgFields: FieldDef[] = [
    { kind: "textarea", key: "content", label: "Message", rows: 3, tokens: true },
    { kind: "toggle", key: "isMine", label: "Sent by the player" },
    { kind: "number", key: "delayMs", label: "Delay (ms)", min: 0, step: 100 },
];

const weechatMsgFields: FieldDef[] = [
    { kind: "textarea", key: "content", label: "Message", rows: 3, tokens: true },
    { kind: "text", key: "username", label: "Username", mono: true, hint: "Ignored when sent by the player." },
    { kind: "toggle", key: "isMine", label: "Sent by the player" },
    { kind: "number", key: "delayMs", label: "Delay (ms)", min: 0, step: 100 },
];

/**
 * Reusable field groups, exported so the network device editor can render the
 * same port/user/rule/vulnerability controls the node inspectors use.
 */
export const FIELD_GROUPS = {
    ports: {
        fields: portFields,
        addLabel: "Add port",
        itemTitle: (p: Record<string, unknown>) => `${p.external}/${p.service ?? "?"}`,
        newItem: () => ({ id: nanoid(8), external: 80, internal: 80, active: true, service: "http" }),
    },
    users: {
        fields: userFields,
        addLabel: "Add account",
        itemTitle: (u: Record<string, unknown>) => String(u.username ?? "account"),
        newItem: () => ({ id: nanoid(8), username: "admin" }),
    },
    rules: {
        fields: ruleFields,
        addLabel: "Add rule",
        itemTitle: (r: Record<string, unknown>) => `${r.allowed ? "Allow" : "Block"} ${r.port}`,
        newItem: () => ({ id: nanoid(8), allowed: false, port: 22, source: "*" }),
    },
    vulnerabilities: {
        fields: vulnFields,
        addLabel: "Add vulnerability",
        itemTitle: (v: Record<string, unknown>) => String(v.type),
        newItem: () => ({ id: nanoid(8), type: "SQL_INJECTION" }),
    },
    files: {
        fields: fileFields,
        addLabel: "Add file",
        itemTitle: (f: Record<string, unknown>, i: number) =>
            f.isFolder ? `📁 ${String(f.name ?? "")}` : String(f.name ?? `file ${i + 1}`),
        newItem: () => ({ id: nanoid(8), name: "readme", extension: "txt", isFolder: false, data: "" }),
    },
} as const;

/* ── The registry ────────────────────────────────────────────────────────── */

export interface NodeTypeDef {
    type: NodeType;
    category: CategoryId;
    label: string;
    /** One-line description shown in the palette. */
    blurb: string;
    icon: string;
    targets: HandleSpec[];
    sources: HandleSpec[];
    /** Which lifecycle hook the compiler emits this node's statements into. */
    hook: "onStart" | "onObjectivesStart" | "onComplete" | "onAbandon" | "declarative";
    fields: FieldDef[];
    create: () => NodeDoc["data"];
}

/** Parse a seed through a schema so every `.default()` is materialised. */
function seed<S extends z.ZodTypeAny>(schema: S, input: unknown = {}): z.infer<S> {
    return schema.parse(input);
}

const entryFields: FieldDef[] = [
    {
        kind: "note",
        tone: "info",
        text: "Everything wired below this node runs in that lifecycle hook. Event listeners belong under “Objectives start”, never under “Quest start” — they are wiped on reload.",
    },
];

export const NODE_TYPES_REGISTRY: Record<NodeType, NodeTypeDef> = {
    "entry.start": {
        type: "entry.start",
        category: "entry",
        label: "Quest start",
        blurb: "Runs once, when the quest is claimed",
        icon: "flag",
        targets: [],
        sources: [outFlow],
        hook: "onStart",
        fields: entryFields,
        create: () => seed(EntryStartData),
    },
    "entry.load": {
        type: "entry.load",
        category: "entry",
        label: "Objectives start",
        blurb: "Runs on claim and on every game load",
        icon: "refresh",
        targets: [],
        sources: [outFlow],
        hook: "onObjectivesStart",
        fields: entryFields,
        create: () => seed(EntryStartData),
    },
    "entry.complete": {
        type: "entry.complete",
        category: "entry",
        label: "Quest complete",
        blurb: "Runs when every objective is done",
        icon: "check",
        targets: [],
        sources: [outFlow],
        hook: "onComplete",
        fields: entryFields,
        create: () => seed(EntryStartData),
    },
    "entry.abandon": {
        type: "entry.abandon",
        category: "entry",
        label: "Quest abandoned",
        blurb: "Runs when the player gives up",
        icon: "x",
        targets: [],
        sources: [outFlow],
        hook: "onAbandon",
        fields: entryFields,
        create: () => seed(EntryStartData),
    },

    objective: {
        type: "objective",
        category: "objective",
        label: "Objective",
        blurb: "A task the player must complete",
        icon: "target",
        targets: [inFlow, triggerIn, unlockIn],
        sources: [doneOut, unlockOut],
        hook: "declarative",
        fields: [
            { kind: "text", key: "name", label: "Identifier", mono: true, hint: "Unique within the quest. Used by triggers and unlocksAfter." },
            { kind: "textarea", key: "description", label: "Shown to the player", rows: 2 },
            { kind: "textarea", key: "hint", label: "Hint", rows: 2 },
            { kind: "textarea", key: "info", label: "Extra info", rows: 2 },
            { kind: "text", key: "terminalCommand", label: "Suggested command", mono: true },
            { kind: "toggle", key: "hidden", label: "Hidden until unlocked" },
        ],
        create: () => seed(ObjectiveDataSchema),
    },

    "trigger.event": {
        type: "trigger.event",
        category: "trigger",
        label: "When event",
        blurb: "React to something the player does",
        icon: "zap",
        targets: [],
        sources: [whenOut],
        hook: "declarative",
        fields: [
            { kind: "event", key: "event", label: "Game event", hint: "All 92 HackHub events, with their real payload fields." },
            { kind: "conditions", key: "conditions", label: "Only when", hint: "Leave empty to fire on any occurrence." },
        ],
        create: () => seed(TriggerEventDataSchema),
    },

    "world.network": {
        type: "world.network",
        category: "world",
        label: "Create network",
        blurb: "Routers, devices, firewalls and ports",
        icon: "network",
        ...io,
        hook: "onStart",
        fields: [
            {
                kind: "select",
                key: "ipMode",
                label: "Router IP",
                options: [
                    { value: "random", label: "Random public IP", hint: "Allocated per playthrough via Network.randomIp()" },
                    { value: "fixed", label: "Fixed IP" },
                ],
            },
            { kind: "deviceTree", key: "device", label: "Devices" },
            { kind: "toggle", key: "destroyOnComplete", label: "Tear down when the quest ends" },
        ],
        create: () =>
            seed(NetworkNodeDataSchema, {
                device: {
                    id: nanoid(8),
                    ip: "45.33.32.156",
                    type: "ROUTER",
                    vulnerabilities: [],
                    users: [],
                    ports: [{ id: nanoid(8), external: 80, internal: 80, active: true, service: "http" }],
                    rules: [],
                    rootFiles: [],
                    children: [],
                },
            }),
    },

    "world.wifi": {
        type: "world.wifi",
        category: "world",
        label: "Create Wi-Fi",
        blurb: "A crackable access point",
        icon: "wifi",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "ssid", label: "Network name (SSID)", mono: true },
            { kind: "text", key: "password", label: "WPA passphrase", mono: true, hint: "The player recovers this via handshake capture." },
            { kind: "number", key: "signal", label: "Signal strength", min: 0, max: 3, hint: "Also drives how long joining takes." },
            { kind: "text", key: "model", label: "Router model", mono: true, hint: "Enables the in-game `fern` recovery route. Leave blank to disable it." },
            {
                kind: "list",
                key: "users",
                label: "Router accounts",
                addLabel: "Add account",
                itemTitle: (u) => String(u.username ?? "account"),
                fields: userFields,
                newItem: () => ({ id: nanoid(8), username: "admin" }),
            },
            {
                kind: "list",
                key: "ports",
                label: "Router ports",
                addLabel: "Add port",
                itemTitle: (p) => `${p.external}/${p.service ?? "?"}`,
                fields: portFields,
                newItem: () => ({ id: nanoid(8), external: 80, internal: 80, active: true, service: "http" }),
            },
            { kind: "deviceTree", key: "children", label: "Devices behind the access point" },
            { kind: "toggle", key: "destroyOnComplete", label: "Tear down when the quest ends" },
        ],
        create: () => seed(WifiNodeDataSchema, { ssid: "NEIGHBOUR_5Ghz", password: "letmein123" }),
    },

    "world.firewall": {
        type: "world.firewall",
        category: "world",
        label: "Firewall rule",
        blurb: "Allow or block a port",
        icon: "shield",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "ip", label: "Protected IP", mono: true, tokens: true },
            {
                kind: "list",
                key: "rule",
                label: "Rule",
                addLabel: "Add rule",
                itemTitle: (r) => `${r.allowed ? "Allow" : "Block"} ${r.port}`,
                fields: ruleFields,
                newItem: () => ({ id: nanoid(8), allowed: false, port: 22, source: "*" }),
            },
            { kind: "toggle", key: "removeOnComplete", label: "Remove when the quest ends" },
        ],
        create: () =>
            seed(FirewallNodeDataSchema, {
                ip: "",
                rule: { id: nanoid(8), allowed: false, port: 22, source: "*" },
            }),
    },

    "world.port": {
        type: "world.port",
        category: "world",
        label: "Change port",
        blurb: "Open, close, add or remove a port",
        icon: "plug",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "ip", label: "Device IP", mono: true, tokens: true, hint: "A router IP or any device behind it." },
            {
                kind: "select",
                key: "action",
                label: "Action",
                options: [
                    { value: "open", label: "Open" },
                    { value: "close", label: "Close", hint: "Closing internal port 22 also drops live SSH sessions." },
                    { value: "add", label: "Add" },
                    { value: "remove", label: "Remove" },
                ],
            },
            { kind: "number", key: "port.external", label: "External port", min: 0, max: 65535 },
            { kind: "number", key: "port.internal", label: "Internal port", min: 0, max: 65535 },
            { kind: "text", key: "port.service", label: "Service", mono: true },
            { kind: "toggle", key: "port.active", label: "Open" },
            { kind: "toggle", key: "restoreOnComplete", label: "Restore when the quest ends" },
        ],
        create: () =>
            seed(PortNodeDataSchema, {
                ip: "",
                port: { id: nanoid(8), external: 22, internal: 22, active: true, service: "ssh" },
            }),
    },

    "world.domain": {
        type: "world.domain",
        category: "world",
        label: "Register domain",
        blurb: "Point a hostname at an IP",
        icon: "globe",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "domain", label: "Domain", mono: true },
            { kind: "text", key: "ip", label: "Resolves to", mono: true, tokens: true },
            {
                kind: "list",
                key: "vulnerabilities",
                label: "Vulnerabilities",
                hint: "These drive what `nuclei` and `sqlmap` report.",
                addLabel: "Add vulnerability",
                itemTitle: (v) => String(v.type),
                fields: vulnFields,
                newItem: () => ({ id: nanoid(8), type: "SQL_INJECTION" }),
            },
            { kind: "toggle", key: "removeOnComplete", label: "Remove when the quest ends" },
        ],
        create: () => seed(DomainNodeDataSchema),
    },

    "world.database": {
        type: "world.database",
        category: "world",
        label: "Create database",
        blurb: "Content for sqlmap and DatabaseManager",
        icon: "database",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "host", label: "Host IP", mono: true, tokens: true },
            { kind: "text", key: "user", label: "Username", mono: true },
            { kind: "text", key: "password", label: "Password", mono: true },
            { kind: "note", tone: "info", text: "Table editing arrives with the full data inspector in Step 3." },
            { kind: "toggle", key: "removeOnComplete", label: "Remove when the quest ends" },
        ],
        create: () => seed(DatabaseNodeDataSchema, { host: "", user: "admin", password: "secret123" }),
    },

    "world.files": {
        type: "world.files",
        category: "world",
        label: "Seed files",
        blurb: "Drop files on a PC or a remote device",
        icon: "folder",
        ...io,
        hook: "onStart",
        fields: [
            {
                kind: "select",
                key: "target",
                label: "Where",
                options: [
                    { value: "player", label: "The player's PC" },
                    { value: "device", label: "A remote device" },
                ],
            },
            { kind: "text", key: "ip", label: "Device IP", mono: true, tokens: true, hint: "Only used for a remote device." },
            { kind: "text", key: "parentPath", label: "Parent folder", mono: true, placeholder: "~/" },
            {
                kind: "list",
                key: "files",
                label: "Files",
                addLabel: "Add file",
                itemTitle: (f, i) => (f.isFolder ? `📁 ${f.name}` : String(f.name ?? `file ${i + 1}`)),
                fields: fileFields,
                newItem: () => ({ id: nanoid(8), name: "readme", extension: "txt", isFolder: false, data: "" }),
            },
        ],
        create: () => seed(FilesNodeDataSchema),
    },

    "world.toolResponse": {
        type: "world.toolResponse",
        category: "world",
        label: "Tool response",
        blurb: "Script what a recon tool reports",
        icon: "terminal",
        ...io,
        hook: "onStart",
        fields: [
            {
                kind: "select",
                key: "command",
                label: "Tool",
                hint: "Shell.addCommandData — what the tool prints when the player runs it on this input.",
                options: [
                    { value: "nmap", label: "nmap" },
                    { value: "hydra", label: "hydra" },
                    { value: "whois", label: "whois" },
                    { value: "nslookup", label: "nslookup" },
                    { value: "mxlookup", label: "mxlookup" },
                    { value: "ping", label: "ping" },
                    { value: "lynx", label: "lynx" },
                    { value: "geoip", label: "geoip" },
                    { value: "ssh", label: "ssh" },
                    { value: "ftp", label: "ftp" },
                    { value: "weechat", label: "weechat" },
                ],
            },
            { kind: "text", key: "input", label: "Keyed by", mono: true, tokens: true, hint: "The IP or domain the player passes. hydra/ssh/ftp use user + target instead." },
            { kind: "text", key: "inputUser", label: "User", mono: true },
            { kind: "text", key: "inputTarget", label: "Target", mono: true, tokens: true },
            { kind: "textarea", key: "dataText", label: "Response", mono: true, rows: 8, hint: "Edited through a shape-aware builder in Step 3." },
            { kind: "toggle", key: "removeOnComplete", label: "Remove when the quest ends" },
        ],
        create: () => seed(ToolResponseNodeDataSchema),
    },

    "comms.mail": {
        type: "comms.mail",
        category: "comms",
        label: "Send e-mail",
        blurb: "A message in the player's inbox",
        icon: "mail",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "from", label: "From", mono: true },
            { kind: "text", key: "to", label: "To", mono: true, hint: "Defaults to the player." },
            { kind: "text", key: "subject", label: "Subject" },
            { kind: "textarea", key: "content", label: "Body", rows: 8, tokens: true, hint: "HTML is rendered." },
            { kind: "toggle", key: "replyable", label: "The player can reply" },
            { kind: "section", label: "Attachment", fields: [
                { kind: "text", key: "attachment.name", label: "File name", mono: true },
                { kind: "text", key: "attachment.extension", label: "Extension", mono: true },
                { kind: "textarea", key: "attachment.content", label: "Contents", mono: true, rows: 3 },
            ] },
        ],
        create: () => seed(MailNodeDataSchema, { from: "handler@anon.mail" }),
    },

    "comms.call": {
        type: "comms.call",
        category: "comms",
        label: "Phone call",
        blurb: "Start a branching dialog",
        icon: "phone",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "branch", label: "Branch", mono: true, hint: "Dialog trees are authored in the call editor (Step 3)." },
            { kind: "number", key: "startIndex", label: "Start at line", min: 0 },
        ],
        create: () => seed(CallNodeDataSchema),
    },

    "comms.kisscord": {
        type: "comms.kisscord",
        category: "comms",
        label: "Kisscord messages",
        blurb: "A DM chain that drip-feeds",
        icon: "message",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "contactId", label: "Contact", mono: true, hint: "A Kisscord NPC registered by this quest." },
            {
                kind: "list",
                key: "messages",
                label: "Messages",
                hint: "The chain pauses at the first gated message and resumes once its objectives complete — reloads included.",
                addLabel: "Add message",
                itemTitle: (m, i) => `${m.isMine ? "You" : "NPC"}: ${String(m.content ?? "").slice(0, 34) || `message ${i + 1}`}`,
                fields: kisscordMsgFields,
                newItem: () => ({ id: nanoid(8), content: "", isMine: false, delayMs: 1000, unlocksAfter: [] }),
            },
        ],
        create: () => seed(KisscordNodeDataSchema),
    },

    "comms.weechat": {
        type: "comms.weechat",
        category: "comms",
        label: "WeeChat messages",
        blurb: "An IRC channel conversation",
        icon: "hash",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "host", label: "Server host", mono: true, placeholder: "irc.darknet.org" },
            { kind: "text", key: "password", label: "Password", mono: true, hint: "The player connects with: weechat <host> <password>" },
            { kind: "toggle", key: "registerServer", label: "Register the server" },
            {
                kind: "list",
                key: "messages",
                label: "Messages",
                addLabel: "Add message",
                itemTitle: (m, i) => `${m.username ?? "you"}: ${String(m.content ?? "").slice(0, 30) || `message ${i + 1}`}`,
                fields: weechatMsgFields,
                newItem: () => ({ id: nanoid(8), content: "", username: "informant", isMine: false, delayMs: 1000 }),
            },
        ],
        create: () => seed(WeeChatNodeDataSchema, { host: "irc.darknet.org", password: "secret123" }),
    },

    "comms.tweet": {
        type: "comms.tweet",
        category: "comms",
        label: "Post tweet",
        blurb: "A Twotter post from an NPC",
        icon: "bird",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "accountId", label: "Account", mono: true },
            { kind: "textarea", key: "content", label: "Tweet", rows: 4 },
            { kind: "number", key: "likes", label: "Likes", min: 0 },
            { kind: "number", key: "comments", label: "Comments", min: 0 },
            { kind: "number", key: "shares", label: "Shares", min: 0 },
            { kind: "number", key: "views", label: "Views", min: 0 },
            { kind: "text", key: "postedAgo", label: "Posted", placeholder: "2 days" },
        ],
        create: () => seed(TweetNodeDataSchema),
    },

    "reply.hackertyper": {
        type: "reply.hackertyper",
        category: "reply",
        label: "Hackertyper",
        blurb: "Mash keys to reveal a string",
        icon: "keyboard",
        ...io,
        hook: "onObjectivesStart",
        fields: [
            { kind: "note", tone: "info", text: "HackHub has no engine primitive for this, so the editor emits a small HTML surface that runs the effect and emits a custom event when the string is revealed." },
            {
                kind: "select",
                key: "surface",
                label: "Rendered as",
                options: [
                    { value: "website", label: "A website page" },
                    { value: "app", label: "A desktop app" },
                    { value: "phoneApp", label: "A phone app" },
                ],
            },
            { kind: "text", key: "targetRef", label: "Website host or app name", mono: true },
            { kind: "textarea", key: "text", label: "Text to reveal", mono: true, rows: 5 },
            { kind: "text", key: "heading", label: "Heading" },
            { kind: "number", key: "charsPerKeypress", label: "Characters per keypress", min: 1, max: 20 },
            { kind: "text", key: "eventName", label: "Custom event", mono: true, hint: "Left blank, one is generated from the node id." },
        ],
        create: () => seed(HackertyperNodeDataSchema, { text: "ACCESS GRANTED — decrypting payload…" }),
    },

    "reply.input": {
        type: "reply.input",
        category: "reply",
        label: "Manual input",
        blurb: "The player types a passphrase",
        icon: "key",
        ...{ targets: [inFlow], sources: [successOut, failureOut] },
        hook: "onObjectivesStart",
        fields: [
            { kind: "note", tone: "info", text: "Compiles to a custom terminal command using tools.prompt(). Wire the green “Correct” socket for success and the red “Wrong” socket for failure." },
            { kind: "text", key: "commandName", label: "Command name", mono: true, placeholder: "decrypt" },
            { kind: "text", key: "commandDescription", label: "Help text" },
            { kind: "text", key: "prompt", label: "Prompt", placeholder: "Passphrase >" },
            { kind: "toggle", key: "mask", label: "Mask the input", hint: "Shown as *, like the built-in ssh and sudo prompts." },
            {
                kind: "select",
                key: "matchMode",
                label: "Match",
                options: [
                    { value: "exact", label: "Exactly equals" },
                    { value: "contains", label: "Contains" },
                    { value: "regex", label: "Matches pattern" },
                ],
            },
            { kind: "text", key: "expected", label: "Expected answer", mono: true },
            { kind: "toggle", key: "caseSensitive", label: "Case sensitive" },
            { kind: "text", key: "successMessage", label: "Success message" },
            { kind: "text", key: "failureMessage", label: "Failure message" },
        ],
        create: () =>
            seed(ManualInputNodeDataSchema, {
                commandName: "decrypt",
                commandDescription: "Decrypt the intercepted payload",
                prompt: "Passphrase >",
                successMessage: "Decrypted.",
                failureMessage: "Wrong passphrase.",
            }),
    },

    "fx.pay": {
        type: "fx.pay",
        category: "effect",
        label: "Pay the player",
        blurb: "Deposit money",
        icon: "coin",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "number", key: "amount", label: "Amount", min: 0 },
            { kind: "text", key: "description", label: "Description" },
            { kind: "text", key: "fromIBAN", label: "From IBAN", mono: true },
            { kind: "text", key: "fromName", label: "From name" },
        ],
        create: () => seed(PayNodeDataSchema, { amount: 1000, description: "Job payment" }),
    },

    "fx.withdraw": {
        type: "fx.withdraw",
        category: "effect",
        label: "Charge the player",
        blurb: "Withdraw money",
        icon: "coin",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "number", key: "amount", label: "Amount", min: 0 },
            { kind: "text", key: "description", label: "Description" },
        ],
        create: () => seed(PayNodeDataSchema, { amount: 100, description: "Purchase" }),
    },

    "fx.notify": {
        type: "fx.notify",
        category: "effect",
        label: "Notify",
        blurb: "A popup or toast",
        icon: "bell",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "textarea", key: "message", label: "Message", rows: 2, tokens: true },
            {
                kind: "select",
                key: "variant",
                label: "Style",
                options: [
                    { value: "notify", label: "Notification popup" },
                    { value: "toast", label: "Toast" },
                ],
            },
            {
                kind: "select",
                key: "tone",
                label: "Tone",
                options: [
                    { value: "info", label: "Info" },
                    { value: "success", label: "Success" },
                    { value: "warning", label: "Warning" },
                    { value: "error", label: "Error" },
                ],
            },
        ],
        create: () => seed(NotifyNodeDataSchema),
    },

    "fx.setData": {
        type: "fx.setData",
        category: "effect",
        label: "Set quest data",
        blurb: "Store a value for later",
        icon: "save",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "key", label: "Key", mono: true },
            { kind: "text", key: "value", label: "Value", mono: true, tokens: true },
        ],
        create: () => seed(SetDataNodeDataSchema),
    },

    "fx.claimQuest": {
        type: "fx.claimQuest",
        category: "effect",
        label: "Claim another quest",
        blurb: "Chain into the next quest",
        icon: "link",
        ...io,
        hook: "onStart",
        fields: [{ kind: "text", key: "questName", label: "Quest", mono: true }],
        create: () => seed(ClaimQuestNodeDataSchema, { questName: "" }),
    },

    "fx.shell": {
        type: "fx.shell",
        category: "effect",
        label: "Run shell command",
        blurb: "Execute in the terminal",
        icon: "terminal",
        ...io,
        hook: "onStart",
        fields: [{ kind: "text", key: "command", label: "Command", mono: true, tokens: true }],
        create: () => seed(ShellExecNodeDataSchema),
    },

    "fx.handbook": {
        type: "fx.handbook",
        category: "effect",
        label: "Open handbook",
        blurb: "Jump to an in-game article",
        icon: "book",
        ...io,
        hook: "onStart",
        fields: [
            { kind: "text", key: "articleId", label: "Article", mono: true },
            { kind: "text", key: "category", label: "Category" },
        ],
        create: () => seed(HandbookNodeDataSchema),
    },

    "flow.branch": {
        type: "flow.branch",
        category: "flow",
        label: "Branch",
        blurb: "Split on a condition",
        icon: "branch",
        targets: [inFlow, triggerIn],
        sources: [trueOut, falseOut],
        hook: "onObjectivesStart",
        fields: [
            {
                kind: "select",
                key: "source",
                label: "Test against",
                options: [
                    { value: "event", label: "The triggering event payload" },
                    { value: "data", label: "Quest data" },
                ],
            },
            { kind: "conditions", key: "conditions", label: "Take the “Yes” path when" },
        ],
        create: () => seed(BranchNodeDataSchema),
    },

    "flow.delay": {
        type: "flow.delay",
        category: "flow",
        label: "Wait",
        blurb: "Pause before continuing",
        icon: "clock",
        ...io,
        hook: "onStart",
        fields: [{ kind: "number", key: "ms", label: "Milliseconds", min: 0, step: 100 }],
        create: () => seed(DelayNodeDataSchema),
    },

    "flow.random": {
        type: "flow.random",
        category: "flow",
        label: "Random pick",
        blurb: "Choose one option at random",
        icon: "shuffle",
        ...io,
        hook: "onStart",
        fields: [
            {
                kind: "list",
                key: "options",
                label: "Options",
                addLabel: "Add option",
                itemTitle: (o, i) => String(o.label ?? `option ${i + 1}`),
                fields: [{ kind: "text", key: "label", label: "Value" }],
                newItem: () => ({ id: nanoid(8), label: "" }),
            },
            { kind: "text", key: "storeAs", label: "Store the result as", mono: true },
        ],
        create: () => seed(RandomPickNodeDataSchema),
    },

    "flow.note": {
        type: "flow.note",
        category: "flow",
        label: "Sticky note",
        blurb: "A comment on the canvas",
        icon: "note",
        targets: [],
        sources: [],
        hook: "declarative",
        fields: [
            { kind: "textarea", key: "text", label: "Note", rows: 6 },
            { kind: "number", key: "width", label: "Width", min: 160, max: 640, step: 20 },
        ],
        create: () => seed(NoteNodeDataSchema, { text: "" }),
    },
};

/** Palette order: categories first, then registry order within each. */
export function paletteGroups(): { category: (typeof CATEGORIES)[number]; types: NodeTypeDef[] }[] {
    return CATEGORIES.map((category) => ({
        category,
        types: (Object.values(NODE_TYPES_REGISTRY) as NodeTypeDef[]).filter(
            (t) => t.category === category.id,
        ),
    }));
}

export function nodeTypeDef(type: NodeType): NodeTypeDef {
    return NODE_TYPES_REGISTRY[type];
}

export function categoryOf(type: NodeType) {
    const id = NODE_TYPES_REGISTRY[type].category;
    return CATEGORIES.find((c) => c.id === id)!;
}

/** Look up a handle's kind, used by the connection validator. */
export function handleKind(type: NodeType, handleId: string, side: "source" | "target"): EdgeKind | undefined {
    const def = NODE_TYPES_REGISTRY[type];
    const list = side === "source" ? def.sources : def.targets;
    return list.find((h) => h.id === handleId)?.kind;
}
