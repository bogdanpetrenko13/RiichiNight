#!/usr/bin/env python3
"""Builds the placeholder heroine art from the Ren'Py demo games.

Source: https://github.com/renpy/renpy (tutorial/ and the_question/).
Ren'Py's license states that the demo artwork is released by its copyright
holders under the same MIT terms as the engine, which allows reuse with the
copyright/permission notice kept (see public/characters/CREDITS.md).

What it produces, per heroine, in public/characters/<id>/:
  portrait.webp                 round-crop source (face), 256 px
  emotions/<emotion>.webp       same crop for each in-game emotion
  reward/stage<N>.webp          illustrative scene: a demo background with the
                                full sprite in a different expression

Usage: python scripts/import-renpy-art.py [renpy-commit]
Needs: git, Pillow with WebP support.
"""

import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

COMMIT = sys.argv[1] if len(sys.argv) > 1 else "80edccb125734ec9851b60b2f2b14d3f1f24eca6"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "characters")

T = "tutorial/game/images/"
Q = "the_question/game/images/"

# Heroine -> sprite files per emotion, face crop (centre x, centre y, size).
HEROINES = {
    "hikari": {
        "source": "Eileen (Ren'Py tutorial)",
        "emotions": {
            "neutral": T + "eileen happy.png",
            "happy": T + "eileen vhappy.png",
            "confident": T + "eileen vhappy.png",
            "surprised": T + "eileen concerned.png",
            "troubled": T + "eileen concerned.png",
        },
        "face": (160, 165, 270),
        "scenes": [T + "eileen happy.png", T + "eileen vhappy.png", T + "eileen concerned.png", T + "eileen vhappy.png"],
    },
    "rin": {
        "source": "Lucy (Ren'Py tutorial)",
        "emotions": {
            "neutral": T + "lucy happy.png",
            "happy": T + "lucy happy.png",
            "confident": T + "lucy happy.png",
            "surprised": T + "lucy mad.png",
            "troubled": T + "lucy mad.png",
        },
        "face": (205, 160, 260),
        "scenes": [T + "lucy happy.png", T + "lucy mad.png", T + "lucy happy.png", T + "lucy mad.png"],
    },
    "mai": {
        "source": "Sylvie, green outfit (Ren'Py \"The Question\")",
        "emotions": {
            "neutral": Q + "sylvie green normal.png",
            "happy": Q + "sylvie green giggle.png",
            "confident": Q + "sylvie green smile.png",
            "surprised": Q + "sylvie green surprised.png",
            "troubled": Q + "sylvie green surprised.png",
        },
        "face": (222, 150, 260),
        "scenes": [Q + "sylvie green smile.png", Q + "sylvie green surprised.png", Q + "sylvie green giggle.png", Q + "sylvie green normal.png"],
    },
    "yuzu": {
        "source": "Sylvie, blue outfit (Ren'Py \"The Question\")",
        "emotions": {
            "neutral": Q + "sylvie blue normal.png",
            "happy": Q + "sylvie blue giggle.png",
            "confident": Q + "sylvie blue smile.png",
            "surprised": Q + "sylvie blue surprised.png",
            "troubled": Q + "sylvie blue surprised.png",
        },
        "face": (165, 150, 260),
        "scenes": [Q + "sylvie blue giggle.png", Q + "sylvie blue surprised.png", Q + "sylvie blue smile.png", Q + "sylvie blue normal.png"],
    },
}

BACKGROUNDS = [Q + "bg club.jpg", Q + "bg uni.jpg", Q + "bg meadow.jpg", Q + "bg lecturehall.jpg"]
SCENE_W, SCENE_H = 900, 1200


def checkout() -> str:
    tmp = tempfile.mkdtemp(prefix="renpy-")
    run = lambda *a: subprocess.run(a, cwd=tmp, check=True, capture_output=True)  # noqa: E731
    run("git", "init", "-q")
    run("git", "remote", "add", "origin", "https://github.com/renpy/renpy.git")
    run("git", "config", "core.sparseCheckout", "true")
    with open(os.path.join(tmp, ".git", "info", "sparse-checkout"), "w") as f:
        f.write("tutorial/game/images/\nthe_question/game/images/\n")
    run("git", "fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", COMMIT)
    run("git", "checkout", "-q", "FETCH_HEAD")
    return tmp


def face(src: Image.Image, box) -> Image.Image:
    cx, cy, size = box
    crop = src.crop((cx - size // 2, cy - size // 2, cx + size // 2, cy + size // 2))
    return crop.resize((256, 256), Image.LANCZOS)


def scene(bg_path: str, sprite_path: str) -> Image.Image:
    bg = Image.open(bg_path).convert("RGB")
    # Cover-crop the 16:9 background to a 3:4 portrait frame.
    scale = SCENE_H / bg.height
    bg = bg.resize((round(bg.width * scale), SCENE_H), Image.LANCZOS)
    left = (bg.width - SCENE_W) // 2
    frame = bg.crop((left, 0, left + SCENE_W, SCENE_H)).filter(ImageFilter.GaussianBlur(2.5))
    sprite = Image.open(sprite_path).convert("RGBA")
    s = (SCENE_H * 0.92) / sprite.height
    sprite = sprite.resize((round(sprite.width * s), round(sprite.height * s)), Image.LANCZOS)
    frame = frame.convert("RGBA")
    frame.alpha_composite(sprite, ((SCENE_W - sprite.width) // 2, SCENE_H - sprite.height))
    # Soft vignette so the caption bar reads well.
    shade = Image.new("L", (SCENE_W, SCENE_H), 0)
    ImageDraw.Draw(shade).rectangle((0, int(SCENE_H * 0.78), SCENE_W, SCENE_H), fill=120)
    shade = shade.filter(ImageFilter.GaussianBlur(60))
    frame.alpha_composite(Image.merge("RGBA", (*(Image.new("L", shade.size, 0),) * 3, shade)))
    return frame.convert("RGB")


def main() -> None:
    src = checkout()
    for hid, cfg in HEROINES.items():
        base = os.path.join(OUT, hid)
        os.makedirs(os.path.join(base, "emotions"), exist_ok=True)
        os.makedirs(os.path.join(base, "reward"), exist_ok=True)
        for emotion, path in cfg["emotions"].items():
            img = face(Image.open(os.path.join(src, path)).convert("RGBA"), cfg["face"])
            img.save(os.path.join(base, "emotions", f"{emotion}.webp"), quality=88)
            if emotion == "neutral":
                img.save(os.path.join(base, "portrait.webp"), quality=88)
        for i, (bg, sprite) in enumerate(zip(BACKGROUNDS, cfg["scenes"]), start=1):
            img = scene(os.path.join(src, bg), os.path.join(src, sprite))
            img.save(os.path.join(base, "reward", f"stage{i}.webp"), quality=82)
        print(f"{hid}: {cfg['source']}")
    with open(os.path.join(OUT, "renpy.version"), "w") as f:
        f.write(COMMIT + "\n")


if __name__ == "__main__":
    main()
