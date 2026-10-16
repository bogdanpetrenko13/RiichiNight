#!/usr/bin/env python3
"""Builds every heroine from Sutemo's layered sprite PSDs (itch.io).

Sources (downloaded by the user, not stored in this repo):
  Anime_Mature_Woman_Free.psd   https://sutemo.itch.io/female-mature-anime-sprite
  Female_Sprite_by_Sutemo.psd   https://sutemo.itch.io/female-character

Terms (author's page): usable in personal and commercial projects; the
sprite itself may not be resold on its own (including as a character
creator). This game is free and non-commercial. The repository keeps only
the finished images, not the source PSDs. See public/characters/CREDITS.md.

Each heroine is a combination of hairstyle, hair colour, outfit and
accessories, with three expressions (neutral / happy / troubled) for the
table. Only adult outfits are used (office, knitwear, aprons, coats, dresses,
hoodie);
the PSDs' school/PE uniforms, swimsuits, towel and pajama layers are never
composed.

Output per heroine in public/characters/<id>/:
  portrait.webp, emotions/<neutral|happy|troubled>.webp   256 px face crops

Usage: python scripts/import-sutemo-art.py MATURE.psd SUTEMO.psd
Needs: ImageMagick (convert, identify) and Pillow with WebP.
"""

import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "characters")

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
    },
    "rin": {  # accountant: dark bob, black glasses, turtleneck
        **MATURE,
        "hair": [20, 21], "front": [55, 95],
        "outfit": BLACK_KNIT,
        "emotions": {"neutral": 78, "happy": 76, "troubled": 80},
    },
    "mai": {  # parlor owner: long pink curls, rose dress, red rose
        **MATURE,
        "hair": [8, 21], "front": [73, 106],
        "outfit": ROSE_DRESS,
        "emotions": {"neutral": 87, "happy": 77, "troubled": 79},
    },
    "yuzu": {  # streamer: silver bob with side-swept bangs, choker, hoodie
        **SUTEMO,
        "hair": [21, 25], "front": [53, 72],
        "outfit": HOODIE,
        "emotions": {"neutral": 57, "happy": 67, "troubled": 64},
    },
    "reiko": {  # project manager: long dark hair, office suit with name tag
        **MATURE,
        "hair": [5, 21], "front": [70],
        "outfit": OFFICE,
        "emotions": {"neutral": 78, "happy": 87, "troubled": 89},
    },
    "nanami": {  # illustrator: long brown hair, winter coat with scarf
        **SUTEMO,
        "hair": [13, 25], "front": [55],
        "outfit": WINTER_S,
        "emotions": {"neutral": 59, "happy": 60, "troubled": 61},
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


def main() -> None:
    psds = sys.argv[1:3]
    if len(psds) != 2:
        sys.exit(__doc__)
    for hid, cfg in HEROINES.items():
        needed = set(cfg["hair"]) | set(cfg["nose"]) | set(cfg["front"]) | set(cfg["outfit"]) | set(cfg["emotions"].values())
        with tempfile.TemporaryDirectory() as tmp:
            layers = extract(psds[cfg["psd"]], needed, tmp)
            base = os.path.join(OUT, hid)
            shutil.rmtree(base, ignore_errors=True)
            os.makedirs(os.path.join(base, "emotions"), exist_ok=True)
            for emotion, expr in cfg["emotions"].items():
                img = face(sprite(cfg, layers, cfg["outfit"], expr, []), cfg["face"])
                img.save(os.path.join(base, "emotions", f"{emotion}.webp"), quality=90)
                if emotion == "neutral":
                    img.save(os.path.join(base, "portrait.webp"), quality=90)
        print(f"{hid}: done")


if __name__ == "__main__":
    main()
