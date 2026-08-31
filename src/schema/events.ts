/**
 * The game-event catalogue.
 *
 * Loaded from `reference/hackhub-events.json`, which is *generated* from the SDK's
 * own `ModEventMap` (see `reference/generate-event-catalogue.mjs`). This matters:
 * the docs' Events guide lists stale payloads for roughly half of the 92 events,
 * and a condition built against a stale field name would silently never match
 * (docs/01 §7.2).
 */
import raw from "../../reference/hackhub-events.json";

export interface CatalogueEvent {
    name: string;
    group: string;
    payload: string;
    doc?: string;
}

interface Catalogue {
    generatedFrom: { package: string; version: string; source: string; generatedBy: string };
    count: number;
    events: CatalogueEvent[];
}

const catalogue = raw as Catalogue;

export const SDK_VERSION = catalogue.generatedFrom.version;
export const EVENT_COUNT = catalogue.count;

export const EVENTS: CatalogueEvent[] = catalogue.events;

export const EVENT_GROUPS: { id: string; label: string }[] = [
    { id: "recon", label: "Reconnaissance & terminal" },
    { id: "web", label: "Directory brute-force & browser" },
    { id: "access", label: "Access & exploitation" },
    { id: "cracking", label: "Cracking & vuln scanning" },
    { id: "wifi", label: "Bettercap & Wi-Fi" },
    { id: "network", label: "Network & infrastructure" },
    { id: "files", label: "Files" },
    { id: "mail", label: "E-mail" },
    { id: "social", label: "Social & chat" },
    { id: "world", label: "Bank, quest & misc" },
];

const byName = new Map(EVENTS.map((e) => [e.name, e]));

export function getEvent(name: string): CatalogueEvent | undefined {
    return byName.get(name);
}

/** `{ ip: string; results: string[] }` → `["ip", "results"]` */
export function payloadFields(payload: string): string[] {
    const trimmed = payload.trim();
    // A primitive payload (`string`, `void`, `number`) has no fields to match on,
    // so there is nothing to offer the author in the condition builder.
    if (!trimmed.startsWith("{")) return [];
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    const fields: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of inner) {
        if (ch === "{" || ch === "[" || ch === "<") depth++;
        if (ch === "}" || ch === "]" || ch === ">") depth--;
        if (ch === ";" && depth === 0) {
            fields.push(current);
            current = "";
            continue;
        }
        current += ch;
    }
    if (current.trim()) fields.push(current);
    return fields
        .map((f) => f.trim().split(":")[0].replace(/\?$/, "").trim())
        .filter(Boolean);
}

export function eventFields(name: string): string[] {
    const ev = byName.get(name);
    if (!ev) return [];
    return payloadFields(ev.payload);
}

/** True when the payload is a primitive rather than an object (e.g. `string`). */
export function isPrimitivePayload(name: string): boolean {
    const ev = byName.get(name);
    if (!ev) return false;
    return !ev.payload.trim().startsWith("{");
}

export function isKnownEvent(name: string): boolean {
    return byName.has(name);
}

/** Events grouped for the picker, in catalogue order. */
export function groupedEvents(): { group: string; label: string; events: CatalogueEvent[] }[] {
    return EVENT_GROUPS.map((g) => ({
        group: g.id,
        label: g.label,
        events: EVENTS.filter((e) => e.group === g.id),
    })).filter((g) => g.events.length > 0);
}

/**
 * Human label for an event, e.g. `Terminal.NmapScan` → `Nmap scan`.
 *
 * The namespace is dropped because the picker already groups events by it.
 */
export function eventLabel(name: string): string {
    const last = name.split(".").pop() ?? name;
    const words = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim().toLowerCase();
    if (!words) return name;
    return words.charAt(0).toUpperCase() + words.slice(1);
}
