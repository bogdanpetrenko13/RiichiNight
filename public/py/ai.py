"""Opponent AI: a difficulty level plus a play style.

Levels (how well she plays):
easy   - efficiency-based discards with frequent mistakes (30 % random)
normal - shanten + ukeire discards
hard   - the same; the style decides calls and defence

Styles (how she plays; one per heroine, see STYLES):
fold      fold against riichi when her best shanten is >= this (99: never)
fold_two  also fold at tenpai when two players are in riichi
calls     none | yakuhai (value-honour pon) | yaku (pon/chi that keep a yaku)
          | fast (also all-simples calls) | honitsu (calls in her flush suit)
dama      stay silent (no riichi) when the closed hand is all simples
flush     discard tiles outside her strongest suit first (honitsu hunting)
keep      keep dora and honour pairs longer (big flashy hands)

Without a style the level picks the old behaviour (beginner / balanced / sharp).
The AI only reads its own hand and public information (rivers, melds, dora,
riichi declarations), never the other hands or the wall order.
"""

import random
from typing import Dict, List, Optional, Tuple

from pyriichi import GameAction, MeldType, Suit, Tile
from shanten import shanten, useful_tiles
import rulefix

SUIT_BASE = {Suit.MANZU: 0, Suit.PINZU: 9, Suit.SOUZU: 18, Suit.HONORS: 27}
WIND_RANK = {"east": 1, "south": 2, "west": 3, "north": 4}


def tile_index(tile: Tile) -> int:
    return SUIT_BASE[tile.suit] + tile.rank - 1


def counts_of(tiles: List[Tile]) -> List[int]:
    counts = [0] * 34
    for t in tiles:
        counts[tile_index(t)] += 1
    return counts


STYLES: Dict[str, dict] = {
    # Defaults by level (games without heroine styles, older saves).
    "beginner": {"fold": 99, "calls": "none"},
    "balanced": {"fold": 2, "calls": "yakuhai"},
    "sharp": {"fold": 1, "calls": "yaku"},
    # Heroines (src/game/characters.ts `style`).
    "reckless": {"fold": 99, "calls": "fast"},  # Hikari: fast, cheerful, reckless
    "precise": {"fold": 1, "calls": "yakuhai", "dama": True},  # Rin: calm, poker face
    "showy": {"fold": 99, "calls": "yakuhai", "keep": True},  # Yuzu: flashy hands, never folds
    "patient": {"fold": 1, "fold_two": True, "calls": "none"},  # Reiko: patient, ruthless
    "flush": {"fold": 99, "calls": "honitsu", "flush": True},  # Nanami: honitsu, hates folding
}
LEVEL_STYLE = {"easy": "beginner", "normal": "balanced", "hard": "sharp"}


