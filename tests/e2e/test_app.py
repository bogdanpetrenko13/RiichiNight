"""End-to-end checks of the table on rigged and seeded games."""

import pytest

from conftest import LANDSCAPE, PORTRAIT


def test_tsumo_result_shows_score_breakdown(make_app):
    app = make_app().open("?scenario=tsumo&seed=5").start_game()
    app.wait_my_turn()
    if app.page.locator("[class*=dock] button[aria-label='1z']").count():
        app.discard("1z")  # the player deals: cut the junk tile first
    app.button("Цумо").first.wait_for(timeout=60_000)
    app.button("Цумо").first.click()
    panel = app.page.get_by_text("Как посчитано")
    panel.wait_for(timeout=30_000)
    app.page.wait_for_timeout(600)
    app.shot("result_collapsed")
    panel.click()
    body = app.page.locator("[class*=calcBody]")
    body.wait_for()
    text = body.inner_text()
    for part in ("Основа", "Цумо", "Закрытый сет", "Ценная пара", "канчан", "30 фу", "Каждая платит"):
        assert part in text, (part, text)
    assert "Дора" in app.page.locator("[class*=yaku]").first.inner_text()
    app.shot("result_breakdown")
    assert not app.errors, app.errors


def test_red_five_stays_in_hand_when_plain_five_is_cut(make_app):
    app = make_app().open("?scenario=redfive&seed=6").start_game()
    app.wait_my_turn()
    if app.page.locator("[class*=dock] button[aria-label='1z']").count():
        app.discard("1z")
    # Wait until the plain 5p arrives as the drawn tile.
    app.page.wait_for_function(
        "() => document.querySelectorAll(\"[class*=dock] button[aria-label='5p']\").length === 1",
        timeout=60_000,
    )
    app.discard("5p")
    app.page.wait_for_timeout(800)
    assert app.page.locator("[class*=dock] button[aria-label='r5p']").count() == 1
    assert app.page.locator("[class*=dock] button[aria-label='5p']").count() == 0
    assert not app.errors, app.errors


@pytest.mark.parametrize(
    "name,viewport,style",
    [
        ("portrait_quiet", PORTRAIT, "quiet"),
        ("portrait_felt", PORTRAIT, "felt"),
        ("landscape_quiet", LANDSCAPE, "quiet"),
    ],
)
def test_table_layout_after_a_few_turns(make_app, name, viewport, style):
    app = make_app(viewport).open("?seed=7", {"tableStyle": style}).start_game()
    discards = 0
    for _ in range(300):
        state = app.step()
        discards += state == "discard"
        if discards >= 6 or state == "result":
            break
    app.page.wait_for_timeout(1200)
    app.shot(f"table_{name}")
    assert app.no_horizontal_scroll()
    assert not app.errors, app.errors


def test_first_hand_plays_to_a_result(make_app):
    app = make_app().open("?seed=11").start_game()
    for _ in range(600):
        if app.step() == "result":
            break
    assert app.result_shown(), "no round result after 600 steps"
    app.page.wait_for_timeout(600)
    app.shot("first_result")
    assert not app.errors, app.errors
