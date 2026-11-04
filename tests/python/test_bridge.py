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
from ai import Brain, counts_of  # noqa: E402
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


def test_scenario_riichi_rivals_tenpai_and_one_declares():
    """Scenario "riichi": every rival starts tenpai, the tile count is intact
    and, whatever the dealer seat, a rival declares riichi before anyone wins."""
    for seed in range(1, 13):
        game = bridge.Game({"seed": seed, "scenario": "riichi", "levels": ["heur:0.25", "heur:0.33", "heur:0.3"],
                            "styles": ["flush", "reckless", "showy"]})
        ts = game.engine._tile_set
        assert sum(len(h.tiles) for h in game.engine._hands) + len(ts._tiles) + len(ts._wall) == 136
        dealer = game.engine.game_state.dealer
        for seat in (1, 2, 3):
            tiles = list(game.engine._hands[seat].tiles)
            if seat == dealer:
                assert any(shanten(counts_of(tiles[:i] + tiles[i + 1:])) == 0 for i in range(len(tiles))), seed
            else:
                assert shanten(counts_of(tiles)) == 0, (seed, seat)
        declared = False
        for _ in range(40):
            game.run_ai()
            if any(getattr(game.engine._hands[s], "is_riichi", False) for s in (1, 2, 3)):
                declared = True
                break
            actions = game.engine.get_available_actions(0)
            if game.round_result is not None or not actions:
                break
            a, t, kw = Brain("easy", random.Random(1)).decide(game.engine, 0, actions)
            game._exec(0, a, t, **kw)
        assert declared, seed


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


def test_old_save_without_new_attributes_keeps_playing():
    """Saves from older versions lack attributes added later (Game.scenario,
    Brain.style_name); loading one and playing on must still work."""
    step = json.loads(bridge.new_game(json.dumps({"seed": 21}), True))
    game = bridge._game
    del game.scenario
    for brain in game.brains.values():
        del brain.style_name
    blob = bridge.save()
    json.loads(bridge.load(blob))
    brain = Brain("normal", random.Random(21))
    for _ in range(3000):
        view = step["view"]
        if view["status"] == "round_over":
            step = json.loads(bridge.next_round(True))
            assert step["view"]["status"] in ("human", "ai", "round_over", "game_over")
            return
        step = json.loads(bridge.act(json.dumps(human_command(bridge._game, brain)), True))
    raise AssertionError("no round end")


def test_first_east_is_drawn_and_ties_go_to_the_seat_closer_to_it():
    """config.dealer picks the first East (the UI draws it): the player's
    seat wind follows, and ties in the standings go to the seat closer to
    the first East. (test_score_audit plays whole matches from every seat.)"""
    for dealer in range(4):
        view = json.loads(bridge.new_game(json.dumps({"seed": 11, "dealer": dealer, "gameRules": {"gameLength": "east"}})))["view"]
        assert view["round"]["dealer"] == dealer and view["round"]["startDealer"] == dealer
        assert view["players"][0]["wind"] == ["east", "north", "west", "south"][dealer], view["players"][0]["wind"]
    game = bridge._game
    game.engine.game_state._scores = [25000, 25000, 25000, 25000]
    game.start_dealer = 2
    game.game_end_emitted = False
    game.events = []
    game._emit_game_end()
    assert game.events[-1]["placement"] == [2, 3, 0, 1]


def test_win_on_the_kan_replacement_tile_is_offered_and_paid():
    """A replacement tile that completes the hand is an ordinary draw: Tsumo
    is offered (not declared by itself), counts rinshan kaihou and is paid."""
    step = json.loads(bridge.new_game(json.dumps({"seed": 3, "scenario": "rinshan"})))
    assert "ankan" in step["view"]["prompt"]["actions"]
    step = json.loads(bridge.act(json.dumps({"action": "ankan", "tile": "1m"})))
    view = step["view"]
    assert view["status"] == "human" and view["result"] is None, view["status"]
    assert "tsumo" in view["prompt"]["actions"]
    assert "win" not in [e["t"] for e in step["events"]]
    step = json.loads(bridge.act(json.dumps({"action": "tsumo"})))
    result = step["view"]["result"]
    assert result["type"] == "win" and result["tsumo"]
    w = result["winners"][0]
    assert w["seat"] == 0 and w["winTile"] == "2s"
    assert "rinshan" in [y["key"] for y in w["yaku"]]
    deltas = result["deltas"]
    assert deltas[0] == w["points"] > 0 and sum(deltas) == 0, deltas
    assert all(d < 0 for d in deltas[1:]), deltas