class Brain:
    def __init__(self, level: str, rng: random.Random, style: Optional[str] = None):
        if level not in ("easy", "normal", "hard"):
            level = "normal"
        self.level = level
        self.rng = rng
        self.style_name = style if style in STYLES else LEVEL_STYLE[level]

    @property
    def style(self) -> dict:
        # getattr: brains pickled in saves from before styles have no style_name.
        return STYLES.get(getattr(self, "style_name", None) or LEVEL_STYLE[self.level], STYLES["balanced"])

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
        style = self.style
        flush_suit = self._flush_suit(hand) if style.get("flush") else None
        scored = []
        for s, tile, idx in options:
            off = flush_suit is not None and not tile.is_honor and tile.suit != flush_suit
            ukeire = 0
            if s <= best_s or (off and s <= best_s + 1):
                counts[idx] -= 1
                _, ukeire = useful_tiles(counts, open_melds, unseen)
                counts[idx] += 1
            value_penalty = (2 if idx in dora else 0) + (1 if tile.is_red_dora else 0)
            if style.get("keep"):
                # Flashy hands: dora and honour pairs are worth a step of shanten.
                value_penalty *= 2
                if tile.is_honor and counts[idx] >= 2:
                    value_penalty += 2
            isolation = 0 if tile.is_honor else abs(tile.rank - 5)
            # Flush hunting: an off-suit number tile goes first, even at one
            # step of shanten.
            flush_rank = 1
            if off:
                s = max(best_s, s - 1)
                flush_rank = 0
            elif flush_suit is None:
                flush_rank = 0
            scored.append((s, flush_rank, -ukeire, value_penalty, -isolation, tile))
        scored.sort(key=lambda x: x[:5])
        return scored

    @staticmethod
    def _flush_suit(hand, need: int = 8) -> Optional[Suit]:
        """Her strongest number suit if a half flush is still realistic
        (at least `need` of her tiles are that suit or honours)."""
        tiles = list(hand.tiles) + [t for m in hand.melds for t in m.tiles]
        by_suit: Dict[Suit, int] = {}
        for t in tiles:
            if not t.is_honor:
                by_suit[t.suit] = by_suit.get(t.suit, 0) + 1
        if not by_suit:
            return None
        suit, n = max(by_suit.items(), key=lambda kv: kv[1])
        honors = sum(1 for t in tiles if t.is_honor)
        if any(not m.tiles[0].is_honor and m.tiles[0].suit != suit for m in hand.melds):
            return None
        return suit if n + honors >= need else None

    def choose_discard(self, engine, me: int, candidates: Optional[List[Tile]] = None) -> Tile:
        hand = engine.get_hand(me)
        if hand.is_riichi:
            return hand.last_drawn_tile or hand.tiles[-1]
        candidates = candidates or list(hand.tiles)
        # Kuikae: right after a call some kinds may not be discarded.
        bad = rulefix.forbidden_discards(engine, me)
        candidates = [t for t in candidates if (t.suit, t.rank) not in bad] or candidates
        scored = self._discard_options(engine, me, candidates)

        if self.level == "easy" and self.rng.random() < 0.3:
            return self.rng.choice(candidates)

        threats = self._threats(engine, me)
        best_shanten = scored[0][0]
        style = self.style
        fold = threats and (
            best_shanten >= style["fold"] or (style.get("fold_two") and len(threats) >= 2)
        )
        if fold:
            seen = self._visible_counts(engine, me)
            ranked = sorted(
                candidates,
                key=lambda t: (self._danger(engine, t, threats, seen), -scored_rank(scored, t)),
            )
            return ranked[0]
        return scored[0][-1]

    # ----------------------------------------------------------------- calls
    def _should_call(self, engine, me: int, action: GameAction) -> bool:
        mode = self.style["calls"]
        if mode == "none":
            return False
        # Careful styles stop calling once someone is in riichi.
        if self._threats(engine, me) and self.style["fold"] <= 2:
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
        if action not in (GameAction.PON, GameAction.CHI):
            return False
        if action == GameAction.PON and tile.is_honor and tile.rank in yakuhai:
            return True  # every calling style takes a value-honour pon
        if mode == "yakuhai":
            return False
        if mode == "yaku" and not has_yaku_meld:
            return False
        if mode == "fast" and not (has_yaku_meld or self._all_simples_after(hand, tile, action, engine, me)):
            return False
        if mode == "honitsu":
            # Only call once the flush is nearly there, so the hand keeps a yaku.
            suit = self._flush_suit(hand, need=10)
            if suit is None or (not tile.is_honor and tile.suit != suit):
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

    @staticmethod
    def _all_simples_after(hand, tile, action, engine, me) -> bool:
        """Open tanyao is still possible after this call (no terminals / honours)."""
        if not tile.is_simple:
            return False
        if action == GameAction.CHI:
            seqs = engine.get_available_chi_sequences(me)
            if not seqs or any(not t.is_simple for t in seqs[0]):
                return False
        melds_ok = all(all(t.is_simple for t in m.tiles) for m in hand.melds)
        yaochuu = sum(1 for t in hand.tiles if not t.is_simple)
        return melds_ok and yaochuu <= 2

    # ---------------------------------------------------------------- decide
    def decide(self, engine, me: int, actions: List[GameAction]) -> Tuple[GameAction, Optional[Tile], dict]:
        if GameAction.RON in actions:
            return GameAction.RON, None, {}
        if GameAction.TSUMO in actions:
            return GameAction.TSUMO, None, {}

        hand = engine.get_hand(me)
        if GameAction.DECLARE_RIICHI in actions:
            choices = hand.tenpai_discards
            silent = self.style.get("dama") and self._dama_ok(hand, choices)
            if choices and silent and GameAction.DISCARD in actions:
                # Dama: keep tenpai without announcing it.
                return GameAction.DISCARD, self.choose_discard(engine, me, choices), {}
            if choices and not silent and (self.level != "easy" or self.rng.random() < 0.7):
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


def _dama_ok_impl(hand, choices) -> bool:
    """Closed all-simples tenpai after some tenpai discard: tanyao is a yaku
    already, so a poker-faced player can wait without announcing riichi."""
    tiles = list(hand.tiles)
    for cut in choices or []:
        rest = list(tiles)
        for i, t in enumerate(rest):
            if t is cut or (str(t) == str(cut)):
                del rest[i]
                break
        if all(t.is_simple for t in rest):
            return True
    return False


Brain._dama_ok = staticmethod(_dama_ok_impl)  # type: ignore[attr-defined]


def scored_rank(scored, tile: Tile) -> int:
    for i, row in enumerate(scored):
        if tile_index(row[-1]) == tile_index(tile):
            return -i
    return -len(scored)
