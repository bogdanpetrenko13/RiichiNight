"""End-to-end checks of the table on rigged and seeded games."""

import pytest

from conftest import LANDSCAPE, PORTRAIT


def test_tsumo_result_shows_score_breakdown(make_app):
    app = make_app().open("?scenario=tsumo&seed=5").start_game()
    app.wait_my_turn()
    if app.page.locator("[class*=dock] button[aria-label='1z']").count():
        app.discard("1z")  # the player deals: cut the junk tile first
    app.button("Цумо").first.wait_for(timeout=60_000)
    app.page.wait_for_timeout(400)
    # Buttons sit in a row under the hand and are never clipped.
    assert app.in_viewport("button:has-text('Цумо')")
    box = app.page.locator("button:has-text('Цумо')").first.bounding_box()
    hand = app.page.locator("[class*=dock] [data-k]").first.bounding_box()
    assert box["y"] > hand["y"] + hand["height"] - 1, (box, hand)
    app.button("Цумо").first.click()
    panel = app.page.get_by_role("button", name="Как посчитано")
    panel.wait_for(timeout=30_000)
    app.page.wait_for_timeout(600)
    app.shot("result_panel")
    assert app.in_viewport("button:has-text('Следующая раздача')"), "Next hand needs scrolling"
    assert "Дора" in app.page.locator("[class*=yaku]").first.inner_text()
    panel.click()
    dialog = app.page.get_by_role("dialog")
    dialog.wait_for()
    app.page.wait_for_timeout(300)
    text = dialog.inner_text()
    for part in ("Основа", "Цумо", "Закрытый сет", "Ценная пара", "канчан", "30 фу", "Каждая платит"):
        assert part in text, (part, text)
    app.shot("result_breakdown")
    app.page.get_by_role("button", name="Понятно").click()
    dialog.wait_for(state="detached")
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


def test_table_look_settings_reach_the_table(make_app):
    """Felt colour and turn highlight from Settings land on the table and the
    active band's frame takes the chosen colour."""
    look = {"tableStyle": "felt", "feltColor": "burgundy", "turnRing": "aqua", "turnRingStyle": "glow"}
    app = make_app(PORTRAIT).open("?seed=7", look).start_game()
    app.wait_my_turn()
    page = app.page
    attrs = page.evaluate(
        "() => { const e = document.querySelector('[data-style]'); return [e.dataset.style, e.dataset.felt, e.dataset.ring, e.dataset.glow]; }"
    )
    assert attrs == ["felt", "burgundy", "aqua", "true"], attrs
    ring = page.evaluate(
        "() => getComputedStyle(document.querySelector('[data-active]'), '::after').boxShadow"
    )
    assert "rgb(63, 214, 207)" in ring and ring.count("inset") == 2, ring
    app.shot("table_look_burgundy_aqua_glow")
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


# Landscape with a camera-cutout inset on the left, as on a phone in full screen.
CUTOUT = "[data-orientation] { padding-left: 44px !important; }"


def _rect(page, selector):
    return page.locator(selector).first.bounding_box()


def test_landscape_drawn_tiles_stay_in_place(make_app):
    from conftest import LANDSCAPE

    app = make_app(LANDSCAPE).open("?seed=7", {"aiDelay": 600})
    app.page.add_style_tag(content=CUTOUT)
    app.start_game()
    app.page.add_style_tag(content=CUTOUT)
    checked_me = checked_rival = 0
    for _ in range(600):
        if checked_me >= 2 and checked_rival >= 2:
            break
        # A rival holding her drawn tile: it stays inside her column.
        drawn = app.page.locator("section [data-drawn]")
        if drawn.count():
            box = drawn.first.bounding_box()
            band = drawn.first.locator("xpath=ancestor::section[1]").bounding_box()
            if box and band:
                assert box["x"] + box["width"] <= band["x"] + band["width"] - 2, (box, band)
                checked_rival += 1
        if app.my_turn() and not app.button("Пропуск").count():
            app.page.wait_for_timeout(500)
            tiles = app.page.locator("[class*=dock] [data-k]")
            last = tiles.last.bounding_box()
            actions = app.page.locator("[data-actions]").first.bounding_box()
            assert last["x"] + last["width"] <= actions["x"] + 1, ("drawn tile under the buttons", last, actions)
            checked_me += 1
        if app.step() == "result":
            break
        app.page.wait_for_timeout(100)
    assert checked_me >= 2 and checked_rival >= 1, (checked_me, checked_rival)
    assert not app.errors, app.errors


def test_landscape_result_hand_on_one_line(make_app):
    from conftest import LANDSCAPE

    app = make_app(LANDSCAPE).open("?scenario=tsumo&seed=5", {"aiDelay": 300}).start_game()
    app.wait_my_turn()
    if app.page.locator("[class*=dock] button[aria-label='1z']").count():
        app.discard("1z")
    app.button("Цумо").first.wait_for(timeout=60_000)
    app.button("Цумо").first.click()
    app.page.get_by_role("button", name="Как посчитано").wait_for(timeout=30_000)
    app.page.wait_for_timeout(700)
    tops = app.page.evaluate(
        "() => [...document.querySelectorAll('[data-win-hand] [aria-label]')].map(e => Math.round(e.getBoundingClientRect().bottom))"
    )
    assert len(tops) >= 14 and max(tops) - min(tops) <= 2, tops
    app.shot("landscape_result")


def _inject_engine_failures(app, count):
    """Serve bridge.py with act() failing `count` times (no hooks in the app)."""
    patch = f"""

_fail_left = [{count}]
_real_act = act


def act(command_json, run_ai=False):
    if _fail_left[0]:
        _fail_left[0] -= 1
        raise RuntimeError("injected test failure")
    return _real_act(command_json, run_ai)
"""

    def handle(route):
        resp = route.fetch()
        route.fulfill(response=resp, body=resp.text() + patch)

    app.page.context.route("**/py/bridge.py", handle)


def test_engine_error_shows_a_dialog_and_recovers(make_app):
    app = make_app()
    _inject_engine_failures(app, 2)
    app.open("?seed=7", {"aiDelay": 300}).start_game()
    for _ in range(300):
        if app.my_turn() and not app.button("Пропуск").count():
            break
        app.step()
    river_before = app.page.locator("[class*=me] [class*=river] > [aria-label]").count()
    app.discard()
    dialog = app.page.get_by_role("alertdialog")
    dialog.wait_for(timeout=15_000)
    text = dialog.inner_text()
    assert "Что-то пошло не так" in text and "Traceback" not in text, text
    assert "Traceback" not in app.page.locator("header").first.inner_text()
    app.page.wait_for_timeout(500)
    app.shot("engine_error")
    # Details can be opened and contain the engine message for a report.
    dialog.get_by_role("button", name="Подробности").click()
    assert "injected test failure" in dialog.inner_text()
    # "Try again" repeats the failed discard; the second injected failure shows the dialog again.
    dialog.get_by_role("button", name="Повторить").click()
    dialog.wait_for(timeout=15_000)
    # "Continue from the last save" reloads the match; then the discard works.
    app.page.get_by_role("button", name="Продолжить с сохранения").click()
    app.page.get_by_role("alertdialog").wait_for(state="detached", timeout=15_000)
    for _ in range(300):
        if app.my_turn() and not app.button("Пропуск").count():
            break
        app.step()
    app.discard()
    app.page.wait_for_function(
        f"() => document.querySelectorAll('[class*=me] [class*=river] > [aria-label]').length > {river_before}",
        timeout=15_000,
    )
    assert app.page.get_by_role("alertdialog").count() == 0
