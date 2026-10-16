"""Strength ladder: one challenger against three full-strength Mortal seats.

    MORTAL_LIB=... MORTAL_DIR=... python tests/python/mortal_strength.py <challenger> <games> [seed] [east|hanchan]

challenger: hard | normal | easy (heuristic AI levels) or mortal:<explore>:<temp>
(Mortal sampling a move from softmax(Q / temp) with probability explore).
Prints the challenger's average placement (2.5 = as strong as the others),
placement counts and average final score.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
import mortal  # noqa: E402
from ai import Brain  # noqa: E402
from pyriichi import GamePhase  # noqa: E402


def make(game, spec: str):
    if spec.startswith("mortal"):
        parts = spec.split(":")
        explore = float(parts[1]) if len(parts) > 1 else 0.0
        temp = float(parts[2]) if len(parts) > 2 else 1.0
        return mortal.MortalBrain(0, Brain("hard", game.rng), (explore, temp), game.seed)
    return Brain(spec, game.rng)


def play(spec: str, seed: int, length: str):
    game = bridge.Game({"seed": seed, "levels": ["mortal"] * 3, "rules": {"gameLength": length}})
    me = make(game, spec)
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
    return order.index(0) + 1, scores[0]


if __name__ == "__main__":
    spec, n = sys.argv[1], int(sys.argv[2])
    seed0 = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    length = sys.argv[4] if len(sys.argv) > 4 else "east"
    assert mortal.link() is not None
    ranks, total = [0, 0, 0, 0], 0
    for g in range(n):
        r, s = play(spec, seed0 + g, length)
        ranks[r - 1] += 1
        total += s
        print(f"{spec} game {seed0 + g}: place {r}, {s}", flush=True)
    avg = sum((i + 1) * c for i, c in enumerate(ranks)) / n
    print(f"RESULT {spec}: avg place {avg:.3f} over {n}, places {ranks}, avg score {total / n:.0f}")
