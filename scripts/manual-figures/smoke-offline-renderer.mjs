import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { loadActiveFigureCatalogue } from "./handbook.mjs";
import { renderFigureMarkup } from "./markup.mjs";

const prototypePath = fileURLToPath(new URL("../../public/manual-figure-prototype.html", import.meta.url));
const rendererPath = fileURLToPath(new URL("../../public/figures/renderer.html", import.meta.url));
const manualScriptPath = fileURLToPath(new URL("../../public/manual/manual.js", import.meta.url));
const manualFigureCssPath = fileURLToPath(new URL("../../public/manual/manual-figures.css", import.meta.url));
const bundlePath = path.resolve(path.dirname(rendererPath), "assets/renderer.js");
const prototypeHtml = await readFile(prototypePath, "utf8");
const manualScript = await readFile(manualScriptPath, "utf8");
const manualFigureCss = await readFile(manualFigureCssPath, "utf8");
const bundle = await readFile(bundlePath, "utf8");
const activeCatalogue = await loadActiveFigureCatalogue(path.resolve(path.dirname(prototypePath), ".."));

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
const activeSceneIds = Object.keys(activeCatalogue).sort();
const smokeScenes = [...new Set([...scenes, ...activeSceneIds])];
if (activeSceneIds.length !== 88) throw new Error(`Expected 88 live handbook scenes; catalogue has ${activeSceneIds.length}.`);

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

