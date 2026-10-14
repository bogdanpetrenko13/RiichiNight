"""Play-style statistics from simulated games (used by test_styles.py; run
directly for a table: `python tests/python/style_stats.py [games]`)."""

import json
import os
import random
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

import bridge  # noqa: E402
from ai import Brain  # noqa: E402
from test_bridge import human_command  # noqa: E402

STYLE_LEVEL = {"reckless": "easy", "precise": "normal", "sharp": "hard", "showy": "normal", "patient": "hard", "flush": "easy"}


def play(style: str, seed: int, stats: dict) -> None:
    level = STYLE_LEVEL.get(style, "normal")
    cfg = {"seed": seed, "levels": [level] * 3, "styles": [style] * 3, "rules": {"gameLength": "east"}}
    step = json.loads(bridge.new_game(json.dumps(cfg), True))
    brain = Brain("normal", random.Random(seed))
    riichi = set()
    rivers = defaultdict(set)
    for _ in range(4000):
        for e in step["events"]:
            t = e["t"]
            if t == "round_start":
                riichi.clear()
                rivers.clear()
                for s in (1, 2, 3):
                    stats["rounds"] += 1
            elif t == "discard":
                seat = e["seat"]
                base = e["tile"].lstrip("r")
                if seat in (1, 2, 3) and not e["riichi"] and seat not in riichi:
                    threats = [r for r in riichi if r != seat]
                    if threats:
                        stats["under_riichi"] += 1
                        if all(base in rivers[r] for r in threats):
                            stats["safe"] += 1
                rivers[seat].add(base)
                if e["riichi"]:
                    riichi.add(seat)
                    if seat in (1, 2, 3):
                        stats["riichi"] += 1
            elif t == "meld" and e["seat"] in (1, 2, 3):
                stats["calls"] += 1
            elif t == "win":
                for w in e["winners"]:
                    if w in (1, 2, 3):
                        stats["wins"] += 1
                if e["from"] in (1, 2, 3):
                    stats["dealins"] += 1
        view = step["view"]
        if view["status"] == "game_over":
            return
        if view["status"] == "round_over":
            res = view["result"]
            if res["type"] == "win":
                for w in res["winners"]:
                    if w["seat"] in (1, 2, 3):
                        stats["points"] += w["points"]
                        keys = {y["key"] for y in w["yaku"]}
                        if keys & {"honitsu", "chinitsu"}:
                            stats["flush_wins"] += 1
                        if w["melds"]:
                            stats["open_wins"] += 1
                        if not w["melds"] and "riichi" not in keys:
                            stats["dama_wins"] += 1
            step = json.loads(bridge.next_round(True))
            continue
        step = json.loads(bridge.act(json.dumps(human_command(bridge._game, brain)), True))


def collect(styles, games: int) -> dict:
    out = {}
    for style in styles:
        stats = defaultdict(int)
        for g in range(games):
            play(style, 1000 + g, stats)
        r = max(1, stats["rounds"])
        out[style] = {
            "calls/hand": stats["calls"] / r,
            "riichi/hand": stats["riichi"] / r,
            "win%": 100 * stats["wins"] / r,
            "dealin%": 100 * stats["dealins"] / r,
            "safe%": 100 * stats["safe"] / max(1, stats["under_riichi"]),
            "avg pts": stats["points"] / max(1, stats["wins"]),
            "flush wins%": 100 * stats["flush_wins"] / max(1, stats["wins"]),
            "dama wins%": 100 * stats["dama_wins"] / max(1, stats["wins"]),
            "open wins%": 100 * stats["open_wins"] / max(1, stats["wins"]),
            "_wins": stats["wins"],
        }
    return out


if __name__ == "__main__":
    import time

    games = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    t = time.time()
    table = collect(["reckless", "precise", "sharp", "showy", "patient", "flush", "balanced"], games)
    cols = list(next(iter(table.values())).keys())
    print("style".ljust(10), *(c.rjust(11) for c in cols))
    for s, row in table.items():
        print(s.ljust(10), *(f"{row[c]:11.2f}" for c in cols))
    print(f"{time.time() - t:.0f}s")
