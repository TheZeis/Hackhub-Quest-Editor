/**
 * The quest graph's node model.
 *
 * A node is `{ id, type, position, data }` — structurally identical to what React
 * Flow expects, so the canvas can consume the document without a translation
 * layer. React Flow's own runtime fields (`selected`, `measured`, `dragging`) are
 * never persisted.
 */
import { z } from "zod";
import {
    FileEntrySchema,
    FirewallRuleSchema,
    IdentifierSchema,
    NetworkDeviceSchema,
    NetworkPortSchema,
    NetworkUserSchema,
    PositionSchema,
    VulnerabilitySchema,
} from "./common";

/* ── Conditions ────────────────────────────────────────────────────────────
   A no-code predicate. Authors build a list of clauses joined by and/or; the
   compiler emits a real JavaScript expression for `trigger.condition`.
   ─────────────────────────────────────────────────────────────────────── */

export const CONDITION_OPS = [
    "equals",
    "notEquals",
    "contains",
    "notContains",
    "startsWith",
    "endsWith",
    "matches",
    "exists",
    "notEmpty",
    "greaterThan",
    "lessThan",
] as const;
export const ConditionOpSchema = z.enum(CONDITION_OPS);
export type ConditionOp = z.infer<typeof ConditionOpSchema>;

/** Ops that take no right-hand value. */
export const UNARY_OPS: readonly ConditionOp[] = ["exists", "notEmpty"];

export const CONDITION_OP_LABELS: Record<ConditionOp, string> = {
    equals: "is exactly",
    notEquals: "is not",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    matches: "matches pattern",
    exists: "exists",
    notEmpty: "is not empty",
    greaterThan: "is greater than",
    lessThan: "is less than",
};

export const ConditionClauseSchema = z.object({
    id: z.string(),
    /** How this clause joins to the previous one. Ignored on the first clause. */
    join: z.enum(["and", "or"]).default("and"),
    /** Payload field path, e.g. `ip`, `results`, `file.name`. */
    field: z.string().default(""),
    op: ConditionOpSchema.default("equals"),
    /** Accepts `{{data.targetIp}}` runtime tokens. */
    value: z.string().default(""),
});
export type ConditionClause = z.infer<typeof ConditionClauseSchema>;

export const ConditionListSchema = z.array(ConditionClauseSchema).default([]);
export type ConditionList = z.infer<typeof ConditionListSchema>;

/* ── Comms payloads ────────────────────────────────────────────────────────
   These mirror the SDK's declarative quest content so the compiler can emit
   `Mails`, `KisscordChats`, `WeeChatChats` and `Dialog` almost verbatim.
   ─────────────────────────────────────────────────────────────────────── */

