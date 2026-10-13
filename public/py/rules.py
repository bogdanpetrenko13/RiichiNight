"""Rule options exposed in the game's settings.

Maps the UI's rule object onto pyriichi's RulesetConfig and adds what
pyriichi lacks: an East-only game (tonpuusen) and a game without red fives. The East-only switch is an
attribute on the GameState, so it survives save/load with the rest of the game.
"""

from pyriichi import GameState, RuleEngine, RulesetConfig, Tile, TileSet, Wind

DEFAULT_RULES = {
    "gameLength": "hanchan",  # "east" (tonpuusen) or "hanchan" (East + South)
    "tobi": True,  # game ends when someone drops below zero
    "agariYame": True,  # dealer leading in the final hand may stop the game
    "kiriageMangan": False,  # 4 han 30 fu / 3 han 60 fu counted as mangan
    "openTanyao": True,  # kuitan
    "redFives": True,  # one red five per suit (aka dora)
}

_original_next_round = GameState.next_round


def _next_round(self: GameState) -> bool:
    if getattr(self, "east_only", False) and self.round_wind == Wind.EAST and self.round_number >= 4:
        return False
    return _original_next_round(self)


_original_start_round = RuleEngine.start_round


def _start_round(self: RuleEngine) -> None:
    _original_start_round(self)
    if getattr(self._game_state, "red_fives", True):
        return
    # Rebuild the wall from plain tiles, then shuffle as the engine does.
    plain = [Tile(t.suit, t.rank) for t in TileSet._create_standard_set()]
    self._tile_set = TileSet(plain)
    self._tile_set.shuffle()


def apply_patches() -> None:
    GameState.next_round = _next_round
    RuleEngine.start_round = _start_round


def normalize(rules) -> dict:
    out = dict(DEFAULT_RULES)
    if isinstance(rules, dict):
        for key in DEFAULT_RULES:
            if key in rules:
                out[key] = rules[key]
    if out["gameLength"] not in ("east", "hanchan"):
        out["gameLength"] = "hanchan"
    return out


def make_game_state(rules: dict, num_players: int) -> GameState:
    cfg = RulesetConfig()
    cfg.tobi_enabled = bool(rules["tobi"])
    cfg.agari_yame = bool(rules["agariYame"])
    cfg.kiriage_mangan = bool(rules["kiriageMangan"])
    cfg.open_tanyao_enabled = bool(rules["openTanyao"])
    state = GameState(num_players=num_players, ruleset=cfg)
    state.east_only = rules["gameLength"] == "east"
    state.red_fives = bool(rules["redFives"])
    return state
