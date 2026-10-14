"""Score explanation (calcinfo.py) and the dora / fu fixes, over many full games:
fu parts add up to pyriichi's fu, dora parts to the dora han, payments to the
score change."""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
from test_bridge import play_full_game  # noqa: E402

SEEDS = range(1, 13)


def collect_wins():
    results = []
    original = bridge.Game._finish_win

    def spy(self, result):
        original(self, result)
        results.append((self.round_result, self.engine.game_state.dealer))

    bridge.Game._finish_win = spy
    try:
        for seed in SEEDS:
            play_full_game(seed)
    finally:
        bridge.Game._finish_win = original
    return results


WINS = None


def wins():
    global WINS
    if WINS is None:
        WINS = collect_wins()
    return WINS


def test_fu_parts_add_up():
    checked = 0
    for result, _ in wins():
        for w in result["winners"]:
            calc = w["calc"]
            if w["yakuman"]:
                continue
            raw = sum(p["fu"] for p in calc["fuParts"])
            assert raw == calc["fuRaw"], (calc, w["fu"])
            rounded = raw if raw == 25 else (raw + 9) // 10 * 10
            assert rounded == w["fu"], (calc["fuParts"], w["fu"])
            checked += 1
    assert checked > 50


def test_dora_parts_add_up():
    for result, _ in wins():
        for w in result["winners"]:
            if w["yakuman"]:
                continue
            calc = w["calc"]
            yaku_han = sum(y["han"] for y in w["yaku"])
            assert calc["dora"] + calc["aka"] + calc["ura"] == w["han"] - yaku_han, (w, calc)


def test_payments_match_score_change():
    for result, dealer in wins():
        if len(result["winners"]) != 1:
            continue
        w = result["winners"][0]
        calc = w["calc"]
        gain = result["deltas"][w["seat"]]
        pay = calc["payments"]
        if result["tsumo"]:
            if w["seat"] == dealer:
                total = 3 * pay["nonDealer"]
            else:
                total = pay["dealer"] + 2 * pay["nonDealer"]
        else:
            total = pay["ron"]
        # The winner's own riichi deposit this round is part of the delta.
        own_stick = 1000 if calc["uraIndicators"] is not None else 0
        assert total + calc["sticks"] - own_stick == gain, (calc, gain, result["deltas"])


def test_open_hand_ron_has_at_least_30_fu():
    for result, _ in wins():
        for w in result["winners"]:
            if w["melds"] and not result["tsumo"] and not w["yakuman"]:
                assert w["fu"] >= 30, w


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
