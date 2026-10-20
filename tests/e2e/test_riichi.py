"""The player's riichi: confirmation step, button look, the sideways tile in
the river, and a landscape table that keeps its size while buttons come and go.

Scenario "myriichi" deals the player 555z 666z 777z 11z 22z (tenpai from the
start); the rivals get shuffled hands.
"""

from conftest import LANDSCAPE, PORTRAIT

ME = "section[class*=band]:not([aria-label])"
MY_STICK = ME + " [class*=riichiLine]:not([data-empty])"


def _riichi_offered(app):
    """Skip calls (rivals may cut 1z / 2z) until the player's turn with Riichi."""
    for _ in range(600):
        if app.result_shown():
            raise AssertionError("the hand ended before riichi")
        if app.button("Пропуск").count():
            app.step()
        elif app.my_turn() and app.button("Риичи").count():
            app.page.wait_for_timeout(300)
            return
        else:
            app.page.wait_for_timeout(200)
    raise AssertionError("riichi was not offered")


def _declare(app):
    """Riichi button, lift the drawn tile, tap it again."""
    app.button("Риичи").first.click()
    tile = app.page.locator("[class*=dock] button[aria-label]").last
    tile.click()
    app.page.wait_for_timeout(150)
    tile.click()
    app.page.locator(MY_STICK).wait_for(timeout=10_000)
    app.page.wait_for_timeout(900)


def test_riichi_is_the_filled_button_and_needs_confirmation(make_app):
    app = make_app(PORTRAIT).open("?scenario=myriichi", {"aiDelay": 200}).start_game()
    _riichi_offered(app)
    page = app.page
    # Lift a tile: Riichi stays the one filled button, Discard is plain.
    page.locator("[class*=dock] button[aria-label]").last.click()
    page.wait_for_timeout(200)
    assert app.button("Риичи").first.get_attribute("data-kind") == "primary"
    assert app.button("Сброс").first.get_attribute("data-kind") == "pass"

    app.button("Риичи").first.click()
    assert page.locator("text=Выберите тайл для сброса с риичи").count() > 0
    tile = page.locator("[class*=dock] button[aria-label]").last
    tile.click()
    page.wait_for_timeout(300)
    # One tap only lifts the tile: no declaration yet, its waits are shown
    # and the Riichi button confirms.
    assert page.locator(MY_STICK).count() == 0
    assert "Ожидания" in page.locator(ME).inner_text()
    confirm = app.button("Риичи").first
    assert confirm.get_attribute("data-kind") == "primary"
    app.shot("riichi_confirm")
    confirm.click()
    page.locator(MY_STICK).wait_for(timeout=10_000)
    assert not app.errors, app.errors


def test_riichi_tile_sits_evenly_between_its_neighbours(make_app):
    app = make_app(PORTRAIT).open("?scenario=myriichi", {"aiDelay": 200}).start_game()
    # A few discards first, so the riichi tile has a neighbour on the left...
    for _ in range(2):
        _riichi_offered(app)
        try:
            app.discard()
        except AssertionError:  # re-rendered mid-tap; the next turn will do
            pass
        app.page.wait_for_timeout(300)
    _riichi_offered(app)
    _declare(app)
    # ...and, unless a rival wins on it, one on the right.
    river = app.page.locator(ME + " [class*=river] > [class*=tile]")
    for _ in range(600):
        if river.count() >= 4 or app.result_shown():
            break
        try:
            app.step()
        except AssertionError:
            app.page.wait_for_timeout(300)
    app.page.wait_for_timeout(900)
    gaps = app.page.evaluate(
        """(sel) => {
          const tiles = [...document.querySelectorAll(sel + ' [class*=river] > [class*=tile]')];
          const i = tiles.findIndex((t) => t.className.includes('sideways'));
          if (i < 1) return { classes: tiles.map((t) => t.className) };
          const r = (t) => t.getBoundingClientRect();
          const [a, b] = [r(tiles[i - 1]), r(tiles[i])];
          const c = tiles[i + 1] ? r(tiles[i + 1]) : null;
          return { left: b.left - a.right, right: c ? c.left - b.right : null,
                   bottom: b.bottom - a.bottom, width: b.width / a.width };
        }""",
        ME,
    )
    app.shot("riichi_tile")
    assert "classes" not in gaps, gaps
    # Same 1 px gap as between upright tiles, its face on the row's baseline.
    assert 0 <= gaps["left"] <= 2.5, gaps
    if gaps["right"] is not None:
        assert 0 <= gaps["right"] <= 2.5, gaps
        assert abs(gaps["left"] - gaps["right"]) <= 1.5, gaps
    assert abs(gaps["bottom"]) <= 1.5, gaps
    assert abs(gaps["width"] - 1.42) < 0.05, gaps
    assert not app.errors, app.errors


def test_landscape_bands_keep_their_size_with_buttons(make_app):
    """Waits and 1-4 buttons must not resize the rival columns."""
    app = make_app(LANDSCAPE).open("?scenario=myriichi", {"aiDelay": 200}).start_game()
    page = app.page
    size = "() => { const r = document.querySelector('[class*=bands]').getBoundingClientRect(); return [r.width, r.height]; }"
    river = "() => getComputedStyle(document.querySelector('[class*=bands]')).getPropertyValue('--band-river')"
    _riichi_offered(app)
    with_buttons = (page.evaluate(size), page.evaluate(river))
    page.locator("[class*=dock] button[aria-label]").last.click()  # Riichi + Discard + waits
    page.wait_for_timeout(300)
    lifted = (page.evaluate(size), page.evaluate(river))
    app.shot("landscape_buttons")
    page.locator("[class*=dock] button[aria-label]").last.click()  # discard
    page.wait_for_function(
        "() => !document.querySelector('[data-actions] button')", timeout=10_000
    )
    page.wait_for_timeout(300)
    without = (page.evaluate(size), page.evaluate(river))
    assert with_buttons == lifted == without, (with_buttons, lifted, without)
    # The waits sit inside the player's column, fully on screen.
    assert app.in_viewport(ME)
    assert not app.errors, app.errors
