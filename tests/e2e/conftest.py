"""Browser tests of the built app (Playwright for Python + Chromium).

    npm run build                      # or any build with the same layout
    pip install pytest playwright && python -m playwright install chromium
    E2E_DIST=dist python -m pytest tests/e2e -q

E2E_DIST    folder with the built app (default: dist)
E2E_SHOTS   folder for screenshots (default: test-results/e2e); CI uploads it

Games are made reproducible with `?seed=` and start from rigged deals with
`?scenario=` (public/py/scenarios.py).
"""

import functools
import http.server
import json
import os
import threading

import pytest
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DIST = os.path.abspath(os.environ.get("E2E_DIST", os.path.join(ROOT, "dist")))
SHOTS = os.path.abspath(os.environ.get("E2E_SHOTS", os.path.join(ROOT, "test-results", "e2e")))

PORTRAIT = {"width": 412, "height": 915}
LANDSCAPE = {"width": 915, "height": 412}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".ts": "text/javascript",
        ".wasm": "application/wasm",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
    }

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        pass  # the browser dropping connections on context close is not an error


@pytest.fixture(scope="session")
def base_url():
    if not os.path.exists(os.path.join(DIST, "index.html")):
        message = f"no built app in {DIST} (run npm run build or set E2E_DIST)"
        if os.environ.get("E2E_REQUIRE"):
            raise RuntimeError(message)  # CI: never pass by skipping
        pytest.skip(message)
    server = Server(("127.0.0.1", 0), functools.partial(Handler, directory=DIST))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}/"
    server.shutdown()


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--disable-gpu"])
        yield b
        b.close()


SETTINGS = {"lang": "ru", "aiDelay": 120, "dealAnimation": False, "adultConfirmed": False}


class App:
    """A page of the app with helpers; collects uncaught page errors."""

    def __init__(self, page, base_url):
        self.page = page
        self.base_url = base_url
        self.errors = []
        page.on("pageerror", lambda e: self.errors.append(str(e)))

    def open(self, query: str = "", settings: dict | None = None):
        pg = self.page
        pg.goto(self.base_url + "index.html")
        merged = json.dumps({**SETTINGS, **(settings or {})})
        # Capacitor Preferences on the web prefixes keys; the preview stub does not.
        pg.evaluate(
            """(s) => { for (const k of ['settings.v1', 'CapacitorStorage.settings.v1']) {
                 const old = JSON.parse(localStorage.getItem(k) || '{}');
                 localStorage.setItem(k, JSON.stringify(Object.assign(old, JSON.parse(s)))); } }""",
            merged,
        )
        pg.goto(self.base_url + "index.html" + query)
        pg.get_by_text("Новая игра").first.wait_for(timeout=120_000)
        return self

    def start_game(self):
        pg = self.page
        pg.get_by_text("Новая игра").first.click()
        pg.get_by_text("Начать", exact=True).first.click()
        self.hand().first.wait_for(timeout=120_000)
        return self

    def hand(self):
        return self.page.locator("[class*=dock] button[aria-label]")

    def discard(self, code: str | None = None):
        """Tap a hand tile twice (select, then discard); the drawn tile if no code.
        Retries when the hand re-renders between the taps."""
        sel = "[class*=dock] button[aria-label]" + (f"[aria-label='{code}']" if code else "")
        for _ in range(4):
            try:
                tile = self.page.locator(sel).last
                tile.click(timeout=3_000)
                self.page.wait_for_timeout(80)
                tile.click(timeout=3_000)
                return
            except Exception:
                self.page.wait_for_timeout(300)
        raise AssertionError(f"could not discard {code or 'the drawn tile'}")

    def my_turn(self) -> bool:
        """14 tiles (incl. melds' share) and the hand accepts taps: during a
        call announcement the count can already match while it is disabled."""
        return self.page.evaluate(
            """() => { const b = [...document.querySelectorAll('[class*=dock] button[aria-label]')];
                       return b.length % 3 === 2 && !b[b.length - 1].disabled; }"""
        )

    def result_shown(self) -> bool:
        return self.page.locator("text=/Следующая раздача|Продолжить/").count() > 0

    def step(self) -> str:
        """One move of autopilot for the player: skip calls, cut the drawn tile.
        Returns 'result', 'skip', 'discard' or 'wait'."""
        if self.result_shown():
            return "result"
        skip = self.button("Пропуск")
        if skip.count():
            try:
                skip.first.click(timeout=3_000)
                return "skip"
            except Exception:
                return "wait"
        if self.my_turn():
            self.discard()
            self.page.wait_for_timeout(150)
            return "discard"
        self.page.wait_for_timeout(200)
        return "wait"

    def button(self, text: str):
        return self.page.locator(f"button:has-text('{text}')")

    def wait_my_turn(self, timeout=60_000):
        self.page.wait_for_function(
            "() => document.querySelectorAll('[class*=dock] button[aria-label]').length % 3 === 2",
            timeout=timeout,
        )

    def shot(self, name: str):
        os.makedirs(SHOTS, exist_ok=True)
        self.page.screenshot(path=os.path.join(SHOTS, name + ".png"))

    def in_viewport(self, selector: str) -> bool:
        """The element is fully on screen (no scrolling needed to reach it)."""
        box = self.page.locator(selector).first.bounding_box()
        vp = self.page.viewport_size
        return bool(box) and box["y"] >= 0 and box["y"] + box["height"] <= vp["height"] + 1

    def no_horizontal_scroll(self):
        return self.page.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1")


@pytest.fixture
def make_app(browser, base_url):
    contexts = []

    def make(viewport=PORTRAIT, dark=True):
        ctx = browser.new_context(
            viewport=viewport,
            device_scale_factor=2,
            color_scheme="dark" if dark else "light",
            locale="ru-RU",
            has_touch=True,
        )
        contexts.append(ctx)
        return App(ctx.new_page(), base_url)

    yield make
    for ctx in contexts:
        ctx.close()
