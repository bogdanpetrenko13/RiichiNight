"""Every heroine's lines (src/game/speech/<id>.ts) cover every situation in
both languages, and bonds only name heroines that exist (with lines both
ways in both languages)."""

import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SPEECH = os.path.join(ROOT, "src", "game", "speech")


def _kinds():
    text = open(os.path.join(SPEECH, "types.ts"), encoding="utf-8").read()
    block = text[text.index("SPEECH_KINDS"):]
    block = block[: block.index("];")]
    return re.findall(r'"(\w+)"', block)


def _heroines():
    return sorted(f[:-3] for f in os.listdir(SPEECH) if f.endswith(".ts") and f not in ("types.ts", "index.ts"))


def _section(text, start, end):
    i = text.index(start)
    j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j]


def test_every_situation_has_lines_in_both_languages():
    kinds = _kinds()
    assert len(kinds) >= 16, kinds
    for hid in _heroines():
        text = open(os.path.join(SPEECH, hid + ".ts"), encoding="utf-8").read()
        lines = _section(text, "  lines: {", "  bonds: {")
        en = _section(lines, "    en: {", "    ru: {")
        ru = _section(lines, "    ru: {", None)
        for lang, block in (("en", en), ("ru", ru)):
            for kind in kinds:
                m = re.search(r"\b" + kind + r': \[(.*?)\],', block)
                assert m, (hid, lang, kind)
                items = re.findall(r'"((?:[^"\\]|\\.)+)"', m.group(1))
                assert len(items) >= 2, (hid, lang, kind, items)
                assert all(len(x) <= 70 for x in items), (hid, lang, kind, [x for x in items if len(x) > 70])
        for field in ("chatty:", "story:", "playstyle:"):
            assert field in text, (hid, field)
        chatty = float(re.search(r"chatty: ([0-9.]+)", text).group(1))
        assert 0.3 <= chatty <= 1, (hid, chatty)


def test_bonds_name_real_heroines_and_go_both_ways():
    heroines = set(_heroines())
    roster = open(os.path.join(ROOT, "src", "game", "characters.ts"), encoding="utf-8").read()
    for hid in heroines:
        assert f'id: "{hid}"' in roster, hid
    bonds = {}
    for hid in heroines:
        text = open(os.path.join(SPEECH, hid + ".ts"), encoding="utf-8").read()
        block = _section(text, "  bonds: {", None)
        others = re.findall(r"^    (\w+): \{$", block, re.M)
        for other in others:
            assert other in heroines, (hid, other)
            part = _section(block, f"    {other}: {{", "\n    },")
            for lang in ("en", "ru"):
                sub = _section(part, f"      {lang}: {{", "      }")
                for which in ("greet", "lostTo"):
                    m = re.search(which + r': \[(.*?)\]', sub)
                    assert m and re.findall(r'"[^"]+"', m.group(1)), (hid, other, lang, which)
        bonds[hid] = set(others)
        assert others, f"{hid} knows nobody at the table"
    for hid, others in bonds.items():
        for other in others:
            assert hid in bonds[other], f"{hid} knows {other}, but not the other way round"
