"""Mortal seats: the strongest heroines are played by the Mortal S42 network.

The network and libriichi's player-state tracker run in WebAssembly
(native/mortal, loaded by public/mortal/mortal.js). This module feeds each
Mortal seat the game's mjai events (mjai.py), as that seat sees them, asks for
its move and turns the move into a pyriichi action.

Backends (`link()`):
* in the app: the JS module `mortal_js` the worker registers in Pyodide;
* in CPython tests: the same Rust code built as a native library, loaded
  with ctypes from $MORTAL_LIB, weights from $MORTAL_DIR;
* none: Mortal seats play with the heuristic AI (ai.Brain) instead.

Where pyriichi and libriichi disagree on what is legal, the seat falls back
to the heuristic AI for that move and the case is recorded in
`Game.mortal_mismatches` (tests check that this stays empty).

Strength: `explore` is the chance to sample a move from softmax(Q / temp)
instead of taking the best one, so the same network can play below full
strength.
"""

from __future__ import annotations

import json
import os
import random
from typing import List, Optional, Tuple

from pyriichi import GameAction

import mjai
import rulefix

_LINK = None
_LINK_TRIED = False


class _CLink:
    """The Rust library through ctypes (CPython tests)."""

    def __init__(self, lib_path: str, model_dir: str):
        import ctypes

        lib = ctypes.CDLL(lib_path)
        self.lib = lib
        self.c = ctypes
        lib.rn_alloc.restype = ctypes.c_void_p
        lib.rn_alloc.argtypes = [ctypes.c_size_t]
        lib.rn_free.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
        lib.rn_out_ptr.restype = ctypes.c_void_p
        lib.rn_out_len.restype = ctypes.c_size_t
        lib.rn_load.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint32]
        lib.rn_bot_new.argtypes = [ctypes.c_uint32, ctypes.c_uint32]
        lib.rn_bot_free.argtypes = [ctypes.c_uint32]
        lib.rn_bot_update.argtypes = [ctypes.c_uint32, ctypes.c_char_p, ctypes.c_size_t]
        lib.rn_bot_react.argtypes = [ctypes.c_uint32, ctypes.c_float, ctypes.c_float]
        lib.rn_bot_agari.argtypes = [ctypes.c_uint32, ctypes.c_uint32, ctypes.c_char_p, ctypes.c_size_t]
        index = open(os.path.join(model_dir, "s42.json"), "rb").read()
        half = os.path.exists(os.path.join(model_dir, "s42.f16.bin"))
        data = open(os.path.join(model_dir, "s42.f16.bin" if half else "s42.bin"), "rb").read()
        self._check(lib.rn_load(index, len(index), data, len(data), 1 if half else 0), "load")

    def _out(self) -> str:
        n = self.lib.rn_out_len()
        return self.c.string_at(self.lib.rn_out_ptr(), n).decode("utf-8") if n else ""

    def _check(self, code: int, what: str) -> int:
        if code < 0:
            raise RuntimeError(f"mortal {what}: {self._out()}")
        return code

    def new_bot(self, seat: int, seed: int) -> int:
        return self._check(self.lib.rn_bot_new(seat, seed & 0xFFFFFFFF), "new")

    def free_bot(self, h: int) -> None:
        self.lib.rn_bot_free(h)

    def update(self, h: int, line: str) -> bool:
        b = line.encode("utf-8")
        return self._check(self.lib.rn_bot_update(h, b, len(b)), "update") == 1

    def react(self, h: int, explore: float, temperature: float) -> str:
        self._check(self.lib.rn_bot_react(h, explore, temperature), "react")
        return self._out()


    def agari(self, h: int, is_ron: bool, ura: list) -> dict:
        b = json.dumps(ura).encode("utf-8")
        self._check(self.lib.rn_bot_agari(h, 1 if is_ron else 0, b, len(b)), "agari")
        return json.loads(self._out())


    def brief(self, h: int) -> str:
        self.lib.rn_bot_brief.argtypes = [self.c.c_uint32]
        self._check(self.lib.rn_bot_brief(h), "brief")
        return self._out()


