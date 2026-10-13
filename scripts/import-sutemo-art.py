#!/usr/bin/env python3
"""Builds two heroines from Sutemo's layered sprite PSDs (itch.io).

Sources (downloaded by the user, not stored in this repo):
  Anime_Mature_Woman_Free.psd   https://sutemo.itch.io/female-mature-anime-sprite
  Female_Sprite_by_Sutemo.psd   https://sutemo.itch.io/female-character

Terms (author's page): usable in personal and commercial projects; the
sprite may not be resold or redistributed on its own (including as a
character creator). So only flattened, finished images are committed here,
never the PSDs or separate layers. See public/characters/CREDITS.md.

Only adult outfits are used (office, casual, winter, summer dress, hoodie);
the PSDs' school/PE uniforms, swimsuits, towel and pajama layers are never
composed.

Output per heroine in public/characters/<id>/:
  portrait.webp, emotions/<emotion>.webp   256 px face crops
  reward/stage1..4.webp                    900x1200 scenes, fully clothed

Usage: python scripts/import-sutemo-art.py MATURE.psd SUTEMO.psd
Needs: ImageMagick (convert, identify) and Pillow with WebP.
"""

import os
import random
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "characters")
SCENE_W, SCENE_H = 900, 1200

# Layer numbers are ImageMagick PSD indices (identify FILE.psd), bottom to top.
HEROINES = {
    "reiko": {
        "psd": 0,
        "size": (1736, 1440),
        # Dark long hair (hime back + middle-part front), office suit + name tag.
        "base": [5, 21],
        "front": [92, 93, 70],
        "outfit": [26, 30],
        "emotions": {"neutral": 78, "happy": 83, "confident": 87, "surprised": 79, "troubled": 80},
        "face": (870, 625, 600),
        # (outfit layers, expression, extra layers drawn on top of the face)
        "scenes": [
            ([26, 30], 76, []),
            ([29], 83, []),
            ([33], 87, []),
            ([34], 77, [22, 107]),
        ],
        "palette": [("#1b1430", "#4b2a6b"), ("#14213d", "#5b3a7a"), ("#221a3a", "#7a3a5e"), ("#2a1630", "#b8577a")],
    },
    "nanami": {
        "psd": 1,
        "size": (1011, 1145),
        # Brown long hair with side-swept bangs, hoodie.
        "base": [13, 25],
        "front": [55],
        "outfit": [33],
        "emotions": {"neutral": 59, "happy": 60, "confident": 63, "surprised": 58, "troubled": 61},
        "face": (505, 430, 540),
        "scenes": [
            ([33], 57, []),
            ([35], 67, []),
            ([30], 66, [71]),
            ([30], 60, [26, 71]),
        ],
        "palette": [("#101a33", "#2f5d8a"), ("#16213e", "#5b7bb5"), ("#1f2b3a", "#3fa58f"), ("#2a1a33", "#d0679a")],
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


def sprite(cfg: dict, layers: dict, outfit, expression: int, extra) -> Image.Image:
    w, h = cfg["size"]
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    order = cfg["base"] + list(outfit) + [expression] + cfg["front"] + list(extra)
    for n in order:
        img, x, y = layers[n]
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
        needed = set(cfg["base"]) | set(cfg["front"]) | set(cfg["outfit"]) | set(cfg["emotions"].values())
        for outfit, expr, extra in cfg["scenes"]:
            needed |= set(outfit) | {expr} | set(extra)
        with tempfile.TemporaryDirectory() as tmp:
            layers = extract(psds[cfg["psd"]], needed, tmp)
            base = os.path.join(OUT, hid)
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
