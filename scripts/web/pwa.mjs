// Vite plugin for the web version: after the build, writes dist/sw.js (the
// service worker from scripts/web/sw.js) with the list of every built file and
// a version that changes whenever any of them does.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Not cached: the worker itself and files only the APK or tests use. */
const SKIP = new Set(["sw.js"]);

async function walk(dir, base = "") {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else if (!SKIP.has(rel) && !e.name.endsWith(".sha256") && !e.name.endsWith(".md")) out.push(rel);
  }
  return out;
}

export async function writeServiceWorker(outDir) {
  const files = (await walk(outDir)).sort();
  const hash = createHash("sha256");
  for (const f of files) {
    hash.update(f);
    hash.update(await readFile(path.join(outDir, f)));
  }
  const version = hash.digest("hex").slice(0, 12);
  const list = ["./", ...files.map((f) => `./${f}`)];
  const template = await readFile(path.join(HERE, "sw.js"), "utf8");
  const sw = template.replace("__VERSION__", version).replace("__FILES__", JSON.stringify(list, null, 0));
  await writeFile(path.join(outDir, "sw.js"), sw);
  return { version, count: list.length };
}

export function pwa() {
  let outDir = "dist";
  return {
    name: "riichinight-pwa",
    apply: "build",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      const { version, count } = await writeServiceWorker(outDir);
      console.log(`[pwa] sw.js: ${count} files, version ${version}`);
    },
  };
}
