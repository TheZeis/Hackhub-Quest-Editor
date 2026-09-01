/**
 * Project migrations. Drafts older than the current feature set get their
 * raw JSON rewritten before schema validation — e.g. the four separate
 * comms nodes became the single general `comms.dialogue` node, so saved
 * projects carrying the old types keep working.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const mapNode = (n: Loose): Loose => {
    switch (n?.type) {
        case "comms.call":
            return {
                ...n,
                type: "comms.dialogue",
                data: {
                    kind: "phone",
                    phone: { branch: n.data?.branch ?? "default", startIndex: n.data?.startIndex ?? 0 },
                },
            };
        case "comms.kisscord":
            return { ...n, type: "comms.dialogue", data: { kind: "kisscord", kisscord: n.data ?? {} } };
        case "comms.mail":
            return { ...n, type: "comms.dialogue", data: { kind: "mail", mail: n.data ?? {} } };
        case "comms.weechat":
            return { ...n, type: "comms.dialogue", data: { kind: "weechat", weechat: n.data ?? {} } };
        case "flow.delay":
            // ms → seconds (round 19)
            if (n.data && n.data.ms != null && n.data.seconds == null) {
                return { ...n, data: { ...n.data, seconds: Number(n.data.ms) / 1000 } };
            }
            return n;
        case "fx.pay":
        case "fx.withdraw":
            // amountMode/percent added in round 19 — old drafts are fixed-amount
            return { ...n, data: { amountMode: "fixed", percent: 10, ...n.data } };
        default:
            return n;
    }
};

export function migrateProject(raw: unknown): unknown {
    if (typeof raw !== "object" || raw === null) return raw;
    const doc = raw as Loose;
    if (!Array.isArray(doc.quests)) return raw;
    return {
        ...doc,
        quests: doc.quests.map((q: Loose) =>
            q?.graph?.nodes ? { ...q, graph: { ...q.graph, nodes: q.graph.nodes.map(mapNode) } } : q,
        ),
    };
}
