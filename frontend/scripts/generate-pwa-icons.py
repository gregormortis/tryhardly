#!/usr/bin/env python3
"""Generate TryHardly PWA icons (dark + amber brand) using Pillow.

Outputs into frontend/public:
  - icons/icon-192.png, icons/icon-512.png        (any-purpose, rounded square)
  - icons/icon-192-maskable.png, icons/icon-512-maskable.png  (full-bleed, safe-zone padded)
  - apple-touch-icon.png (180x180, opaque, no transparency for iOS)
  - favicon-32.png, favicon-16.png

Run from the frontend/ directory:
  python3 scripts/generate-pwa-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

BG = (9, 9, 11)          # zinc-950  #09090b
AMBER = (245, 158, 11)   # amber-500 #f59e0b
AMBER_DK = (180, 83, 9)  # amber-700 #b45309
TEXT = (245, 158, 11)

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.normpath(os.path.join(HERE, "..", "public"))
ICONS = os.path.join(PUBLIC, "icons")
os.makedirs(ICONS, exist_ok=True)

# Render at high resolution then downscale for crisp anti-aliased edges.
SS = 4


def _load_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _draw_monogram(size, *, radius_ratio, pad_ratio, opaque_bg):
    """Draw the brand tile at `size` px. Returns an RGBA image."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(big * pad_ratio)
    box = [pad, pad, big - pad, big - pad]
    radius = int((box[2] - box[0]) * radius_ratio)

    # Background tile (rounded square).
    draw.rounded_rectangle(box, radius=radius, fill=BG if opaque_bg else BG)

    # Amber border ring for brand pop.
    ring = max(2, int(big * 0.012))
    draw.rounded_rectangle(box, radius=radius, outline=AMBER_DK, width=ring)

    # "TH" monogram, centered.
    inner_h = box[3] - box[1]
    font = _load_font(int(inner_h * 0.46))
    text = "TH"
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    tw, th = r - l, b - t
    cx = (box[0] + box[2]) / 2
    cy = (box[1] + box[3]) / 2
    tx = cx - tw / 2 - l
    ty = cy - th / 2 - t
    draw.text((tx, ty), text, font=font, fill=TEXT)

    # Accent underline bar beneath the monogram.
    bar_w = int(tw * 0.9)
    bar_h = max(3, int(inner_h * 0.05))
    bar_y = int(ty + th + inner_h * 0.06)
    bx0 = int(cx - bar_w / 2)
    draw.rounded_rectangle(
        [bx0, bar_y, bx0 + bar_w, bar_y + bar_h],
        radius=bar_h // 2,
        fill=AMBER,
    )

    return img.resize((size, size), Image.LANCZOS)


def save_any(size):
    """App icon: rounded square with transparent corners."""
    img = _draw_monogram(size, radius_ratio=0.22, pad_ratio=0.0, opaque_bg=False)
    out = os.path.join(ICONS, f"icon-{size}.png")
    img.save(out)
    return out


def save_maskable(size):
    """Maskable: full-bleed opaque bg, content within ~80% safe zone."""
    big = size * SS
    base = Image.new("RGBA", (big, big), BG + (255,))
    tile = _draw_monogram(size, radius_ratio=0.0, pad_ratio=0.12, opaque_bg=True)
    tile = tile.resize((big, big), Image.LANCZOS)
    base.alpha_composite(tile)
    img = base.resize((size, size), Image.LANCZOS).convert("RGB")
    out = os.path.join(ICONS, f"icon-{size}-maskable.png")
    img.save(out)
    return out


def save_apple():
    """Apple touch icon must be opaque (no alpha) at 180x180."""
    img = _draw_monogram(180, radius_ratio=0.0, pad_ratio=0.0, opaque_bg=True)
    img = img.convert("RGB")
    out = os.path.join(PUBLIC, "apple-touch-icon.png")
    img.save(out)
    return out


def save_favicon(size):
    img = _draw_monogram(size, radius_ratio=0.22, pad_ratio=0.0, opaque_bg=False)
    out = os.path.join(PUBLIC, f"favicon-{size}.png")
    img.save(out)
    return out


if __name__ == "__main__":
    written = [
        save_any(192),
        save_any(512),
        save_maskable(192),
        save_maskable(512),
        save_apple(),
        save_favicon(32),
        save_favicon(16),
    ]
    for w in written:
        print("wrote", os.path.relpath(w, PUBLIC))