for (const scene of smokeScenes) {
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
            // JSDOM has no layout engine, ResizeObserver or structuredClone.
            // Real browsers provide these APIs; the clone stub is only for the
            // fixed plain-data fixtures exercised by this renderer smoke.
            window.structuredClone = globalThis.structuredClone.bind(globalThis);
            window.ResizeObserver = class {
                observe() {}
                unobserve() {}
                disconnect() {}
            };
        },
    });

    const settleTime = scene === "tutorial-11-status-clean" ? 820 : scene === "tutorial-12-dryrun" || scene === "guide-dryrun" ? 1600 : scene === "howto-12-tool-match" ? 520 : scene === "howto-07-website" || scene === "guide-websites-page" ? 700 : 180;
    await new Promise((resolve) => {
        dom.window.addEventListener("load", () => setTimeout(resolve, settleTime), { once: true });
    });

    const root = dom.window.document.getElementById("root");
    const renderedScene = dom.window.document.documentElement.dataset.figureScene;
    const text = (dom.window.document.body.textContent ?? "").replace(/\s+/g, " ");
    if (!dom.window.document.body.hasAttribute("inert")) {
        runtimeErrors.push("the renderer document is not inert; its editor controls could be exposed as interactive");
    }
    if (scene === "howto-12-tool-match") {
        const addonText = text.replace(/\s+/g, " ");
        const inputs = Array.from(dom.window.document.querySelectorAll("input")).map((input) => input.value);
        if (!addonText.includes("Recon-NG") || !addonText.includes("matches http, ftp, ssh")) {
            runtimeErrors.push("the checked-in Recon-NG addon and its supported-service list are not visible");
        }
        if (!inputs.includes("OpenSSH 8.9.0")) {
            runtimeErrors.push("the fixed SSH port version is not visible in the selected network inspector");
        }
    }
    if (scene === "howto-07-website" || scene === "guide-websites-page") {
        const preview = dom.window.document.querySelector('iframe[title="Page preview"]');
        const previewHtml = preview?.getAttribute("srcdoc") ?? "";
        if (!previewHtml.includes("R. Calloway") || !previewHtml.includes("The night shift doesn't log what it unloads")) {
            runtimeErrors.push("the local Greyline Dispatch article is not open in the website preview");
        }
        if (text.includes("This page links to 1 page that don't exist yet")) {
            runtimeErrors.push("the article fixture's root link has no matching Greyline Dispatch home page");
        }
    }
    if (scene === "tutorial-12-dryrun" || scene === "guide-dryrun") {
        if (!text.includes("Objective completed: send-manifest")) {
            runtimeErrors.push("the fixed Harbour Manifest simulation did not show its completed sample trace");
        }
    }
    if (scene === "trouble-export-report") {
        if (!text.includes("Needs attention") || !text.includes("nothing can start this quest")) {
            runtimeErrors.push("the explicit non-startable quest does not show its real export warning");
        }
    }
    if (scene === "tutorial-11-status-clean" && !text.includes("Saved")) {
        runtimeErrors.push("the settled status-bar figure does not show Saved");
    }
    if (scene === "tour-empty-canvas" && text.includes("Drag nodes from the left onto the canvas")) {
        runtimeErrors.push("the component-only empty-canvas scene unexpectedly shows the App first-run card");
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

async function smokeManualFigureViewer(pageUrl, expectedSandbox, mode) {
    const scenes = ["tour-workspace", "tutorial-02-first-contact", "node-objective-inspector"];
    const figures = scenes.map((sceneId) => {
        const scene = activeCatalogue[sceneId];
        return renderFigureMarkup(
            sceneId,
            scene,
            `Fixed parent-page description for ${sceneId}.`,
            `<span>Fixed caption for ${sceneId}.</span>`,
            "../figures/renderer.html",
        );
    }).join("\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>.manual-figure-viewer__viewport{padding:16px}</style></head><body>${figures}<script>${manualScript}</script></body></html>`;
    const dom = new JSDOM(html, {
        url: pageUrl,
        runScripts: "dangerously",
        pretendToBeVisual: true,
        beforeParse(window) {
            window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
            window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
        },
    });
    const problems = [];
    if (!/\.manual-figure-viewer__viewport\s*\{[^}]*\bdisplay:\s*flex;/s.test(manualFigureCss)
        || !/\.manual-figure-viewer__canvas\s*\{[^}]*\bflex:\s*0 0 auto;[^}]*\bmargin:\s*auto;/s.test(manualFigureCss)) {
        problems.push("the larger view no longer centers the canvas on both axes");
    }
    if (!/\.manual-figure__stage iframe\s*\{[^}]*\bpointer-events:\s*none;/s.test(manualFigureCss)
        || !/\.manual-figure-viewer__frame\s*\{[^}]*\bpointer-events:\s*none;/s.test(manualFigureCss)) {
        problems.push("a fixed editor illustration can still receive pointer input");
    }
    const document = dom.window.document;
    if (document.readyState === "loading") {
        await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    const firstFigure = document.querySelector('[data-scene-id="tour-workspace"]');
    const secondFigure = document.querySelector('[data-scene-id="tutorial-02-first-contact"]');
    const fixedFigure = document.querySelector('[data-scene-id="node-objective-inspector"]');
    const hitTarget = firstFigure?.querySelector(".manual-figure__click-target");
    const firstButton = firstFigure?.querySelector(".manual-figure__expand");
    const secondButton = secondFigure?.querySelector(".manual-figure__expand");

    if (!firstFigure?.classList.contains("manual-figure--viewer-enabled") || !hitTarget || hitTarget.hidden) {
        problems.push("wide workspace illustrations are not enabled as pointer-open targets");
    }
    if (!firstButton || firstButton.hidden || firstButton.getAttribute("aria-label")?.indexOf("View larger illustration:") !== 0) {
        problems.push("wide workspace illustrations have no visible, descriptive View larger button");
    }
    if (fixedFigure?.querySelector("[data-manual-figure-open]")) {
        problems.push("a focused inspector figure unexpectedly gained full-size gallery controls");
    }

    const dialog = document.querySelector(".manual-figure-viewer");
    const viewerViewport = dialog?.querySelector(".manual-figure-viewer__viewport");
    if (viewerViewport) {
        Object.defineProperty(viewerViewport, "clientWidth", { configurable: true, value: 1464 });
        Object.defineProperty(viewerViewport, "clientHeight", { configurable: true, value: 884 });
    }
    if (hitTarget) hitTarget.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    if (!dialog?.open) problems.push("clicking the illustration did not open its larger view");
    const modalFrame = dialog?.querySelector("iframe.manual-figure-viewer__frame");
    if (!modalFrame || modalFrame.getAttribute("width") !== "1360" || modalFrame.getAttribute("height") !== "820") {
        problems.push("the larger view did not use the editor scene's natural size");
    }
    const fittedCanvas = dialog?.querySelector(".manual-figure-viewer__canvas");
    const initialScale = Number(/scale\(([\d.]+)\)/.exec(modalFrame?.style.transform || "")?.[1] || 0);
    if (initialScale <= 1 || initialScale > 1.04
        || Number.parseInt(fittedCanvas?.style.width || "0", 10) > 1424
        || Number.parseInt(fittedCanvas?.style.height || "0", 10) > 844) {
        problems.push("the opening view did not maximize the available space without clipping the illustration");
    }
    if (modalFrame?.getAttribute("tabindex") !== "-1" || modalFrame?.getAttribute("sandbox") !== expectedSandbox) {
        problems.push(`the larger illustration frame lost its non-focusable ${expectedSandbox} sandbox`);
    }
    if (!dialog?.querySelector(".manual-figure-viewer__next") || !dialog?.querySelector(".manual-figure-viewer__zoom")) {
        problems.push("the larger view has no gallery navigation or zoom controls");
    }

    if (modalFrame) {
        dom.window.dispatchEvent(new dom.window.MessageEvent("message", {
            data: { type: "manual-figure-ready", scene: "tour-workspace", status: "ready" },
            source: modalFrame.contentWindow,
        }));
        if (modalFrame.style.visibility !== "visible" || !dialog?.querySelector(".manual-figure-viewer__status")?.hidden) {
            problems.push("the larger view did not reveal its scene after the renderer-ready message");
        }
    }

    const zoomIn = dialog?.querySelector('[aria-label="Zoom in"]');
    const zoomOut = dialog?.querySelector('[aria-label="Zoom out"]');
    const fitButton = dialog?.querySelector('[aria-label="Fit illustration to the window"]');
    const actualSize = dialog?.querySelector('[aria-label="Show illustration at actual size"]');
    zoomIn?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    const zoomedScale = Number(/scale\(([\d.]+)\)/.exec(modalFrame?.style.transform || "")?.[1] || 0);
    zoomOut?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    if (zoomedScale <= initialScale || Math.abs(Number(/scale\(([\d.]+)\)/.exec(modalFrame?.style.transform || "")?.[1] || 0) - initialScale) > 0.001) {
        problems.push("zoom in and out did not adjust the illustration around its fitted size");
    }
    actualSize?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    fitButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    if (Math.abs(Number(/scale\(([\d.]+)\)/.exec(modalFrame?.style.transform || "")?.[1] || 0) - initialScale) > 0.001) {
        problems.push("Fit and 100% did not restore their respective illustration sizes");
    }

    const nextButton = dialog?.querySelector(".manual-figure-viewer__next");
    nextButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    const secondModalFrame = dialog?.querySelector("iframe.manual-figure-viewer__frame");
    if (secondModalFrame?.getAttribute("data-manual-figure-scene") !== "tutorial-02-first-contact") {
        problems.push("the gallery's Next button did not open the next wide workspace scene");
    }
    if (secondModalFrame) {
        dom.window.dispatchEvent(new dom.window.MessageEvent("message", {
            data: { type: "manual-figure-ready", scene: "tutorial-02-first-contact", status: "error" },
            source: secondModalFrame.contentWindow,
        }));
        if (dialog?.querySelector(".manual-figure-viewer__failure")?.hidden !== false) {
            problems.push("a renderer failure in the larger view has no readable fallback");
        }
    }

    const escaped = dialog?.dispatchEvent(new dom.window.Event("cancel", { bubbles: false, cancelable: true }));
    if (dialog?.open || escaped !== false || document.activeElement !== firstButton) {
        problems.push("Escape did not close the larger view and return focus to its opener");
    }

    secondButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    const secondDialogFrame = dialog?.querySelector("iframe.manual-figure-viewer__frame");
    const closeButton = dialog?.querySelector(".manual-figure-viewer__close");
    closeButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    if (dialog?.open || document.activeElement !== secondButton || secondDialogFrame?.isConnected) {
        problems.push("the accessible View larger and Close buttons did not close cleanly and restore focus");
    }

    dom.window.close();
    if (problems.length) throw new Error(`Manual illustration viewer failed: ${problems.join("; ")}`);
    console.log(`${mode} manual illustration viewer supports click, accessible button, gallery navigation, zoom, inert scene frames, fallback, Escape and focus return`);
}

await smokeManualFigureViewer("https://manual-preview.example/manual/index.html", "allow-scripts", "HTTP");
await smokeManualFigureViewer("file:///manual/index.html", "allow-scripts allow-same-origin", "file://");
