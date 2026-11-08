import type { Plugin } from "vite";
export function pwa(): Plugin;
export function writeServiceWorker(outDir: string): Promise<{ version: string; count: number }>;
