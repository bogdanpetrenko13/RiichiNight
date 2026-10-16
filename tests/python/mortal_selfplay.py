"""Self-play with four Mortal seats: checks the mjai event stream, the move
mapping and where pyriichi and libriichi (Mortal's rules) disagree.

    MORTAL_LIB=... MORTAL_DIR=... python tests/python/mortal_selfplay.py [games] [seed]

Prints a summary of legal-action disagreements (`legal_mismatches`) and
fallbacks (`mortal_mismatches`), plus the final scores.
"""

import os
import sys
import time
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
import mortal  # noqa: E402
from ai import Brain  # noqa: E402
from pyriichi import GamePhase  # noqa: E402


def check_points(game, scoring: list) -> None:
    """Compares pyriichi's payments with libriichi's for each Mortal win."""
    res = game.round_result
    pts = getattr(game, "mortal_agari", None) or {}
    game.mortal_agari = {}
    if not res or res.get("type") != "win":
        return
    for w in res["winners"]:
        p = pts.get(w["seat"])
        if p is None:
            continue
        calc = w["calc"]
        honba_each = round(calc["honba"] / 300) * 100
        pay = calc["payments"]
        if "error" in p:
            mine, theirs = "-", p["error"]
        elif "ron" in pay:
            mine, theirs = pay["ron"] - calc["honba"], p["ron"]
        elif calc["dealer"]:
            mine, theirs = pay["nonDealer"] - honba_each, p["tsumo_ko"]
        else:
            mine, theirs = (pay["dealer"] - honba_each, pay["nonDealer"] - honba_each), (p["tsumo_oya"], p["tsumo_ko"])
        scoring.append({"ok": mine == theirs, "engine": mine, "libriichi": theirs, "han": w["han"], "fu": w["fu"],
                        "yaku": [f"{y['key']}{y['han']}" for y in w["yaku"]], "hand": w["hand"], "melds": w["melds"],
                        "win": w["winTile"], "tsumo": res["tsumo"], "dora_ind": res["dora"],
                        "dora": [calc["dora"], calc["aka"], calc["ura"]], "ura_ind": calc["uraIndicators"], "brief": p.get("brief", "")[:600], "events": list(game.mjai.events)})


def play(seed: int, levels=("mortal", "mortal", "mortal"), human_mortal=True, max_rounds=40, scoring=None):
    game = bridge.Game({"seed": seed, "levels": list(levels), "rules": {"gameLength": "hanchan"}})
    human = mortal.MortalBrain(0, Brain("hard", game.rng), (0.0, 1.0), seed) if human_mortal else Brain("hard", game.rng)
    rounds = 0
    for _ in range(20000):
        if game.engine.get_phase() == GamePhase.ENDED:
            break
        if game.round_result is not None:
            if scoring is not None:
                check_points(game, scoring)
            rounds += 1
            if rounds >= max_rounds:
                break
            game.next_round()
            continue
        game.run_ai()
        if game.round_result is not None or game.engine.get_phase() != GamePhase.PLAYING:
            continue
        actions = game.engine.get_available_actions(0)
        if not actions:
            continue
        if isinstance(human, mortal.MortalBrain):
            a, t, kw = human.decide(game, actions)
        else:
            a, t, kw = human.decide(game.engine, 0, actions)
        game._exec(0, a, t, **kw)
    return game, rounds


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    seed0 = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    assert mortal.link() is not None, "set MORTAL_LIB and MORTAL_DIR"
    legal, fallbacks = Counter(), Counter()
    scoring = []
    examples = {}
    t0 = time.time()
    total_rounds = 0
    for g in range(n):
        game, rounds = play(seed0 + g, scoring=scoring)
        total_rounds += rounds
        for m in getattr(game, "legal_mismatches", []):
            key = f"mortal+{m['mortal']} engine+{m['engine']}"
            legal[key] += 1
            examples.setdefault(key, m)
        for m in game.mortal_mismatches:
            key = m["why"][:90]
            fallbacks[key] += 1
            examples.setdefault(key, m)
        print(f"game {seed0 + g}: {rounds} hands, scores {game.engine.game_state.scores}", flush=True)
    print(f"{total_rounds} hands in {time.time() - t0:.0f}s")
    print("legal-action disagreements:")
    for k, v in legal.most_common():
        print(f"  {v:4d}  {k}\n        e.g. {examples[k]}")
    bad = [x for x in scoring if not x["ok"]]
    print(f"scoring: {len(scoring) - len(bad)}/{len(scoring)} wins agree with libriichi")
    for x in bad[:15]:
        print("   ", x)
    print("fallbacks:")
    for k, v in fallbacks.most_common():
        print(f"  {v:4d}  {k}\n        e.g. {examples[k]}")
