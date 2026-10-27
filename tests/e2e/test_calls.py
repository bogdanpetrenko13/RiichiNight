"""A rival's Chi / Pon / Kan: a plaque in her colour across her band with whom
the tile came from, and her new meld outlined until the next player's discard.

Scenario "rivalpon": the rival on the right (seat 1) holds 77z, the player
is dealt the third 7z.
"""

from conftest import LANDSCAPE, PORTRAIT
import pytest

ANNOUNCE = "section[aria-label] [class*=announce]"
FRESH = "section[aria-label] [class*=meld][data-fresh]"


@pytest.mark.parametrize("viewport", [PORTRAIT, LANDSCAPE])
def test_rival_pon_is_announced_in_her_band(make_app, viewport):
    app = make_app(viewport).open("?scenario=rivalpon", {"aiDelay": 300}).start_game()
    page = app.page
    # Record every announcement as it appears (it only stays 1.6 s).
    page.evaluate(
        """() => {
          window.__ann = [];
          window.__fresh = false;
          const look = () => {
            document.querySelectorAll('[class*=announce]').forEach((e) => {
              if (!e.dataset.seen) {
                e.dataset.seen = '1';
                window.__ann.push(e.innerText);
              }
            });
            if (document.querySelector('[class*=meld][data-fresh]')) window.__fresh = true;
          };
          new MutationObserver(look).observe(document.body, { childList: true, subtree: true, attributes: true });
        }"""
    )
    seen = None
    cut = False
    for _ in range(400):
        texts = page.evaluate("() => window.__ann")
        assert not any("{" in x for x in texts), texts
        pons = [x for x in texts if "ПОН" in x.upper()]
        if pons:
            seen = pons[0]
            break
        if app.result_shown():
            break
        if not cut and app.my_turn() and page.locator("[class*=dock] button[aria-label='7z']").count():
            try:
                app.discard("7z")
                cut = True
            except AssertionError:  # the hand re-rendered mid-tap: try again
                page.wait_for_timeout(300)
            continue
        try:
            if cut or not app.my_turn():
                app.step()
            else:
                app.discard()
        except AssertionError:
            page.wait_for_timeout(300)
    assert seen, ("no Pon was announced", cut, page.evaluate("() => window.__ann"))
    assert "у вас" in seen, seen
    # The plaque covers the caller's band (checked while it is still up).
    if page.locator(ANNOUNCE).count():
        box = page.locator(ANNOUNCE).first.bounding_box()
        band = page.locator(ANNOUNCE).first.locator("xpath=..").bounding_box()
        assert box and band and abs(box["x"] - band["x"]) <= 3 and abs(box["width"] - band["width"]) <= 6, (box, band)
        app.shot("rival_pon_" + ("portrait" if viewport == PORTRAIT else "landscape"))
    page.wait_for_function("() => window.__fresh === true", timeout=5_000)
    # The plaque goes away by itself; the meld stays marked (data-fresh, no
    # outline) until the next player discards.
    # (that plaque: another rival may call meanwhile and show her own)
    plaque = page.locator(ANNOUNCE).first.element_handle(timeout=1_000) if page.locator(ANNOUNCE).count() else None
    if plaque:
        page.wait_for_function("(e) => !e.isConnected", arg=plaque, timeout=8_000)
    for _ in range(100):
        if not page.locator(FRESH).count():
            break
        app.step()
    assert page.locator(FRESH).count() == 0
    assert not app.errors, app.errors


