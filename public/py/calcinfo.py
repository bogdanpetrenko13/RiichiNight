"""How a win was scored, for the result screen.

pyriichi only returns the totals (han, fu, points). This module records the
details while pyriichi scores each candidate decomposition:

* fu parts, mirroring ScoreCalculator.calculate_fu line by line (base, closed
  ron / tsumo, each triplet or kan, value pair, wait, rounding);
* dora split into dora / red fives / ura, plus the ura indicators;
* limit name, base points and the payments (ron total or tsumo split, honba,
  riichi sticks).

It also fixes one fu rule: an open hand that wins by ron with no fu at all
(open "pinfu" shape) scores 30 fu, not 20.

The parts are attached to the ScoreResult object, so the decomposition that
pyriichi finally keeps carries its own explanation.
tests/python/test_calcinfo.py checks that the parts always add up to pyriichi's
fu and that dora parts add up to the dora han.
"""

from pyriichi.hand import CombinationType
from pyriichi.scoring import ScoreCalculator
from pyriichi.tiles import Suit
from pyriichi.yaku import Machi, Yaku

from yakufix import winning_tiles

_original_calculate = ScoreCalculator.calculate
_original_calculate_fu = ScoreCalculator.calculate_fu


def _code(tile) -> str:
    return str(tile)


def fu_parts(calc, hand, winning_tile, combination, yaku_results, game_state, is_tsumo, player):
    """Labelled fu parts; follows ScoreCalculator.calculate_fu exactly."""
    if any(r.yaku == Yaku.CHIITOITSU for r in yaku_results):
        return [{"key": "chiitoitsu", "fu": 25}]
    if any(r.yaku == Yaku.PINFU for r in yaku_results):
        return [{"key": "pinfuTsumo" if is_tsumo else "pinfuRon", "fu": 20 if is_tsumo else 30}]

    parts = [{"key": "base", "fu": 20}]
    if hand.is_concealed and not is_tsumo:
        parts.append({"key": "closedRon", "fu": 10})
    elif is_tsumo:
        parts.append({"key": "tsumo", "fu": 2})

    for comb in combination or []:
        if comb.type not in (CombinationType.TRIPLET, CombinationType.KAN):
            continue
        tile = comb.tiles[0]
        is_open = comb.is_open
        # Ron completing a closed triplet makes it count as open.
        if (
            not is_tsumo
            and not is_open
            and comb.type == CombinationType.TRIPLET
            and tile.suit == winning_tile.suit
            and tile.rank == winning_tile.rank
        ):
            is_open = True
        edge = tile.is_terminal or tile.is_honor
        if comb.type == CombinationType.TRIPLET:
            base = 4 if is_open else 8
            kind = "openTriplet" if is_open else "closedTriplet"
        else:
            base = 16 if is_open else 32
            kind = "openKan" if is_open else "closedKan"
        parts.append({"key": kind, "tile": _code(tile), "fu": base if edge else base // 2})

    pair = calc._extract_pair(combination)
    if pair is not None:
        tile = pair.tiles[0]
        if tile.suit == Suit.HONORS:
            fu = 0
            if tile.rank in (5, 6, 7):
                fu += 2
            if game_state.round_wind.tile == tile:
                fu += 2
            winds = game_state.seat_winds
            if player < len(winds) and winds[player].tile == tile:
                fu += 2
            if fu:
                parts.append({"key": "valuePair", "tile": _code(tile), "fu": fu})

    machi = calc._determine_machi(winning_tile, combination)
    if machi in (Machi.TANKI, Machi.PENCHAN, Machi.KANCHAN):
        parts.append({"key": "wait_" + machi.name.lower(), "fu": 2})
    return parts


def calculate_fu(self, hand, winning_tile, winning_combination, yaku_results, game_state, is_tsumo, player_position=0):
    fu = _original_calculate_fu(
        self, hand, winning_tile, winning_combination, yaku_results, game_state, is_tsumo, player_position
    )
    # Open hand, ron, nothing but the 20 base fu: the minimum is 30 (kuipinfu).
    if fu == 20 and not is_tsumo and not hand.is_concealed:
        fu = 30
    return fu


def calculate(self, hand, winning_tile, winning_combination, yaku_results, dora_count, game_state, is_tsumo, player_position=0, **kwargs):
    result = _original_calculate(
        self, hand, winning_tile, winning_combination, yaku_results, dora_count, game_state, is_tsumo,
        player_position=player_position, **kwargs,
    )
    parts = fu_parts(self, hand, winning_tile, winning_combination, yaku_results, game_state, is_tsumo, player_position)
    raw = sum(p["fu"] for p in parts)
    if raw == 20 and not is_tsumo and not hand.is_concealed:
        parts.append({"key": "openMinimum", "fu": 10})
        raw = 30
    result.calc_fu_parts = parts  # type: ignore[attr-defined]
    result.calc_fu_raw = raw  # type: ignore[attr-defined]
    return result


LIMITS = [(13, "kazoe"), (11, "sanbaiman"), (8, "baiman"), (6, "haneman")]


def limit_name(sr) -> str | None:
    if sr.is_yakuman:
        return "yakuman"
    for han, name in LIMITS:
        if sr.han >= han:
            return name
    if sr.han >= 5 or (sr.han == 4 and sr.fu >= 40):
        return "mangan"
    if sr.kiriage_mangan_enabled and ((sr.han == 4 and sr.fu == 30) or (sr.han == 3 and sr.fu == 60)):
        return "mangan"
    return None


def dora_split(engine, seat: int, win_tile) -> dict:
    hand = engine.get_hand(seat)
    tiles = winning_tiles(hand, win_tile)
    dora = sum(sum(1 for t in tiles if t == d) for d in engine.get_revealed_dora_tiles())
    aka = sum(1 for t in tiles if t.is_red_dora)
    ura = 0
    ura_indicators = []
    tileset = engine._tile_set
    if hand.is_riichi and tileset is not None:
        ura_indicators = list(tileset.get_ura_dora_indicators(1 + engine._kan_count) or [])
        for ind in ura_indicators:
            u = tileset.get_dora(ind)
            ura += sum(1 for t in tiles if t == u)
    return {
        "dora": dora,
        "aka": aka,
        "ura": ura,
        "uraIndicators": [_code(t) for t in ura_indicators] if hand.is_riichi else None,
    }


def describe(engine, seat: int, win_result, win_tile) -> dict:
    """The `calc` block of a winner on the result screen."""
    sr = win_result.score_result
    dealer = engine.game_state.dealer == seat
    info = {
        "fuParts": getattr(sr, "calc_fu_parts", None),
        "fuRaw": getattr(sr, "calc_fu_raw", None),
        "limit": limit_name(sr),
        "yakumanCount": sr.yakuman_count if sr.is_yakuman else 0,
        "base": sr.base_points if not limit_name(sr) else None,
        "dealer": dealer,
        "honba": sr.honba_bonus,
        "sticks": sr.riichi_sticks_bonus,
    }
    if sr.is_tsumo:
        info["payments"] = {"dealer": sr.dealer_payment, "nonDealer": sr.non_dealer_payment}
    else:
        info["payments"] = {"ron": sr.total_points - sr.riichi_sticks_bonus}
    info.update(dora_split(engine, seat, win_tile))
    return info


def apply() -> None:
    ScoreCalculator.calculate = calculate  # type: ignore[method-assign]
    ScoreCalculator.calculate_fu = calculate_fu  # type: ignore[method-assign]
