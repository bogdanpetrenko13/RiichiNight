"""Copies the parts of Mortal's libriichi the app needs, without Python bindings.

    python scripts/mortal/import_libriichi.py <Mortal checkout>

libriichi (AGPL-3.0-or-later, https://github.com/Equim-chan/Mortal) is a Rust
crate with PyO3 bindings. The app only needs the player-state tracker, the
observation encoder and the rule algorithms, compiled to WebAssembly, where
PyO3 cannot be used. This script copies those modules into
native/mortal/src/riichi/ and removes everything that touches Python:
`use pyo3/numpy` lines, #[py...] attributes and every function whose
signature mentions a Python type. The result is committed, so the build does
not need the Mortal checkout; re-run the script to update to another commit.
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "native" / "mortal" / "src" / "riichi"

# Files and directories under libriichi/src that are kept.
KEEP = [
    "algo",
    "state",
    "mjai/event.rs",
    "tile.rs",
    "hand.rs",
    "chi_type.rs",
    "macros.rs",
    "vec_ops.rs",
    "array.rs",
    "consts.rs",
    "rankings.rs",
]
SKIP_FILES = {"state/test.rs"}  # unit tests that need the whole crate

PY_TYPES = re.compile(r"\b(Python<|PyResult|PyObject|Bound<|PyArray|PyModule|Py<|PyAny|PyErr)")
ATTR = re.compile(r"^\s*#\[(pyclass|pymethods|pyo3|pyfunction|pymodule|getter|setter|new|staticmethod|classmethod)\b.*\]\s*$")


def strip_python(text: str) -> str:
    lines = text.split("\n")
    out = []
    for line in lines:
        if re.match(r"^\s*use (pyo3|numpy)\b", line) or "py_helper" in line:
            continue
        if ATTR.match(line):
            continue
        # #[pyclass(...)] spanning one line with other derives is handled above;
        # inline `#[pyo3(get)] pub x` style:
        line = re.sub(r"#\[pyo3\([^)]*\)\]\s*", "", line)
        out.append(line)
    text = "\n".join(out)
    return remove_python_fns(text)


def remove_python_fns(text: str) -> str:
    """Deletes `fn` items (with their doc comments and attributes) whose
    signature mentions a Python type."""
    i = 0
    result = []
    pattern = re.compile(r"(?m)^([ \t]*)((?:pub(?:\([^)]*\))?\s+)?(?:const\s+)?fn\s+\w+)")
    while True:
        m = pattern.search(text, i)
        if not m:
            result.append(text[i:])
            break
        # Signature: up to the first `{` or `;` at depth 0.
        j = m.end()
        depth = 0
        while j < len(text):
            c = text[j]
            if c in "(<[":
                depth += 1
            elif c in ")>]":
                depth -= 1
            elif c in "{;" and depth <= 0:
                break
            j += 1
        sig = text[m.start():j]
        if not PY_TYPES.search(sig):
            result.append(text[i:m.end()])
            i = m.end()
            continue
        # Start of the item: include preceding doc comments / attributes.
        start = m.start()
        before = text[i:start]
        lines = before.split("\n")
        # `before` ends with the indentation of the fn line (no newline).
        tail = lines.pop()
        while lines and re.match(r"^\s*(///|#\[)", lines[-1]):
            lines.pop()
        result.append("\n".join(lines) + ("\n" if lines else ""))
        # End of the item: matching brace.
        if text[j] == ";":
            end = j + 1
        else:
            depth = 0
            k = j
            while k < len(text):
                if text[k] == "{":
                    depth += 1
                elif text[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            end = k + 1
        # Swallow the rest of the line.
        nl = text.find("\n", end)
        i = len(text) if nl < 0 else nl + 1
        del tail
    return "".join(result)


def main() -> None:
    mortal = Path(sys.argv[1])
    src = mortal / "libriichi" / "src"
    if DEST.exists():
        shutil.rmtree(DEST)
    for item in KEEP:
        p = src / item
        files = [p] if p.is_file() else sorted(x for x in p.rglob("*") if x.is_file())
        for f in files:
            rel = f.relative_to(src)
            if str(rel) in SKIP_FILES:
                continue
            target = DEST / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            if f.suffix == ".rs":
                target.write_text(strip_python(f.read_text()))
            else:
                shutil.copyfile(f, target)
    commit = (mortal / ".git" / "HEAD").read_text().strip() if (mortal / ".git").exists() else "?"
    (DEST / "README.md").write_text(
        "Copied from Mortal's libriichi (AGPL-3.0-or-later,\n"
        "https://github.com/Equim-chan/Mortal) by scripts/mortal/import_libriichi.py,\n"
        f"with the Python bindings removed. Source: {commit}\n"
    )
    shutil.copyfile(mortal / "LICENSE", DEST / "LICENSE")
    print(f"copied to {DEST}")


if __name__ == "__main__":
    main()
