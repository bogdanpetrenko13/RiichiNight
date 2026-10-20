"""A rival's Chi / Pon / Kan: a plaque in her colour across her band with whom
the tile came from, and her new meld outlined until the next player's discard.

Scenario "rivalpon": the rival on the right (seat 1) holds 77z, the player's
first draw is the third 7z.
"""

from conftest import LANDSCAPE, PORTRAIT
import pytest

ANNOUNCE = "section[aria-label] [class*=announce]"
FRESH = "section[aria-label] [class*=meld][data-fresh]"


@pytest.mark.parametrize("viewport", [PORTRAIT, LANDSCAPE])
def test_rival_pon_is_announced_in_her_band(make_app, viewport):
    app = make_app(viewport).open("?scenario=rivalpon", {"aiDelay": 300}).start_game()
    page = app.page
    seen = None
    cut = False
    for _ in range(400):
        if page.locator(ANNOUNCE).count():
            seen = page.locator(ANNOUNCE).first.inner_text()
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
        if cut or not app.my_turn():
            app.step()
        else:
            app.discard()
    assert seen, "no call was announced"
    assert "ПОН" in seen.upper() and "у вас" in seen, seen
    page.wait_for_timeout(500)
    # The plaque sits inside the caller's band, fully on screen.
    box = page.locator(ANNOUNCE).first.bounding_box()
    band = page.locator(ANNOUNCE).first.locator("xpath=..").bounding_box()
    assert box and band and abs(box["x"] - band["x"]) <= 3 and abs(box["width"] - band["width"]) <= 6, (box, band)
    assert page.locator(FRESH).count() == 1
    app.shot("rival_pon_" + ("portrait" if viewport == PORTRAIT else "landscape"))
    # The plaque goes away by itself; the outline stays until the next
    # player discards.
    page.locator(ANNOUNCE).wait_for(state="detached", timeout=5_000)
    for _ in range(100):
        if not page.locator(FRESH).count():
            break
        app.step()
    assert page.locator(FRESH).count() == 0
    assert not app.errors, app.errors
