"""Checks the yaku corrections in public/py/yakufix.py against the full
engine scoring path (RuleEngine.check_win picks the best decomposition)."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

from pyriichi import GameState, Hand, YakuChecker, parse_tiles  # noqa: E402

import fastpatch  # noqa: E402
import yakufix  # noqa: E402

fastpatch.apply()
yakufix.apply()


def best_yaku(example: str):
    """Highest-han yaku set over all decompositions, like the engine does."""
    tiles = parse_tiles(example.replace(" ", ""))
    *rest, winning = tiles
    hand = Hand(rest)
    combos = hand.get_winning_combinations(winning, is_tsumo=False) or [[]]
    checker = YakuChecker()
    best = None
    for combo in combos:
        results = checker.check_all(hand, winning, combo, GameState(), is_tsumo=False)
        score = (any(r.is_yakuman for r in results), sum(r.han for r in results))
        if best is None or score > best[0]:
            best = (score, {r.yaku.value for r in results})
    return best[1]


def test_ryanpeikou_beats_seven_pairs():
    found = best_yaku("112233m 778899p 55s")
    assert "ryanpeikou" in found and "chiitoitsu" not in found, found


def test_plain_seven_pairs_still_seven_pairs():
    found = best_yaku("11m 33m 55p 77p 22s 66s 44z")
    assert found == {"chiitoitsu"}, found


def test_honroutou_has_no_chanta():
    found = best_yaku("111m 999p 222z 77z 111s")
    assert "honroutou" in found and "chanta" not in found and "junchan" not in found, found


def test_chanta_with_sequence_kept():
    found = best_yaku("123m 999p 789s 111z 99s")
    assert "chanta" in found, found


def test_junchan_with_sequence_kept():
    found = best_yaku("123m 789m 999p 123s 11s")
    assert "junchan" in found, found


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("PASS", name)


def test_winning_tiles_counts_melds_and_win_tile_once():
    from types import SimpleNamespace
    from yakufix import winning_tiles

    t = lambda code: SimpleNamespace(code=code)  # noqa: E731
    pon = SimpleNamespace(tiles=[t("6z"), t("6z"), t("6z")])
    # Tsumo: the drawn tile is already among the 11 closed tiles.
    closed = [t(c) for c in ("1m", "2m", "3m", "4p", "4p", "5p", "6p", "7p", "8s", "8s", "8s")]
    tsumo_hand = SimpleNamespace(tiles=closed, melds=[pon])
    assert len(winning_tiles(tsumo_hand, closed[-1])) == 14
    # Ron: 10 closed tiles + the discard + the pon.
    ron_hand = SimpleNamespace(tiles=closed[:-1], melds=[pon])
    tiles = winning_tiles(ron_hand, t("8s"))
    assert len(tiles) == 14
    assert sum(1 for x in tiles if x.code == "6z") == 3
