"""Fixes to pyriichi's game flow, found by comparing it with Mortal's rules
(libriichi) in self-play (tests/python/mortal_selfplay.py).

* Kan: the replacement tile comes from the dead wall, and the dead wall is
  topped up from the end of the live wall, so every kan leaves one tile less
  to draw (the hand ends after 70 - kans draws). pyriichi kept the live wall
  whole.
* No kan on the last tile of the wall (nothing left to replace it) and no
  fifth kan.
* No chi / pon / kan on the last discard of the hand (only ron).
* Riichi needs 1000 points for the stick.
* Nine terminals (kyuushu kyuuhai) on every player's first turn while nobody
  has called, not only on the dealer's: pyriichi cleared its "first turn"
  flag after the dealer's discard.
* Ippatsu ends with the riichi player's next discard; pyriichi kept it for
  one more go-around.
* Scoring: below 5 han the base points stop at 2000 (mangan), e.g. 3 han
  70 fu is mangan, not 9000 points; the wait of 23 on 1 (and 78 on 9) is
  two-sided, not an edge wait; when the winning tile fits several waits of
  one decomposition, the one worth the most fu counts.
* Kuikae: after a chi or pon the player may not discard the called tile,
  nor (after a chi) the tile at the other end of the run; a call that would
  leave nothing else to discard is not offered.
* Dora after a red dragon indicator is the white dragon (dragons cycle
  white -> green -> red -> white); pyriichi gave East.
* Temporary furiten: a player who lets a winning tile go by (whether or not
  the hand had a yaku for it) cannot ron until their own next discard; in
  riichi, for the rest of the hand. pyriichi only counted passed ron offers,
  and only until the next turn of anyone.
* Riichi with a red five in hand: pyriichi's tenpai check removed "a tile
  equal to" the discard and put the discard back, which could swap the red
  five for the plain one (one dora lost).
* Double riichi is the riichi declared on the player's first discard with no
  call before it; tenhou / chiihou is the win on the player's first draw with
  no call before it. pyriichi decided both from whether the dealer had
  discarded yet, so a double riichi won later scored as plain riichi and a
  non-dealer never got chiihou. (Renhou is off, as on Tenhou: rules.py.)
* Chi with a red five: pyriichi built the meld from new plain tiles, so the
  red five disappeared (one dora lost). The chi options now hold the hand's
  own tiles, the red five first (as Tenhou and Mortal call by default).
"""

from pyriichi import GameAction, RuleEngine, RuleError, Suit, Tile, TileSet
from pyriichi.hand import CombinationType, Hand
from pyriichi.scoring import ScoreCalculator, ScoreResult
from pyriichi.yaku import Machi, YakuChecker

_original_draw_rinshan = RuleEngine._draw_rinshan_tile
_original_check_interrupts = RuleEngine._check_interrupts
_original_can_riichi = RuleEngine._can_riichi
_original_can_kan = RuleEngine._can_kan
_original_can_ankan = RuleEngine._can_declare_ankan

MAX_KANS = 4


def _draw_rinshan_tile(self, player, result, *, kan_type):
    ts = self._tile_set
    before = len(ts._rinshan_tiles) if ts is not None else 0
    drawn = _original_draw_rinshan(self, player, result, kan_type=kan_type)
    if ts is not None and len(ts._rinshan_tiles) < before and ts._tiles:
        ts._tiles.pop()  # moves to the dead wall
    return drawn


def _wall_empty(self) -> bool:
    return self._tile_set is not None and self._tile_set.is_exhausted()


def _check_interrupts(self, tile, discarded_player):
    interrupts = _original_check_interrupts(self, tile, discarded_player)
    if not _wall_empty(self):
        return interrupts
    out = {}
    for seat, actions in interrupts.items():
        if GameAction.RON in actions:
            out[seat] = [GameAction.RON, GameAction.PASS]
    return out


def _can_riichi(self, player):
    if self._game_state.scores[player] < 1000:
        return False
    return _original_can_riichi(self, player)


def _kan_allowed(self) -> bool:
    return not _wall_empty(self) and self._kan_count < MAX_KANS


def _can_kan(self, player):
    return _kan_allowed(self) and _original_can_kan(self, player)


def _can_declare_ankan(self, player):
    return _kan_allowed(self) and _original_can_ankan(self, player)


