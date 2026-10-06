import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertFigureReferences, loadActiveFigureCatalogue, rendererUrlForPage } from "./handbook.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANUAL = path.join(ROOT, "public/manual");
const CHECK = process.argv.includes("--check");
const CATALOGUE = await loadActiveFigureCatalogue(ROOT);
const ACTIVE_IDS = Object.keys(CATALOGUE).sort();

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (entry.endsWith(".html")) out.push(full);
    }
    return out;
}

const pages = walk(MANUAL);
const changes = [];
for (const file of pages) {
    const before = readFileSync(file, "utf8");
    const relativePagePath = path.relative(MANUAL, file).split(path.sep).join("/");
    const rendererSrc = rendererUrlForPage(relativePagePath);
    const convertedPage = convertFigureReferences(before, rendererSrc, CATALOGUE);
    let html = convertedPage.html;
    const converted = convertedPage.converted;
    const refreshed = convertedPage.refreshed;
    if (html.includes("class=\"manual-figure\"") && !html.includes("manual-figures.css")) {
        const stylesheet = relativePagePath.includes("/") ? "../manual-figures.css" : "manual-figures.css";
        const manualStylesheet = /<link\b[^>]*href=[\"'](?:\.\.\/)?manual\.css[\"'][^>]*>/i;
        const link = manualStylesheet.exec(html)?.[0];
        if (!link) throw new Error(`${relativePagePath} has a rendered figure but no manual.css link.`);
        html = html.replace(link, `${link}\n<link rel=\"stylesheet\" href=\"${stylesheet}\" />`);
    }
    if (before !== html) {
        changes.push({ file, relativePagePath, converted, refreshed });
        if (!CHECK) writeFileSync(file, html);
    }
}

const present = new Map(ACTIVE_IDS.map((id) => [id, 0]));
const unknown = [];
const raster = [];
for (const file of pages) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/<iframe\b[^>]*\bdata-manual-figure-scene="([^"]+)"[^>]*>/gi)) {
        const id = match[1];
        if (present.has(id)) present.set(id, present.get(id) + 1);
        else unknown.push(`${path.relative(MANUAL, file)}: ${id}`);
    }
    for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
        const stem = path.posix.basename(match[1].replace(/\\/g, "/"), path.posix.extname(match[1]));
        if (CATALOGUE[stem]) raster.push(`${path.relative(MANUAL, file)}: ${stem}`);
    }
}

const missing = [...present].filter(([, count]) => count === 0).map(([id]) => id);
const duplicates = [...present].filter(([, count]) => count > 1).map(([id, count]) => `${id} (${count})`);
if (unknown.length || missing.length || duplicates.length || raster.length) {
    const problems = [
        unknown.length ? `unknown rendered IDs: ${unknown.join(", ")}` : "",
        missing.length ? `active scenes not referenced: ${missing.join(", ")}` : "",
        duplicates.length ? `active scenes referenced more than once: ${duplicates.join(", ")}` : "",
        raster.length ? `active scenes still referenced as raster captures: ${raster.join(", ")}` : "",
    ].filter(Boolean);
    throw new Error(`Manual figure references are incomplete: ${problems.join("; ")}`);
}

const convertedCount = changes.reduce((count, item) => count + item.converted.length, 0);
const refreshedCount = changes.reduce((count, item) => count + item.refreshed.length, 0);
console.log(`Manual figures: ${ACTIVE_IDS.length} active code-rendered references across ${pages.length} HTML pages.`);
console.log(`${CHECK ? "Would update" : "Updated"} ${changes.length} handbook HTML files; ${convertedCount} raster references converted and ${refreshedCount} existing scenes refreshed in this pass.`);