def test_player_pon_uses_the_same_plaque(make_app):
    """The player's own Pon: the same plaque as a rival's (over the player
    band, "from <name>"), the new meld outlined in the hand, and the same
    lettering as the riichi / ron cutaway (tokens.css --call-*)."""
    app = make_app(PORTRAIT).open("?scenario=mypon", {"aiDelay": 300}).start_game()
    page = app.page
    page.evaluate(
        """() => {
          window.__ann = [];
          new MutationObserver(() => document.querySelectorAll('[class*=announce]').forEach((e) => {
            if (!e.dataset.seen) {
              e.dataset.seen = '1';
              window.__ann.push({ text: e.innerText, me: e.hasAttribute('data-me'),
                font: getComputedStyle(e.querySelector('b')).fontWeight + ' ' + getComputedStyle(e.querySelector('b')).textTransform,
                family: getComputedStyle(e.querySelector('b')).fontFamily });
            }
          })).observe(document.body, { childList: true, subtree: true });
        }"""
    )
    called = False
    for _ in range(400):
        if app.result_shown():
            break
        if not called and app.button("Пон").count():
            app.button("Пон").first.click()
            called = True
            continue
        mine = [a for a in page.evaluate("() => window.__ann") if a["me"]]
        if mine:
            break
        try:
            if app.button("Пропуск").count():
                app.step()  # other calls
            elif app.my_turn():
                app.discard()
            else:
                page.wait_for_timeout(200)
        except AssertionError:
            page.wait_for_timeout(300)
    assert called, "no Pon was offered"
    page.wait_for_function("() => window.__ann.some((a) => a.me)", timeout=10_000)
    mine = [a for a in page.evaluate("() => window.__ann") if a["me"]][0]
    assert "ПОН" in mine["text"].upper() and "у " in mine["text"], mine
    assert mine["font"] == "900 uppercase", mine
    # The bundled Inter Black is loaded and used for the lettering.
    assert page.evaluate("() => [...document.fonts].some((f) => f.family.includes('Riichi Call') && f.status === 'loaded')")
    # (read when the plaque appeared: it may be gone by now)
    assert mine["family"].startswith('"Riichi Call"'), mine
    fresh = page.locator("[class*=dock] [class*=meld][data-fresh]")
    assert fresh.count() == 1
    # The new meld is marked for logic only: no outline or glow around it.
    look = fresh.evaluate("e => { const s = getComputedStyle(e); return [s.outlineStyle, s.boxShadow]; }")
    assert look == ["none", "none"], look
    app.shot("player_pon")
    assert not app.errors, app.errors


def test_chi_with_several_choices_shows_each_option(make_app):
    """Rigged deal (scenario "mychi"): the left rival throws 4s while the
    player holds 2356s. Chi opens a chooser with the three sequences as
    tile groups (the claimed 4s ringed); tapping one calls that chi."""
    app = make_app(PORTRAIT).open("?scenario=mychi", {"aiDelay": 300}).start_game()
    page = app.page
    chi = page.get_by_role("button", name="Чи", exact=True)
    skip = page.get_by_role("button", name="Пропуск", exact=True)
    for _ in range(300):
        if chi.count():
            break
        if skip.count():
            # The Chi button may render a moment after Пропуск: look again
            # before skipping, or the offer we wait for gets passed.
            page.wait_for_timeout(250)
            if chi.count():
                break
            skip.first.click()
            page.wait_for_timeout(200)
        elif app.my_turn():
            try:
                app.discard()
            except AssertionError:  # the hand re-rendered; try again
                pass
        else:
            page.wait_for_timeout(150)
    assert chi.count(), "no Chi was offered"
    # The discard you can call is ringed in the river.
    assert page.locator("section[aria-label] [class*=river] [class*=highlight]").count() == 1
    chi.first.click()
    options = page.locator("[data-chi-option]")
    options.first.wait_for(timeout=15_000)
    assert options.count() == 3
    groups = [o.locator("img").evaluate_all("els => els.map(e => e.getAttribute('src').split('/').pop())") for o in options.all()]
    assert all(len(g) == 3 for g in groups), groups
    assert all(o.locator("[class*=highlight]").count() == 1 for o in options.all())
    app.shot("chi_chooser")
    options.nth(1).click()  # 3s-4s-5s
    meld = page.locator("[class*=dock] [class*=meld]").first
    meld.wait_for(timeout=20_000)
    assert page.locator("[data-chi-option]").count() == 0
    assert not app.errors, app.errors
