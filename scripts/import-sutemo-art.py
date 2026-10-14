#!/usr/bin/env python3
"""Builds every heroine from Sutemo's layered sprite PSDs (itch.io).

Sources (downloaded by the user, not stored in this repo):
  Anime_Mature_Woman_Free.psd   https://sutemo.itch.io/female-mature-anime-sprite
  Female_Sprite_by_Sutemo.psd   https://sutemo.itch.io/female-character

Terms (author's page): usable in personal and commercial projects; the
sprite itself may not be resold on its own (including as a character
creator). This game is free and non-commercial. The repository keeps only
the finished images, not the source PSDs. See public/characters/CREDITS.md.

Each heroine is a distinct combination of hairstyle, hair colour, outfit and
accessories, with three expressions (neutral / happy / troubled) for the
table. Only adult outfits are used (office, knitwear, aprons, coats, dresses,
hoodie);
the PSDs' school/PE uniforms, swimsuits, towel and pajama layers are never
composed.

Output per heroine in public/characters/<id>/:
  portrait.webp, emotions/<neutral|happy|troubled>.webp   256 px face crops
  reward/stage1..4.webp                    900x1200 scenes, fully clothed

Usage: python scripts/import-sutemo-art.py MATURE.psd SUTEMO.psd
Needs: ImageMagick (convert, identify) and Pillow with WebP.
"""

import os
import random
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "characters")
SCENE_W, SCENE_H = 900, 1200

# Layer numbers are ImageMagick PSD indices (identify FILE.psd), bottom to top.
# PSD 0 = Anime_Mature_Woman_Free.psd, PSD 1 = Female_Sprite_by_Sutemo.psd.
# "hair": back hair + base body; "front": nose + front hair + accessories.
# Outfits are lists of layers; numbers in MULTIPLY are shading layers.
MATURE = dict(psd=0, size=(1736, 1440), face=(870, 625, 600), nose=[92, 93])
SUTEMO = dict(psd=1, size=(1011, 1145), face=(505, 430, 540), nose=[])
MULTIPLY = {(0, 31), (0, 37), (0, 39)}

# Mature-sprite outfits.
OFFICE, BLACK_KNIT, PINK_KNIT = [26, 30], [28], [29]
WINTER_M, SUMMER_M, SHIRT_W, SHIRT_Y = [33], [34], [35], [36]
APRON_BLACK, ROSE_DRESS, CARDIGAN = [35, 39, 40], [44], [45]
# Sutemo-sprite outfits.
SUMMER_S, HOODIE, WINTER_S = [30], [33], [35]

