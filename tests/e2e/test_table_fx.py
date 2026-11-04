"""Table animations (Settings -> Table animations): the round splash, a new
dora turning over after a kan, the riichi stick going down and swept up by
the winner, and points changing hands on the table before the result card.
Each also checks that "off" leaves the table as before."""

import pytest

from conftest import PORTRAIT

RESULT = "button:has-text('Следующая раздача')"


def _cut_junk(app):
    app.wait_my_turn()
    if app.page.locator("[class*=dock] button[aria-label='1z']").count():
        app.discard("1z")


@pytest.mark.parametrize("fx", ["full", "off"])
def test_round_splash_rolls_the_dice_and_names_the_first_east(make_app, fx):
    app = make_app(PORTRAIT).open("?seed=12&dealer=2", {"tableFx": fx, "aiDelay": 400})
    page = app.page
    page.get_by_text("Новая игра").first.click()
    page.get_by_text("Начать", exact=True).first.click()
    splash = page.locator("[data-round-splash]")
    if fx == "off":
        page.locator("[class*=dock] button[aria-label]").first.wait_for(timeout=120_000)
        page.wait_for_timeout(300)
        assert splash.count() == 0
        return
    splash.wait_for(timeout=120_000)
    text = splash.text_content()
    assert "Восток 1" in text, text
    # Seat 2 (across) is the first East: one of the heroines, named.
    assert "Первый Восток — " in text and "вы" not in text.split("—")[-1], text
    # Two dice tumble and land on a pair that counts from the player to the
    # first East (seat 2): (a + b - 1) % 4 == 2. Only the dice, no sum.
    page.wait_for_timeout(1200)
    faces = page.evaluate("() => [...document.querySelectorAll('[data-round-splash] [data-die]')].map((d) => Number(d.dataset.die))")
    assert len(faces) == 2 and (sum(faces) - 1) % 4 == 2, faces
    assert "=" not in splash.text_content() and "+" not in splash.text_content()
    app.shot("round_splash_dice")
    splash.wait_for(state="detached", timeout=5_000)
    assert not app.errors, app.errors


@pytest.mark.parametrize("fx", ["full", "off"])
def test_points_change_hands_on_the_table_before_the_result_card(make_app, fx):
    app = make_app(PORTRAIT).open("?scenario=tsumo&seed=5", {"tableFx": fx}).start_game()
    page = app.page
    _cut_junk(app)
    app.button("Цумо").first.wait_for(timeout=60_000)
    before = page.evaluate("() => [0,1,2,3].map((s) => document.querySelector(`[data-score-seat='${s}']`).textContent)")
    app.button("Цумо").first.click()
    if fx == "off":
        page.locator(RESULT).wait_for(timeout=30_000)
        assert page.locator("[data-delta]").count() == 0
        return
    # The scores stand still under the Tsumo banner, then the changes float up
    # beside them while the result card is still held back.
    page.locator("[data-delta]").first.wait_for(timeout=10_000)
    assert page.locator(RESULT).count() == 0
    deltas = page.evaluate(
        "() => Object.fromEntries([...document.querySelectorAll('[data-delta]')].map((d) => [d.closest('[data-score-seat]').dataset.scoreSeat, Number(d.dataset.delta)]))"
    )
    assert len(deltas) == 4 and sum(deltas.values()) == 0 and deltas["0"] > 0, deltas
    app.shot("points_transfer")
    page.locator(RESULT).wait_for(timeout=10_000)
    after = page.evaluate("() => [0,1,2,3].map((s) => Number(document.querySelector(`[data-score-seat='${s}']`).firstChild.textContent.replace(/\\D/g, '')))")
    start = [int("".join(c for c in b if c.isdigit())) for b in before]
    assert [a - s for a, s in zip(after, start)] == [deltas[str(i)] for i in range(4)], (start, after, deltas)
    assert not app.errors, app.errors


def test_riichi_stick_goes_down_and_the_winner_sweeps_it_up(make_app):
    app = make_app(PORTRAIT).open("?scenario=riichitsumo&seed=3").start_game()
    page = app.page
    app.wait_my_turn()
    app.button("Риичи").first.click()
    tile = page.locator("[class*=dock] button[aria-label='9s']").last
    tile.click()
    page.wait_for_timeout(150)
    tile.click()
    line = "section[class*=band]:not([aria-label]) [data-riichi-stick]:not([data-empty]) > *"
    page.locator(line).wait_for(timeout=10_000)
    # The stick slides from the score to its place in front of the river.
    moving = page.evaluate(f"() => document.querySelector('{line}').getAnimations().length")
    assert moving > 0
    app.button("Цумо").first.wait_for(timeout=60_000)
    app.button("Цумо").first.click()
    # After the banner a copy flies to the winner's score; the stick is gone.
    page.wait_for_function(
        "() => document.querySelector('[data-sticks-taken]') !== null", timeout=10_000
    )
    flying = page.evaluate("() => [...document.body.children].filter((e) => e.style && e.style.position === 'fixed').length")
    assert flying >= 1, flying
    assert page.evaluate(f"() => getComputedStyle(document.querySelector('{line}')).visibility") == "hidden"
    page.locator(RESULT).wait_for(timeout=10_000)
    assert not app.errors, app.errors


def test_a_new_dora_turns_over_after_a_kan(make_app):
    app = make_app(PORTRAIT).open("?scenario=rinshan&seed=3").start_game()
    page = app.page
    app.wait_my_turn()
    app.button("Кан").first.click()
    page.wait_for_function("() => document.querySelectorAll('[data-dead-wall] [data-kind]').length === 2", timeout=10_000)
    turning = page.evaluate("() => document.querySelectorAll('[data-dead-wall] [data-kind]')[1].getAnimations().length")
    assert turning > 0
    assert page.evaluate("() => document.querySelectorAll('[data-dead-wall] [data-kind]')[0].getAnimations().length") == 0
    assert not app.errors, app.errors
