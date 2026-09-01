/**
 * Step 4: the export compiler. Turns the project document into a complete,
 * build-free HackHub mod folder:
 *
 *   manifest.json        mod metadata + computed permissions
 *   dist/mod.js          runnable CJS (plain JS — no TS-only syntax)
 *   src/index.ts         the same text, for power users who rebuild
 *   package.json …       scaffolding so `npm run build` also works
 *   README.md            what got compiled, and what needs a human
 *
 * The emitted mod.js embeds the project as data plus a small interpreter
 * (runtimeSource.ts) that walks each quest graph at runtime.
 */
import type { ProjectDocument } from "@/schema/project";
import type { NodeDoc } from "@/schema/nodes";
import { RUNTIME_SOURCE } from "./runtimeSource";

export interface CompiledFile {
    path: string;
    content: string;
}

export interface CompileResult {
    files: CompiledFile[];
    permissions: string[];
    warnings: string[];
}

const nodeType = (n: NodeDoc) => n.type;

export function computePermissions(project: ProjectDocument): string[] {
    const perms = new Set<string>();
    const nodes = project.quests.flatMap((q) => q.graph.nodes);
    for (const n of nodes) {
        switch (nodeType(n)) {
            case "world.network":
            case "world.wifi":
            case "world.domain":
            case "world.database":
                perms.add("network");
                break;
            case "world.files":
                perms.add("filesystem");
                perms.add("network");
                break;
            case "world.toolResponse":
            case "fx.shell":
            case "reply.input":
                perms.add("shell");
                break;
            case "trigger.event":
            case "fx.claimQuest":
            case "reply.hackertyper":
                perms.add("events");
                break;
            case "fx.pay":
            case "fx.withdraw":
                perms.add("bank");
                break;
            case "fx.notify":
                perms.add("ui");
                break;
            case "comms.dialogue": {
                const kind = (n.data as { kind: string }).kind;
                if (kind === "mail") perms.add("mail");
                if (kind === "kisscord" || kind === "weechat") {
                    const msgs = ((n.data as { kisscord?: { messages?: { playerAction?: string }[] }; weechat?: { messages?: { playerAction?: string }[] } }).kisscord?.messages ??
                        (n.data as { weechat?: { messages?: { playerAction?: string }[] } }).weechat?.messages) ?? [];
                    if (msgs.some((m) => m.playerAction === "input")) perms.add("shell");
                }
                break;
            }
            default:
                break;
        }
    }
    if (project.quests.some((q) => q.dialog.some((b) => b.lines.some((l) => l.input)))) perms.add("shell");
    return [...perms];
}

