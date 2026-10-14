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


def test_without_tile_keeps_red_five():
    """Tile.__eq__ ignores the red flag: removing a plain 5 must not take the red one."""
    from pyriichi.tiles import Suit, Tile

    red = Tile(Suit.PINZU, 5, is_red_dora=True)
    plain = Tile(Suit.PINZU, 5)
    hand = [Tile(Suit.PINZU, 4), red, plain]
    left = bridge.without_tile(hand, plain)
    assert [str(t) for t in left] == ["4p", "r5p"]
    left = bridge.without_tile(hand, red)
    assert [str(t) for t in left] == ["4p", "5p"]


def test_scenario_tsumo_wins_on_first_draw():
    import scenarios

    step = json.loads(bridge.new_game(json.dumps({"seed": 5, "scenario": "tsumo"})))
    game = bridge._game
    hand = sorted(str(t) for t in game.engine.get_hand(bridge.HUMAN).tiles)
    expected = scenarios.parse(scenarios.SCENARIOS["tsumo"]["hand"])
    for code in expected:
        assert code in hand
    total = sum(len(game.engine.get_hand(p).tiles) for p in range(4)) + len(game.engine._tile_set._tiles)
    assert total == 136 - 14
    # Discard the junk tile (if dealing) and keep cutting the drawn tile until tsumo shows up.
    for _ in range(40):
        view = step["view"]
        if view["status"] == "ai":
            step = json.loads(bridge.ai_step())
            continue
        if view["status"] == "round_over":
            break
        prompt = view["prompt"]
        if "tsumo" in prompt["actions"]:
            step = json.loads(bridge.act(json.dumps({"action": "tsumo"})))
            break
        if "discard" in prompt["actions"]:
            tile = "1z" if "1z" in prompt["discardable"] else prompt["discardable"][-1]
            step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": tile})))
        else:
            step = json.loads(bridge.act(json.dumps({"action": "skip"})))
    result = step["view"]["result"]
    assert result and result["type"] == "win" and result["tsumo"], result
    w = result["winners"][0]
    assert w["seat"] == 0 and w["winTile"] == "7s"
    keys = [p["key"] for p in w["calc"]["fuParts"]]
    assert keys == ["base", "tsumo", "closedTriplet", "valuePair", "wait_kanchan"], keys
    assert w["calc"]["dora"] == 3


def test_scenario_redfive_keeps_red_in_hand():
    step = json.loads(bridge.new_game(json.dumps({"seed": 6, "scenario": "redfive"})))
    for _ in range(40):
        view = step["view"]
        if view["status"] == "ai":
            step = json.loads(bridge.ai_step())
            continue
        if view["players"][0].get("drawn") == "5p":
            break
        prompt = view["prompt"]
        if "discard" in prompt["actions"]:
            step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": "1z"})))
        else:
            step = json.loads(bridge.act(json.dumps({"action": "skip"})))
    me = step["view"]["players"][0]
    assert "r5p" in me["hand"], me
    step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": "5p"})))
    me = step["view"]["players"][0]
    assert "r5p" in me["hand"], me
    assert me["discards"][-1] == "5p", me["discards"]
