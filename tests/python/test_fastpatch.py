"""Compare fastpatch results against pyriichi's original implementation."""

import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

from pyriichi.hand import Hand  # noqa: E402
from pyriichi.tiles import Suit, Tile  # noqa: E402

import fastpatch  # noqa: E402

ORIGINAL = {
    "get_machi_tiles": Hand.get_machi_tiles,
    "calculate_tenpai_discards": Hand.calculate_tenpai_discards,
}

WALL = [Tile(s, r) for s in (Suit.MANZU, Suit.PINZU, Suit.SOUZU) for r in range(1, 10) for _ in range(4)] + [
    Tile(Suit.HONORS, r) for r in range(1, 8) for _ in range(4)
]


def near_tenpai_hand(rng: random.Random, size: int):
    """Hands built from melds + a pair + noise, so many of them are tenpai."""
    tiles = []
    while len(tiles) < size - 2:
        suit = rng.choice((Suit.MANZU, Suit.PINZU, Suit.SOUZU, Suit.HONORS))
        if suit == Suit.HONORS or rng.random() < 0.3:
            rank = rng.randint(1, 7 if suit == Suit.HONORS else 9)
            group = [Tile(suit, rank)] * 3
        else:
            rank = rng.randint(1, 7)
            group = [Tile(suit, rank + k) for k in range(3)]
        tiles.extend(group)
    tiles = tiles[: size - 2]
    tiles.extend(rng.sample(WALL, 2))
    # Mutate one tile to create waits of different shapes.
    tiles[rng.randrange(len(tiles))] = rng.choice(WALL)
    # Real hands never hold more than four copies of a tile.
    if any(tiles.count(t) > 4 for t in tiles):
        return near_tenpai_hand(rng, size)
    return tiles


def types(tiles):
    return sorted({(t.suit.value, t.rank) for t in tiles})


def test_machi_and_tenpai_discards_match():
    rng = random.Random(7)
    checked = 0
    for _ in range(400):
        hand13 = Hand(near_tenpai_hand(rng, 13))
        assert types(fastpatch.get_machi_tiles(hand13)) == types(ORIGINAL["get_machi_tiles"](hand13))
        hand14 = Hand(near_tenpai_hand(rng, 14))
        assert types(fastpatch.calculate_tenpai_discards(hand14)) == types(
            ORIGINAL["calculate_tenpai_discards"](hand14)
        )
        checked += 1
    assert checked == 400


if __name__ == "__main__":
    test_machi_and_tenpai_discards_match()
    print("fastpatch matches pyriichi on 800 random hands")