export function computeWarnings(project: ProjectDocument): string[] {
    const warnings: string[] = [];
    for (const q of project.quests) {
        if (!q.autoStart) {
            warnings.push(
                `${q.title || q.name}: starts only when the player accepts it (e.g. from the quest board) — nothing in it runs before then. Turn on “Start automatically” in the quest's Behaviour settings if it should begin on its own.`,
            );
        }
        for (const n of q.graph.nodes) {
            switch (n.type) {
                case "world.port":
                case "world.files":
                case "world.firewall":
                case "world.domain":
                case "world.database":
                    warnings.push(
                        `${q.name}: “${n.type}” nodes export as notes only — fold them into a network's device tree for full effect.`,
                    );
                    break;
                case "fx.handbook":
                    warnings.push(`${q.name}: handbook nodes are not compiled yet.`);
                    break;
                case "world.wifi":
                    warnings.push(
                        `${q.name}: the mod SDK (0.21.0) cannot create wireless networks yet — “Create Wi-Fi” exports as a regular router network the player reaches by IP, not through the in-game Wi-Fi list.`,
                    );
                    break;
                case "comms.dialogue": {
                    const d = n.data as { kind: string; phone?: { branch?: string }; kisscord?: { messages?: { playerAction?: string; input?: { expected?: string } }[] }; weechat?: { messages?: { playerAction?: string } } };
                    if (d.kind === "phone" && q.dialog.some((b) => b.lines.some((l) => l.input))) {
                        warnings.push(
                            `${q.name}: phone lines with typed answers also register a terminal command (qe-…) the player uses to answer.`,
                        );
                    }
                    if (d.kind === "kisscord" && d.kisscord?.messages?.some((m) => m.playerAction === "upload")) {
                        warnings.push(`${q.name}: Kisscord uploads compile to a “[uploaded file …]” message.`);
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }
    for (const w of project.websites) {
        const hidden = w.pages.filter((p) => !p.seo);
        if (hidden.length) {
            warnings.push(
                `${w.host}: ${hidden.length} unlisted page${hidden.length > 1 ? "s" : ""} (${hidden.map((p) => p.path).join(", ")}) — reachable by address but hidden from the in-game search.`,
            );
        }
    }
    return warnings;
}

export function compileProject(project: ProjectDocument): CompileResult {
    const permissions = computePermissions(project);
    const warnings = computeWarnings(project);

    const PROJECT = {
        mod: project.mod,
        quests: project.quests.map((q) => ({
            name: q.name,
            title: q.title,
            description: q.description,
            icon: q.icon ?? null,
            group: q.group,
            rewards: q.rewards,
            employer: q.employer,
            autoStart: q.autoStart,
            autoComplete: q.autoComplete,
            abandonable: q.abandonable,
            hasCompleteButton: q.hasCompleteButton,
            questsToComplete: q.questsToComplete,
            maxClaim: q.maxClaim ?? null,
            maxClaimPerDay: q.maxClaimPerDay ?? null,
            hackhubPost: q.hackhubPost ?? null,
            twotterAccounts: q.twotterAccounts,
            dialog: q.dialog,
            graph: q.graph,
        })),
        websites: project.websites,
    };

    const modJs = [
        '"use strict";',
        "/* Generated by the HackHub Quest Mod Editor. Edit the project, not this file. */",
        'var sdk = require("@hotbunny/hackhub-content-sdk");',
        `var PROJECT = ${JSON.stringify(PROJECT)};`,
        RUNTIME_SOURCE,
        "__qeRegisterProject(sdk, PROJECT);",
        "",
    ].join("\n");

    const manifest = {
        id: project.mod.id,
        name: project.mod.name,
        version: project.mod.version,
        author: project.mod.author || "Quest Mod Editor",
        description: project.mod.description || `${project.mod.name} — built with the HackHub Quest Mod Editor`,
        apiVersion: project.mod.apiVersion,
        permissions,
    };

    const readme = [
        `# ${project.mod.name}`,
        "",
        project.mod.description || "A HackHub quest mod built with the Quest Mod Editor.",
        "",
        "## Install (no coding needed)",
        "",
        "1. Copy this whole folder into the game's `mods/` directory.",
        "2. Start HackHub — the mod loads from `dist/mod.js`.",
        "",
        "## Rebuild (optional, for programmers)",
        "",
        "`src/index.ts` is the same code as `dist/mod.js`. With Node 18+:",
        "",
        "```",
        "npm install",
        "npm run build",
        "```",
        "",
        "## What the editor compiled for you",
        "",
        `- Quests: ${project.quests.map((q) => q.name).join(", ") || "none"}`,
        `- Websites: ${project.websites.map((w) => w.host).join(", ") || "none"}`,
        `- Permissions requested: ${permissions.join(", ") || "none"}`,
        "",
        "## Notes",
        "",
        ...(warnings.length ? warnings.map((w) => `- ${w}`) : ["- Everything compiled cleanly. Have fun."]),
        "",
    ].join("\n");

    const packageJson = {
        name: project.mod.id,
        version: project.mod.version,
        private: true,
        scripts: { build: "node esbuild.config.mjs" },
        devDependencies: { "@hotbunny/hackhub-content-sdk": "latest", esbuild: "^0.24.0" },
    };

    const esbuildConfig = [
        'import { build } from "esbuild";',
        "build({",
        '    entryPoints: ["src/index.ts"],',
        '    outfile: "dist/mod.js",',
        '    format: "cjs",',
        '    platform: "neutral",',
        '    target: "es2020",',
        '    external: ["@hotbunny/hackhub-content-sdk"],',
        "});",
        "",
    ].join("\n");

    const tsconfig = {
        compilerOptions: {
            target: "ES2020",
            module: "CommonJS",
            strict: true,
            experimentalDecorators: true,
            skipLibCheck: true,
        },
        include: ["src"],
    };

    return {
        permissions,
        warnings,
        files: [
            { path: "manifest.json", content: JSON.stringify(manifest, null, 4) + "\n" },
            { path: "dist/mod.js", content: modJs },
            { path: "src/index.ts", content: modJs },
            { path: "README.md", content: readme },
            { path: "package.json", content: JSON.stringify(packageJson, null, 2) + "\n" },
            { path: "esbuild.config.mjs", content: esbuildConfig },
            { path: "tsconfig.json", content: JSON.stringify(tsconfig, null, 2) + "\n" },
        ],
    };
}
