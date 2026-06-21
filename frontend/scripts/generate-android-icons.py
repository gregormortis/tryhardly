#!/usr/bin/env python3
"""Generate Android launcher icons from the TryHardly brand asset.

Replaces the default Capacitor/Android-Studio placeholder launcher icons with
the TryHardly brand mark (amber "TH" on a zinc-950 background), reusing the same
brand art as the PWA icons in public/icons so the app icon matches everywhere.

Outputs into frontend/android/app/src/main/res:
  - mipmap-<dpi>/ic_launcher.png        (legacy square)
  - mipmap-<dpi>/ic_launcher_round.png  (legacy round)
  - mipmap-<dpi>/ic_launcher_foreground.png  (adaptive foreground, transparent)

The adaptive background color is set in values/ic_launcher_background.xml to the
brand dark (#09090b); this script only writes the raster assets.

Run from the frontend/ directory:
  python3 scripts/generate-android-icons.py
"""
import os
from PIL import Image, ImageDraw

BG = (9, 9, 11, 255)  # zinc-950 #09090b

HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.normpath(os.path.join(HERE, ".."))
SRC = os.path.join(FRONTEND, "public", "icons", "icon-512.png")
RES = os.path.join(FRONTEND, "android", "app", "src", "main", "res")

# Legacy square/round icon pixel sizes per density.
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# Adaptive foreground sizes per density (full 108dp tile).
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def _load_glyph():
    """Brand mark trimmed to its content, on transparent, for compositing."""
    img = Image.open(SRC).convert("RGBA")
    # The source is the amber "TH" mark on a dark rounded tile. For the adaptive
    # foreground we want just the mark on transparent, so the tile doesn't double
    # up over the adaptive background. Make near-black pixels transparent.
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r < 40 and g < 40 and b < 40:
                px[x, y] = (r, g, b, 0)
    return img.getbbox() and img.crop(img.getbbox()) or img


def _rounded_square(size, content, radius_ratio=0.18):
    """Brand-dark rounded square with the mark centered — legacy launcher icon."""
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tile = Image.new("RGBA", (size, size), BG)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    base.paste(tile, (0, 0), mask)
    _center(base, content, scale=0.62)
    return base


def _round_icon(size, content):
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tile = Image.new("RGBA", (size, size), BG)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    base.paste(tile, (0, 0), mask)
    _center(base, content, scale=0.58)
    return base


def _foreground(size, content):
    # Adaptive foreground must keep the mark inside the ~66% safe zone so the
    # launcher's mask (circle/squircle/etc.) never clips it.
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    _center(base, content, scale=0.46)
    return base


def _center(base, content, scale):
    size = base.size[0]
    target = int(size * scale)
    cw, ch = content.size
    ratio = min(target / cw, target / ch)
    new = content.resize((max(1, int(cw * ratio)), max(1, int(ch * ratio))), Image.LANCZOS)
    base.alpha_composite(new, ((size - new.size[0]) // 2, (size - new.size[1]) // 2))


def main():
    glyph = _load_glyph()
    for dpi, size in LEGACY.items():
        out = os.path.join(RES, f"mipmap-{dpi}")
        os.makedirs(out, exist_ok=True)
        _rounded_square(size, glyph).save(os.path.join(out, "ic_launcher.png"))
        _round_icon(size, glyph).save(os.path.join(out, "ic_launcher_round.png"))
    for dpi, size in FOREGROUND.items():
        out = os.path.join(RES, f"mipmap-{dpi}")
        os.makedirs(out, exist_ok=True)
        _foreground(size, glyph).save(os.path.join(out, "ic_launcher_foreground.png"))
    print("Android launcher icons regenerated from", os.path.relpath(SRC, FRONTEND))


if __name__ == "__main__":
    main()