def _check_kyuushu_kyuuhai(self, player):
    if player != self._current_player:
        return False
    hand = self._hands[player]
    if hand.discards or hand.melds:
        return False
    if any(h.melds for h in self._hands):
        return False
    # Only on the first draw: every discard so far was someone's first, so no
    # player has discarded twice and the drawn turn order has not wrapped.
    if len(self._hands[player].tiles) != 14:
        return False
    if any(len(h.discards) > 1 for h in self._hands):
        return False
    return len({(t.suit, t.rank) for t in hand.tiles if t.is_yaochuu}) >= 9


_original_handle_discard = RuleEngine._handle_discard


def _handle_discard(self, player, tile=None, **kwargs):
    if self._riichi_ippatsu.get(player) and self._riichi_ippatsu_discard.get(player) == 0:
        # First discard after the riichi: the ippatsu chance is over.
        self._riichi_ippatsu[player] = False
    return _original_handle_discard(self, player, tile, **kwargs)


_original_post_init = ScoreResult.__post_init__


def _score_post_init(self):
    _original_post_init(self)
    if not self.is_yakuman and self.han < 5 and self.total_points > 2000 and self.base_points > 2000:
        self.base_points = 2000
        self.total_points = 2000


# Fu of each wait, for choosing between interpretations.
_WAIT_FU = {Machi.TANKI: 2, Machi.KANCHAN: 2, Machi.PENCHAN: 2, Machi.RYANMEN: 0, Machi.SHABO: 0}
_WAIT_ORDER = [Machi.TANKI, Machi.KANCHAN, Machi.PENCHAN, Machi.RYANMEN, Machi.SHABO]


def _same(a, b) -> bool:
    return a.suit == b.suit and a.rank == b.rank


def _waits(winning_tile, winning_combination) -> set:
    waits = set()
    for comb in winning_combination:
        if getattr(comb, "is_open", False):
            continue  # a called meld cannot hold the winning tile
        tiles = sorted(comb.tiles)
        if not any(_same(t, winning_tile) for t in tiles):
            continue
        if comb.type == CombinationType.PAIR:
            waits.add(Machi.TANKI)
        elif comb.type == CombinationType.TRIPLET:
            waits.add(Machi.SHABO)
        elif comb.type == CombinationType.SEQUENCE:
            i = next(k for k, t in enumerate(tiles) if _same(t, winning_tile))
            if i == 1:
                waits.add(Machi.KANCHAN)
            elif (i == 2 and tiles[0].rank == 1) or (i == 0 and tiles[-1].rank == 9):
                waits.add(Machi.PENCHAN)
            else:
                waits.add(Machi.RYANMEN)
    return waits


def _determine_machi(self, winning_tile, winning_combination):
    """For fu: the wait worth the most."""
    waits = _waits(winning_tile, winning_combination or [])
    if not waits:
        return Machi.RYANMEN
    return max(waits, key=lambda w: (_WAIT_FU[w], -_WAIT_ORDER.index(w)))


def _determine_machi_yaku(self, winning_tile, winning_combination):
    """For pinfu: two-sided if the tile can be read as a two-sided wait."""
    waits = _waits(winning_tile, winning_combination or [])
    if not waits or Machi.RYANMEN in waits:
        return Machi.RYANMEN
    return max(waits, key=lambda w: (_WAIT_FU[w], -_WAIT_ORDER.index(w)))


def _can_chi(self, tile, from_player):
    if from_player != 0 or tile.is_honor:
        return []
    results = []
    for start in range(tile.rank - 2, tile.rank + 1):
        ranks = [start, start + 1, start + 2]
        if not all(1 <= r <= 9 for r in ranks):
            continue
        seq = []
        for r in ranks:
            if r == tile.rank:
                continue
            same = [t for t in self._tiles if t.suit == tile.suit and t.rank == r]
            if not same:
                break
            seq.append(next((t for t in same if t.is_red_dora), same[0]))
        else:
            results.append(seq)
    return results


# ------------------------------------------------------------ kuikae
def _kuikae_kinds(called, seq_tiles) -> set:
    """Kinds the caller may not discard right after the call."""
    kinds = {(called.suit, called.rank)}
    if seq_tiles:
        ranks = sorted(t.rank for t in seq_tiles)
        if called.rank < ranks[0] and ranks[1] + 1 <= 9:  # called the low end
            kinds.add((called.suit, ranks[1] + 1))
        elif called.rank > ranks[1] and ranks[0] - 1 >= 1:  # called the high end
            kinds.add((called.suit, ranks[0] - 1))
    return kinds


def forbidden_discards(engine, player) -> set:
    """(suit, rank) kinds `player` may not discard now."""
    return getattr(engine, "_kuikae", {}).get(player, set())


