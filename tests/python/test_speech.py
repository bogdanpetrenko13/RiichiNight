"""Every heroine's lines (src/game/speech/<id>.ts) cover every situation in
both languages, placeholders are known and never the only option, story
beats come in order, and bonds only name heroines that exist (with lines
both ways in both languages)."""

import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
SPEECH = os.path.join(ROOT, "src", "game", "speech")


def _kinds():
    text = open(os.path.join(SPEECH, "types.ts"), encoding="utf-8").read()
    block = text[text.index("SPEECH_KINDS"):]
    block = block[: block.index("];")]
    return re.findall(r'"(\w+)"', block)


PLACEHOLDERS = {"points", "yaku", "name"}


def _heroines():
    return sorted(f[:-3] for f in os.listdir(SPEECH) if f.endswith(".ts") and f not in ("types.ts", "index.ts"))


def _section(text, start, end):
    i = text.index(start)
    j = text.index(end, i + len(start)) if end else len(text)
    return text[i:j]


def test_every_situation_has_lines_in_both_languages():
    kinds = _kinds()
    assert len(kinds) >= 24, kinds
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
                # {points}, {yaku}, {name} only, and a line without any, for
                # when the situation has no value to fill in.
                for x in items:
                    assert set(re.findall(r"\{(\w+)\}", x)) <= PLACEHOLDERS, (hid, lang, kind, x)
                assert any(not re.search(r"\{\w+\}", x) for x in items), (hid, lang, kind)
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
                for which in ("greet", "lostTo", "beat", "riichi"):
                    m = re.search(which + r': \[(.*?)\]', sub)
                    assert m and re.findall(r'"[^"]+"', m.group(1)), (hid, other, lang, which)
        bonds[hid] = set(others)
        assert others, f"{hid} knows nobody at the table"
    for hid, others in bonds.items():
        for other in others:
            assert hid in bonds[other], f"{hid} knows {other}, but not the other way round"


def test_story_beats_are_short_ordered_and_in_both_languages():
    """Five pieces of her story, told one by one as you keep playing her."""
    for hid in _heroines():
        text = open(os.path.join(SPEECH, hid + ".ts"), encoding="utf-8").read()
        block = _section(text, "  beats: [", "  lines: {")
        ats = [int(x) for x in re.findall(r"at: (\d+),", block)]
        assert len(ats) == 5, (hid, ats)
        assert ats == sorted(set(ats)) and ats[0] >= 1, (hid, ats)
        for lang in ("en", "ru"):
            texts = re.findall(lang + r': "((?:[^"\\]|\\.)+)"', block)
            assert len(texts) == 5, (hid, lang)
            assert all(len(x) <= 110 for x in texts), (hid, lang, [x for x in texts if len(x) > 110])


def test_russian_lines_do_not_give_the_player_a_gender():
    """The player may be anyone: no "ты выиграл", "сам", "готов" in lines
    addressed to them (lines to another heroine may use feminine forms)."""
    gendered = re.compile(r"\bты\s+\w+л\b|\bсам\b|\bготов\b|\bрад\b(?!а)", re.I)
    for hid in _heroines():
        text = open(os.path.join(SPEECH, hid + ".ts"), encoding="utf-8").read()
        ru = _section(_section(text, "  lines: {", "  bonds: {"), "    ru: {", None)
        beats = re.findall(r'ru: "((?:[^"\\]|\\.)+)"', _section(text, "  beats: [", "  lines: {"))
        for line in re.findall(r'"((?:[^"\\]|\\.)+)"', ru) + beats:
            assert not gendered.search(line), (hid, line)


CALL_WORDS = {"pon": "pon", "пон": "pon", "chi": "chi", "чи": "chi", "kan": "kan", "кан": "kan"}


def _line_call(line):
    """The call a line opens with, as lineCall() in src/game/characters.ts."""
    m = re.match(r"([a-zа-яё]+)", line.strip(), re.I)
    return CALL_WORDS.get(m.group(1).lower()) if m else None


def test_every_call_has_a_fitting_line():
    """A "call" line naming a call ("Pon!", "Чи.") is said only for that call,
    so each heroine needs, for Pon, Chi and Kan alike, a line that names it or
    names none ("Беру!"), in both languages."""
    for hid in _heroines():
        text = open(os.path.join(SPEECH, hid + ".ts"), encoding="utf-8").read()
        lines = _section(text, "  lines: {", "  bonds: {")
        for lang, block in (("en", _section(lines, "    en: {", "    ru: {")), ("ru", _section(lines, "    ru: {", None))):
            items = re.findall(r'"((?:[^"\\]|\\.)+)"', re.search(r"\bcall: \[(.*?)\],", block).group(1))
            for call in ("pon", "chi", "kan"):
                assert any(_line_call(x) in (None, call) for x in items), (hid, lang, call, items)
            assert _line_call("Pon! Mine!") == "pon" and _line_call("Чи. Так быстрее.") == "chi"
            assert _line_call("Беру-беру!") is None and _line_call("Чистая рука") is None
