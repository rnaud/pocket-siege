#!/usr/bin/env python3
"""Rebuild the share card and home-screen icons from the generated art."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "public" / "art"
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
LIME = "#c3eb87"
DARK = "#0d1d24"


def cover(image, size, centering=(0.5, 0.5)):
    return ImageOps.fit(image.convert("RGB"), size, Image.LANCZOS, centering=centering)


def with_shadow(subject, blur=18, offset=(0, 12), opacity=150):
    pad = blur * 3
    canvas = Image.new("RGBA", (subject.width + pad * 2, subject.height + pad * 2), (0, 0, 0, 0))
    alpha = subject.getchannel("A").point(lambda v: int(v * opacity / 255))
    shadow = Image.new("RGBA", subject.size, (3, 12, 15, 255))
    shadow.putalpha(alpha)
    canvas.alpha_composite(shadow, (pad + offset[0], pad + offset[1]))
    canvas.alpha_composite(subject, (pad, pad))
    return canvas


def spaced(draw, xy, text, font, fill, spacing=2):
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + spacing


def share_card():
    bg = cover(Image.open(ART / "fern-islands.webp"), (1200, 630), (0.5, 0.42))
    # Darken the left side so the type stays legible over the painted jungle.
    xs = np.arange(1200)[None, :].repeat(630, axis=0)
    alpha = np.clip(238 - (xs - 360) * 0.62, 0, 238).astype(np.uint8)
    shade = np.zeros((630, 1200, 4), np.uint8)
    shade[..., 0], shade[..., 1], shade[..., 2] = 9, 26, 32
    shade[..., 3] = alpha
    bg = Image.alpha_composite(bg.convert("RGBA"), Image.fromarray(shade, "RGBA"))

    moss = with_shadow(Image.open(ART / "moss-soldier.webp").convert("RGBA").resize((330, 330), Image.LANCZOS))
    coral = with_shadow(Image.open(ART / "coral-soldier.webp").convert("RGBA").resize((300, 300), Image.LANCZOS))
    bg.alpha_composite(moss, (660, 240))
    bg.alpha_composite(coral, (880, 290))

    d = ImageDraw.Draw(bg)
    title = ImageFont.truetype(FONT_BLACK, 86)
    tag = ImageFont.truetype(FONT, 22)
    body = ImageFont.truetype(FONT, 30)
    small = ImageFont.truetype(FONT, 16)
    spaced(d, (66, 92), "TINY TROOPS. BIG TROUBLE.", tag, LIME, 2)
    d.text((62, 128), "POCKET", font=title, fill="#f5f7e9")
    d.text((62, 214), "SIEGE", font=title, fill=LIME)
    d.text((66, 330), "Pick your angle.", font=body, fill="#f5f7e9")
    d.text((66, 368), "Make a little chaos.", font=body, fill="#f5f7e9")
    spaced(d, (66, 470), "DESTRUCTIBLE ISLAND  ·  4 WEAPONS  ·  SOLO OR PASS & PLAY", small, "#d7e6c6", 1)
    d.rounded_rectangle((62, 520, 300, 574), radius=8, fill="#c3eb87")
    d.text((82, 534), "PLAY IN BROWSER", font=tag, fill="#20352a")
    out = ART / "og-card.png"
    bg.convert("RGB").save(out, "PNG", optimize=True)
    print(out, bg.size)


def icon():
    size = 512
    y = np.arange(size)[:, None].repeat(size, axis=1)
    t = (y / (size - 1))[:, :, None]
    top = np.array([27, 54, 52], dtype=float)
    bottom = np.array([8, 22, 28], dtype=float)
    rgb = (top * (1 - t) + bottom * t).astype(np.uint8)
    canvas = Image.fromarray(rgb, "RGB").convert("RGBA")
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((70, 70, 442, 442), fill=(195, 235, 135, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(24))
    canvas.alpha_composite(glow)
    d = ImageDraw.Draw(canvas)
    d.ellipse((92, 92, 420, 420), outline=(195, 235, 135, 210), width=10)
    d.ellipse((112, 112, 400, 400), outline=(195, 235, 135, 70), width=2)
    soldier = Image.open(ART / "moss-soldier.webp").convert("RGBA").resize((300, 300), Image.LANCZOS)
    soldier = with_shadow(soldier, blur=14, offset=(0, 10), opacity=170)
    canvas.alpha_composite(soldier, (106, 120))
    canvas.convert("RGB").save(ART / "icon-512.png", "PNG", optimize=True)
    for px, name in [(192, "icon-192.png"), (180, "apple-touch-icon.png")]:
        canvas.convert("RGB").resize((px, px), Image.LANCZOS).save(ART / name, "PNG", optimize=True)
    print("icons written")


if __name__ == "__main__":
    share_card()
    icon()
