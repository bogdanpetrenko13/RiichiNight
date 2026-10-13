/// <reference lib="webworker" />
// Runs Pyodide + pyriichi off the main thread so the UI never stutters.
import type { PyodideInterface } from "pyodide";
import { bootPython } from "./pyBoot.js";
import type { WorkerRequest, WorkerResponse, BootStage } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

interface Bridge {
  new_game(config: string): string;
  act(command: string): string;
  ai_step(): string;
  next_round(): string;
  save(): string;
  load(blob: string): string;
}

let bridge: Bridge | null = null;
let booting: Promise<void> | null = null;

function post(message: WorkerResponse) {
  self.postMessage(message);
}

function progress(stage: BootStage) {
  post({ id: -1, progress: stage });
}

/**
 * Some WebViews serve .wasm from the app bundle without the application/wasm
 * MIME type, which makes instantiateStreaming throw. Pyodide's loader has no
 * fallback for that, so route such responses through ArrayBuffer instead.
 */
function guardWasmStreaming() {
  const original = WebAssembly.instantiateStreaming?.bind(WebAssembly);
  if (!original) return;
  WebAssembly.instantiateStreaming = async (source, imports) => {
    const response = await source;
    if ((response.headers.get("content-type") ?? "").includes("application/wasm")) {
      return original(response, imports);
    }
    return WebAssembly.instantiate(await response.arrayBuffer(), imports);
  };
}

async function boot(baseUrl: string): Promise<void> {
  guardWasmStreaming();
  const pyodideUrl = new URL("pyodide/", baseUrl).href;
  const pyUrl = new URL("py/", baseUrl).href;
  progress("runtime");
  // Loaded at runtime from public/pyodide, so Vite never bundles Pyodide.
  const mod = (await import(/* @vite-ignore */ pyodideUrl + "pyodide.mjs")) as {
    loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface>;
  };
  const pyodide = await mod.loadPyodide({ indexURL: pyodideUrl });
  progress("engine");
  const readAsset = async (name: string) => {
    const res = await fetch(pyUrl + name);
    if (!res.ok) throw new Error(`cannot load ${name}: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  };
  const module = await bootPython(pyodide, readAsset);
  bridge = module as unknown as Bridge;
  progress("ready");
}

function parse(json: string): unknown {
  return JSON.parse(json);
}

async function handle(req: WorkerRequest): Promise<unknown> {
  if (req.op === "init") {
    booting ??= boot(req.baseUrl);
    await booting;
    return true;
  }
  if (!bridge) throw new Error("engine is not ready");
  switch (req.op) {
    case "newGame":
      return parse(bridge.new_game(JSON.stringify(req.config)));
    case "act":
      return parse(bridge.act(JSON.stringify(req.command)));
    case "aiStep":
      return parse(bridge.ai_step());
    case "nextRound":
      return parse(bridge.next_round());
    case "save":
      return bridge.save();
    case "load":
      return parse(bridge.load(req.blob));
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    const result = await handle(req);
    post({ id: req.id, ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ id: req.id, ok: false, error: message });
  }
};
