import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works from Capacitor's local server and file://.
import pkg from "./package.json";
// Web version (GitHub Pages): dist/sw.js caches the whole game for offline play.
import { pwa } from "./scripts/web/pwa.mjs";

export default defineConfig({
  base: "./",
  // Shown in the error report.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), pwa()],
  worker: { format: "es" },
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  server: {
    // Pyodide is loaded from public/pyodide at runtime, never bundled.
    fs: { strict: true },
  },
});
