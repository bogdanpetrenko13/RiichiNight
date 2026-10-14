"""Heroine play styles (ai.py STYLES) must be visible in play: simulated
east-only games with three rivals of one style each (fixed seeds)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from style_stats import collect  # noqa: E402

GAMES = 6
_TABLE = None


def table():
    global _TABLE
    if _TABLE is None:
        _TABLE = collect(["reckless", "precise", "showy", "patient", "flush"], GAMES)
    return _TABLE


def test_patient_never_calls_and_deals_in_least():
    t = table()
    assert t["patient"]["calls/hand"] == 0
    assert t["patient"]["dealin%"] < min(t[s]["dealin%"] for s in ("reckless", "showy", "flush"))


def test_reckless_calls_more_than_precise():
    t = table()
    assert t["reckless"]["calls/hand"] > 2 * t["precise"]["calls/hand"]


def test_showy_pushes_and_patient_folds():
    t = table()
    assert t["patient"]["safe%"] > t["showy"]["safe%"] + 20


def test_precise_wins_some_hands_silently():
    assert table()["precise"]["dama wins%"] > 0


def test_flush_style_makes_flushes():
    t = table()
    assert t["flush"]["flush wins%"] >= 25
    assert all(t[s]["flush wins%"] < t["flush"]["flush wins%"] for s in ("reckless", "precise", "showy", "patient"))
