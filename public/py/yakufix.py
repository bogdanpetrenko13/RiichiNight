"""Corrections to pyriichi's yaku detection (pyriichi 0.1.1).

1. Ryanpeikou scored as chiitoitsu. A hand such as 112233m 778899p 55s is
   both seven pairs and four sets + pair. pyriichi checks the seven-pairs
   shape first and returns early, so the set decomposition (ryanpeikou,
   3 han, often with pinfu/tanyao) is never considered. Standard rules score
   the interpretation worth more; ties go to the set decomposition.

2. Chanta / junchan without a sequence. Both yaku require at least one
   sequence; an all-triplet hand of terminals and honours is honroutou
   (+ toitoi) instead. pyriichi awarded chanta on top of honroutou.

3. Dora counting (RuleEngine._count_dora). pyriichi counted the closed tiles
   plus the winning tile: on tsumo the drawn tile is already in the hand, so a
   winning tile that is dora / red five / ura was counted twice, and tiles in
   called melds (pon, chi, kan) were never counted at all.

tests/python/test_yakufix.py covers these cases plus regressions.
"""

from typing import List

from pyriichi.hand import CombinationType
from pyriichi.rules import RuleEngine
from pyriichi.yaku import Yaku, YakuChecker

_original_check_all = YakuChecker.check_all

_NEEDS_SEQUENCE = {Yaku.CHANTA, Yaku.JUNCHAN}


def _han(results) -> int:
    return sum(r.han for r in results)


def _has_sequence(combination) -> bool:
    return any(getattr(c, "type", None) == CombinationType.SEQUENCE for c in combination or [])


def _without_chiitoitsu(checker: YakuChecker, *args, **kwargs):
    """Runs check_all as if the seven-pairs shape did not exist."""
    original = checker.check_chiitoitsu
    checker.check_chiitoitsu = lambda *a, **k: None  # type: ignore[method-assign]
    try:
        return _original_check_all(checker, *args, **kwargs)
    finally:
        checker.check_chiitoitsu = original  # type: ignore[method-assign]


def check_all(self: YakuChecker, hand, winning_tile, winning_combination, *args, **kwargs):
    results = _original_check_all(self, hand, winning_tile, winning_combination, *args, **kwargs)

    # (1) Seven pairs that also decompose into sets: keep the better reading.
    if winning_combination and any(r.yaku == Yaku.CHIITOITSU for r in results):
        standard = _without_chiitoitsu(self, hand, winning_tile, winning_combination, *args, **kwargs)
        if standard and (any(r.is_yakuman for r in standard) or _han(standard) >= _han(results)):
            results = standard

    # (2) Chanta / junchan need at least one sequence.
    if winning_combination and not _has_sequence(winning_combination):
        results = [r for r in results if r.yaku not in _NEEDS_SEQUENCE]

    return results


def winning_tiles(hand, winning_tile=None) -> list:
    """All 14+ tiles of a won hand: closed tiles, the winning tile once, meld tiles."""
    tiles = list(hand.tiles)
    # Ron: the discard is not in the hand yet (13 - 3k tiles); tsumo: it already is.
    if winning_tile is not None and len(tiles) % 3 == 1:
        tiles.append(winning_tile)
    for meld in hand.melds:
        tiles.extend(meld.tiles)
    return tiles


def count_dora(self: RuleEngine, player: int, winning_tile=None) -> int:
    if not self._tile_set:
        return 0
    hand = self._hands[player]
    tiles = winning_tiles(hand, winning_tile)
    count = 0
    for dora in self.get_revealed_dora_tiles():
        count += sum(1 for t in tiles if t == dora)
    if hand.is_riichi:
        for indicator in self._tile_set.get_ura_dora_indicators(1 + self._kan_count) or []:
            ura = self._tile_set.get_dora(indicator)
            count += sum(1 for t in tiles if t == ura)
    count += sum(1 for t in tiles if t.is_red_dora)
    return count


def apply() -> None:
    YakuChecker.check_all = check_all  # type: ignore[method-assign]
    RuleEngine._count_dora = count_dora  # type: ignore[method-assign]
