#!/usr/bin/env python3
"""Generates the app icon, Android adaptive icons and splash screens.

Shared between Riichi Night and Riichi Trainer (variant "A": a tile with a
symbol). The artwork is original vector art drawn here.

  python scripts/make-icons.py night     # Riichi Night: tile with a crescent moon, night sky
  python scripts/make-icons.py trainer   # Riichi Trainer: tile with a check mark, paper

Writes:
  resources/android/res/mipmap-*/ic_launcher{,_round,_foreground,_background}.png
  resources/android/res/mipmap-anydpi-v26/ic_launcher{,_round}.xml
  resources/android/res/drawable*/splash.png
  resources/icon.svg (master artwork)
  public/<web icons> (see WEB below)
CI copies resources/android/res into android/app/src/main/res after `cap add`.

Needs Python with Pillow and Playwright (Chromium) to rasterise the SVGs.
"""

import base64
import io
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VB = 108  # adaptive icon grid (dp); safe zone: circle of radius 33 at the centre

STARS = "".join(
    f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fbfaf6" opacity="{o}"/>'
    for x, y, r, o in [(24, 26, 1.1, 0.9), (84, 22, 0.8, 0.7), (90, 52, 1, 0.8), (18, 70, 0.7, 0.6), (30, 88, 0.9, 0.7), (80, 86, 0.7, 0.6), (62, 16, 0.6, 0.6)]
)

THEMES = {
    "night": {
        "background": f"""<defs><radialGradient id="nb" cx="50%" cy="38%" r="75%">
<stop offset="0" stop-color="#2e4a3b"/><stop offset="1" stop-color="#121614"/></radialGradient></defs>
<rect width="108" height="108" fill="url(#nb)"/>{STARS}""",
        "symbol": """<mask id="moon"><circle cx="54" cy="53" r="15" fill="#fff"/><circle cx="60.3" cy="48.8" r="12.3" fill="#000"/></mask>
<circle cx="54" cy="53" r="15" fill="#e08768" mask="url(#moon)"/>""",
        "splash_bg": "#161b18",
        "web": {"favicon.png": 48, "icon-192.png": 192, "icon-512.png": 512},
    },
    "trainer": {
        "background": """<rect width="108" height="108" fill="#f7f4ec"/><circle cx="54" cy="54" r="40" fill="#e3ece6"/>""",
        "symbol": """<path d="M41 54 l9 10 l17 -21" fill="none" stroke="#2e4a3b" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>""",
        "splash_bg": "#f7f4ec",
        "web": {"favicon.png": 48, "icon-192.png": 192, "icon-512.png": 512},
    },
}


def tile(inner: str) -> str:
    """White tile with a 3D edge, tilted like a tile just put down."""
    x, y, w, h = 32, 24, 44, 58
    return f"""<g transform="rotate(-8 54 53)">
<rect x="{x}" y="{y + 3}" width="{w}" height="{h}" rx="7" fill="#9a927f"/>
<rect x="{x}" y="{y + 1.6}" width="{w}" height="{h}" rx="7" fill="#cdc5b3"/>
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="#fdfcf8"/>
<rect x="{x + 1}" y="{y + 1}" width="{w - 2}" height="{h - 2}" rx="6" fill="none" stroke="#ffffff" stroke-opacity=".7"/>
{inner}</g>"""


def svg(body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB} {VB}">{body}</svg>'


def layers(theme: dict) -> dict:
    fg = tile(theme["symbol"])
    return {
        "full": svg(theme["background"] + fg),
        "background": svg(theme["background"]),
        # Adaptive icons crop to ~72/108: shrink the tile into the safe zone.
        "foreground": svg(f'<g transform="translate(54 54) scale(0.72) translate(-54 -54)">{fg}</g>'),
        "splash": svg(f'<g transform="translate(54 54) scale(0.86) translate(-54 -54)">{fg}</g>'),
    }


def rasterize(svgs: dict, size: int) -> dict:
    from playwright.sync_api import sync_playwright

    out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-gpu"])
        page = browser.new_page(viewport={"width": size, "height": size})
        for key, code in svgs.items():
            url = "data:image/svg+xml;base64," + base64.b64encode(code.encode()).decode()
            page.set_content(
                f'<html><body style="margin:0;background:transparent"><img src="{url}" width="{size}" height="{size}"></body></html>'
            )
            page.wait_for_timeout(100)
            png = page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
            out[key] = Image.open(io.BytesIO(png)).convert("RGBA")
        browser.close()
    return out


def rounded(img: Image.Image, radius_frac: float) -> Image.Image:
    size = img.size[0]
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * radius_frac), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def circle(img: Image.Image) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
SPLASH_PORT = {"mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280), "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920)}

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    if name not in THEMES:
        sys.exit(__doc__)
    theme = THEMES[name]
    svgs = layers(theme)
    big = rasterize(svgs, 1024)
    res = os.path.join(ROOT, "resources", "android", "res")

    os.makedirs(os.path.join(ROOT, "resources"), exist_ok=True)
    with open(os.path.join(ROOT, "resources", "icon.svg"), "w") as f:
        f.write(svgs["full"])

    for dens, k in DENSITIES.items():
        d = os.path.join(res, f"mipmap-{dens}")
        os.makedirs(d, exist_ok=True)
        legacy = round(48 * k)
        adaptive = round(108 * k)
        full = big["full"].resize((legacy, legacy), Image.LANCZOS)
        rounded(full, 0.22).save(os.path.join(d, "ic_launcher.png"))
        circle(full).save(os.path.join(d, "ic_launcher_round.png"))
        big["foreground"].resize((adaptive, adaptive), Image.LANCZOS).save(os.path.join(d, "ic_launcher_foreground.png"))
        big["background"].resize((adaptive, adaptive), Image.LANCZOS).save(os.path.join(d, "ic_launcher_background.png"))

    anydpi = os.path.join(res, "mipmap-anydpi-v26")
    os.makedirs(anydpi, exist_ok=True)
    for fname in ("ic_launcher.xml", "ic_launcher_round.xml"):
        with open(os.path.join(anydpi, fname), "w") as f:
            f.write(ADAPTIVE_XML)

    # Splash screens: the tile centred on the app background colour.
    bg = theme["splash_bg"]
    def splash(w: int, h: int) -> Image.Image:
        img = Image.new("RGBA", (w, h), bg)
        s = int(min(w, h) * 0.8)
        logo = big["splash"].resize((s, s), Image.LANCZOS)
        img.alpha_composite(logo, ((w - s) // 2, (h - s) // 2))
        return img.convert("RGB")

    for dens, (w, h) in SPLASH_PORT.items():
        for orient, size in (("port", (w, h)), ("land", (h, w))):
            d = os.path.join(res, f"drawable-{orient}-{dens}")
            os.makedirs(d, exist_ok=True)
            splash(*size).save(os.path.join(d, "splash.png"))
    os.makedirs(os.path.join(res, "drawable"), exist_ok=True)
    splash(480, 320).save(os.path.join(res, "drawable", "splash.png"))

    public = os.path.join(ROOT, "public")
    for fname, size in theme["web"].items():
        rounded(big["full"].resize((size, size), Image.LANCZOS), 0.22).save(os.path.join(public, fname))
    print(f"{name}: icons written to resources/android/res and public/")


if __name__ == "__main__":
    main()
