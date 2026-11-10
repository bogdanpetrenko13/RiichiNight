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
    # The 7z came from you, the player before her: it lies sideways on the left.
    side = page.locator("section[aria-label] [data-meld=pon_meld]").first.evaluate('e => [...e.children].map((c) => /sideways/.test(c.className) || Boolean(c.querySelector("[class*=sideways]")))')
    assert side == [True, False, False], side
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
          // The new meld's tiles fly in (from the hand and the river), not pop up.
          window.__meldFly = null;
          new MutationObserver(() => {
            const m = document.querySelector('[class*=dock] [data-meld]');
            if (m && window.__meldFly === null) {
              window.__meldFly = [...m.querySelectorAll('[data-kind]')].map((t) => t.getAnimations().length);
            }
          }).observe(document.body, { childList: true, subtree: true });
        }"""
    )
    called = False
    for _ in range(400):
        if app.result_shown():
            break
        if not called and app.button("Пон").count():
            # At once, even with a rival's riichi banner still on screen
            # (it lets taps through while a call waits for you).
            app.button("Пон").first.click(timeout=1_500)
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
    # Claimed from the player after you (right): the sideways tile is on the right.
    side = fresh.evaluate('e => [...e.children].map((c) => /sideways/.test(c.className) || Boolean(c.querySelector("[class*=sideways]")))')
    assert side == [False, False, True], side
    # The new meld is marked for logic only: no outline or glow around it.
    look = fresh.evaluate("e => { const s = getComputedStyle(e); return [s.outlineStyle, s.boxShadow]; }")
    assert look == ["none", "none"], look
    fly = page.evaluate("() => window.__meldFly")
    assert fly and len(fly) == 3 and all(n > 0 for n in fly), fly
    app.shot("player_pon")
    assert not app.errors, app.errors


def test_chi_with_several_choices_shows_each_option(make_app):
    """Rigged deal (scenario "mychi"): the left rival throws 4s while the
    player holds 2356s. Chi opens a chooser with the three sequences as
    tile groups (the claimed 4s ringed); tapping one calls that chi."""
    # A fixed seed: with a random one the hand sometimes ended (a rival's
    # call or win) before the left rival threw the 4s, and Chi never came.
    app = make_app(PORTRAIT).open("?scenario=mychi&seed=3", {"aiDelay": 300}).start_game()
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
    # Chi always comes from the left: the claimed 4s lies sideways first.
    side = page.locator("[class*=dock] [data-meld=chi_meld]").first.evaluate('e => [...e.children].map((c) => /sideways/.test(c.className) || Boolean(c.querySelector("[class*=sideways]")))')
    assert side == [True, False, False], side
    assert not app.errors, app.errors


@pytest.mark.parametrize("style", ["quiet", "felt"])
def test_landscape_chi_chooser_is_a_strip_over_the_hand(make_app, style):
    """Landscape: the Chi options leave the narrow button column for a strip
    over the hand, all in one row with Cancel, tiles big enough to read."""
    app = make_app(LANDSCAPE).open("?scenario=mychi&seed=3", {"aiDelay": 300, "tableStyle": style}).start_game()
    page = app.page
    chi = page.get_by_role("button", name="Чи", exact=True)
    skip = page.get_by_role("button", name="Пропуск", exact=True)
    for _ in range(300):
        if chi.count():
            break
        if skip.count():
            page.wait_for_timeout(250)
            if chi.count():
                break
            skip.first.click()
            page.wait_for_timeout(200)
        elif app.my_turn():
            try:
                app.discard()
            except AssertionError:
                pass
        else:
            page.wait_for_timeout(150)
    assert chi.count(), "no Chi was offered"
    chi.first.click()
    options = page.locator("[data-chi-option]")
    options.first.wait_for(timeout=15_000)
    page.wait_for_timeout(300)
    geo = page.evaluate(
        """() => {
          const r = (e) => e.getBoundingClientRect();
          const strip = document.querySelector('[data-chi][data-strip]');
          const opts = [...document.querySelectorAll('[data-chi-option]')].map(r);
          const cancel = r(strip.querySelector('[data-kind=pass]'));
          const hand = [...document.querySelectorAll('[class*=dock] [data-k]')].map(r);
          const tile = r(document.querySelector('[data-chi-option] [class*=tile]'));
          return { strip: r(strip).toJSON(), opts: opts.map((o) => o.toJSON()), cancel: cancel.toJSON(),
                   handTop: Math.min(...hand.map((h) => h.top)), tileW: tile.width,
                   vw: innerWidth, inColumn: Boolean(strip.closest('[data-actions]')) };
        }"""
    )
    assert not geo["inColumn"], geo
    # One row: options and Cancel share a line.
    tops = {round(o["top"]) for o in geo["opts"]}
    assert len(tops) == 1, geo
    assert abs(geo["cancel"]["top"] + geo["cancel"]["height"] / 2 - (geo["opts"][0]["top"] + geo["opts"][0]["height"] / 2)) < 4, geo
    # Readable tiles (they were 17 px in the column), on screen, over the hand.
    assert geo["tileW"] >= 24, geo
    assert geo["strip"]["left"] >= 0 and geo["strip"]["right"] <= geo["vw"], geo
    assert geo["strip"]["bottom"] <= geo["handTop"] + 1, geo
    app.shot(f"chi_strip_{style}")
    options.nth(1).click()
    page.locator("[class*=dock] [data-meld]").first.wait_for(timeout=20_000)
    assert page.locator("[data-chi-option]").count() == 0
    assert not app.errors, app.errors


@pytest.mark.parametrize("style", ["quiet", "felt"])
def test_call_buttons_are_capital_pills(make_app, style):
    """The buttons at the table look like the seat chips: pills with small
    capitals; Pon in the call colour (the main green, gold on the felt), Pass
    on a soft chip."""
    app = make_app(PORTRAIT).open("?scenario=mypon", {"aiDelay": 300, "tableStyle": style}).start_game()
    page = app.page
    for _ in range(300):
        if app.button("Пон").count():
            break
        if app.my_turn():
            app.discard()
        page.wait_for_timeout(100)
    look = page.evaluate(
        """() => Object.fromEntries([...document.querySelectorAll('[data-actions] button')].map((b) => {
             const s = getComputedStyle(b);
             return [b.dataset.kind, { radius: parseFloat(s.borderTopLeftRadius), height: b.offsetHeight,
                                       caps: s.textTransform, bg: s.backgroundColor, font: s.fontWeight }];
           }))"""
    )
    call, skip = look["call"], look["pass"]
    for b in (call, skip):
        assert b["caps"] == "uppercase" and b["font"] == "700", look
        assert b["radius"] >= b["height"] / 2 - 1, look  # a pill
    # The main colour of the app's theme (light or dark), gold on the felt.
    main = page.evaluate(
        """() => { const p = document.createElement('i'); p.style.color = 'var(--primary)';
                   document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }"""
    )
    assert call["bg"] == ("rgb(242, 193, 78)" if style == "felt" else main), (look, main)
    assert skip["bg"] != call["bg"], look
    assert not app.errors, app.errors
