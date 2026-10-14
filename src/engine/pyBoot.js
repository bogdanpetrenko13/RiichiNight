// Shared Python boot sequence, used by the Web Worker and by the Node smoke
// test (tests/pyodide-smoke.mjs). Plain JS so Node can import it unbuilt.

/** Python modules shipped in public/py, loaded in dependency order. */
export const PY_MODULES = ["shanten.py", "ai.py", "fastpatch.py", "rules.py", "yakufix.py", "calcinfo.py", "scenarios.py", "bridge.py"];

const GAME_DIR = "/home/pyodide/game";

/**
 * Installs pyriichi and the game modules into a Pyodide instance and returns
 * the `bridge` module proxy.
 *
 * @param {any} pyodide        result of loadPyodide()
 * @param {(name: string) => Promise<Uint8Array>} readAsset
 *        reads a file from public/py (fetch in the browser, fs in Node)
 */
export async function bootPython(pyodide, readAsset) {
  pyodide.FS.mkdirTree(GAME_DIR);
  const zip = await readAsset("pyriichi.zip");
  pyodide.unpackArchive(zip, "zip", { extractDir: GAME_DIR });
  for (const name of PY_MODULES) {
    pyodide.FS.writeFile(`${GAME_DIR}/${name}`, await readAsset(name));
  }
  pyodide.runPython(`
import sys
if "${GAME_DIR}" not in sys.path:
    sys.path.insert(0, "${GAME_DIR}")
import bridge
`);
  return pyodide.pyimport("bridge");
}
