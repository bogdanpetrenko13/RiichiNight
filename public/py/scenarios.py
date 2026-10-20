"""Rigged first deals for tests and quick visual checks.

`new_game({"scenario": name})` (or `?scenario=name` in the app URL) replaces the
first deal of the game with a prepared one, so a test can reach a situation in
a few moves instead of waiting for it to happen by chance:

  tsumo    the player is tenpai on a kanchan wait and draws the winning tile
           on the first turn (closed triplet, value pair, 3 dora): the result
           screen with every fu part
  redfive  the player holds the red 5p and draws a plain 5p first (the red
           five must stay in the hand when the drawn 5p is discarded)
  riichi   all three rivals start tenpai on a tanki wait the player holds
           all other copies of, so one of them declares riichi within the
           first go-around and nobody wins first (rival riichi display)
  rivalpon the right-hand rival holds a pair of red dragons and the
           player is dealt the third: cutting it lets her Pon
           (call announcement, outlined new meld)
  mypon    the player holds a pair of red dragons, the right-hand rival a
           lone one she cuts early: the player's own Pon announcement
  myriichi the player alone starts tenpai (same hand as "riichi"): the
           player's riichi flow, the sideways tile in the player's river

Only the tiles named here are placed; everything else stays shuffled by the
seed. The human is seat 0. Draw order follows the turn order from the dealer.
"""

from typing import Dict, List, Optional

from pyriichi.hand import Hand

HUMAN = 0

# hand: the player's 13 tiles (a 14th junk tile is added when the player
# deals; omitted = a shuffled hand); draws: the player's next draws in order;
# rivals: 13-tile hands of seats 1, 2, 3 (the dealer gets a 14th from the
# wall); dora: first dora indicator.
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
    "riichi": {
        # Each rival waits on one honour tile whose other three copies the
        # player holds, so nobody can win before declaring riichi (the test
        # autopilot cuts the drawn tile, the player's hand stays put).
        "hand": "555z 666z 777z 1122z",
        "junk": "9s",
        "rivals": ["123m 456m 789p 234s 5z", "234p 567p 678s 345m 6z", "789m 123s 456s 345p 7z"],
        "dora": "9p",
    },
    "rivalpon": {
        "hand": "7z 123m 456m 13p 79s 24s",
        "junk": "9p",
        "rivals": ["77z 123m 456p 78s 23p 5s"],
        "dora": "1m",
    },
    "mypon": {
        "hand": "77z 123m 58m 46p 79s 33s",
        "junk": "9p",
        "rivals": ["7z 123m 456m 789p 234s"],
        "dora": "1m",
    },
    "myriichi": {
        "hand": "555z 666z 777z 1122z",
        "junk": "9s",
        "dora": "9p",
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


def _replace_dead(ts, old, new) -> None:
    """Put `new` in the dead wall in place of `old` (in every list that holds
    it; matched by identity, Tile.__eq__ ignores red fives)."""
    for attr in ("_wall", "_rinshan_tiles", "_dora_indicators", "_ura_dora_indicators"):
        tiles = getattr(ts, attr, None) or []
        for i, t in enumerate(tiles):
            if t is old:
                tiles[i] = new


def _take_any(ts, pool: list, code: str):
    """A tile from the pool, or else from the dead wall (not the visible dora
    indicator), with a pool tile put in its place."""
    try:
        return _take(pool, code)
    except ValueError:
        shown = ts._dora_indicators[0] if ts._dora_indicators else None
        for t in list(ts._wall):
            if str(t) == code and t is not shown:
                _replace_dead(ts, t, pool.pop())
                return t
        raise


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

    # The dora indicator first: the old one goes back to the pool.
    if spec.get("dora"):
        indicator = _take(pool, spec["dora"])
        old = ts._dora_indicators[0]
        ts._dora_indicators[0] = indicator
        # Same slot in the dead wall (by identity: Tile.__eq__ ignores red fives).
        slot = next((i for i, t in enumerate(ts._wall) if t is old), None)
        if slot is not None:
            ts._wall[slot] = indicator
        pool.append(old)

    rivals = {seat: [_take_any(ts, pool, c) for c in parse(text)] for seat, text in enumerate(spec.get("rivals", []), start=1)}
    for seat, tiles in rivals.items():
        if len(tiles) != 13:
            raise ValueError(f"scenario {name}: seat {seat} needs 13 tiles, has {len(tiles)}")
    mine = [_take_any(ts, pool, c) for c in parse(spec["hand"])] if spec.get("hand") else []
    if spec.get("hand") and len(mine) != 13:
        raise ValueError(f"scenario {name}: the hand needs 13 tiles, has {len(mine)}")
    if spec.get("hand") and dealer == HUMAN:
        mine.append(_take_any(ts, pool, spec["junk"]))
    draws = [_take_any(ts, pool, c) for c in spec.get("draws", [])]

    hands: List[list] = [[] for _ in range(n)]
    hands[HUMAN] = mine
    for seat, tiles in rivals.items():
        hands[seat] = tiles
    for seat in range(n):
        size = 14 if seat == dealer else 13
        while len(hands[seat]) < size:
            hands[seat].append(pool.pop(0))

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
    # A dealt hand gets its riichi discards when its 14th tile is added; the
    # rigged dealer hand is built whole, so compute them here (else no Riichi
    # on the dealer's first turn)...
    deal_hand = engine._hands[dealer]
    deal_hand._tenpai_discards = deal_hand.calculate_tenpai_discards()
    # ...and its 14th tile counts as drawn (shown apart, cut by tsumogiri).
    deal_hand._last_drawn_tile = hands[dealer][-1]
    engine._waiting_for_actions = {dealer: engine._calculate_turn_actions(dealer)}
