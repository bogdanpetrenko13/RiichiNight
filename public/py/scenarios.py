"""Rigged first deals for tests and quick visual checks.

`new_game({"scenario": name})` (or `?scenario=name` in the app URL) replaces the
first deal of the game with a prepared one, so a test can reach a situation in
a few moves instead of waiting for it to happen by chance:

  tsumo    the player is tenpai on a kanchan wait and draws the winning tile
           on the first turn (closed triplet, value pair, 3 dora): the result
           screen with every fu part
  redfive  the player holds the red 5p and draws a plain 5p first (the red
           five must stay in the hand when the drawn 5p is discarded)

Only the tiles named here are placed; everything else stays shuffled by the
seed. The human is seat 0. Draw order follows the turn order from the dealer.
"""

from typing import Dict, List, Optional

from pyriichi.hand import Hand

HUMAN = 0

# hand: the player's 13 tiles (a 14th junk tile is added when the player
# deals); draws: the player's next draws in order; dora: first dora indicator.
SCENARIOS: Dict[str, dict] = {
    "tsumo": {
        "hand": "234m 789p 444s 68s 77z",
        "junk": "1z",
        "draws": ["7s"],
        "dora": "3s",
    },
    "redfive": {
        "hand": "123m r5p 67p 456s 789s 2z",
        "junk": "1z",
        "draws": ["5p"],
        "dora": "1m",
    },
}


def parse(text: str) -> List[str]:
    """'234m r5p 77z' -> ['2m', '3m', '4m', 'r5p', '7z', '7z']"""
    out: List[str] = []
    for group in text.split():
        red = group.startswith("r")
        body = group[1:] if red else group
        suit = body[-1]
        for i, digit in enumerate(body[:-1]):
            out.append(("r" if red and i == 0 else "") + digit + suit)
    return out


def _take(pool: list, code: str):
    for i, tile in enumerate(pool):
        if str(tile) == code:
            return pool.pop(i)
    raise ValueError(f"scenario tile {code} is not available")


def rig(engine, name: str) -> None:
    spec = SCENARIOS.get(name)
    if spec is None:
        raise ValueError(f"unknown scenario {name}")
    ts = engine._tile_set
    dealer = engine.game_state.dealer
    n = engine._num_players

    # Everything that is not in the dead wall.
    pool = [t for h in engine._hands for t in h.tiles] + list(ts._tiles)
    total = len(pool)

    mine = [_take(pool, c) for c in parse(spec["hand"])]
    if len(mine) != 13:
        raise ValueError(f"scenario {name}: the hand needs 13 tiles, has {len(mine)}")
    if dealer == HUMAN:
        mine.append(_take(pool, spec["junk"]))
    draws = [_take(pool, c) for c in spec.get("draws", [])]

    if spec.get("dora"):
        indicator = _take(pool, spec["dora"])
        old = ts._dora_indicators[0]
        ts._dora_indicators[0] = indicator
        # Same slot in the dead wall (by identity: Tile.__eq__ ignores red fives).
        slot = next((i for i, t in enumerate(ts._wall) if t is old), None)
        if slot is not None:
            ts._wall[slot] = indicator
        pool.append(old)

    hands: List[list] = [[] for _ in range(n)]
    hands[HUMAN] = mine
    for seat in range(n):
        if seat == HUMAN:
            continue
        size = 14 if seat == dealer else 13
        hands[seat] = [pool.pop(0) for _ in range(size)]

    # The k-th draw of `seat` comes at position offset + n * k of the live wall.
    offset = (HUMAN - dealer - 1) % n
    wall: List[Optional[object]] = [None] * len(pool + draws)
    for k, tile in enumerate(draws):
        wall[offset + n * k] = tile
    rest = iter(pool)
    wall = [t if t is not None else next(rest) for t in wall]
    assert sum(len(h) for h in hands) + len(wall) == total

    ts._tiles = wall
    engine._hands = [Hand(sorted(h)) for h in hands]
    engine._waiting_for_actions = {dealer: engine._calculate_turn_actions(dealer)}
