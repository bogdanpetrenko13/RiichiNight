import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works from Capacitor's local server and file://.
export default defineConfig({
  base: "./",
  plugins: [react()],
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