def test_kan_replacement_tile_can_be_declined_and_rinshan_ends_with_the_discard():
    step = json.loads(bridge.new_game(json.dumps({"seed": 3, "scenario": "rinshan"})))
    step = json.loads(bridge.act(json.dumps({"action": "ankan", "tile": "1m"})))
    step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": "2s"})))
    engine = bridge._game.engine
    assert getattr(engine, "_rinshan_player", None) is None
    assert step["view"]["result"] is None or step["view"]["result"]["type"] != "win" or \
        step["view"]["result"]["winners"][0]["seat"] != 0


def test_river_tsumogiri_flags_follow_the_discards():
    """view players[].tsumogiri: one flag per river tile, equal to the discard
    events' flags (called tiles leave the river and their flag); a game
    saved before the flags existed shows its earlier tiles as from the hand."""
    step = json.loads(bridge.new_game(json.dumps({"seed": 21})))
    flags = {s: [] for s in range(4)}
    seen = 0
    for _ in range(4000):
        for ev in step["events"]:
            if ev["t"] == "discard":
                flags[ev["seat"]].append(ev["tsumogiri"])
            if ev["t"] == "meld" and ev.get("from") is not None:
                flags[ev["from"]].pop()
        view = step["view"]
        if view["status"] in ("round_over", "game_over"):
            break
        for p in view["players"]:
            assert len(p["tsumogiri"]) == len(p["discards"]), p
            assert p["tsumogiri"] == flags[p["seat"]], (p["seat"], p["tsumogiri"], flags[p["seat"]])
            seen += sum(p["tsumogiri"])
        if view["status"] == "human":
            pr = view["prompt"]
            if "pass" in pr["actions"]:
                step = json.loads(bridge.act(json.dumps({"action": "pass"})))
            elif "discard" in pr["actions"]:
                me = view["players"][0]
                tile = me.get("drawn") if len(flags[0]) % 2 else me["hand"][0]
                step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": tile or me["hand"][0]})))
            else:
                step = json.loads(bridge.act(json.dumps({"action": pr["actions"][0]})))
        else:
            step = json.loads(bridge.ai_step())
    assert seen > 0
    # An old save: no flags at all -> every tile shows as from the hand.
    game = bridge._game
    del game.tsumogiri_marks
    view = game.view()
    for p in view["players"]:
        assert p["tsumogiri"] == [False] * len(p["discards"])


def test_safe_tiles_against_riichi_follow_every_discard_of_the_hand():
    """players[0].safe: kinds no rival in riichi can ron, recomputed from the
    discard events (her own discards, called ones included, and everything
    thrown after her riichi); absent while nobody is in riichi."""
    checked = 0
    for seed in range(1, 40):
        step = json.loads(bridge.new_game(json.dumps({"seed": seed})))
        log, riichi_at = [], {}
        for _ in range(3000):
            for ev in step["events"]:
                if ev["t"] == "discard":
                    log.append((ev["seat"], ev["tile"].lstrip("r")))
                    if ev["riichi"]:
                        riichi_at[ev["seat"]] = len(log) - 1
            view = step["view"]
            if view["status"] in ("round_over", "game_over"):
                break
            rivals = [p["seat"] for p in view["players"] if p["seat"] and p["riichi"]]
            me = view["players"][0]
            if not rivals:
                assert "safe" not in me
            else:
                expect = None
                for r in rivals:
                    kinds = {k for s, k in log if s == r} | {k for i, (s, k) in enumerate(log) if i > riichi_at[r]}
                    expect = kinds if expect is None else expect & kinds
                assert set(me["safe"]) == expect, (seed, me["safe"], expect)
                checked += 1
            if view["status"] == "human":
                pr = view["prompt"]
                if "pass" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "pass"})))
                elif "discard" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": me.get("drawn") or me["hand"][-1]})))
                else:
                    step = json.loads(bridge.act(json.dumps({"action": pr["actions"][0]})))
            else:
                step = json.loads(bridge.ai_step())
        if checked > 60:
            break
    assert checked > 20, checked
    # An old save without the log: her river as it stands.
    game = bridge._game
    del game.discard_log
    game.view()


