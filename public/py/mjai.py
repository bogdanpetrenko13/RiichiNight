"""The game as mjai events (the protocol Mortal reads).

bridge.Game records every hand as a list of mjai events with full
information (`MjaiLog.events`); `masked(events, seat)` hides what that seat
cannot see (other hands at the deal, other players' draws), which is what a
Mortal seat is fed.

pyriichi reports results per action, so `MjaiLog.observe` compares the game
before and after each action (melds, discards, draws, dora indicators) and
writes the events in the order Mortal's own arena uses:

    tsumo, dahai, reach -> dahai -> reach_accepted (once the discard passes),
    chi / pon -> dahai, daiminkan / kakan -> tsumo (dead wall) -> dora -> dahai,
    ankan -> dora -> tsumo, hora / ryukyoku -> end_kyoku, end_game.

Tile names: 1m..9m 1p..9p 1s..9s, red fives 5mr 5pr 5sr, E S W N, P (white),
F (green), C (red).
"""

from typing import Dict, List, Optional

from pyriichi import GameAction, GamePhase, MeldType, Suit

HONORS = ["E", "S", "W", "N", "P", "F", "C"]
WIND_NAMES = {"east": "E", "south": "S", "west": "W", "north": "N"}


def pai(tile) -> str:
    if tile is None:
        return "?"
    if tile.suit == Suit.HONORS:
        return HONORS[tile.rank - 1]
    suit = {Suit.MANZU: "m", Suit.PINZU: "p", Suit.SOUZU: "s"}[tile.suit]
    return f"{tile.rank}{suit}" + ("r" if tile.is_red_dora else "")


def masked(event: dict, seat: int) -> dict:
    """The event as `seat` sees it."""
    t = event["type"]
    if t == "start_kyoku":
        ev = dict(event)
        ev["tehais"] = [h if i == seat else ["?"] * len(h) for i, h in enumerate(event["tehais"])]
        return ev
    if t == "tsumo" and event["actor"] != seat:
        return {**event, "pai": "?"}
    return event


class _Snapshot:
    def __init__(self, engine):
        n = engine.get_num_players()
        self.melds = [list(engine.get_hand(p).melds) for p in range(n)]
        self.discards = [len(engine.get_hand(p).discards) for p in range(n)]
        self.dora = len(engine.get_revealed_dora_indicators())
        self.drawn = engine._last_drawn_tile


