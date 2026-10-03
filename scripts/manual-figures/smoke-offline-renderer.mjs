import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const rendererPath = fileURLToPath(new URL("../../public/figures/renderer.html", import.meta.url));
const bundlePath = path.resolve(path.dirname(rendererPath), "assets/renderer.js");
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
