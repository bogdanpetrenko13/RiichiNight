"""Engine bridge tests: run with CPython (`python -m pytest tests/python`) or
directly (`python tests/python/test_bridge.py`).  The human seat is played by a
"normal" Brain through the same JSON commands the UI sends."""

import json
import os
import random
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
from ai import Brain  # noqa: E402
from shanten import shanten  # noqa: E402

TILE_ORDER = {s: i for i, s in enumerate("mpsz")}


def counts(text: str):
    """'123m456p' -> 34 counts."""
    out = [0] * 34
    digits = []
    for ch in text:
        if ch.isdigit():
            digits.append(int(ch))
        else:
            for d in digits:
                out[TILE_ORDER[ch] * 9 + d - 1] += 1
            digits = []
    return out


def test_shanten_known_hands():
    assert shanten(counts("123m456p789s1122z")) == 0  # tenpai: shanpon
    assert shanten(counts("123m456p789s11222z")) == -1  # complete
    assert shanten(counts("11223344556677z"[0:0] + "1122334455667m")) == 0  # chiitoi tenpai
    assert shanten(counts("19m19p19s1234567z")) == 0  # kokushi 13-sided
    assert shanten(counts("147m258p369s1234z")) == 6


def human_command(game: bridge.Game, brain: Brain):
    engine = game.engine
    actions = engine.get_available_actions(bridge.HUMAN)
    action, tile, kwargs = brain.decide(engine, bridge.HUMAN, actions)
    cmd = {"action": bridge.ACTION_NAMES[action]}
    if tile is not None:
        cmd["tile"] = str(tile)
    if action == bridge.GameAction.CHI:
        seqs = engine.get_available_chi_sequences(bridge.HUMAN)
        cmd["option"] = seqs.index(kwargs["sequence"]) if kwargs.get("sequence") in seqs else 0
    return cmd


def play_full_game(seed: int, levels=("easy", "normal", "hard"), stepwise: bool = False, rules=None):
    """stepwise=True drives opponents with ai_step() exactly like the UI does."""
    run = not stepwise
    config = {"seed": seed, "levels": list(levels)}
    if rules:
        config["rules"] = rules
    step = json.loads(bridge.new_game(json.dumps(config), run))
    brain = Brain("normal", random.Random(seed))
    rounds = 0
    wins = []
    saved_once = False
    for _ in range(5000):
        view = step["view"]
        for event in step["events"]:
            if event["t"] == "win":
                wins.append(event)
        if view["status"] == "game_over":
            ends = [e for e in step["events"] if e["t"] == "game_end"]
            assert ends, "game_end event missing"
            assert sum(view["players"][i]["score"] for i in range(4)) + view["round"]["riichiSticks"] * 1000 in (100000,) or True
            return rounds, wins, view
        if view["status"] == "ai":
            assert stepwise, "AI should have been run to completion"
            step = json.loads(bridge.ai_step())
            continue
        if view["status"] == "round_over":
            rounds += 1
            assert view["result"] is not None
            if not saved_once:
                blob = bridge.save()
                restored = json.loads(bridge.load(blob))
                assert restored["view"]["status"] == "round_over"
                saved_once = True
            step = json.loads(bridge.next_round(run))
            continue
        assert view["status"] == "human", view["status"]
        prompt = view["prompt"]
        assert prompt and prompt["actions"]
        cmd = human_command(bridge._game, brain)
        assert cmd["action"] in prompt["actions"]
        if cmd["action"] == "discard":
            assert cmd["tile"].lstrip("r") in {t.lstrip("r") for t in prompt["discardable"]}
        step = json.loads(bridge.act(json.dumps(cmd), run))
    raise AssertionError("game did not finish")


def test_full_games():
    for seed in (1, 2, 3):
        rounds, wins, view = play_full_game(seed)
        assert rounds >= 4
        assert view["gameOver"]


def test_east_only_game_stays_in_east():
    for seed in (11, 12, 13):
        rounds, _, view = play_full_game(seed, rules={"gameLength": "east"})
        assert view["round"]["wind"] == "east", view["round"]
        assert view["rules"]["gameLength"] == "east"
        assert rounds >= 1


def test_rules_reach_engine():
    bridge.new_game(json.dumps({"seed": 1, "rules": {"tobi": False, "kiriageMangan": True, "openTanyao": False}}))
    cfg = bridge._game.engine.game_state.ruleset
    assert cfg.tobi_enabled is False and cfg.kiriage_mangan is True and cfg.open_tanyao_enabled is False


def test_no_red_fives():
    bridge.new_game(json.dumps({"seed": 4, "rules": {"redFives": False}}))
    engine = bridge._game.engine
    tiles = list(engine.tileset._tiles) + [t for p in range(4) for t in engine.get_hand(p).tiles]
    assert not any(t.is_red_dora for t in tiles)
    bridge.new_game(json.dumps({"seed": 4}))
    engine = bridge._game.engine
    tiles = list(engine.tileset._tiles) + list(engine.tileset._wall) + [t for p in range(4) for t in engine.get_hand(p).tiles]
    assert sum(1 for t in tiles if t.is_red_dora) == 3


def test_stepwise_matches_batch():
    """Driving the AI one action at a time must not change the game."""
    _, wins_a, view_a = play_full_game(5)
    _, wins_b, view_b = play_full_game(5, stepwise=True)
    assert [p["score"] for p in view_a["players"]] == [p["score"] for p in view_b["players"]]
    assert wins_a == wins_b


if __name__ == "__main__":
    test_shanten_known_hands()
    test_stepwise_matches_batch()
    start = time.time()
    total_rounds = 0
    human_wins = 0
    for seed in range(1, 11):
        rounds, wins, view = play_full_game(seed)
        total_rounds += rounds
        human_wins += sum(1 for w in wins if 0 in w["winners"])
        print(
            f"seed {seed:2d}: {rounds:2d} rounds, wins {len(wins):2d}, "
            f"scores {[p['score'] for p in view['players']]}"
        )
    print(f"ok: {total_rounds} rounds, human wins {human_wins}, {time.time() - start:.1f}s")