def allowed_discards(engine, player) -> list:
    hand = engine.get_hand(player)
    bad = forbidden_discards(engine, player)
    tiles = [t for t in hand.tiles if (t.suit, t.rank) not in bad]
    return tiles or list(hand.tiles)


_original_handle_chi = RuleEngine._handle_chi
_original_handle_pon = RuleEngine._handle_pon


def _handle_chi(self, player, tile=None, **kwargs):
    called = self._last_discarded_tile
    result = _original_handle_chi(self, player, tile, **kwargs)
    meld = result.meld
    if meld is not None and called is not None:
        rest = [t for t in meld.tiles if t is not meld.called_tile]
        self.__dict__.setdefault("_kuikae", {})[player] = _kuikae_kinds(called, rest)
    return result


def _handle_pon(self, player, tile=None, **kwargs):
    called = self._last_discarded_tile
    result = _original_handle_pon(self, player, tile, **kwargs)
    if result.meld is not None and called is not None:
        self.__dict__.setdefault("_kuikae", {})[player] = _kuikae_kinds(called, None)
    return result


def _handle_discard_kuikae(self, player, tile=None, **kwargs):
    bad = forbidden_discards(self, player)
    if bad and tile is not None and (tile.suit, tile.rank) in bad:
        if any((t.suit, t.rank) not in bad for t in self.get_hand(player).tiles):
            raise RuleError("kuikae")
    getattr(self, "_missed_win", {}).pop(player, None)  # own discard ends temporary furiten
    result = _handle_discard(self, player, tile, **kwargs)
    if result.discarded:
        getattr(self, "_kuikae", {}).pop(player, None)
    return result


def _chi_leaves_discard(hand, tile, seq) -> bool:
    bad = _kuikae_kinds(tile, seq)
    rest = list(hand.tiles)
    for t in seq:
        for i, x in enumerate(rest):
            if x is t:
                del rest[i]
                break
    return any((t.suit, t.rank) not in bad for t in rest)


def _can_chi_kuikae(self, tile, from_player):
    return [seq for seq in _can_chi(self, tile, from_player) if _chi_leaves_discard(self, tile, seq)]


_original_hand_can_pon = Hand.can_pon


def _can_pon_kuikae(self, tile):
    if not _original_hand_can_pon(self, tile):
        return False
    # Two of the kind go into the meld; something else must remain to discard.
    rest = [t for t in self._tiles if not (t.suit == tile.suit and t.rank == tile.rank)]
    return bool(rest)


# Handlers are stored as bound methods in RuleEngine._action_handlers, and a
# pickled bound method is looked up by its __name__ on load.
_handle_discard_kuikae.__name__ = "_handle_discard"


# --------------------------------------------------------------- dora
_original_get_dora = TileSet.get_dora


def _get_dora(self, indicator):
    if indicator.suit == Suit.HONORS and indicator.rank == 7:
        return Tile(Suit.HONORS, 5)
    return _original_get_dora(self, indicator)


# ------------------------------------------------------------ furiten
def _missed(engine) -> dict:
    """player -> the winning tile they let go by (temporary furiten);
    riichi players are also kept in `_missed_riichi` for the whole hand."""
    return engine.__dict__.setdefault("_missed_win", {})


def _waits_kinds(hand) -> set:
    try:
        return {(w.suit, w.rank) for w in hand.get_machi_tiles()}
    except Exception:  # noqa: BLE001
        return set()


def _check_interrupts_furiten(self, tile, discarded_player):
    interrupts = _check_interrupts(self, tile, discarded_player)
    missed = _missed(self)
    for p in range(self._num_players):
        if p == discarded_player:
            continue
        hand = self._hands[p]
        if (tile.suit, tile.rank) in _waits_kinds(hand):
            # Furiten once this tile has gone by (p may still ron this one).
            missed[p] = tile
            if hand.is_riichi:
                self.__dict__.setdefault("_missed_riichi", {})[p] = tile
    return interrupts


def _in_missed_furiten(self, player) -> bool:
    last = self._last_discarded_tile
    for store in (getattr(self, "_missed_win", {}), getattr(self, "_missed_riichi", {})):
        t = store.get(player)
        if t is not None and t is not last:
            return True
    return False


_original_can_ron = RuleEngine._can_ron


def _can_ron(self, player):
    if _in_missed_furiten(self, player):
        return False
    return _original_can_ron(self, player)


def _check_interrupts_ordered(self, tile, discarded_player):
    return _check_interrupts_furiten(self, tile, discarded_player)