export const AttachmentSchema = z.object({
    /**
     * Optional on purpose: the inspector writes an attachment as a nested
     * section (`attachment.name`, …), not as a list row, so nothing supplies an
     * id. The compiler derives one from the owning node's id.
     */
    id: z.string().optional(),
    name: z.string(),
    extension: z.string().default("txt"),
    content: z.string().default(""),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

/** A Kisscord message in a chain. Mirrors `KisscordMessageDefinition`. */
export const KisscordMessageSchema = z.object({
    id: z.string(),
    content: z.string().default(""),
    isMine: z.boolean().default(false),
    delayMs: z.number().default(0),
    /**
     * Objective ids that must all complete before this message (and everything
     * after it) appears. The SDK pauses the chain at the first gated message and
     * resumes automatically, reloads included.
     */
    unlocksAfter: z.array(z.string()).default([]),
});
export type KisscordMessage = z.infer<typeof KisscordMessageSchema>;

/** A WeeChat message. Mirrors `WeeChatMessageDefinition`. */
export const WeeChatMessageSchema = z.object({
    id: z.string(),
    content: z.string().default(""),
    username: z.string().optional(),
    isMine: z.boolean().default(false),
    delayMs: z.number().default(0),
});
export type WeeChatMessage = z.infer<typeof WeeChatMessageSchema>;

/** One line of a phone-call dialog. Mirrors `QuestDialogSpeech`. */
export const DialogOptionSchema = z.object({
    id: z.string(),
    label: z.string().default(""),
    text: z.string().default(""),
    switchBranch: z.string().optional(),
    nextIndex: z.number().optional(),
    isEnd: z.boolean().default(false),
    timeout: z.number().optional(),
});
export type DialogOption = z.infer<typeof DialogOptionSchema>;

export const DialogSpeechSchema = z.object({
    id: z.string(),
    speaker: z.string().default(""),
    text: z.string().default(""),
    audio: z.string().optional(),
    isEnd: z.boolean().default(false),
    timeout: z.number().optional(),
    options: z.array(DialogOptionSchema).default([]),
});
export type DialogSpeech = z.infer<typeof DialogSpeechSchema>;

export const DialogBranchSchema = z.object({
    id: z.string(),
    name: z.string().default("default"),
    lines: z.array(DialogSpeechSchema).default([]),
});
export type DialogBranch = z.infer<typeof DialogBranchSchema>;

/* ── Node data schemas ─────────────────────────────────────────────────── */

const empty = z.object({}).default({});

/** Entry nodes mark which quest lifecycle hook a subtree is emitted into. */
export const EntryStartData = empty;
export const EntryLoadData = empty;
export const EntryCompleteData = empty;
export const EntryAbandonData = empty;

export const ObjectiveDataSchema = z.object({
    name: z.string().default(""),
    description: z.string().default(""),
    hint: z.string().optional(),
    info: z.string().optional(),
    terminalCommand: z.string().optional(),
    hidden: z.boolean().default(false),
});

export const TriggerEventDataSchema = z.object({
    /** A key of the SDK's `ModEventMap`, or a custom event name. */
    event: z.string().default(""),
    conditions: ConditionListSchema,
});

export const NetworkNodeDataSchema = z.object({
    /** `random` allocates via `Network.randomIp()` in `CreateData()`. */
    ipMode: z.enum(["fixed", "random"]).default("random"),
    device: NetworkDeviceSchema,
    /** Remove the whole network in `OnComplete` / `OnAbandon`. */
    destroyOnComplete: z.boolean().default(true),
});

export const WifiNodeDataSchema = z.object({
    ssid: z.string().default(""),
    password: z.string().default(""),
    signal: z.number().default(2),
    bssid: z.string().optional(),
    channel: z.string().optional(),
    /** Router IP. `random` lets the engine allocate one. */
    ipMode: z.enum(["fixed", "random"]).default("random"),
    ip: z.string().optional(),
    /** Router model — enables the in-game `fern` recovery route. */
    model: z.string().optional(),
    users: z.array(NetworkUserSchema).default([]),
    ports: z.array(NetworkPortSchema).default([]),
    children: z.array(NetworkDeviceSchema).default([]),
    destroyOnComplete: z.boolean().default(true),
});

export const FirewallNodeDataSchema = z.object({
    ip: z.string().default(""),
    rule: FirewallRuleSchema,
    removeOnComplete: z.boolean().default(true),
});

export const PortNodeDataSchema = z.object({
    ip: z.string().default(""),
    action: z.enum(["open", "close", "add", "remove"]).default("open"),
    port: NetworkPortSchema,
    restoreOnComplete: z.boolean().default(false),
});

export const DomainNodeDataSchema = z.object({
    domain: z.string().default(""),
    ip: z.string().default(""),
    vulnerabilities: z.array(VulnerabilitySchema).default([]),
    removeOnComplete: z.boolean().default(true),
});

export const DatabaseNodeDataSchema = z.object({
    host: z.string().default(""),
    user: z.string().default(""),
    password: z.string().default(""),
    tables: z
        .array(
            z.object({
                id: z.string(),
                name: z.string().default(""),
                /** Rows are authored as CSV-ish records; the compiler types cells. */
                rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
            }),
        )
        .default([]),
    removeOnComplete: z.boolean().default(true),
});

export const FilesNodeDataSchema = z.object({
    target: z.enum(["player", "device"]).default("player"),
    /** Ignored when target is `player`. */
    ip: z.string().optional(),
    parentPath: z.string().default("~/"),
    files: z.array(FileEntrySchema).default([]),
});

/**
 * `Shell.addCommandData` — scripts what a built-in reconnaissance tool reports.
 * `dataText` is edited through a shape-aware editor in the inspector, never as
 * raw JSON in the common case.
 */
export const ToolResponseNodeDataSchema = z.object({
    command: z
        .enum([
            "nmap",
            "hydra",
            "whois",
            "nslookup",
            "mxlookup",
            "ping",
            "lynx",
            "geoip",
            "ssh",
            "ftp",
            "weechat",
        ])
        .default("nmap"),
    /** The input the tool is keyed by: an IP, a domain, or a `{ user, target }` pair. */
    input: z.string().default(""),
    inputUser: z.string().optional(),
    inputTarget: z.string().optional(),
    dataText: z.string().default(""),
    removeOnComplete: z.boolean().default(true),
});

export const MailNodeDataSchema = z.object({
    from: z.string().default(""),
    to: z.string().optional(),
    subject: z.string().default(""),
    /** Plain text or HTML — the SDK renders it as HTML. */
    content: z.string().default(""),
    replyable: z.boolean().default(false),
    attachment: AttachmentSchema.optional(),
});

export const CallNodeDataSchema = z.object({
    branch: z.string().default("default"),
    startIndex: z.number().default(0),
});

export const KisscordNodeDataSchema = z.object({
    contactId: z.string().default(""),
    messages: z.array(KisscordMessageSchema).default([]),
});

export const WeeChatNodeDataSchema = z.object({
    host: z.string().default(""),
    password: z.string().default(""),
    /** Registering the server lets the player `weechat <host> <password>`. */
    registerServer: z.boolean().default(true),
    messages: z.array(WeeChatMessageSchema).default([]),
});

export const TweetNodeDataSchema = z.object({
    accountId: z.string().default(""),
    content: z.string().default(""),
    likes: z.number().optional(),
    comments: z.number().optional(),
    shares: z.number().optional(),
    views: z.number().optional(),
    postedAgo: z.string().optional(),
});

/**
 * "Hackertyper" — the player mashes keys and a predefined string types itself
 * out. There is no engine primitive for this, so the editor emits a small HTML
 * surface (website page / desktop app / phone app) that runs the effect and
 * emits a custom event; a quest listener turns that into an objective.
 */
export const HackertyperNodeDataSchema = z.object({
    surface: z.enum(["website", "app", "phoneApp"]).default("website"),
    /** Website host + path, or app name, depending on `surface`. */
    targetRef: z.string().default(""),
    text: z.string().default(""),
    /** How many characters of the string each keypress reveals. */
    charsPerKeypress: z.number().default(3),
    /** Optional headline shown above the terminal. */
    heading: z.string().optional(),
    /** Emitted when the string is fully revealed. */
    eventName: z.string().default(""),
});

/**
 * "Manual input" — the player must type a specific phrase. Compiles to a custom
 * `Command` using `tools.prompt()`, branching on success/failure.
 */
export const ManualInputNodeDataSchema = z.object({
    /** Command name the player types to reach the prompt, e.g. `decrypt`. */
    commandName: z.string().default(""),
    commandDescription: z.string().default(""),
    prompt: z.string().default(""),
    /** Mask the input, like the built-in ssh/sudo password prompts. */
    mask: z.boolean().default(false),
    matchMode: z.enum(["exact", "contains", "regex"]).default("exact"),
    expected: z.string().default(""),
    caseSensitive: z.boolean().default(false),
    successMessage: z.string().default(""),
    failureMessage: z.string().default(""),
});

export const PayNodeDataSchema = z.object({
    amount: z.number().default(0),
    description: z.string().default(""),
    fromIBAN: z.string().optional(),
    fromName: z.string().optional(),
});

export const NotifyNodeDataSchema = z.object({
    message: z.string().default(""),
    variant: z.enum(["notify", "toast"]).default("notify"),
    tone: z.enum(["success", "error", "warning", "info"]).default("info"),
});

export const SetDataNodeDataSchema = z.object({
    key: z.string().default(""),
    value: z.string().default(""),
});

export const ClaimQuestNodeDataSchema = z.object({
    questName: IdentifierSchema.optional().or(z.literal("")),
});

export const ShellExecNodeDataSchema = z.object({
    command: z.string().default(""),
});

export const HandbookNodeDataSchema = z.object({
    articleId: z.string().optional(),
    category: z.string().optional(),
});

export const BranchNodeDataSchema = z.object({
    conditions: ConditionListSchema,
    /** What the branch reads from: the triggering event payload or quest data. */
    source: z.enum(["event", "data"]).default("event"),
});

export const DelayNodeDataSchema = z.object({
    ms: z.number().default(1000),
});

export const RandomPickNodeDataSchema = z.object({
    options: z.array(z.object({ id: z.string(), label: z.string().default("") })).default([]),
    /** Data key the chosen option is written to, so later nodes can read it. */
    storeAs: z.string().optional(),
});

export const NoteNodeDataSchema = z.object({
    text: z.string().default(""),
    width: z.number().default(240),
});

/* ── The node union ──────────────────────────────────────────────────────── */

/**
 * Both parameters must be generic: without `T` the literal collapses to `string`
 * and the discriminated union degrades to one undifferentiated shape, and without
 * `D` every node's `data` degrades to `unknown`.
 */
const node = <T extends string, D extends z.ZodTypeAny>(type: T, data: D) =>
    z.object({
        id: z.string(),
        type: z.literal(type),
        position: PositionSchema,
        data,
    });

export const NodeSchema = z.discriminatedUnion("type", [
    node("entry.start", EntryStartData),
    node("entry.load", EntryLoadData),
    node("entry.complete", EntryCompleteData),
    node("entry.abandon", EntryAbandonData),
    node("objective", ObjectiveDataSchema),
    node("trigger.event", TriggerEventDataSchema),
    node("world.network", NetworkNodeDataSchema),
    node("world.wifi", WifiNodeDataSchema),
    node("world.firewall", FirewallNodeDataSchema),
    node("world.port", PortNodeDataSchema),
    node("world.domain", DomainNodeDataSchema),
    node("world.database", DatabaseNodeDataSchema),
    node("world.files", FilesNodeDataSchema),
    node("world.toolResponse", ToolResponseNodeDataSchema),
    node("comms.mail", MailNodeDataSchema),
    node("comms.call", CallNodeDataSchema),
    node("comms.kisscord", KisscordNodeDataSchema),
    node("comms.weechat", WeeChatNodeDataSchema),
    node("comms.tweet", TweetNodeDataSchema),
    node("reply.hackertyper", HackertyperNodeDataSchema),
    node("reply.input", ManualInputNodeDataSchema),
    node("fx.pay", PayNodeDataSchema),
    node("fx.withdraw", PayNodeDataSchema),
    node("fx.notify", NotifyNodeDataSchema),
    node("fx.setData", SetDataNodeDataSchema),
    node("fx.claimQuest", ClaimQuestNodeDataSchema),
    node("fx.shell", ShellExecNodeDataSchema),
    node("fx.handbook", HandbookNodeDataSchema),
    node("flow.branch", BranchNodeDataSchema),
    node("flow.delay", DelayNodeDataSchema),
    node("flow.random", RandomPickNodeDataSchema),
    node("flow.note", NoteNodeDataSchema),
]);

export type NodeDoc = z.infer<typeof NodeSchema>;
export type NodeType = NodeDoc["type"];

/** Narrow a node doc to a specific type, for inspectors and the compiler. */
export type NodeOfType<T extends NodeType> = Extract<NodeDoc, { type: T }>;
export type NodeDataOf<T extends NodeType> = NodeOfType<T>["data"];

export const NODE_TYPES = NodeSchema.options.map((o) => o.shape.type.value) as NodeType[];
