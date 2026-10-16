"""Turn generated heroine art into the game's portrait files.

    python scripts/import-heroine-art.py <base-dir> <emotions-dir> [--pick id:emotion:N ...] [--preview out.jpg]

<base-dir> holds the chosen 832x1216 portraits as NN_<id>.png; <emotions-dir>
the img2img emotion renders as NN_<id>_<emotion>_<NNNNN>_.png (ComfyUI
naming). For every heroine and emotion one render is used (the first, or the
one given by --pick, e.g. --pick hikari:happy:3), its colours are matched to the
base portrait in Lab space (img2img washes them out), a square face crop is
cut out and saved as public/characters/<id>/emotions/<emotion>.webp (512 px).
portrait.webp is the neutral crop.

All art is AI-generated (Animagine XL 4.0, CreativeML Open RAIL++-M) from
text prompts; every heroine is an adult and is drawn as one.
"""
import argparse
import glob
import os
import re

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
EMOTIONS = ("neutral", "happy", "troubled")
SIZE = 512
# Crop centre (x, y) in the 832x1216 portrait (the nose, so the face sits in the
# middle of the round frame) and the crop's side.
CROP = {
    "hikari": (395, 360, 640),
    "nanami": (345, 290, 720),
    "yuzu": (395, 430, 640),
    "rin": (420, 320, 640),
    "mai": (420, 410, 640),
    "reiko": (455, 220, 460),
    "kaede": (385, 390, 640),
    "sora": (405, 390, 640),
    "akane": (460, 370, 640),
    "midori": (460, 360, 640),
    "yuki": (413, 270, 640),
    "tsukiko": (440, 410, 640),
}


def _srgb_to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def _lab_to_srgb(lab):
    fy = (lab[..., 0] + 16) / 116
    fx, fz = fy + lab[..., 1] / 500, fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f > 0.206893, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.95047, 1.0, 1.08883])
    m = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])
    c = np.clip(xyz @ m.T, 0, 1)
    c = np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(c * 255 + 0.5, 0, 255).astype(np.uint8)


def match_colours(img: Image.Image, ref: Image.Image) -> Image.Image:
    """Give img the per-channel Lab mean / spread of ref."""
    a = _srgb_to_lab(np.asarray(img.convert("RGB"), dtype=np.float64))
    b = _srgb_to_lab(np.asarray(ref.convert("RGB"), dtype=np.float64))
    for ch in range(3):
        a[..., ch] = (a[..., ch] - a[..., ch].mean()) / (a[..., ch].std() + 1e-6) * b[..., ch].std() + b[..., ch].mean()
    return Image.fromarray(_lab_to_srgb(a))


def crop(img: Image.Image, hid: str) -> Image.Image:
    cx, cy, side = CROP[hid]
    w, h = img.size
    x0 = min(max(cx - side // 2, 0), w - side)
    y0 = min(max(cy - side // 2, 0), h - side)
    return img.crop((x0, y0, x0 + side, y0 + side)).resize((SIZE, SIZE), Image.LANCZOS)


def renders(emo_dir, num, hid, emotion):
    pat = os.path.join(emo_dir, f"{num}_{hid}_{emotion}_*_.png")
    return sorted(glob.glob(pat), key=lambda p: int(re.search(r"_(\d+)_\.png$", p).group(1)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("emotions")
    ap.add_argument("--pick", action="append", default=[], help="id:emotion:N (render number)")
    ap.add_argument("--preview", help="write a contact sheet instead of the game files")
    ap.add_argument("--only", nargs="*", help="heroine ids")
    args = ap.parse_args()
    picks = {}
    for p in args.pick:
        hid, emo, n = p.split(":")
        picks[(hid, emo)] = int(n)

    rows = []
    for base in sorted(glob.glob(os.path.join(args.base, "*_*.png"))):
        num, hid = os.path.basename(base)[:-4].split("_", 1)
        if hid not in CROP or (args.only and hid not in args.only):
            continue
        ref = Image.open(base).convert("RGB")
        row = [crop(ref, hid)]
        out = {}
        for emo in EMOTIONS:
            files = renders(args.emotions, num, hid, emo)
            if args.preview:
                row += [crop(match_colours(Image.open(f), ref), hid) for f in files]
                continue
            n = picks.get((hid, emo))
            chosen = [f for f in files if n is None or f.endswith(f"_{n:05d}_.png")]
            if not chosen:
                raise SystemExit(f"{hid} {emo}: no render")
            out[emo] = crop(match_colours(Image.open(chosen[0]), ref), hid)
        rows.append((hid, row))
        if args.preview:
            continue
        d = os.path.join(ROOT, "public", "characters", hid)
        os.makedirs(os.path.join(d, "emotions"), exist_ok=True)
        for emo, im in out.items():
            im.save(os.path.join(d, "emotions", f"{emo}.webp"), quality=86, method=6)
        out["neutral"].save(os.path.join(d, "portrait.webp"), quality=86, method=6)
        print(hid, "ok")

    if args.preview:
        t = 200
        cols = max(len(r) for _, r in rows)
        sheet = Image.new("RGB", (cols * t, len(rows) * t), (24, 24, 28))
        for y, (_, row) in enumerate(rows):
            for x, im in enumerate(row):
                sheet.paste(im.resize((t, t)), (x * t, y * t))
        sheet.save(args.preview, quality=88)
        print("preview", args.preview)


if __name__ == "__main__":
    main()
