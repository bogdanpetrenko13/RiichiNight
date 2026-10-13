"""JSON bridge between the React UI (via a Web Worker) and the pyriichi engine.

All public functions take and return JSON strings so that the JS side never
has to deal with Python proxies.  Seat 0 is always the human player.

Command flow:
    new_game(config) -> step result      (deals and runs AIs until the human acts)
    act(command)     -> step result      (applies a human action, then runs AIs)
    next_round()     -> step result
    save() / load(blob)                  (opaque snapshot of the whole game)

A step result is {"events": [...], "view": {...}}.
"""

import base64
import json
import pickle
import random
from typing import Dict, List, Optional

from pyriichi import GameAction, GamePhase, RuleEngine, RuleError, RyuukyokuType, Tile
from pyriichi.player import PublicInfo  # noqa: F401  (kept for future AI variants)

import fastpatch
import yakufix
import rules as game_rules
from ai import Brain, tile_index

fastpatch.apply()
yakufix.apply()
game_rules.apply_patches()

SAVE_VERSION = 1
HUMAN = 0
NUM_PLAYERS = 4

ACTION_NAMES = {
    GameAction.DISCARD: "discard",
    GameAction.DECLARE_RIICHI: "riichi",
    GameAction.TSUMO: "tsumo",
    GameAction.RON: "ron",
    GameAction.PON: "pon",
    GameAction.CHI: "chi",
    GameAction.KAN: "kan",
    GameAction.DECLARE_ANKAN: "ankan",
    GameAction.PASS: "pass",
    GameAction.DECLARE_KYUUSHU_KYUUHAI: "kyuushu",
}
ACTION_BY_NAME = {v: k for k, v in ACTION_NAMES.items()}
CALLOUTS = {
    GameAction.DECLARE_RIICHI: "riichi",
    GameAction.TSUMO: "tsumo",
    GameAction.RON: "ron",
    GameAction.PON: "pon",
    GameAction.CHI: "chi",
    GameAction.KAN: "kan",
    GameAction.DECLARE_ANKAN: "kan",
}


def tstr(tile: Optional[Tile]) -> Optional[str]:
    return None if tile is None else str(tile)


def Tile_from(code: str) -> Tile:
    from pyriichi import parse_tiles

    return parse_tiles(code.lstrip("r"))[0]


def tile_sort_key(tile: Tile):
    return (tile_index(tile), 0 if tile.is_red_dora else 1)