_original_is_furiten = RuleEngine.is_furiten


def _is_furiten(self, player):
    return _in_missed_furiten(self, player) or _original_is_furiten(self, player)


_original_deal = RuleEngine.deal


def _deal(self):
    # Per-hand state of these fixes (rules.py wraps start_round already).
    self.__dict__["_missed_win"] = {}
    self.__dict__["_missed_riichi"] = {}
    self.__dict__["_kuikae"] = {}
    self.__dict__["_double_riichi"] = set()
    return _original_deal(self)


# ------------------------------------------------- riichi, first turn
def _first_go_around(self, player) -> bool:
    """No discard by `player` yet and no call (or kan) by anyone."""
    return not self._hands[player].discards and not any(h.melds for h in self._hands)


def _handle_riichi(self, player, tile=None, **kwargs):
    if tile is None:
        raise RuleError("riichi_requires_discard")
    if self._tile_set and self._tile_set.remaining < self._game_state.ruleset.riichi_min_remaining_tiles:
        raise RuleError("riichi_not_enough_wall_tiles")
    hand = self._hands[player]
    tiles = hand._tiles
    idx = next((i for i, t in enumerate(tiles) if t is tile), None)
    if idx is None:
        idx = next((i for i, t in enumerate(tiles) if t == tile and t.is_red_dora == tile.is_red_dora), None)
    if idx is None:
        raise RuleError("tile_not_in_hand")
    tile = tiles.pop(idx)
    hand._tile_counts_cache = None
    is_tenpai = hand.is_tenpai()
    tiles.insert(idx, tile)
    hand._tile_counts_cache = None
    if not is_tenpai:
        if self._game_state.ruleset.chombo_penalty_enabled:
            return self._handle_chombo(player)
        raise RuleError("riichi_discard_must_keep_tenpai")

    double = _first_go_around(self, player)
    discard_result = self._handle_discard(player, tile, **kwargs)
    hand.set_riichi(True, turn=len(hand.discards) - 1)
    self._game_state.add_riichi_stick()
    self._game_state.update_score(player, -1000)
    self._riichi_ippatsu[player] = True
    self._riichi_ippatsu_discard[player] = 0
    if double:
        self.__dict__.setdefault("_double_riichi", set()).add(player)
    if any(GameAction.RON in actions for actions in discard_result.waiting_for.values()):
        self._pending_riichi_discards.add(player)
    discard_result.riichi = True
    return discard_result


_CTX: dict = {}
_original_check_win = RuleEngine.check_win
_original_check_riichi = YakuChecker.check_riichi


def _check_win(self, player, winning_tile, is_chankan=False, is_rinshan=False):
    saved = self._is_first_turn_after_deal
    self._is_first_turn_after_deal = _first_go_around(self, player)
    _CTX["double"] = player in getattr(self, "_double_riichi", ())
    try:
        return _original_check_win(self, player, winning_tile, is_chankan=is_chankan, is_rinshan=is_rinshan)
    finally:
        self._is_first_turn_after_deal = saved
        _CTX.clear()


def _check_riichi(self, hand, game_state, is_ippatsu=False, is_double_riichi=False):
    if "double" in _CTX:
        is_double_riichi = bool(_CTX["double"]) and hand.is_riichi
    return _original_check_riichi(self, hand, game_state, is_ippatsu, is_double_riichi)


def apply() -> None:
    RuleEngine._handle_riichi = _handle_riichi
    RuleEngine.check_win = _check_win
    YakuChecker.check_riichi = _check_riichi
    TileSet.get_dora = _get_dora
    RuleEngine._can_ron = _can_ron
    RuleEngine.is_furiten = _is_furiten
    RuleEngine.deal = _deal
    RuleEngine._handle_chi = _handle_chi
    RuleEngine._handle_pon = _handle_pon
    Hand.can_chi = _can_chi_kuikae
    Hand.can_pon = _can_pon_kuikae
    RuleEngine._handle_discard = _handle_discard_kuikae
    ScoreResult.__post_init__ = _score_post_init
    ScoreCalculator._determine_machi = _determine_machi
    YakuChecker._determine_machi = _determine_machi_yaku
    RuleEngine._draw_rinshan_tile = _draw_rinshan_tile
    RuleEngine._check_interrupts = _check_interrupts_ordered
    RuleEngine._can_riichi = _can_riichi
    RuleEngine._can_kan = _can_kan
    RuleEngine._can_declare_ankan = _can_declare_ankan
    RuleEngine._check_kyuushu_kyuuhai = _check_kyuushu_kyuuhai
