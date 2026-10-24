"""React effects must return nothing or a cleanup function. An arrow with an
expression body (`useEffect(() => el.scrollIntoView(), ...)`) returns that
expression's value; newer WebViews return Promises from such DOM calls, and
React then crashes calling it on cleanup ("n is not a function")."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_no_expression_bodied_effects():
    bad = []
    for f in (ROOT / "src").rglob("*.ts*"):
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r"use(Layout)?Effect\(\(\) => [^{(]", line):
                bad.append(f"{f.relative_to(ROOT)}:{n}: {line.strip()}")
    assert not bad, "effects with an expression body:\n" + "\n".join(bad)