class Game:
    def __init__(self, config: dict):
        self.seed = int(config.get("seed") or random.randrange(1, 2**31))
        self.rng = random.Random(self.seed)
        # pyriichi shuffles with the global `random` module.
        random.seed(self.seed)
        levels = list(config.get("levels") or ["normal", "normal", "normal"])
        while len(levels) < NUM_PLAYERS - 1:
            levels.append("normal")
        self.levels = levels[: NUM_PLAYERS - 1]
        self.brains = {i + 1: Brain(self.levels[i], self.rng) for i in range(NUM_PLAYERS - 1)}
        self.rules = game_rules.normalize(config.get("rules"))
        self.engine = RuleEngine(num_players=NUM_PLAYERS)
        self.engine.start_game()
        self.engine._game_state = game_rules.make_game_state(self.rules, NUM_PLAYERS)
        self.round_result: Optional[dict] = None
        self.round_start_scores: List[int] = []
        self.events: List[dict] = []
        self.round_index = 0
        self.game_end_emitted = False
        self._start_round()

    # ---------------------------------------------------------------- rounds
    def _start_round(self) -> None:
        self.engine.start_round()
        self.engine.deal()
        self.round_result = None
        self.round_index += 1
        self.round_start_scores = list(self.engine.game_state.scores)
        gs = self.engine.game_state
        self.events.append(
            {
                "t": "round_start",
                "wind": gs.round_wind.value,
                "number": gs.round_number,
                "honba": gs.honba,
                "dealer": gs.dealer,
            }
        )

    def next_round(self) -> None:
        phase = self.engine.get_phase()
        if self.round_result is None or phase == GamePhase.ENDED:
            return
        if phase == GamePhase.WINNING:
            self.engine.end_round(self.round_result.get("winnerSeats", []))
        if self.engine.get_phase() != GamePhase.ENDED:
            self._start_round()

    def _emit_game_end(self) -> None:
        if self.game_end_emitted:
            return
        self.game_end_emitted = True
        scores = list(self.engine.game_state.scores)
        order = sorted(range(NUM_PLAYERS), key=lambda p: (-scores[p], p))
        self.events.append({"t": "game_end", "scores": scores, "placement": order})

    # -------------------------------------------------------------- execution
    def _exec(self, seat: int, action: GameAction, tile: Optional[Tile] = None, **kwargs):
        discarder = self.engine.get_last_discard_player()
        result = self.engine.execute_action(seat, action, tile, **kwargs)
        if action in CALLOUTS:
            self.events.append({"t": "call", "seat": seat, "kind": CALLOUTS[action]})
        if result.discarded:
            discards = self.engine.get_discards(seat)
            self.events.append(
                {
                    "t": "discard",
                    "seat": seat,
                    "tile": tstr(discards[-1]) if discards else tstr(tile),
                    "riichi": action == GameAction.DECLARE_RIICHI,
                }
            )
        if result.called_action in (GameAction.PON, GameAction.CHI, GameAction.KAN):
            self.events.append(
                {
                    "t": "meld",
                    "seat": seat,
                    "kind": ACTION_NAMES[result.called_action],
                    "tile": tstr(result.called_tile),
                    "from": discarder,
                }
            )
        if result.rinshan_win is not None:
            result.winners = [result.rinshan_win.player]
            result.win_results[result.rinshan_win.player] = result.rinshan_win
        self._after_result(result)
        return result

    def _after_result(self, result) -> None:
        engine = self.engine
        if result.chombo:
            self._finish_draw("chombo", chombo_seat=result.chombo_player)
            return
        if result.winners:
            self._finish_win(result)
            return
        if result.ryuukyoku is not None and result.ryuukyoku.ryuukyoku:
            kind = result.ryuukyoku.ryuukyoku_type
            if kind == RyuukyokuType.EXHAUSTIVE_DRAW:
                tenpai = [p for p in range(NUM_PLAYERS) if engine.get_hand(p).is_tenpai()]
                settled = engine.handle_ryuukyoku()
                self._finish_draw(
                    "exhaustive_draw",
                    tenpai=tenpai,
                    nagashi=list(settled.nagashi_mangan_players or []),
                )
            else:
                self._finish_draw(kind.value if kind else "ryuukyoku")
            return
        if engine.get_phase() == GamePhase.PLAYING:
            kind = engine.check_ryuukyoku()
            if kind is not None and kind != RyuukyokuType.EXHAUSTIVE_DRAW:
                settled = engine.handle_ryuukyoku()
                self._finish_draw(settled.ryuukyoku_type.value if settled.ryuukyoku_type else kind.value)

    def _deltas(self) -> List[int]:
        scores = self.engine.game_state.scores
        return [scores[i] - self.round_start_scores[i] for i in range(NUM_PLAYERS)]

    def _finish_win(self, result) -> None:
        winners = []
        from_seat = None
        tsumo = False
        for seat in result.winners:
            wr = result.win_results.get(seat)
            if wr is None:
                continue
            sr = wr.score_result
            tsumo = bool(sr.is_tsumo)
            if not tsumo:
                from_seat = sr.payment_from
            hand = self.engine.get_hand(seat)
            winners.append(
                {
                    "seat": seat,
                    "han": wr.han,
                    "fu": wr.fu,
                    "points": wr.points,
                    "yakuman": bool(sr.is_yakuman),
                    "yaku": [
                        {"key": y.yaku.value, "ja": y.yaku.ja, "en": y.yaku.en, "han": y.han}
                        for y in wr.yaku
                    ],
                    "hand": [tstr(t) for t in sorted(hand.tiles, key=tile_sort_key)],
                    "melds": self._melds(seat),
                }
            )
        seats = [w["seat"] for w in winners]
        self.round_result = {
            "type": "win",
            "tsumo": tsumo,
            "from": from_seat,
            "winners": winners,
            "winnerSeats": seats,
            "deltas": self._deltas(),
            "scores": list(self.engine.game_state.scores),
            "dora": [tstr(t) for t in self.engine.get_revealed_dora_indicators()],
        }
        self.events.append(
            {"t": "win", "winners": seats, "from": from_seat, "tsumo": tsumo}
        )

    def _finish_draw(self, kind: str, tenpai=None, nagashi=None, chombo_seat=None) -> None:
        self.round_result = {
            "type": "draw",
            "kind": kind,
            "tenpai": tenpai or [],
            "nagashi": nagashi or [],
            "chombo": chombo_seat,
            "winnerSeats": [],
            "deltas": self._deltas(),
            "scores": list(self.engine.game_state.scores),
        }
        self.events.append({"t": "draw_game", "kind": kind})

    # -------------------------------------------------------------------- AI
    def run_ai(self, max_actions: Optional[int] = None) -> None:
        """Let AI seats act until the human must decide or the round ends.

        With max_actions=1 the UI can animate opponents one move at a time."""
        engine = self.engine
        done = 0
        for _ in range(2000):
            if max_actions is not None and done >= max_actions:
                return
            if self.round_result is not None or engine.get_phase() != GamePhase.PLAYING:
                return
            waiting = engine.waiting_for_actions
            if not waiting:
                kind = engine.check_ryuukyoku()
                if kind is not None:
                    tenpai = [p for p in range(NUM_PLAYERS) if engine.get_hand(p).is_tenpai()]
                    settled = engine.handle_ryuukyoku()
                    self._finish_draw(
                        settled.ryuukyoku_type.value if settled.ryuukyoku_type else kind.value,
                        tenpai=tenpai,
                    )
                return
            ai_seats = [s for s in waiting if s != HUMAN]
            if not ai_seats:
                return  # only the human is left to decide
            seat = ai_seats[0]
            actions = engine.get_available_actions(seat)
            action, tile, kwargs = self.brains[seat].decide(engine, seat, actions)
            try:
                self._exec(seat, action, tile, **kwargs)
            except (RuleError, ValueError):
                self._exec(seat, *self._fallback(seat, actions))
            done += 1
        raise RuntimeError("AI loop did not settle")

    def _fallback(self, seat: int, actions: List[GameAction]):
        hand = self.engine.get_hand(seat)
        if GameAction.PASS in actions:
            return GameAction.PASS, None
        if hand.is_riichi and hand.last_drawn_tile is not None:
            return GameAction.DISCARD, hand.last_drawn_tile
        return GameAction.DISCARD, hand.tiles[-1]

    # ----------------------------------------------------------------- human
    def _find_tile(self, seat: int, text: Optional[str]) -> Optional[Tile]:
        if text is None:
            return None
        for t in self.engine.get_hand(seat).tiles:
            if str(t) == text:
                return t
        # Accept a plain five when the hand only has the red one (and vice versa).
        plain = text.lstrip("r")
        for t in self.engine.get_hand(seat).tiles:
            if str(t).lstrip("r") == plain:
                return t
        raise RuleError("tile_not_in_hand", {"tile": text})

    def human_act(self, command: dict) -> None:
        name = command.get("action")
        if name not in ACTION_BY_NAME:
            raise ValueError(f"unknown action {name!r}")
        action = ACTION_BY_NAME[name]
        if action not in self.engine.get_available_actions(HUMAN):
            raise ValueError(f"action {name!r} is not available now")
        kwargs = {}
        tile = None
        if action in (GameAction.DISCARD, GameAction.DECLARE_RIICHI):
            tile = self._find_tile(HUMAN, command.get("tile"))
            if action == GameAction.DISCARD and self.engine.get_hand(HUMAN).is_riichi:
                tile = self.engine.get_hand(HUMAN).last_drawn_tile
        elif action == GameAction.CHI:
            options = self.engine.get_available_chi_sequences(HUMAN)
            index = int(command.get("option") or 0)
            if not 0 <= index < len(options):
                raise ValueError("bad chi option")
            kwargs["sequence"] = options[index]
        elif action == GameAction.DECLARE_ANKAN and command.get("tile"):
            tile = self._find_tile(HUMAN, command.get("tile"))
        self._exec(HUMAN, action, tile, **kwargs)

    # ------------------------------------------------------------------ view
    def _melds(self, seat: int) -> List[dict]:
        return [
            {
                "type": m.type.value,
                "tiles": [tstr(t) for t in m.tiles],
                "called": tstr(m.called_tile),
                "from": m.called_from,
            }
            for m in self.engine.get_hand(seat).melds
        ]

    def _prompt(self) -> Optional[dict]:
        engine = self.engine
        actions = engine.get_available_actions(HUMAN)
        if not actions or self.round_result is not None:
            return None
        hand = engine.get_hand(HUMAN)
        prompt: Dict[str, object] = {"actions": [ACTION_NAMES[a] for a in actions if a in ACTION_NAMES]}
        if GameAction.DISCARD in actions:
            if hand.is_riichi and hand.last_drawn_tile is not None:
                prompt["discardable"] = [tstr(hand.last_drawn_tile)]
            else:
                prompt["discardable"] = sorted({tstr(t) for t in hand.tiles})
            hints = {}
            if not hand.is_riichi:
                for text in prompt["discardable"]:
                    tile = self._find_tile(HUMAN, text)
                    try:
                        hint = engine.get_tenpai_hint_after_discard(HUMAN, tile)
                    except (RuleError, ValueError):
                        continue
                    if hint is not None and hint.waits:
                        hints[text] = {
                            "waits": [{"tile": tstr(w.tile), "remaining": w.remaining} for w in hint.waits],
                            "furiten": bool(hint.furiten),
                        }
            prompt["hints"] = hints
        if GameAction.DECLARE_RIICHI in actions:
            prompt["riichiTiles"] = sorted({tstr(t) for t in hand.tenpai_discards})
        if GameAction.CHI in actions:
            prompt["chiOptions"] = [
                [tstr(t) for t in seq] for seq in engine.get_available_chi_sequences(HUMAN)
            ]
        last = engine.get_last_discard()
        if last is not None and any(a in actions for a in (GameAction.RON, GameAction.PON, GameAction.CHI, GameAction.KAN)):
            prompt["claim"] = {"tile": tstr(last), "from": engine.get_last_discard_player()}
        return prompt

    def view(self) -> dict:
        engine = self.engine
        gs = engine.game_state
        phase = engine.get_phase()
        players = []
        for seat in range(NUM_PLAYERS):
            hand = engine.get_hand(seat)
            discards = engine.get_discards(seat)
            entry = {
                "seat": seat,
                "wind": gs.seat_winds[seat].value,
                "score": gs.scores[seat],
                "riichi": hand.is_riichi,
                "riichiIndex": hand.riichi_discard_index,
                "discards": [tstr(t) for t in discards],
                "melds": self._melds(seat),
                "handCount": len(hand.tiles),
            }
            if seat == HUMAN:
                waits = hand.get_machi_tiles() if len(hand.tiles) % 3 == 1 else []
                entry["furiten"] = bool(waits and engine.is_furiten(HUMAN))
                # Current waits while it is not the player's discard (Kemono-style wait info).
                entry["waits"] = sorted({tstr(t) for t in waits}, key=lambda c: (tile_index(Tile_from(c)), c))
            show = seat == HUMAN or (self.round_result is not None and seat in self.round_result.get("winnerSeats", []))
            if show:
                tiles = list(hand.tiles)
                drawn = hand.last_drawn_tile if seat == HUMAN else None
                if drawn is not None and drawn in tiles:
                    tiles.remove(drawn)
                entry["hand"] = [tstr(t) for t in sorted(tiles, key=tile_sort_key)]
                entry["drawn"] = tstr(drawn)
            players.append(entry)

        if phase == GamePhase.ENDED:
            status = "game_over"
        elif self.round_result is not None:
            status = "round_over"
        elif engine.get_available_actions(HUMAN):
            status = "human"
        else:
            status = "ai"
        return {
            "status": status,
            "seed": self.seed,
            "levels": self.levels,
            "rules": self.rules,
            "round": {
                "wind": gs.round_wind.value,
                "number": gs.round_number,
                "honba": gs.honba,
                "riichiSticks": gs.riichi_sticks,
                "dealer": gs.dealer,
                "index": self.round_index,
            },
            "wall": engine.get_wall_remaining(),
            "dora": [tstr(t) for t in engine.get_revealed_dora_indicators()],
            "current": engine.get_current_player(),
            "players": players,
            "prompt": self._prompt() if status == "human" else None,
            "result": self.round_result,
            "gameOver": phase == GamePhase.ENDED,
        }

    def take_events(self) -> List[dict]:
        events, self.events = self.events, []
        return events


