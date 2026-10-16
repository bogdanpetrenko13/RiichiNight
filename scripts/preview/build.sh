#!/bin/bash
# Quick preview build without `npm install` (esbuild only), for environments
# where the npm registry is unreachable. Capacitor plugins are replaced by the
# stubs next to this script (Preferences -> plain localStorage keys).
#
#   ESBUILD=/path/to/esbuild PYODIDE_DIR=/path/to/pyodide scripts/preview/build.sh [OUT]
#
# Then serve OUT (default .preview) and open index.html; or run the browser
# tests against it: E2E_DIST=.preview python -m pytest tests/e2e
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/scripts/preview"
OUT="${1:-$ROOT/.preview}"
ES="${ESBUILD:-$(command -v esbuild || echo "$ROOT/node_modules/.bin/esbuild")}"
PYO="${PYODIDE_DIR:-$ROOT/node_modules/pyodide}"
cd "$ROOT"
mkdir -p "$OUT/py" "$OUT/pyodide"
"$ES" src/main.tsx --bundle --format=esm --outfile="$OUT/main.js" --jsx=automatic \
  --loader:.module.css=local-css \
  --alias:@capacitor/preferences="$HERE/stubs/preferences.js" \
  --alias:@capacitor/app="$HERE/stubs/app.js" \
  --define:process.env.NODE_ENV='"production"' --define:__APP_VERSION__='"preview"' --log-level=warning
"$ES" src/engine/engine.worker.ts --bundle --format=esm --outfile="$OUT/engine.worker.ts" --log-level=warning
cp public/py/*.py public/py/pyriichi.zip "$OUT/py/"
cp -r public/characters public/voice public/tiles public/mortal "$OUT/" 2>/dev/null || true
cp "$PYO"/{pyodide.mjs,pyodide.asm.js,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json} "$OUT/pyodide/"
cat > "$OUT/index.html" <<'H'
<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="main.css"></head><body><div id="root"></div><script type="module" src="main.js"></script></body></html>
H
echo "preview built in $OUT"
