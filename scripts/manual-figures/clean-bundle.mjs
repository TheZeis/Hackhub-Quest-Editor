import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../../public/figures/assets/renderer.js", import.meta.url);
const original = readFileSync(file, "utf8");
// Vite preserves trailing spaces inside embedded template strings from React
// diagnostics and generated CSS. They are not meaningful in the rendered text
// or stylesheet, but make the checked-in build fail `git diff --check`.
const cleaned = original.replace(/[\t ]+$/gm, "");
if (cleaned !== original) writeFileSync(file, cleaned);
