/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: false,
        allowedHosts: true,
    },
    preview: {
        host: "0.0.0.0",
        port: 4173,
        allowedHosts: true,
    },
    build: {
        target: "es2022",
        sourcemap: true,
        // A single-bundle desktop-class editor: React + React Flow + Radix come to
        // ~670 kB (~205 kB gzipped), loaded once from the user's own machine, so
        // code-splitting would buy nothing but a warning here.
        chunkSizeWarningLimit: 1000,
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        css: false,
    },
});
