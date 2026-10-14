"""Animation checks: smooth paths without jumps, correct start points, a hand
that does not sway on draw / discard, and no transforms left behind."""

import math
import os

from conftest import PORTRAIT

PROBE = os.path.join(os.path.dirname(__file__), "motion_probe.js")

SETTLE_CHECK = """() => {
  const bad = [];
  for (const el of document.querySelectorAll('[class*=dock] [data-k], [class*=river] > *, [data-back], [data-drawn]')) {
    if (el.getAnimations().some(a => a.playState === 'running')) bad.push(['running', el.getAttribute('aria-label')]);
    const m = getComputedStyle(el).transform.match(/matrix\\(([^)]+)\\)/);
    if (!m) continue;
    const v = m[1].split(',').map(Number);
    const sideways = Math.abs(v[0]) < 0.01 && Math.abs(Math.abs(v[1]) - 1) < 0.01;  // riichi tile
    const lifted = v[0] === 1 && v[1] === 0 && v[2] === 0 && v[3] === 1 && Math.abs(v[4]) < 0.5;  // hint / selection
    if (!sideways && !lifted) bad.push(['transform', el.getAttribute('aria-label'), m[0]]);
  }
  return bad;
}"""


def play(app, discards):
    n = 0
    for _ in range(3000):
        state = app.step()
        if state == "discard":
            n += 1
        if state == "result":
            app.page.wait_for_timeout(400)
            nxt = app.page.locator("text=/Следующая раздача/")
            if nxt.count():
                nxt.first.click()
                app.page.wait_for_timeout(1500)
                continue
            break
        if n >= discards:
            break
    app.page.wait_for_timeout(1200)


def analyse(paths, kind):
    out = []
    for p in paths:
        pts = p["pts"]
        if p["kind"] != kind or len(pts) < 3:
            continue
        total = math.dist(pts[0][:2], pts[-1][:2])
        if total < 2:
            continue
        steps = [math.dist(pts[i][:2], pts[i + 1][:2]) for i in range(len(pts) - 1)]
        dist = [math.dist(q[:2], pts[-1][:2]) for q in pts]
        out.append(
            {
                "total": total,
                "biggest": max(steps) / total,
                "back": max(dist[i + 1] - dist[i] for i in range(len(dist) - 1)),
                "start": pts[0][:2],
                "extra": p.get("extra"),
            }
        )
    return out


def test_discard_flights_are_smooth_and_start_at_the_tile(make_app):
    app = make_app(PORTRAIT)
    app.page.add_init_script(path=PROBE)
    app.open("?seed=41", {"aiDelay": 700}).start_game()
    app.page.evaluate("window.__track.recording = true")
    play(app, 10)
    paths = app.page.evaluate("window.__track.paths")

    mine = analyse(paths, "myDiscard")
    rivals = analyse(paths, "rivalDiscard")
    assert len(mine) >= 8 and len(rivals) >= 20, (len(mine), len(rivals))
    for f in mine + rivals:
        # No frame covers more than ~40 % of the way (a "jump"), never moves back.
        assert f["biggest"] < 0.4, f
        assert f["back"] < 2, f
    for f in mine:
        assert math.dist(f["start"], f["extra"][:2]) < 3, f  # from the tapped tile
    for f in rivals:
        l, t, r, b = f["extra"]
        x, y = f["start"]
        assert l - 4 <= x <= r + 4 and t - 4 <= y <= b + 4, f  # from her hand row
    for f in analyse(paths, "handTile"):
        assert f["biggest"] < 0.45 or f["total"] < 4, f
    assert not app.errors, app.errors


def test_hand_does_not_shift_when_a_tile_is_drawn(make_app):
    app = make_app(PORTRAIT).open("?seed=43", {"aiDelay": 300}).start_game()
    xs_js = "() => Object.fromEntries([...document.querySelectorAll('[class*=dock] [data-k]')].map(e => [e.dataset.k, Math.round(e.getBoundingClientRect().left)]))"
    checked = 0
    for _ in range(400):
        if checked >= 4:
            break
        if app.result_shown():
            break
        if app.button("Пропуск").count():
            app.button("Пропуск").first.click()
            continue
        if not app.my_turn():
            app.page.wait_for_timeout(150)
            continue
        app.discard()
        # After the discard settles: 13 tiles; after the next draw settles: 14.
        app.page.wait_for_timeout(900)
        before = app.page.evaluate(xs_js)
        for _ in range(100):
            if app.my_turn() or app.result_shown() or app.button("Пропуск").count():
                break
            app.page.wait_for_timeout(100)
        if not app.my_turn():
            continue
        app.page.wait_for_timeout(900)
        after = app.page.evaluate(xs_js)
        moved = {k: (before[k], after[k]) for k in before if k in after and abs(before[k] - after[k]) > 1}
        assert not moved, f"hand tiles moved on draw: {moved}"
        checked += 1
    assert checked >= 2, checked


def test_no_transforms_left_after_animations(make_app):
    app = make_app(PORTRAIT).open("?seed=47", {"aiDelay": 300}).start_game()
    for _ in range(8):
        play(app, 1)
        # Wait for a quiet moment (rivals keep playing), then nothing may be
        # left shifted, scaled or half-faded.
        for _ in range(60):
            bad = app.page.evaluate(SETTLE_CHECK)
            if not any(b[0] == "running" for b in bad):
                break
            app.page.wait_for_timeout(50)
        bad = [b for b in bad if b[0] != "running"]
        assert bad == [], bad
    assert not app.errors, app.errors
