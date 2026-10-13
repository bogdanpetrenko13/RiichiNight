#!/usr/bin/env bash
# Packs the pinned pyriichi sources into public/py/pyriichi.zip for Pyodide.
# pyriichi is pure Python with no dependencies, so a zip of the package folder
# is all the worker needs (it is unpacked into the Pyodide filesystem at boot).
#
# Usage: scripts/vendor-pyriichi.sh [commit]
set -euo pipefail

COMMIT="${1:-90b34b965a010b4b8d0e10d5db07ba454049cfb1}"
REPO="https://github.com/d4n1elchen/pyriichi.git"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet "$REPO" "$WORK/pyriichi"
git -C "$WORK/pyriichi" checkout --quiet "$COMMIT"

mkdir -p "$ROOT/public/py"
rm -f "$ROOT/public/py/pyriichi.zip"
(
  cd "$WORK/pyriichi"
  find pyriichi -name '__pycache__' -prune -o -type f -print | sort > files.txt
  echo LICENSE >> files.txt
  python3 - "$ROOT/public/py/pyriichi.zip" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as zf:
    for name in open("files.txt").read().split():
        zf.write(name, name.replace("LICENSE", "pyriichi/LICENSE") if name == "LICENSE" else name)
PY
)
echo "$COMMIT" > "$ROOT/public/py/pyriichi.version"
echo "public/py/pyriichi.zip <- pyriichi@$COMMIT"