HEROINES = {
    "hikari": {  # café barista: blonde short hair, headband, black apron
        **MATURE,
        "hair": [16, 21], "front": [61, 100],
        "outfit": APRON_BLACK,
        "emotions": {"neutral": 76, "happy": 83, "troubled": 80},
        "scenes": [(APRON_BLACK, 77, []), (SHIRT_Y, 84, []), (CARDIGAN, 83, []), (SUMMER_M, 77, [22])],
        "palette": [("#2b1d12", "#8a5a2b"), ("#2a2412", "#a8842e"), ("#2b1620", "#b8577a"), ("#13263a", "#3f8fb5")],
    },
    "rin": {  # accountant: dark bob, black glasses, turtleneck
        **MATURE,
        "hair": [20, 21], "front": [55, 95],
        "outfit": BLACK_KNIT,
        "emotions": {"neutral": 78, "happy": 76, "troubled": 80},
        "scenes": [(BLACK_KNIT, 76, []), (SHIRT_W, 87, []), (WINTER_M, 77, []), (SUMMER_M, 77, [22])],
        "palette": [("#101a2b", "#2f4f7a"), ("#14213d", "#4a6fa5"), ("#18202a", "#5b7385"), ("#16233a", "#5b8def")],
    },
    "mai": {  # parlor owner: long pink curls, rose dress, red rose
        **MATURE,
        "hair": [8, 21], "front": [73, 106],
        "outfit": ROSE_DRESS,
        "emotions": {"neutral": 87, "happy": 77, "troubled": 79},
        "scenes": [(ROSE_DRESS, 77, []), (BLACK_KNIT, 87, []), (WINTER_M, 83, []), (SUMMER_M, 77, [22])],
        "palette": [("#2a0f18", "#8a2a4a"), ("#1f1220", "#6b3a5e"), ("#22161c", "#9a4a5e"), ("#2a1630", "#c2456b")],
    },
    "yuzu": {  # streamer: silver bob with side-swept bangs, choker, hoodie
        **SUTEMO,
        "hair": [21, 25], "front": [53, 72],
        "outfit": HOODIE,
        "emotions": {"neutral": 57, "happy": 67, "troubled": 64},
        "scenes": [(HOODIE, 57, []), (WINTER_S, 67, []), (SUMMER_S, 66, [71]), (SUMMER_S, 60, [26, 71])],
        "palette": [("#1a1430", "#5a3e9a"), ("#16213e", "#6b5bc5"), ("#221a3a", "#8e6cd8"), ("#2a1a33", "#c06cd8")],
    },
    "reiko": {  # project manager: long dark hair, office suit with name tag
        **MATURE,
        "hair": [5, 21], "front": [70],
        "outfit": OFFICE,
        "emotions": {"neutral": 78, "happy": 87, "troubled": 89},
        "scenes": [(OFFICE, 76, []), (PINK_KNIT, 83, []), (WINTER_M, 87, []), (SUMMER_M, 77, [22, 107])],
        "palette": [("#1b1430", "#4b2a6b"), ("#14213d", "#5b3a7a"), ("#221a3a", "#7a3a5e"), ("#2a1630", "#b8577a")],
    },
    "nanami": {  # illustrator: long brown hair, winter coat with scarf
        **SUTEMO,
        "hair": [13, 25], "front": [55],
        "outfit": WINTER_S,
        "emotions": {"neutral": 59, "happy": 60, "troubled": 61},
        "scenes": [(WINTER_S, 57, []), (HOODIE, 67, []), (SUMMER_S, 66, [71]), (SUMMER_S, 60, [26, 71])],
        "palette": [("#101a33", "#2f5d8a"), ("#16213e", "#3f7f8a"), ("#1f2b3a", "#3fa58f"), ("#13302a", "#2fb5a0")],
    },
}


def extract(psd: str, layers: set, tmp: str) -> dict:
    """Layer index -> (RGBA image, x, y), via ImageMagick."""
    out = {}
    for n in sorted(layers):
        geo = subprocess.run(
            ["identify", "-format", "%X %Y", f"{psd}[{n}]"], check=True, capture_output=True, text=True
        ).stdout.split()
        x, y = (int(v) for v in geo)
        path = os.path.join(tmp, f"{n}.png")
        subprocess.run(["convert", f"{psd}[{n}]", "-set", "page", "+0+0", f"PNG32:{path}"], check=True)
        out[n] = (Image.open(path).convert("RGBA"), x, y)
    return out


def multiply(canvas: Image.Image, img: Image.Image, x: int, y: int) -> None:
    """Multiply-blends a shading layer onto the canvas (alpha kept)."""
    region = canvas.crop((x, y, x + img.width, y + img.height))
    shaded = ImageChops.multiply(region.convert("RGB"), img.convert("RGB"))
    mixed = Image.composite(shaded, region.convert("RGB"), img.getchannel("A"))
    mixed.putalpha(region.getchannel("A"))
    canvas.paste(mixed, (x, y))


def sprite(cfg: dict, layers: dict, outfit, expression: int, extra) -> Image.Image:
    w, h = cfg["size"]
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    order = cfg["hair"] + list(outfit) + [expression] + cfg["nose"] + cfg["front"] + list(extra)
    for n in order:
        img, x, y = layers[n]
        if (cfg["psd"], n) in MULTIPLY:
            multiply(canvas, img, x, y)
        else:
            canvas.alpha_composite(img, (x, y))
    return canvas


