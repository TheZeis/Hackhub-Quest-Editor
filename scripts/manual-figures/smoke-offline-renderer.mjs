import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const prototypePath = fileURLToPath(new URL("../../public/manual-figure-prototype.html", import.meta.url));
const rendererPath = fileURLToPath(new URL("../../public/figures/renderer.html", import.meta.url));
const bundlePath = path.resolve(path.dirname(rendererPath), "assets/renderer.js");
const prototypeHtml = await readFile(prototypePath, "utf8");
const bundle = await readFile(bundlePath, "utf8");

if (/\bprocess\.env\.NODE_ENV\b/.test(bundle)) {
    throw new Error("The offline renderer still references process.env.NODE_ENV, which is not available in a browser.");
}

const scenes = [
    "node-objective-inspector",
    "howto-wired-canvas",
    "settings-panel",
    "tour-workspace",
    "tutorial-drag-wire",
];

for (const [mode, pageUrl, expectedSandbox] of [
    ["file", pathToFileURL(prototypePath).href, "allow-scripts allow-same-origin"],
    ["http", "https://manual-preview.example/manual-figure-prototype.html", "allow-scripts"],
]) {
    const dom = new JSDOM(prototypeHtml, { url: pageUrl, runScripts: "dangerously" });
    const frames = [...dom.window.document.querySelectorAll("iframe[data-renderer-src]")];
    const problems = [];
    const frameTitles = new Set();

    if (frames.length !== scenes.length) problems.push(`expected ${scenes.length} frames, found ${frames.length}`);
    for (const [index, frame] of frames.entries()) {
        const frameUrl = new URL(frame.src);
        const scene = new URLSearchParams(frameUrl.search).get("scene");
        const title = frame.getAttribute("title")?.trim() ?? "";
        const describedBy = (frame.getAttribute("aria-describedby") ?? "").split(/\\s+/).filter(Boolean);
        const descriptions = describedBy.map((id) => dom.window.document.getElementById(id)).filter(Boolean);
        const figure = frame.closest("figure");

        if (scene !== scenes[index]) problems.push(`frame ${index + 1} points to scene ${scene}`);
        if (!title) problems.push(`frame ${index + 1} has no accessible name`);
        else if (frameTitles.has(title)) problems.push(`frame ${index + 1} repeats the title “${title}”`);
        frameTitles.add(title);
        if (!figure || !descriptions.some((node) => node.tagName === "FIGCAPTION" && figure.contains(node) && node.textContent.trim())) {
            problems.push(`frame ${index + 1} has no non-empty figcaption linked by aria-describedby`);
        }
        if (frame.getAttribute("tabindex") !== "-1") {
            problems.push(`frame ${index + 1} can enter the keyboard tab order`);
        }
        if (frame.getAttribute("loading") !== "lazy") {
            problems.push(`frame ${index + 1} is not lazy-loaded`);
        }
        if (frame.getAttribute("sandbox") !== expectedSandbox) {
            problems.push(`frame ${index + 1} has sandbox ${frame.getAttribute("sandbox")}`);
        }
        if (scene === "howto-wired-canvas" || scene === "tutorial-drag-wire") {
            const style = dom.window.getComputedStyle(frame);
            const maxWidth = scene === "howto-wired-canvas" ? "960px" : "900px";
            if (style.width !== "100%" || style.maxWidth !== maxWidth) {
                problems.push(`frame ${index + 1} is not responsive (width ${style.width}, max ${style.maxWidth})`);
            }
        }
        if (mode === "file") {
            if (frameUrl.protocol !== "file:" || fileURLToPath(frameUrl) !== rendererPath) {
                problems.push(`frame ${index + 1} does not point to the local renderer file`);
            }
        } else if (frameUrl.origin !== "https://manual-preview.example" || frameUrl.pathname !== "/figures/renderer.html") {
            problems.push(`frame ${index + 1} does not point to the same-origin preview renderer`);
        }
    }

    dom.window.close();
    if (problems.length) throw new Error(`Prototype ${mode} bootstrap failed: ${problems.join("; ")}`);
    console.log(`${mode}:// prototype frames use the expected local renderer and sandbox`);
}

