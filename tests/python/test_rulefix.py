"""Unit checks of the rule fixes in public/py/rulefix.py (the full games
against Mortal's rules are in test_mortal.py)."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "public", "py"))

from pyriichi import Hand, RuleEngine, Tile, parse_tiles  # noqa: E402
from pyriichi.hand import Combination, CombinationType  # noqa: E402
from pyriichi.scoring import ScoreCalculator, ScoreResult  # noqa: E402
from pyriichi.tiles import Suit  # noqa: E402
from pyriichi.yaku import Machi, YakuChecker  # noqa: E402

import rulefix  # noqa: E402

rulefix.apply()


def t(code: str) -> Tile:
    return parse_tiles(code)[0]


def seq(code: str) -> Combination:
    return Combination(CombinationType.SEQUENCE, parse_tiles(code))


def test_three_han_seventy_fu_is_mangan():
    sr = ScoreResult(han=3, fu=70, base_points=0, total_points=0, payment_from=1, payment_to=0,
                     is_yakuman=False, yakuman_count=0)
    assert sr.total_points == 2000


def test_four_han_thirty_fu_is_not_rounded_up():
    sr = ScoreResult(han=4, fu=30, base_points=0, total_points=0, payment_from=1, payment_to=0,
                     is_yakuman=False, yakuman_count=0)
    assert sr.total_points == 1920


def test_waits():
    calc = ScoreCalculator()
    pair = Combination(CombinationType.PAIR, parse_tiles("55p"))
    assert calc._determine_machi(t("1s"), [seq("123s"), pair]) == Machi.RYANMEN  # 23 on 1
    assert calc._determine_machi(t("3s"), [seq("123s"), pair]) == Machi.PENCHAN  # 12 on 3
    assert calc._determine_machi(t("9s"), [seq("789s"), pair]) == Machi.RYANMEN  # 78 on 9
    assert calc._determine_machi(t("7s"), [seq("789s"), pair]) == Machi.PENCHAN  # 89 on 7
    assert calc._determine_machi(t("8s"), [seq("789s"), pair]) == Machi.KANCHAN
    # 3 fits both 123 (edge) and 345 (two-sided): fu take the edge wait,
    # pinfu may use the two-sided reading.
    both = [seq("123s"), seq("345s"), pair]
    assert calc._determine_machi(t("3s"), both) == Machi.PENCHAN
    assert YakuChecker()._determine_machi(t("3s"), both) == Machi.RYANMEN


def test_chi_keeps_the_red_five():
    hand = Hand(parse_tiles("r5m6m") + parse_tiles("123p456p789s1z1z"))
    options = hand.can_chi(t("4m"), 0)
    red = [o for o in options if any(x.is_red_dora for x in o)]
    assert red, options
    meld = hand.chi(t("4m"), red[0])
    assert any(x.is_red_dora for x in meld.tiles)
    assert not any(x.is_red_dora for x in hand.tiles)


def test_kuikae_kinds():
    k = rulefix._kuikae_kinds
    # Called 3 with 45: neither 3 nor 6 may be discarded.
    assert k(t("3s"), parse_tiles("45s")) == {(Suit.SOUZU, 3), (Suit.SOUZU, 6)}
    # Called 6 with 45: 6 and 3.
    assert k(t("6s"), parse_tiles("45s")) == {(Suit.SOUZU, 6), (Suit.SOUZU, 3)}
    # Called 5 with 46 (middle): only 5.
    assert k(t("5s"), parse_tiles("46s")) == {(Suit.SOUZU, 5)}
    # Called 7 with 89: 7 only (no 10).
    assert k(t("7s"), parse_tiles("89s")) == {(Suit.SOUZU, 7)}
    # Pon: the kind.
    assert k(t("1z"), None) == {(Suit.HONORS, 1)}


def test_no_chi_that_leaves_only_forbidden_tiles():
    # 4-tile hand 4s5s + 3s 6s: chi 3s with 45s leaves 3s 6s, both forbidden.
    hand = Hand(parse_tiles("3s4s5s6s"))
    assert hand.can_chi(t("3s"), 0) == []


def test_riichi_needs_a_thousand_points():
    engine = RuleEngine()
    engine.start_game()
    engine.start_round()
    engine.deal()
    hand = Hand(parse_tiles("123m456p789s1122z"))
    hand.add_tile(t("3z"))
    engine._hands[0] = hand
    engine._current_player = 0
    assert engine._can_riichi(0)
    engine.game_state._scores[0] = 900
    assert not engine._can_riichi(0)
