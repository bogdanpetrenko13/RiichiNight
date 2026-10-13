// Copies the Pyodide runtime from node_modules into public/pyodide so the app
// works fully offline (no CDN). Runs automatically after `npm install`.
import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "pyodide");
const dest = path.join(root, "public", "pyodide");

// Only what the worker needs: the loader, the WASM runtime and the stdlib.
const FILES = ["pyodide.mjs", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

try {
  await access(src);
} catch {
  console.warn("[copy-pyodide] node_modules/pyodide not found, skipping");
  process.exit(0);
}

await mkdir(dest, { recursive: true });
for (const file of FILES) {
  await copyFile(path.join(src, file), path.join(dest, file));
}
console.log(`[copy-pyodide] ${FILES.length} files -> public/pyodide`);