for (const scene of scenes) {
    const virtualConsole = new VirtualConsole();
    const runtimeErrors = [];
    virtualConsole.on("jsdomError", (error) => runtimeErrors.push(error.message));
    virtualConsole.on("error", (...args) => runtimeErrors.push(args.map(String).join(" ")));

    const dom = await JSDOM.fromFile(rendererPath, {
        url: `${pathToFileURL(rendererPath).href}?scene=${scene}`,
        resources: "usable",
        runScripts: "dangerously",
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse(window) {
            // JSDOM has no layout engine or ResizeObserver. React Flow only
            // needs the API to exist for this smoke test; real browsers provide it.
            window.ResizeObserver = class {
                observe() {}
                unobserve() {}
                disconnect() {}
            };
        },
    });

    await new Promise((resolve) => {
        dom.window.addEventListener("load", () => setTimeout(resolve, 100), { once: true });
    });

    const root = dom.window.document.getElementById("root");
    const renderedScene = dom.window.document.documentElement.dataset.figureScene;
    const text = root?.textContent ?? "";
    if (!dom.window.document.body.hasAttribute("inert")) {
        runtimeErrors.push("the renderer document is not inert; its editor controls could be exposed as interactive");
    }
    if (scene === "howto-wired-canvas") {
        for (const selector of [
            ".figure-canvas .react-flow__controls",
            ".figure-canvas .react-flow__minimap",
            ".figure-canvas > .relative > .absolute.top-3.left-3",
        ]) {
            const control = root?.querySelector(selector);
            if (!control || dom.window.getComputedStyle(control).display !== "none") {
                runtimeErrors.push(`unwanted canvas control is visible: ${selector}`);
            }
        }
    }
    if (scene === "tutorial-drag-wire") {
        const svg = root?.querySelector(".react-flow__viewport-portal .figure-drag-wire");
        const endpoint = svg?.querySelector("circle");
        const cursor = svg?.querySelector(".figure-drag-cursor");
        const coordinates = cursor?.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
        const [tipX, tipY] = coordinates ?? [];
        const cursorXs = (coordinates ?? []).filter((_, index) => index % 2 === 0);
        const cursorYs = (coordinates ?? []).filter((_, index) => index % 2 === 1);
        const cursorWidth = Math.max(...cursorXs) - Math.min(...cursorXs);
        const cursorHeight = Math.max(...cursorYs) - Math.min(...cursorYs);
        const endpointX = Number(endpoint?.getAttribute("cx"));
        const endpointY = Number(endpoint?.getAttribute("cy"));
        const endpointRadius = Number(endpoint?.getAttribute("r"));
        const children = svg ? [...svg.children] : [];

        if (!svg) runtimeErrors.push("the detached wire is not attached to the fitted canvas viewport");
        if (!cursor || !(tipX < endpointX && tipY < endpointY)) {
            runtimeErrors.push("the mouse cursor does not point up and left toward its endpoint");
        }
        if (!cursor || !(cursorHeight > cursorWidth)) {
            runtimeErrors.push("the drag indicator is not shaped like a regular mouse cursor");
        }
        if (!endpoint || !Number.isFinite(tipX) || !Number.isFinite(tipY) || Math.hypot(tipX - endpointX, tipY - endpointY) > endpointRadius) {
            runtimeErrors.push("the mouse cursor does not meet the loose wire endpoint");
        }
        if (cursor && endpoint && children.indexOf(cursor) <= children.indexOf(endpoint)) {
            runtimeErrors.push("the mouse cursor is painted behind the loose wire endpoint");
        }
    }
    const failed =
        renderedScene !== scene ||
        !root?.querySelector(".figure-root") ||
        text.includes("This editor illustration could not load.") ||
        text.includes("This illustration could not load.") ||
        runtimeErrors.length > 0;

    dom.window.close();

    if (failed) {
        throw new Error(
            `Offline renderer failed for ${scene}: ${runtimeErrors.join("; ") || "scene fallback rendered"}`,
        );
    }

    console.log(`file:// scene rendered: ${scene}`);
}
