#!/usr/bin/env python3
"""Imports the public-domain (CC0) riichi tile faces by FluffyStuff.

Source: https://github.com/FluffyStuff/riichi-mahjong-tiles
License: CC0 1.0 (public domain), see public/tiles/LICENSE.md.

Copies the Regular and Black face SVGs into public/tiles/{regular,black}/,
stripping Inkscape metadata so each file is small. The tile body (bone,
edge, back) is still drawn by CSS, the SVG is only the face.

Usage: python scripts/import-tiles.py [commit]
"""

import os
import re
import subprocess
import sys
import tempfile

COMMIT = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "public", "tiles")

FACES = (
    [f"Man{i}" for i in range(1, 10)]
    + [f"Pin{i}" for i in range(1, 10)]
    + [f"Sou{i}" for i in range(1, 10)]
    + ["Man5-Dora", "Pin5-Dora", "Sou5-Dora", "Ton", "Nan", "Shaa", "Pei", "Haku", "Hatsu", "Chun"]
)


SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"


def clean(svg: str) -> str:
    """Drops editor-only elements/attributes (Inkscape, Sodipodi, RDF metadata)."""
    import xml.etree.ElementTree as ET

    ET.register_namespace("", SVG_NS)
    ET.register_namespace("xlink", XLINK_NS)
    root = ET.fromstring(svg.encode("utf-8"))
    keep_ns = (f"{{{SVG_NS}}}", f"{{{XLINK_NS}}}")

    def walk(el):
        for child in list(el):
            tag = child.tag if isinstance(child.tag, str) else ""
            if not tag.startswith(f"{{{SVG_NS}}}") or tag == f"{{{SVG_NS}}}metadata":
                el.remove(child)
                continue
            walk(child)
        for attr in list(el.attrib):
            if attr.startswith("{") and not attr.startswith(keep_ns):
                del el.attrib[attr]

    walk(root)
    out = ET.tostring(root, encoding="unicode")
    return re.sub(r">\s+<", "><", out).strip() + "\n"


# Winds are drawn in black ink (FluffyStuff draws them blue).
WINDS = ("Ton", "Nan", "Shaa", "Pei")
WIND_BLUES = ("#142896", "#19328c")


def recolor_wind(svg: str) -> str:
    for blue in WIND_BLUES:
        svg = re.sub(blue, "#1a1a1a", svg, flags=re.I)
    return svg


def main() -> None:
    tmp = tempfile.mkdtemp(prefix="tiles-")
    subprocess.run(
        ["git", "clone", "-q", "--depth", "1", "https://github.com/FluffyStuff/riichi-mahjong-tiles", tmp],
        check=True,
    )
    if COMMIT != "HEAD":
        subprocess.run(["git", "-C", tmp, "fetch", "-q", "--depth", "1", "origin", COMMIT], check=True)
        subprocess.run(["git", "-C", tmp, "checkout", "-q", "FETCH_HEAD"], check=True)
    sha = subprocess.run(["git", "-C", tmp, "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout
    for variant, folder in (("regular", "Regular"), ("black", "Black")):
        os.makedirs(os.path.join(OUT, variant), exist_ok=True)
        for name in FACES:
            with open(os.path.join(tmp, folder, f"{name}.svg"), encoding="utf-8") as f:
                svg = clean(f.read())
            if variant == "regular" and name in WINDS:
                svg = recolor_wind(svg)
            with open(os.path.join(OUT, variant, f"{name}.svg"), "w", encoding="utf-8") as f:
                f.write(svg)
    with open(os.path.join(OUT, "fluffystuff.version"), "w") as f:
        f.write(sha)
    print(f"{len(FACES) * 2} faces -> public/tiles (FluffyStuff @ {sha.strip()[:10]})")


if __name__ == "__main__":
    main()
