"""Every example hand in src/learn/yaku.ts must be a complete hand that the
engine scores with the yaku it illustrates."""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
sys.path.insert(0, os.path.join(ROOT, "public", "py"))

from pyriichi import GameState, Hand, YakuChecker, parse_tiles  # noqa: E402

import fastpatch  # noqa: E402

fastpatch.apply()

# Reference ids that differ from the engine's yaku keys.
ENGINE_KEY = {"yakuhai": "chun"}
# A single-wait example of four concealed triplets scores the tanki variant.
ALSO_OK = {"suuankou": {"suuankou_tanki"}}
# riichi needs a declaration, not just a hand shape.
# ryanpeikou: pyriichi 0.1.1 scores this shape as chiitoitsu (2 han) instead of
# ryanpeikou (3 han). Known engine bug; the reference text states the real rule.
SKIP = {"riichi", "ryanpeikou"}


def examples():
    text = open(os.path.join(ROOT, "src", "learn", "yaku.ts"), encoding="utf-8").read()
    for m in re.finditer(r'id: "([a-z_]+)",\s*name:.*?(?:example: "([^"]+)",)?\s*desc:', text, re.S):
        if m.group(2):
            yield m.group(1), m.group(2)


def scored_yaku(example: str):
    tiles = parse_tiles(example.replace(" ", ""))
    assert len(tiles) == 14, (example, len(tiles))
    *rest, winning = tiles
    hand = Hand(rest)
    assert hand.is_winning_hand(winning), f"not a complete hand: {example}"
    # Seven pairs and kokushi have no set decomposition (the engine uses []).
    combos = hand.get_winning_combinations(winning, is_tsumo=False) or [[]]
    checker = YakuChecker()
    found = set()
    for combo in combos:
        results = checker.check_all(hand, winning, combo, GameState(), is_tsumo=False)
        found |= {r.yaku.value for r in results}
    return found


def test_examples_are_complete_and_score_their_yaku():
    checked = 0
    for yid, example in examples():
        found = scored_yaku(example)
        if yid in SKIP:
            continue
        key = ENGINE_KEY.get(yid, yid)
        ok = {key} | ALSO_OK.get(yid, set())
        assert ok & found, f"{yid}: {example} scored {sorted(found)}"
        checked += 1
    assert checked >= 25, checked


if __name__ == "__main__":
    for yid, example in examples():
        print(f"{yid:18s} {example:28s} -> {sorted(scored_yaku(example))}")
    test_examples_are_complete_and_score_their_yaku()
    print("all yaku examples ok")
