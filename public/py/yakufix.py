"""Corrections to pyriichi's yaku detection (pyriichi 0.1.1).

1. Ryanpeikou scored as chiitoitsu. A hand such as 112233m 778899p 55s is
   both seven pairs and four sets + pair. pyriichi checks the seven-pairs
   shape first and returns early, so the set decomposition (ryanpeikou,
   3 han, often with pinfu/tanyao) is never considered. Standard rules score
   the interpretation worth more; ties go to the set decomposition.

2. Chanta / junchan without a sequence. Both yaku require at least one
   sequence; an all-triplet hand of terminals and honours is honroutou
   (+ toitoi) instead. pyriichi awarded chanta on top of honroutou.

tests/python/test_yakufix.py covers both cases plus regressions.
"""

from typing import List

from pyriichi.hand import CombinationType
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


def apply() -> None:
    YakuChecker.check_all = check_all  # type: ignore[method-assign]
