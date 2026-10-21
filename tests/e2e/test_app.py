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
    """Felt colour, turn highlight and dealer badge from Settings land on the
    table: the active band's frame and the dealer's wind take the chosen colours."""
    look = {"tableStyle": "felt", "feltColor": "burgundy", "turnRing": "aqua", "turnRingStyle": "glow", "dealerChip": "sakura"}
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
    chip = page.evaluate("() => getComputedStyle(document.querySelector('[data-dealer]')).backgroundColor")
    assert chip == "rgb(255, 122, 182)", chip
    app.shot("table_look_burgundy_aqua_glow")
    assert not app.errors, app.errors


def test_table_centre_shows_dora_and_counters(make_app):
    """Portrait: the strip between the rivals and the player carries the dora
    indicators and the counters; landscape keeps them in the player's column."""
    app = make_app(PORTRAIT).open("?seed=7").start_game()
    app.wait_my_turn()
    centre = app.page.locator("[data-table-center]")
    assert centre.count() == 1
    # The dead wall as five tiles: the indicator(s) face up, the rest backs.
    dead = centre.locator("[aria-label='Дора'] > *")
    assert dead.count() == 5, dead.count()
    assert centre.locator("[aria-label='Дора'] [aria-label]").count() >= 1
    wall = int(centre.locator("[title^='Стена']").inner_text().strip())
    assert 0 < wall <= 70, wall
    land = make_app(LANDSCAPE).open("?seed=7").start_game()
    land.wait_my_turn()
    assert land.page.locator("[data-table-center]").count() == 0
    assert not app.errors and not land.errors


def test_rival_riichi_tints_her_band(make_app):
    """A rival in riichi gets her band tinted with a red edge; the others stay
    plain (scenario "riichi": all three rivals start tenpai)."""
    app = make_app(PORTRAIT).open("?scenario=riichi", {"aiDelay": 200}).start_game()
    page = app.page
    in_riichi = "() => document.querySelectorAll('section[aria-label] [class*=riichiLine]:not([data-empty])').length"
    for _ in range(300):
        state = app.step()
        if state == "result" or page.evaluate(in_riichi):
            break
    n = page.evaluate(in_riichi)
    assert n, "no rival declared riichi"
    # Every band with a riichi stick is tinted, and only those.
    assert page.locator("section[data-riichi]").count() == n
    band = page.locator("section[data-riichi]").first
    assert band.locator("[class*=riichiLine]:not([data-empty])").count() == 1
    edge = band.evaluate("e => getComputedStyle(e, '::before').backgroundColor")
    assert edge == "rgb(210, 69, 47)", edge
    assert "риичи" in band.get_attribute("aria-label").lower()
    assert not app.errors, app.errors


def test_landscape_rivers_start_on_one_line(make_app):
    """Landscape: rivals (portrait + wind/score/name) and the player (wind/score/
    "You") have headers of one height, so every river starts on the same line."""
    app = make_app(LANDSCAPE).open("?seed=7").start_game()
    app.wait_my_turn()
    tops = app.page.evaluate(
        "() => Array.from(document.querySelectorAll('section')).map(s => Math.round(s.querySelector('[class*=river]').getBoundingClientRect().top))"
    )
    assert len(tops) == 4 and max(tops) - min(tops) <= 1, tops
    assert not app.errors, app.errors


def test_first_hand_plays_to_a_result(make_app):
    app = make_app().open("?seed=11").start_game()
    for _ in range(600):
        if app.step() == "result":
            break
    assert app.result_shown(), "no round result after 600 steps"
    # Score rows: three heroine faces (emotion by the hand's result) and "You".
    faces = app.page.evaluate(
        "() => Array.from(document.querySelectorAll('[class*=who] [data-emotion]')).map(e => e.dataset.emotion)"
    )
    assert len(faces) == 3 and all(f in ("happy", "troubled", "neutral") for f in faces), faces
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
        # Tile and band measured in one call: the turn may move between two.
        pair = app.page.evaluate(
            """() => { const d = document.querySelector('section [data-drawn]'); if (!d) return null;
                 const b = d.getBoundingClientRect(), s = d.closest('section').getBoundingClientRect();
                 return [b.right, s.right]; }"""
        )
        if pair:
            assert pair[0] <= pair[1] - 2, pair
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


def test_crash_while_drawing_shows_the_recovery_dialog(make_app):
    """A render error (window.__rnCrash, see ScreenErrorBoundary.tsx) shows the
    recovery dialog instead of a blank page; each of its buttons gets the
    player back into the app."""
    app = make_app().open("?seed=7", {"aiDelay": 300}).start_game()
    page = app.page
    dialog = page.get_by_role("alertdialog")
    crash = "() => { window.__rnCrash = 'table'; }"

    def crash_now():
        page.evaluate(crash)
        page.get_by_role("button", name="Меню").first.click()  # re-renders the table
        dialog.wait_for(timeout=20_000)
        assert "Что-то пошло не так" in dialog.inner_text()
        page.evaluate("() => { window.__rnCrash = undefined; }")  # the fault is gone

    crash_now()
    dialog.get_by_role("button", name="Подробности").click()
    assert "test crash in table" in dialog.inner_text()
    app.shot("render_error")
    # Try again: the table is drawn again.
    dialog.get_by_role("button", name="Повторить").click()
    dialog.wait_for(state="detached", timeout=10_000)
    app.hand().first.wait_for(timeout=30_000)

    # Continue from the last save: the match goes on.
    crash_now()
    dialog.get_by_role("button", name="Продолжить с сохранения").click()
    dialog.wait_for(state="detached", timeout=30_000)
    app.hand().first.wait_for(timeout=60_000)

    # Main screen.
    crash_now()
    dialog.get_by_role("button", name="На главный экран").click()
    page.get_by_text("Продолжить").first.wait_for(timeout=20_000)
    assert page.locator("[class*=dock]").count() == 0
    # Page errors are expected here (the crash itself); nothing else.
    assert all("test crash" in e or "#520" in e for e in app.errors), app.errors
