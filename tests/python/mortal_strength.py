"""Strength of one AI against three copies of another (the difficulty ladder).

    MORTAL_LIB=... MORTAL_DIR=... python tests/python/mortal_strength.py \\
        <challenger> <opponent> <games> [seed] [east|hanchan]

A side is "<level>[/<style>]": level as in ai.parse_level (easy, normal,
hard, heur:<r>, mortal, mortal:<p>), style one of ai.STYLES (default: the
level's own). The challenger takes each seat in turn (seat = game % 4), so
the first dealer evens out. Prints one line per game and a final
"RESULT {json}" with the challenger's placements and average place
(2.5 = as strong as the opponents).
"""

import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
import mortal  # noqa: E402
from ai import Brain, parse_level  # noqa: E402
from pyriichi import GamePhase  # noqa: E402


def side(spec: str):
    level, _, style = spec.partition("/")
    return level, (style or None)


def seat0_brain(game, spec: str):
    level, style = side(spec)
    p = parse_level(level)
    rng = random.Random(game.seed * 31 + 7)
    if p["kind"] == "mortal":
        return mortal.MortalBrain(0, Brain("hard", rng, style), seed=game.seed, blend=p["blend"])
    return Brain(p["level"], rng, style, p["mistakes"])


def play(challenger: str, opponent: str, seed: int, length: str):
    seat = seed % 4
    specs = [challenger if s == seat else opponent for s in range(4)]
    levels = [side(s)[0] for s in specs[1:]]
    styles = [side(s)[1] for s in specs[1:]]
    game = bridge.Game({"seed": seed, "levels": levels, "styles": styles, "rules": {"gameLength": length}})
    me = seat0_brain(game, specs[0])
    for _ in range(40000):
        if game.engine.get_phase() == GamePhase.ENDED:
            break
        if game.round_result is not None:
            game.next_round()
            continue
        game.run_ai()
        if game.round_result is not None or game.engine.get_phase() != GamePhase.PLAYING:
            continue
        actions = game.engine.get_available_actions(0)
        if not actions:
            continue
        if isinstance(me, mortal.MortalBrain):
            a, t, kw = me.decide(game, actions)
        else:
            a, t, kw = me.decide(game.engine, 0, actions)
        game._exec(0, a, t, **kw)
    scores = list(game.engine.game_state.scores)
    order = sorted(range(4), key=lambda p: (-scores[p], p))
    return order.index(seat) + 1, scores[seat]


if __name__ == "__main__":
    challenger, opponent, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
    seed0 = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    length = sys.argv[5] if len(sys.argv) > 5 else "east"
    if "mortal" in challenger + opponent:
        assert mortal.link() is not None, "Mortal library not available (MORTAL_LIB / MORTAL_DIR)"
    places, scores = [], []
    for g in range(n):
        r, s = play(challenger, opponent, seed0 + g, length)
        places.append(r)
        scores.append(s)
        print(f"{challenger} vs {opponent} game {seed0 + g}: place {r}, {s}", flush=True)
    result = {
        "challenger": challenger,
        "opponent": opponent,
        "games": n,
        "places": [places.count(i) for i in (1, 2, 3, 4)],
        "avg_place": round(sum(places) / n, 4),
        "avg_score": round(sum(scores) / n),
    }
    print("RESULT " + json.dumps(result))