# --------------------------------------------------------------------------
# Module-level API used from JavaScript
# --------------------------------------------------------------------------
_game: Optional[Game] = None


def _step(max_actions: Optional[int] = 0) -> str:
    """Advance AI seats (0 = none, 1 = one action, None = until the human acts)."""
    assert _game is not None
    if max_actions != 0:
        _game.run_ai(max_actions)
    if _game.engine.get_phase() == GamePhase.ENDED:
        _game._emit_game_end()
    return json.dumps({"events": _game.take_events(), "view": _game.view()}, ensure_ascii=False)


def new_game(config_json: str = "{}", run_ai: bool = False) -> str:
    global _game
    _game = Game(json.loads(config_json or "{}"))
    return _step(None if run_ai else 0)


def act(command_json: str, run_ai: bool = False) -> str:
    if _game is None:
        raise RuntimeError("no game in progress")
    _game.human_act(json.loads(command_json))
    return _step(None if run_ai else 0)


def next_round(run_ai: bool = False) -> str:
    if _game is None:
        raise RuntimeError("no game in progress")
    _game.next_round()
    return _step(None if run_ai else 0)


def ai_step() -> str:
    """One AI action; the UI calls this repeatedly while view.status == "ai"."""
    if _game is None:
        raise RuntimeError("no game in progress")
    return _step(1)


def current() -> str:
    if _game is None:
        raise RuntimeError("no game in progress")
    return json.dumps({"events": [], "view": _game.view()}, ensure_ascii=False)


def save() -> str:
    if _game is None:
        raise RuntimeError("no game in progress")
    blob = pickle.dumps(
        {"version": SAVE_VERSION, "game": _game, "random": random.getstate()},
        protocol=pickle.HIGHEST_PROTOCOL,
    )
    return base64.b64encode(blob).decode("ascii")


def load(blob: str) -> str:
    global _game
    data = pickle.loads(base64.b64decode(blob))
    if data.get("version") != SAVE_VERSION:
        raise ValueError("save version mismatch")
    _game = data["game"]
    random.setstate(data["random"])
    return current()
