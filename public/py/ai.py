"""Opponent AI with three difficulty levels.

easy   - efficiency-based discards with frequent mistakes, never calls, never folds
normal - shanten + ukeire discards, calls yakuhai pon, folds only when far from tenpai
hard   - normal + calls that keep a yaku, push/fold against riichi by tile danger

The AI only reads its own hand and public information (rivers, melds, dora,
riichi declarations), never the other hands or the wall order.
"""

import random
from typing import Dict, List, Optional, Tuple

from pyriichi import GameAction, MeldType, Suit, Tile
from shanten import shanten, useful_tiles

SUIT_BASE = {Suit.MANZU: 0, Suit.PINZU: 9, Suit.SOUZU: 18, Suit.HONORS: 27}
WIND_RANK = {"east": 1, "south": 2, "west": 3, "north": 4}


def tile_index(tile: Tile) -> int:
    return SUIT_BASE[tile.suit] + tile.rank - 1


def counts_of(tiles: List[Tile]) -> List[int]:
    counts = [0] * 34
    for t in tiles:
        counts[tile_index(t)] += 1
    return counts


class Brain:
    def __init__(self, level: str, rng: random.Random):
        if level not in ("easy", "normal", "hard"):
            level = "normal"
        self.level = level
        self.rng = rng

    # ------------------------------------------------------------------ info
    @staticmethod
    def _visible_counts(engine, me: int) -> List[int]:
        """Copies of each tile type the player can see (own hand, rivers, melds, dora)."""
        seen = counts_of(engine.get_hand(me).tiles)
        for p in range(engine.get_num_players()):
            for t in engine.get_discards(p):
                seen[tile_index(t)] += 1
            for meld in engine.get_hand(p).melds:
                for t in meld.tiles:
                    seen[tile_index(t)] += 1
        for t in engine.get_revealed_dora_indicators():
            seen[tile_index(t)] += 1
        return seen

    def _unseen(self, engine, me: int) -> List[int]:
        seen = self._visible_counts(engine, me)
        return [max(0, 4 - s) for s in seen]

    @staticmethod
    def _yakuhai_ranks(engine, me: int) -> set:
        gs = engine.game_state
        ranks = {5, 6, 7}
        ranks.add(WIND_RANK[gs.round_wind.value])
        ranks.add(WIND_RANK[gs.seat_winds[me].value])
        return ranks

    def _threats(self, engine, me: int) -> List[int]:
        return [
            p
            for p in range(engine.get_num_players())
            if p != me and engine.get_hand(p).is_riichi
        ]

    # ---------------------------------------------------------------- danger
    def _danger(self, engine, tile: Tile, threats: List[int], seen: List[int]) -> float:
        total = 0.0
        idx = tile_index(tile)
        for r in threats:
            river = {tile_index(t) for t in engine.get_discards(r)}
            if idx in river:
                continue  # genbutsu
            if tile.is_honor:
                total += 1 if seen[idx] >= 3 else 2 if seen[idx] == 2 else 4
                continue
            rank = tile.rank
            base = idx - (rank - 1)
            low = (base + rank - 4) if rank >= 4 else None
            high = (base + rank + 2) if rank <= 6 else None
            low_safe = low is None or low in river
            high_safe = high is None or high in river
            if low_safe and high_safe:
                total += 3 if rank in (1, 9) else 4  # suji
            elif rank in (1, 9):
                total += 5
            elif rank in (2, 8):
                total += 6.5
            else:
                total += 8
        return total

    # --------------------------------------------------------------- discard
    def _discard_options(self, engine, me: int, candidates: List[Tile]):
        hand = engine.get_hand(me)
        open_melds = len(hand.melds)
        counts = counts_of(hand.tiles)
        unseen = self._unseen(engine, me)
        dora = {tile_index(t) for t in engine.get_revealed_dora_tiles()}
        by_type: Dict[int, Tile] = {}
        for t in candidates:
            idx = tile_index(t)
            # Prefer keeping red fives: discard the plain copy when possible.
            if idx not in by_type or (by_type[idx].is_red_dora and not t.is_red_dora):
                by_type[idx] = t
        options = []
        for idx, tile in by_type.items():
            counts[idx] -= 1
            s = shanten(counts, open_melds)
            options.append([s, tile, idx])
            counts[idx] += 1
        best_s = min(o[0] for o in options)
        scored = []
        for s, tile, idx in options:
            ukeire = 0
            if s <= best_s + 0:
                counts[idx] -= 1
                _, ukeire = useful_tiles(counts, open_melds, unseen)
                counts[idx] += 1
            value_penalty = (2 if idx in dora else 0) + (1 if tile.is_red_dora else 0)
            isolation = 0 if tile.is_honor else abs(tile.rank - 5)
            scored.append((s, -ukeire, value_penalty, -isolation, tile))
        scored.sort(key=lambda x: (x[0], x[1], x[2], x[3]))
        return scored

    def choose_discard(self, engine, me: int, candidates: Optional[List[Tile]] = None) -> Tile:
        hand = engine.get_hand(me)
        if hand.is_riichi:
            return hand.last_drawn_tile or hand.tiles[-1]
        candidates = candidates or list(hand.tiles)
        scored = self._discard_options(engine, me, candidates)

        if self.level == "easy" and self.rng.random() < 0.3:
            return self.rng.choice(candidates)

        threats = self._threats(engine, me)
        best_shanten = scored[0][0]
        fold_limit = {"easy": 99, "normal": 2, "hard": 1}[self.level]
        if threats and best_shanten >= fold_limit:
            seen = self._visible_counts(engine, me)
            ranked = sorted(
                candidates,
                key=lambda t: (self._danger(engine, t, threats, seen), -scored_rank(scored, t)),
            )
            return ranked[0]
        return scored[0][4]

    # ----------------------------------------------------------------- calls
    def _should_call(self, engine, me: int, action: GameAction) -> bool:
        if self.level == "easy":
            return False
        if self._threats(engine, me) and self.level == "normal":
            return False
        tile = engine.get_last_discard()
        if tile is None:
            return False
        hand = engine.get_hand(me)
        yakuhai = self._yakuhai_ranks(engine, me)
        has_yaku_meld = any(
            m.tiles[0].is_honor and m.tiles[0].rank in yakuhai
            for m in hand.melds
            if m.type in (MeldType.PON_MELD, MeldType.OPEN_KAN, MeldType.CLOSED_KAN)
        )
        if action == GameAction.PON:
            if tile.is_honor and tile.rank in yakuhai:
                return True
            if self.level != "hard" or not has_yaku_meld:
                return False
        elif action == GameAction.CHI:
            if self.level != "hard" or not has_yaku_meld:
                return False
        else:
            return False
        counts = counts_of(hand.tiles)
        before = shanten(counts, len(hand.melds))
        idx = tile_index(tile)
        if action == GameAction.PON:
            counts[idx] -= 2
        else:
            seqs = engine.get_available_chi_sequences(me)
            if not seqs:
                return False
            for t in seqs[0]:
                counts[tile_index(t)] -= 1
        # After the call we still have to discard: best case removes one more tile.
        after = min(
            shanten([c - (1 if i == j else 0) for i, c in enumerate(counts)], len(hand.melds) + 1)
            for j in range(34)
            if counts[j] > 0
        )
        return after < before

    # ---------------------------------------------------------------- decide
    def decide(self, engine, me: int, actions: List[GameAction]) -> Tuple[GameAction, Optional[Tile], dict]:
        if GameAction.RON in actions:
            return GameAction.RON, None, {}
        if GameAction.TSUMO in actions:
            return GameAction.TSUMO, None, {}

        hand = engine.get_hand(me)
        if GameAction.DECLARE_RIICHI in actions:
            choices = hand.tenpai_discards
            if choices and (self.level != "easy" or self.rng.random() < 0.7):
                return GameAction.DECLARE_RIICHI, self.choose_discard(engine, me, choices), {}

        if GameAction.DISCARD in actions:
            return GameAction.DISCARD, self.choose_discard(engine, me), {}

        for call in (GameAction.PON, GameAction.CHI):
            if call in actions and self._should_call(engine, me, call):
                if call == GameAction.CHI:
                    seqs = engine.get_available_chi_sequences(me)
                    return call, None, {"sequence": seqs[0]}
                return call, None, {}

        if GameAction.PASS in actions:
            return GameAction.PASS, None, {}
        return actions[0], None, {}


def scored_rank(scored, tile: Tile) -> int:
    for i, row in enumerate(scored):
        if tile_index(row[4]) == tile_index(tile):
            return -i
    return -len(scored)
