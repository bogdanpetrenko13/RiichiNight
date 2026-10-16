"""Mortal seats against pyriichi (needs the native Mortal library:
MORTAL_LIB=native/mortal/target/release/libriichinight_mortal.so and
MORTAL_DIR=public/mortal, as CI sets them; skipped otherwise).

Four Mortal seats play whole games. libriichi (Mortal's rules) follows every
event, so these tests check pyriichi against it: the same actions are legal at
every decision (kinds of action and which tiles may be discarded), every win
scores the same, and Mortal never has to fall back to the heuristic AI.
"""

import json
import os
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
import mortal  # noqa: E402
from mortal_selfplay import play  # noqa: E402
from pyriichi import GamePhase  # noqa: E402

needs_mortal = pytest.mark.skipif(mortal.link() is None, reason="Mortal library not built (MORTAL_LIB / MORTAL_DIR)")


@needs_mortal
def test_mortal_games_agree_with_libriichi():
    scoring = []
    for seed in (11, 12):
        game, rounds = play(seed, scoring=scoring)
        assert rounds >= 4
        assert not getattr(game, "legal_mismatches", []), game.legal_mismatches[:3]
        assert not game.mortal_mismatches, game.mortal_mismatches[:3]
    bad = [s for s in scoring if not s["ok"]]
    assert len(scoring) >= 8
    assert not bad, bad[:3]


@needs_mortal
def test_mortal_seats_survive_save_and_load():
    bridge.new_game(json.dumps({"seed": 21, "levels": ["mortal", "mortal", "mortal"]}), True)
    steps = 0
    while steps < 60:
        game = bridge._game
        if game.engine.get_phase() == GamePhase.ENDED:
            break
        if game.round_result is not None:
            bridge.next_round(True)
        else:
            prompt = json.loads(bridge.current())["view"].get("prompt")
            if prompt:
                acts = prompt["actions"]
                if "discard" in acts:
                    cmd = {"action": "discard", "tile": prompt["discardable"][-1]}
                else:
                    cmd = {"action": "pass" if "pass" in acts else acts[0]}
                bridge.act(json.dumps(cmd), True)
        if steps == 25:
            # Mid-hand: the Mortal seats rebuild their view from the hand's events.
            bridge.load(bridge.save())
        steps += 1
    game = bridge._game
    assert not game.mortal_mismatches, game.mortal_mismatches[:3]
