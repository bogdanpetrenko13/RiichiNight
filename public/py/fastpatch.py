"""Speed patches for pyriichi.

pyriichi recomputes tenpai discards on every drawn tile by brute-force
`is_winning_hand` searches (~0.4 s per draw in CPython, several seconds in
Pyodide).  These patches answer the same questions with the table-driven
shanten counter from `shanten.py`, and only fall back to pyriichi's full
decomposition when a hand really is complete (needed for yaku and scoring).

Semantics match pyriichi: a "wait" is any tile type that completes the hand
structurally (regular, chiitoitsu or kokushi) and of which the hand does not
already hold all four copies.
`tests/python/test_fastpatch.py` checks the patched results against the
original implementation on random hands.
"""

from typing import List

from pyriichi import Suit, Tile
from pyriichi.hand import Hand

from shanten import shanten

_SUITS = (Suit.MANZU, Suit.PINZU, Suit.SOUZU, Suit.HONORS)
_BASE = {Suit.MANZU: 0, Suit.PINZU: 9, Suit.SOUZU: 18, Suit.HONORS: 27}
ALL_TYPES: List[Tile] = [Tile(s, r) for s in _SUITS for r in range(1, 8 if s == Suit.HONORS else 10)]

_original_is_winning_hand = Hand.is_winning_hand


def _counts(tiles) -> List[int]:
    counts = [0] * 34
    for t in tiles:
        counts[_BASE[t.suit] + t.rank - 1] += 1
    return counts


def _open_melds(hand: Hand) -> int:
    return len(hand._melds)


def get_machi_tiles(self: Hand) -> List[Tile]:
    counts = _counts(self._tiles)
    melds = _open_melds(self)
    if (sum(counts) + 3 * melds) % 3 != 1:
        return []
    waits = []
    for i, tile in enumerate(ALL_TYPES):
        if counts[i] >= 4:
            continue  # waiting on a fifth copy is not a wait
        counts[i] += 1
        if shanten(counts, melds) == -1:
            waits.append(tile)
        counts[i] -= 1
    return waits


def is_tenpai(self: Hand) -> bool:
    return len(get_machi_tiles(self)) > 0


def calculate_tenpai_discards(self: Hand) -> List[Tile]:
    counts = _counts(self._tiles)
    melds = _open_melds(self)
    result = []
    seen = set()
    for tile in self._tiles:
        key = (tile.suit, tile.rank)
        if key in seen:
            continue
        seen.add(key)
        i = _BASE[tile.suit] + tile.rank - 1
        counts[i] -= 1
        if shanten(counts, melds) == 0 and _has_real_wait(counts, melds):
            result.append(tile)
        counts[i] += 1
    return result


def _has_real_wait(counts: List[int], melds: int) -> bool:
    for j in range(34):
        if counts[j] >= 4:
            continue
        counts[j] += 1
        done = shanten(counts, melds) == -1
        counts[j] -= 1
        if done:
            return True
    return False


def is_winning_hand(self: Hand, winning_tile: Tile, is_tsumo: bool = False) -> bool:
    tiles = list(self._tiles)
    if not is_tsumo:
        tiles.append(winning_tile)
    if shanten(_counts(tiles), _open_melds(self)) != -1:
        return False
    return _original_is_winning_hand(self, winning_tile, is_tsumo)


def apply() -> None:
    Hand.get_machi_tiles = get_machi_tiles
    Hand.is_tenpai = is_tenpai
    Hand.calculate_tenpai_discards = calculate_tenpai_discards
    Hand.is_winning_hand = is_winning_hand
