// Runs the real Python engine inside Pyodide under Node: boots exactly like the
// Web Worker, plays a full hanchan with the human seat on autopilot and
// reports timings. Usage:
//   node tests/pyodide-smoke.mjs            (uses node_modules/pyodide)
//   PYODIDE_DIR=/path/to/pyodide node tests/pyodide-smoke.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootPython } from "../src/engine/pyBoot.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pyDir = path.join(root, "public", "py");

const { loadPyodide } = process.env.PYODIDE_DIR
  ? await import(pathToFileURL(path.join(process.env.PYODIDE_DIR, "pyodide.mjs")).href)
  : await import("pyodide");

const t0 = performance.now();
const pyodide = await loadPyodide(
  process.env.PYODIDE_DIR ? { indexURL: process.env.PYODIDE_DIR + "/" } : {},
);
const tLoad = performance.now();
const bridge = await bootPython(pyodide, async (name) => new Uint8Array(await readFile(path.join(pyDir, name))));
const tBoot = performance.now();

// Autopilot for seat 0: a "normal" Brain choosing through the same JSON API.
pyodide.runPython(`
import json, random
from ai import Brain
import bridge as _b
_auto = Brain("normal", random.Random(99))
def autopilot():
    g = _b._game
    actions = g.engine.get_available_actions(_b.HUMAN)
    action, tile, kwargs = _auto.decide(g.engine, _b.HUMAN, actions)
    cmd = {"action": _b.ACTION_NAMES[action]}
    if tile is not None:
        cmd["tile"] = str(tile)
    if action == _b.GameAction.CHI:
        seqs = g.engine.get_available_chi_sequences(_b.HUMAN)
        cmd["option"] = seqs.index(kwargs["sequence"]) if kwargs.get("sequence") in seqs else 0
    return json.dumps(cmd)
`);
const autopilot = pyodide.globals.get("autopilot");

let step = JSON.parse(bridge.new_game(JSON.stringify({ seed: 42, levels: ["easy", "normal", "hard"] })));
let rounds = 0;
let humanCalls = 0;
let aiSteps = 0;
let slowest = 0;
const tGame = performance.now();
for (let i = 0; i < 20000 && step.view.status !== "game_over"; i++) {
  const s = performance.now();
  if (step.view.status === "ai") {
    // The UI advances opponents one action at a time, like this.
    aiSteps++;
    step = JSON.parse(bridge.ai_step());
  } else if (step.view.status === "round_over") {
    rounds++;
    if (rounds === 1) {
      const blob = bridge.save();
      const restored = JSON.parse(bridge.load(blob));
      if (restored.view.status !== "round_over") throw new Error("save/load mismatch");
    }
    step = JSON.parse(bridge.next_round());
  } else if (step.view.status === "human") {
    humanCalls++;
    step = JSON.parse(bridge.act(autopilot()));
  } else {
    throw new Error(`unexpected status ${step.view.status}`);
  }
  slowest = Math.max(slowest, performance.now() - s);
}
const tEnd = performance.now();
if (step.view.status !== "game_over") throw new Error("game did not finish");
const end = step.events.find((e) => e.t === "game_end");
console.log(
  [
    `pyodide load      ${(tLoad - t0).toFixed(0)} ms`,
    `engine boot       ${(tBoot - tLoad).toFixed(0)} ms`,
    `hanchan           ${rounds} rounds, ${humanCalls} human + ${aiSteps} AI steps, ${((tEnd - tGame) / 1000).toFixed(1)} s`,
    `slowest step      ${slowest.toFixed(0)} ms`,
    `final scores      ${end ? end.scores.join(" / ") : "?"}`,
  ].join("\n"),
);
