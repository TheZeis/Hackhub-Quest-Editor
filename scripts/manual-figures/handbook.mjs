import path from "node:path";
import { createJiti } from "jiti";
import { renderFigureMarkup } from "./markup.mjs";

export async function loadActiveFigureCatalogue(root) {
    const jiti = createJiti(import.meta.url, {
        alias: { "@": path.join(root, "src") },
        interopDefault: true,
    });
    const module = await jiti.import(path.join(root, "scripts/manual-figures/catalogue.ts"));
    return module.SCENE_CATALOGUE;
}

function decodeEntities(value) {
    return String(value)
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
        .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
        .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(parseInt(number, 16)));
}

function attribute(tag, name) {
    const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
    return match ? decodeEntities(match[1] ?? match[2] ?? "") : null;
}

/**
 * Replace only references whose filename is an active scene ID. Unlinked and
 * game-only names remain untouched and therefore stay outside the renderer's
 * live-scene count.
 */
export function convertFigureReferences(html, rendererSrc, catalogue) {
    const converted = [];
    const replacedImages = String(html).replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figureHtml) => {
        const imgTag = /<img\b[^>]*>/i.exec(figureHtml)?.[0];
        if (!imgTag) return figureHtml;
        const src = attribute(imgTag, "src");
        const alt = attribute(imgTag, "alt");
        const captionMatch = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(figureHtml);
        if (!src || alt === null) return figureHtml;

        const sceneId = path.posix.basename(src.replace(/\\/g, "/"), path.posix.extname(src));
        const scene = catalogue[sceneId];
        if (!scene) return figureHtml;
        if (!captionMatch) throw new Error(`Active manual figure ${sceneId} has no figcaption.`);
        if (!alt.trim()) throw new Error(`Active manual figure ${sceneId} has an empty description.`);

        converted.push(sceneId);
        return renderFigureMarkup(sceneId, scene, alt, captionMatch[1], rendererSrc);
    });
    const result = replacedImages.replace(/<iframe\b[^>]*\bdata-manual-figure-scene="([^"]+)"[^>]*>/gi, (tag, sceneId) => {
        if (!catalogue[sceneId]) return tag;
        const expected = `${rendererSrc}?scene=${sceneId}`
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        if (/\bdata-renderer-src=/i.test(tag)) {
            return tag.replace(/\bdata-renderer-src=(?:"[^"]*"|'[^']*')/i, `data-renderer-src="${expected}"`);
        }
        return tag.replace(/<iframe\b/i, `<iframe data-renderer-src="${expected}"`);
    });
    return { html: result, converted };
}

/** The renderer URL, relative to one handbook HTML file. */
export function rendererUrlForPage(relativePagePath) {
    const from = path.posix.dirname(relativePagePath.replace(/\\/g, "/"));
    return path.posix.relative(from, "../figures/renderer.html") || "../figures/renderer.html";
}
