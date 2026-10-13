"""Shanten and ukeire helpers used by the AI.

Tiles are indexed 0..33: 0-8 manzu, 9-17 pinzu, 18-26 souzu, 27-33 honors
(E S W N White Green Red).  Pure Python, no dependencies, Pyodide-friendly.
"""

from functools import lru_cache
from typing import List, Sequence, Tuple

TERMINALS_AND_HONORS = (0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33)


def _suit_best(counts: Tuple[int, ...], is_honor: bool) -> List[Tuple[int, int, int]]:
    """All non-dominated (mentsu, taatsu, pair) splits of one suit."""
    return list(_suit_splits(counts, is_honor))


@lru_cache(maxsize=None)
def _suit_splits(counts: Tuple[int, ...], is_honor: bool) -> frozenset:
    results = set()
    c = list(counts)

    def dfs(i: int, m: int, t: int, p: int) -> None:
        while i < len(c) and c[i] == 0:
            i += 1
        if i >= len(c):
            results.add((m, t, p))
            return
        if c[i] >= 3:
            c[i] -= 3
            dfs(i, m + 1, t, p)
            c[i] += 3
        if not is_honor and i + 2 < len(c) and c[i + 1] and c[i + 2]:
            c[i] -= 1
            c[i + 1] -= 1
            c[i + 2] -= 1
            dfs(i, m + 1, t, p)
            c[i] += 1
            c[i + 1] += 1
            c[i + 2] += 1
        if c[i] >= 2:
            c[i] -= 2
            dfs(i, m, t, p + 1)
            c[i] += 2
        if not is_honor and i + 1 < len(c) and c[i + 1]:
            c[i] -= 1
            c[i + 1] -= 1
            dfs(i, m, t + 1, p)
            c[i] += 1
            c[i + 1] += 1
        if not is_honor and i + 2 < len(c) and c[i + 2]:
            c[i] -= 1
            c[i + 2] -= 1
            dfs(i, m, t + 1, p)
            c[i] += 1
            c[i + 2] += 1
        saved = c[i]
        c[i] = 0
        dfs(i + 1, m, t, p)
        c[i] = saved

    dfs(0, 0, 0, 0)
    # Keep only splits that are not dominated by another one.
    pruned = set()
    for a in results:
        if not any(b != a and b[0] >= a[0] and b[1] >= a[1] and b[2] >= a[2] for b in results):
            pruned.add(a)
    return frozenset(pruned)


def shanten_regular(counts: Sequence[int], open_melds: int = 0) -> int:
    suits = [
        _suit_splits(tuple(counts[0:9]), False),
        _suit_splits(tuple(counts[9:18]), False),
        _suit_splits(tuple(counts[18:27]), False),
        _suit_splits(tuple(counts[27:34]), True),
    ]
    best = 8
    for a in suits[0]:
        for b in suits[1]:
            for c in suits[2]:
                for d in suits[3]:
                    m = a[0] + b[0] + c[0] + d[0] + open_melds
                    t = a[1] + b[1] + c[1] + d[1]
                    pairs = a[2] + b[2] + c[2] + d[2]
                    # Spare pairs act as taatsu; one pair can be the head.
                    has_head = 1 if pairs > 0 else 0
                    t += pairs - has_head
                    if m + t > 4:
                        t = 4 - m
                    s = 8 - 2 * m - t - has_head
                    if s < best:
                        best = s
    return best


def shanten_chiitoi(counts: Sequence[int]) -> int:
    pairs = sum(1 for x in counts if x >= 2)
    kinds = sum(1 for x in counts if x >= 1)
    return 6 - pairs + max(0, 7 - kinds)


def shanten_kokushi(counts: Sequence[int]) -> int:
    kinds = sum(1 for i in TERMINALS_AND_HONORS if counts[i] >= 1)
    pair = any(counts[i] >= 2 for i in TERMINALS_AND_HONORS)
    return 13 - kinds - (1 if pair else 0)


def shanten(counts: Sequence[int], open_melds: int = 0) -> int:
    """Minimum shanten over regular, chiitoitsu and kokushi (closed only)."""
    s = shanten_regular(counts, open_melds)
    if open_melds == 0:
        s = min(s, shanten_chiitoi(counts), shanten_kokushi(counts))
    return s


def useful_tiles(counts: List[int], open_melds: int, unseen: Sequence[int]) -> Tuple[List[int], int]:
    """Tiles that reduce shanten for a 13-tile (3n+1) hand, and how many remain unseen."""
    base = shanten(counts, open_melds)
    tiles: List[int] = []
    total = 0
    for i in range(34):
        if unseen[i] <= 0 or counts[i] >= 4:
            continue
        counts[i] += 1
        if shanten(counts, open_melds) < base:
            tiles.append(i)
            total += unseen[i]
        counts[i] -= 1
    return tiles, total