class _JsLink:
    """The WebAssembly module through Pyodide's JS bridge (the app)."""

    def __init__(self, js):
        self.js = js

    def new_bot(self, seat: int, seed: int) -> int:
        return int(self.js.newBot(seat, seed & 0xFFFFFFFF))

    def free_bot(self, h: int) -> None:
        self.js.freeBot(h)

    def update(self, h: int, line: str) -> bool:
        return bool(self.js.update(h, line))

    def react(self, h: int, explore: float, temperature: float) -> str:
        return str(self.js.react(h, explore, temperature))


def link():
    """The Mortal backend, or None when it is not available (yet)."""
    global _LINK, _LINK_TRIED
    if _LINK is not None or _LINK_TRIED:
        return _LINK
    try:
        import mortal_js  # type: ignore[import-not-found]  (registered by the worker)

        if not getattr(mortal_js, "ready", False):
            return None  # still loading: ask again next time
        _LINK = _JsLink(mortal_js)
        return _LINK
    except ImportError:
        pass
    _LINK_TRIED = True
    lib, model = os.environ.get("MORTAL_LIB"), os.environ.get("MORTAL_DIR")
    if lib and model and os.path.exists(lib):
        _LINK = _CLink(lib, model)
    return _LINK


def reset_link() -> None:
    """Forget the backend (tests switch it on and off)."""
    global _LINK, _LINK_TRIED
    _LINK, _LINK_TRIED = None, False