def face(img: Image.Image, box) -> Image.Image:
    cx, cy, size = box
    return img.crop((cx - size // 2, cy - size // 2, cx + size // 2, cy + size // 2)).resize((256, 256), Image.LANCZOS)


def backdrop(colors, seed: int) -> Image.Image:
    """Soft modern backdrop: vertical gradient with blurred light bokeh."""
    top, bottom = (Image.new("RGB", (1, 1), c).getpixel((0, 0)) for c in colors)
    grad = Image.new("RGB", (1, SCENE_H))
    for y in range(SCENE_H):
        t = y / (SCENE_H - 1)
        grad.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    frame = grad.resize((SCENE_W, SCENE_H)).convert("RGBA")
    rng = random.Random(seed)
    glow = Image.new("RGBA", (SCENE_W, SCENE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    for _ in range(26):
        r = rng.randint(30, 120)
        x, y = rng.randint(0, SCENE_W), rng.randint(0, int(SCENE_H * 0.75))
        tint = rng.choice([(255, 210, 230), (200, 190, 255), (255, 235, 200), (190, 230, 255)])
        d.ellipse((x - r, y - r, x + r, y + r), fill=(*tint, rng.randint(25, 70)))
    frame.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))
    return frame


def scene(img: Image.Image, colors, seed: int) -> Image.Image:
    frame = backdrop(colors, seed)
    box = img.getbbox()
    fig = img.crop(box)
    s = (SCENE_H * 0.9) / fig.height
    if fig.width * s > SCENE_W * 1.05:
        s = SCENE_W * 1.05 / fig.width
    fig = fig.resize((round(fig.width * s), round(fig.height * s)), Image.LANCZOS)
    frame.alpha_composite(fig, ((SCENE_W - fig.width) // 2, SCENE_H - fig.height))
    shade = Image.new("L", (SCENE_W, SCENE_H), 0)
    ImageDraw.Draw(shade).rectangle((0, int(SCENE_H * 0.78), SCENE_W, SCENE_H), fill=120)
    shade = shade.filter(ImageFilter.GaussianBlur(60))
    frame.alpha_composite(Image.merge("RGBA", (*(Image.new("L", shade.size, 0),) * 3, shade)))
    return frame.convert("RGB")


def main() -> None:
    psds = sys.argv[1:3]
    if len(psds) != 2:
        sys.exit(__doc__)
    for hid, cfg in HEROINES.items():
        needed = set(cfg["hair"]) | set(cfg["nose"]) | set(cfg["front"]) | set(cfg["outfit"]) | set(cfg["emotions"].values())
        for outfit, expr, extra in cfg["scenes"]:
            needed |= set(outfit) | {expr} | set(extra)
        with tempfile.TemporaryDirectory() as tmp:
            layers = extract(psds[cfg["psd"]], needed, tmp)
            base = os.path.join(OUT, hid)
            shutil.rmtree(base, ignore_errors=True)
            os.makedirs(os.path.join(base, "emotions"), exist_ok=True)
            os.makedirs(os.path.join(base, "reward"), exist_ok=True)
            for emotion, expr in cfg["emotions"].items():
                img = face(sprite(cfg, layers, cfg["outfit"], expr, []), cfg["face"])
                img.save(os.path.join(base, "emotions", f"{emotion}.webp"), quality=90)
                if emotion == "neutral":
                    img.save(os.path.join(base, "portrait.webp"), quality=90)
            for i, ((outfit, expr, extra), colors) in enumerate(zip(cfg["scenes"], cfg["palette"]), start=1):
                img = scene(sprite(cfg, layers, outfit, expr, extra), colors, seed=i * 31 + len(hid))
                img.save(os.path.join(base, "reward", f"stage{i}.webp"), quality=84)
        print(f"{hid}: done")


if __name__ == "__main__":
    main()
