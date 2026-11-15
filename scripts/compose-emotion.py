"""Composite an expression render through a reviewed grayscale feature mask.

White allows edits; black preserves the base. Inputs must have equal square
dimensions. Resizing precedes compositing so pixels outside the final mask
remain identical to the resized base, even along resampling boundaries.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageChops


def compose(base, render, mask):
    if base.size != render.size or base.size != mask.size or base.width != base.height:
        raise ValueError("Base, render and mask must have equal square dimensions")
    base = base.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    render = render.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    mask = mask.convert("L").resize((512, 512), Image.Resampling.NEAREST)
    if mask.getextrema() != (0, 255):
        raise ValueError("Mask must include black protected and white editable pixels")
    result = Image.composite(render, base, mask)
    protected = mask.point(lambda p: 255 if p == 0 else 0)
    difference = ImageChops.difference(result, base)
    assert Image.composite(difference, Image.new("RGB", base.size), protected).getbbox() is None
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ("base", "render", "mask", "output"):
        ap.add_argument(name, type=Path)
    args = ap.parse_args()
    if args.output.exists():
        ap.error("Output already exists; use a new review filename")
    result = compose(Image.open(args.base), Image.open(args.render), Image.open(args.mask))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output, format="WEBP", lossless=True, method=6)
    with Image.open(args.output) as saved:
        assert ImageChops.difference(saved.convert("RGB"), result).getbbox() is None
    print(args.output)


if __name__ == "__main__":
    main()
