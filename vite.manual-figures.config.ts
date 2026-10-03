import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const systemFontOnly: Plugin = {
    name: "manual-figure-system-font-only",
    enforce: "pre",
    transform(source, id) {
        if (id.split("?")[0] !== path.resolve(import.meta.dirname, "src/index.css")) return;
        // The figures always use the editor's default system font. Drop the
        // optional, user-selectable font files from this isolated static build.
        return source.replace(/@font-face\s*\{[^}]*\}/g, "");
    },
};

export default defineConfig({
    publicDir: false,
    plugins: [systemFontOnly, react(), tailwindcss()],
    resolve: {
        alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    define: {
        // Library-mode builds do not automatically replace React's browser
        // environment check. Without this, the standalone file:// bundle
        // reaches an undefined Node `process` global before it can render.
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
        target: "es2022",
        outDir: path.resolve(import.meta.dirname, "public/figures/assets"),
        emptyOutDir: true,
        sourcemap: false,
        cssCodeSplit: false,
        assetsInlineLimit: 10_000_000,
        chunkSizeWarningLimit: 1800,
        lib: {
            entry: path.resolve(import.meta.dirname, "scripts/manual-figures/main.tsx"),
            name: "QuestManualFigures",
            formats: ["iife"],
            fileName: () => "renderer.js",
            cssFileName: "renderer",
        },
    },
});