class MjaiLog:
    def __init__(self):
        self.events: List[dict] = []  # current hand (start_kyoku first)
        self.game_started = False
        self.pending_reach: Optional[int] = None
        self._before: Optional[_Snapshot] = None
        self.kyoku_index = 0  # increases with each start_kyoku (bots resync on change)

    # ------------------------------------------------------------- hands
    def start_kyoku(self, engine) -> None:
        gs = engine.game_state
        hands = []
        dealer = gs.dealer
        dealer_draw = None
        for p in range(engine.get_num_players()):
            tiles = list(engine.get_hand(p).tiles)
            if p == dealer and len(tiles) == 14:
                # The dealer's 14th tile is their first draw in mjai.
                dealer_draw = tiles.pop()
            hands.append([pai(t) for t in tiles])
        self.events = [
            {
                "type": "start_kyoku",
                "bakaze": WIND_NAMES.get(gs.round_wind.value, "E"),
                "dora_marker": pai(engine.get_revealed_dora_indicators()[0]),
                "kyoku": gs.round_number,
                "honba": gs.honba,
                "kyotaku": gs.riichi_sticks,
                "oya": dealer,
                "scores": list(gs.scores),
                "tehais": hands,
            }
        ]
        if dealer_draw is not None:
            self.events.append({"type": "tsumo", "actor": dealer, "pai": pai(dealer_draw)})
        self.pending_reach = None
        self.kyoku_index += 1
        self.dealer_draw = dealer_draw

    def header(self) -> List[dict]:
        return [{"type": "start_game", "names": ["0", "1", "2", "3"]}]

    # ----------------------------------------------------------- actions
    def before(self, engine) -> None:
        self._before = _Snapshot(engine)

    def _emit(self, ev: dict) -> None:
        if self.pending_reach is not None and ev["type"] in ("tsumo", "chi", "pon", "daiminkan", "ankan", "kakan"):
            self.events.append({"type": "reach_accepted", "actor": self.pending_reach})
            self.pending_reach = None
        self.events.append(ev)

    def observe(self, engine, seat: int, action, tile, result) -> None:
        """Appends the events of one executed action."""
        b = self._before
        if b is None:
            return
        self._before = None
        n = engine.get_num_players()
        after = _Snapshot(engine)

        if action == GameAction.DECLARE_RIICHI and result.discarded:
            self._emit({"type": "reach", "actor": seat})

        # Calls and kans: a meld that is new (or a pon that became a kan).
        for p in range(n):
            old_ids = {id(m) for m in b.melds[p]}
            for m in after.melds[p]:
                if id(m) in old_ids:
                    continue
                ev = self._meld_event(p, m, b.melds[p])
                if ev is not None:
                    self._emit(ev)
                    if ev["type"] in ("ankan", "daiminkan", "kakan"):
                        # pyriichi turns the kan dora at once: before the
                        # replacement draw (libriichi accepts this order and
                        # can then act on the draw).
                        self._emit_dora(engine, b.dora)
                        b.dora = len(engine.get_revealed_dora_indicators())

        if result.discarded:
            discards = engine.get_hand(seat).discards
            d = discards[-1] if discards else tile
            drawn = b.drawn[1] if b.drawn and b.drawn[0] == seat else None
            self._emit({"type": "dahai", "actor": seat, "pai": pai(d), "tsumogiri": drawn is not None and d is drawn})
            if action == GameAction.DECLARE_RIICHI:
                self.pending_reach = seat

        # Draws (normal or from the dead wall).
        rinshan = result.rinshan_tile
        if rinshan is not None:
            self._emit({"type": "tsumo", "actor": engine.get_current_player(), "pai": pai(rinshan)})
        elif after.drawn is not None and (b.drawn is None or after.drawn[1] is not b.drawn[1]):
            # The discard passed (or nobody could call): the next seat drew.
            self._emit({"type": "tsumo", "actor": after.drawn[0], "pai": pai(after.drawn[1])})
        if len(engine.get_revealed_dora_indicators()) > b.dora:
            self._emit_dora(engine, b.dora)

        # Hand over.
        if result.winners:
            self._hora(engine, result)
        elif result.chombo or (result.ryuukyoku is not None and result.ryuukyoku.ryuukyoku):
            self._ryukyoku()

    def _emit_dora(self, engine, before: int) -> None:
        shown = engine.get_revealed_dora_indicators()
        for ind in shown[before:]:
            self._emit({"type": "dora", "dora_marker": pai(ind)})

    def _meld_event(self, p: int, m, old: list) -> Optional[dict]:
        tiles = list(m.tiles)
        called = m.called_tile
        if m.type == MeldType.CLOSED_KAN:
            return {"type": "ankan", "actor": p, "consumed": [pai(t) for t in tiles]}
        if m.type == MeldType.OPEN_KAN:
            pons = [x for x in old if x.type == MeldType.PON_MELD and _same_kind(x.tiles[0], tiles[0])]
            if pons:
                prev = pons[0]
                prev_ids = {id(t) for t in prev.tiles}
                added = [t for t in tiles if id(t) not in prev_ids]
                if not added:
                    # pyriichi may rebuild tile objects; fall back to kinds.
                    added = [tiles[-1]]
                return {"type": "kakan", "actor": p, "pai": pai(added[0]), "consumed": [pai(t) for t in prev.tiles]}
            return self._claim("daiminkan", p, m, tiles, called)
        if m.type == MeldType.PON_MELD:
            return self._claim("pon", p, m, tiles, called)
        if m.type == MeldType.CHI_MELD:
            return self._claim("chi", p, m, tiles, called)
        return None

    @staticmethod
    def _claim(kind: str, p: int, m, tiles: list, called) -> dict:
        rest = list(tiles)
        for i, t in enumerate(rest):
            if t is called:
                del rest[i]
                break
        else:
            for i, t in enumerate(rest):
                if called is not None and str(t) == str(called):
                    del rest[i]
                    break
        return {
            "type": kind,
            "actor": p,
            "target": m.called_from if m.called_from is not None else (p + 3) % 4,
            "pai": pai(called),
            "consumed": [pai(t) for t in rest],
        }

    def _hora(self, engine, result) -> None:
        for w in result.winners:
            wr = result.win_results.get(w)
            sr = wr.score_result if wr else None
            target = w if (sr is None or sr.is_tsumo) else sr.payment_from
            ura = []
            if engine.get_hand(w).is_riichi and engine._tile_set is not None:
                ura = [pai(t) for t in engine._tile_set.get_ura_dora_indicators(1 + engine._kan_count)]
            self.events.append({"type": "hora", "actor": w, "target": target, "ura_markers": ura})
        self.pending_reach = None
        self.events.append({"type": "end_kyoku"})

    def _ryukyoku(self) -> None:
        self.events.append({"type": "ryukyoku"})
        self.pending_reach = None
        self.events.append({"type": "end_kyoku"})


def _same_kind(a, b) -> bool:
    return a.suit == b.suit and a.rank == b.rank