class MortalBrain:
    """A seat played by Mortal; pickled with the game (the WebAssembly state
    is rebuilt from the hand's events after loading)."""

    def __init__(self, seat: int, fallback, strength: Tuple[float, float] = (0.0, 1.0), seed: int = 1, blend: float = 0.0):
        self.seat = seat
        self.fallback = fallback  # ai.Brain: plays the blended share and what Mortal cannot
        self.strength = strength  # (explore, temperature) of Mortal's own sampling
        self.seed = seed
        # Share of decisions left to the heuristic AI: 0 = full strength.
        # Weaker Mortal heroines on the ladder (ai.parse_level "mortal:<p>").
        self.blend = blend
        self.blend_rng = random.Random(seed * 7919 + 1)
        self._reset()

    def _reset(self) -> None:
        self.handle: Optional[int] = None
        self.fed = 0  # events of the current hand already fed
        self.kyoku = -1
        self.can_act = False
        self.prefed: Optional[dict] = None

    def __getstate__(self):
        state = dict(self.__dict__)
        for k in ("handle", "fed", "kyoku", "can_act", "prefed"):
            state.pop(k, None)
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self._reset()

    # Keep the heuristic Brain's interface for the parts of bridge that use it.
    @property
    def level(self):
        return getattr(self.fallback, "level", "normal")

    def _sync(self, ln, log: "mjai.MjaiLog") -> None:
        if self.handle is None or self.kyoku != log.kyoku_index:
            if self.handle is not None:
                ln.free_bot(self.handle)
            self.handle = ln.new_bot(self.seat, self.seed + log.kyoku_index)
            for ev in log.header():
                ln.update(self.handle, json.dumps(ev))
            self.fed = 0
            self.kyoku = log.kyoku_index
            self.prefed = None
        while self.fed < len(log.events):
            ev = log.events[self.fed]
            self.fed += 1
            if self.prefed is not None and ev == self.prefed:
                self.prefed = None
                continue
            self.can_act = ln.update(self.handle, json.dumps(mjai.masked(ev, self.seat)))

    def decide(self, game, actions: List[GameAction]):
        """(action, tile, kwargs) for bridge.Game, like ai.Brain.decide."""
        engine = game.engine
        ln = link()
        if ln is None:
            return self.fallback.decide(engine, self.seat, actions)
        blend = getattr(self, "blend", 0.0)
        if blend > 0 and getattr(self, "blend_rng", None) is not None and self.blend_rng.random() < blend:
            return self.fallback.decide(engine, self.seat, actions)
        try:
            self._sync(ln, game.mjai)
            if not self.can_act:
                return self._mismatch(game, actions, "engine asks, Mortal cannot act")
            r = json.loads(ln.react(self.handle, *self.strength))
            self._compare_legal(game, actions, r["q"])
            ev = r["event"]
            if ev["type"] == "reach":
                if GameAction.DECLARE_RIICHI not in actions:
                    return self._mismatch(game, actions, "Mortal riichi not offered")
                self.prefed = {"type": "reach", "actor": self.seat}
                self.can_act = ln.update(self.handle, json.dumps(self.prefed))
                r = json.loads(ln.react(self.handle, *self.strength))
                ev = r["event"]
                if ev["type"] != "dahai":
                    return self._mismatch(game, actions, f"after reach Mortal chose {ev['type']}")
                tile = self._hand_tile(engine, ev["pai"])
                return GameAction.DECLARE_RIICHI, tile, {}
            return self._to_action(game, actions, ev)
        except Exception as e:  # noqa: BLE001  (never let Mortal break the game)
            self.handle = None
            return self._mismatch(game, actions, f"error {type(e).__name__}: {e}")

    # Action index ranges of Mortal's mask -> pyriichi actions.
    _KINDS = [(range(0, 37), GameAction.DISCARD), (range(37, 38), GameAction.DECLARE_RIICHI),
              (range(38, 41), GameAction.CHI), (range(41, 42), GameAction.PON),
              (range(43, 44), None), (range(44, 45), GameAction.DECLARE_KYUUSHU_KYUUHAI),
              (range(45, 46), GameAction.PASS)]

    def _compare_legal(self, game, actions, q) -> None:
        """Records when pyriichi and libriichi disagree on what is legal now."""
        legal = {i for i, v in enumerate(q) if v is not None}
        mortal_set, engine_set = set(), set()
        for idx, kind in self._KINDS:
            name = kind.name if kind else "AGARI"
            if legal & set(idx):
                mortal_set.add(name)
        if 42 in legal:
            mortal_set.add("KAN")
        for a in actions:
            if a in (GameAction.TSUMO, GameAction.RON):
                engine_set.add("AGARI")
            elif a in (GameAction.KAN, GameAction.DECLARE_ANKAN):
                engine_set.add("KAN")
            else:
                engine_set.add(a.name)
        if mortal_set == engine_set and GameAction.DISCARD in actions:
            # Same kinds of action: compare which tiles may be discarded.
            hand = game.engine.get_hand(self.seat)
            tiles = ([hand.last_drawn_tile] if hand.is_riichi and hand.last_drawn_tile
                     else rulefix.allowed_discards(game.engine, self.seat))
            mine = {mjai.pai(t).rstrip("r") for t in tiles}
            names = ([f"{r}{s}" for s in "mps" for r in range(1, 10)] + mjai.HONORS + ["5m", "5p", "5s"])
            theirs = {names[i] for i in legal if i < 37}
            if mine != theirs:
                mortal_set = {"DISCARD " + " ".join(sorted(theirs - mine))}
                engine_set = {"DISCARD " + " ".join(sorted(mine - theirs))}
        if mortal_set != engine_set:
            lst = getattr(game, "legal_mismatches", None)
            if lst is None:
                lst = game.legal_mismatches = []
            if len(lst) < 500:
                lst.append({"seat": self.seat, "mortal": sorted(mortal_set - engine_set),
                            "engine": sorted(engine_set - mortal_set), "last": game.mjai.events[-4:],
                            "hand": [str(t) for t in game.engine.get_hand(self.seat).tiles],
                            "melds": [[str(t) for t in m.tiles] for m in game.engine.get_hand(self.seat).melds],
                            "scores": list(game.engine.game_state.scores), "wall": game.engine.get_wall_remaining(),
                            "kans": game.engine._kan_count})

    def _mismatch(self, game, actions, why: str):
        lst = getattr(game, "mortal_mismatches", None)
        if lst is None:
            lst = game.mortal_mismatches = []
        if len(lst) < 200:
            eng = game.engine
            lst.append({"seat": self.seat, "why": why, "actions": [a.name for a in actions],
                        "last": game.mjai.events[-3:], "hand": [str(t) for t in eng.get_hand(self.seat).tiles],
                        "melds": [[str(t) for t in m.tiles] for m in eng.get_hand(self.seat).melds],
                        "riichi": eng.get_hand(self.seat).is_riichi, "wall": eng.get_wall_remaining()})
        return self.fallback.decide(game.engine, self.seat, actions)

    def _record_agari(self, game, is_ron: bool) -> None:
        """For the rules tests: libriichi's points for this win (native link only)."""
        ln = link()
        if not hasattr(ln, "agari"):
            return
        eng = game.engine
        ura = []
        if eng.get_hand(self.seat).is_riichi and eng._tile_set is not None:
            ura = [mjai.pai(t) for t in eng._tile_set.get_ura_dora_indicators(1 + eng._kan_count)]
        try:
            pts = ln.agari(self.handle, is_ron, ura)
            pts["brief"] = ln.brief(self.handle)
        except Exception as e:  # noqa: BLE001
            pts = {"error": str(e)}
        store = getattr(game, "mortal_agari", None)
        if store is None:
            store = game.mortal_agari = {}
        store[self.seat] = pts

    def _hand_tile(self, engine, name: str):
        hand = engine.get_hand(self.seat).tiles
        for t in hand:
            if mjai.pai(t) == name:
                return t
        base = name.rstrip("r")
        for t in hand:
            if mjai.pai(t).rstrip("r") == base:
                return t
        raise ValueError(f"tile {name} not in hand")

    def _to_action(self, game, actions, ev):
        engine = game.engine
        t = ev["type"]

        def need(a: GameAction):
            if a not in actions:
                raise _Illegal(f"Mortal {t} but engine offers {[x.name for x in actions]}")
            return a

        try:
            if t == "dahai":
                tile = self._hand_tile(engine, ev["pai"])
                if engine.get_hand(self.seat).is_riichi:
                    tile = engine.get_hand(self.seat).last_drawn_tile or tile
                return need(GameAction.DISCARD), tile, {}
            if t == "none":
                return need(GameAction.PASS), None, {}
            if t == "hora":
                self._record_agari(game, GameAction.TSUMO not in actions)
                if GameAction.TSUMO in actions:
                    return GameAction.TSUMO, None, {}
                return need(GameAction.RON), None, {}
            if t == "pon":
                return need(GameAction.PON), None, {}
            if t == "daiminkan":
                return need(GameAction.KAN), None, {}
            if t == "chi":
                need(GameAction.CHI)
                hand = list(engine.get_hand(self.seat).tiles)
                seq = []
                for name in ev["consumed"]:
                    pick = next((x for x in hand if mjai.pai(x) == name), None) or next(
                        (x for x in hand if mjai.pai(x).rstrip("r") == name.rstrip("r")), None
                    )
                    if pick is None:
                        raise _Illegal(f"chi tile {name} not in hand")
                    hand.remove(pick)
                    seq.append(pick)
                seq.sort()
                options = engine.get_available_chi_sequences(self.seat)
                for opt in options:
                    if sorted(str(x) for x in opt) == sorted(str(x) for x in seq):
                        return GameAction.CHI, None, {"sequence": opt}
                for opt in options:
                    if sorted((x.suit.value, x.rank) for x in opt) == sorted((x.suit.value, x.rank) for x in seq):
                        return GameAction.CHI, None, {"sequence": opt}
                raise _Illegal(f"chi {ev['consumed']} not among {[[str(x) for x in o] for o in options]}")
            if t == "ankan":
                return need(GameAction.DECLARE_ANKAN), self._hand_tile(engine, ev["consumed"][0]), {}
            if t == "kakan":
                return need(GameAction.KAN), self._hand_tile(engine, ev["pai"]), {}
            if t == "ryukyoku":
                return need(GameAction.DECLARE_KYUUSHU_KYUUHAI), None, {}
            raise _Illegal(f"unknown Mortal move {t}")
        except _Illegal as e:
            return self._mismatch(game, actions, str(e))


class _Illegal(Exception):
    pass