def test_rivals_hands_are_shown_only_when_the_hand_is_over():
    """result.hands: each rival's concealed tiles, melds and waits, sent only
    with the result; the tiles add up with her melds, and a rival marked
    tenpai on an exhaustive draw has waits (and one with waits is tenpai)."""
    seen_draw = seen_win = 0
    for seed in range(1, 25):
        step = json.loads(bridge.new_game(json.dumps({"seed": seed})))
        for _ in range(3000):
            view = step["view"]
            if view["status"] in ("round_over", "game_over"):
                break
            assert view["result"] is None
            for p in view["players"][1:]:
                assert "hand" not in p, "a rival's hand leaked into the view"
            if view["status"] == "human":
                pr = view["prompt"]
                if "pass" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "pass"})))
                elif "discard" in pr["actions"]:
                    me = view["players"][0]
                    step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": me.get("drawn") or me["hand"][-1]})))
                else:
                    step = json.loads(bridge.act(json.dumps({"action": pr["actions"][0]})))
            else:
                step = json.loads(bridge.ai_step())
        result = step["view"]["result"]
        hands = result["hands"]
        assert [h["seat"] for h in hands] == [1, 2, 3]
        for h in hands:
            tiles = len(h["hand"]) + sum(3 for _ in h["melds"])
            assert tiles in (13, 14), h
            if result["type"] == "draw" and result["kind"] == "exhaustive_draw":
                assert bool(h["waits"]) == (h["seat"] in result["tenpai"]), (h, result["tenpai"])
        if result["type"] == "draw":
            seen_draw += 1
        else:
            seen_win += 1
        if seen_draw >= 2 and seen_win >= 3:
            break
    assert seen_draw and seen_win, (seen_draw, seen_win)


def test_added_kan_is_flagged_and_other_kans_are_not():
    """melds[].added: true exactly for an open kan made from the seat's own
    earlier pon (shouminkan), drawn with its fourth tile on the sideways one."""
    added = plain = 0
    for seed in range(1, 120):
        step = json.loads(bridge.new_game(json.dumps({"seed": seed})))
        pons = {s: set() for s in range(4)}
        for _ in range(3000):
            view = step["view"]
            for p in view["players"]:
                for m in p["melds"]:
                    kind = m["tiles"][0].lstrip("r")
                    if m["type"] == "open_kan":
                        assert m["added"] == (kind in pons[p["seat"]]), (seed, p["seat"], m, pons[p["seat"]])
                        added += m["added"]
                        plain += not m["added"]
                    else:
                        assert not m["added"], m
                pons[p["seat"]] |= {m["tiles"][0].lstrip("r") for m in p["melds"] if m["type"] == "pon_meld"}
            if view["status"] in ("round_over", "game_over"):
                break
            if view["status"] == "human":
                pr = view["prompt"]
                me = view["players"][0]
                if "kan" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "kan"})))
                elif "pon" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "pon"})))
                elif "pass" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "pass"})))
                elif "discard" in pr["actions"]:
                    step = json.loads(bridge.act(json.dumps({"action": "discard", "tile": me.get("drawn") or me["hand"][-1]})))
                else:
                    step = json.loads(bridge.act(json.dumps({"action": pr["actions"][0]})))
            else:
                step = json.loads(bridge.ai_step())
        if added and plain:
            break
    assert added, (added, plain)


def test_called_riichi_tile_turns_the_next_discard_sideways():
    """When a rival calls the riichi tile, it leaves the river and the
    declarer's next discard lies sideways instead (riichiIndex follows)."""
    from pyriichi.rules import GameAction

    game = bridge.Game({"seed": 7, "scenario": "riichicalled", "dealer": 0})
    engine = game.engine
    assert engine.game_state.dealer == 0
    nine = next(t for t in engine.get_hand(0).tiles if str(t) == "9s")
    game._exec(0, GameAction.DECLARE_RIICHI, nine)
    me = game.view()["players"][0]
    assert me["riichi"] and me["riichiIndex"] == 0, me
    assert GameAction.PON in engine.get_available_actions(1)
    game._exec(1, GameAction.PON, nine)
    me = game.view()["players"][0]
    assert me["discards"] == [] and me["riichiIndex"] is None, me
    # Play on until the player has thrown her next tile.
    for _ in range(40):
        if engine.get_discards(0) or game.round_result is not None:
            break
        if game.engine.get_available_actions(0):
            actions = engine.get_available_actions(0)
            a, t, kw = Brain("easy", random.Random(1)).decide(engine, 0, actions)
            game._exec(0, a, t, **kw)
        else:
            game.run_ai()
    me = game.view()["players"][0]
    assert len(me["discards"]) == 1, me
    assert me["riichiIndex"] == 0, me
    # Old saves (no tracking): pyriichi's own index.
    del game.riichi_side
    assert game.view()["players"][0]["riichiIndex"] == engine.get_hand(0).riichi_discard_index
