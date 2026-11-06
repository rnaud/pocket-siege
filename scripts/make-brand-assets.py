#!/usr/bin/env python3
"""Rebuild the share card and home-screen icons from the generated art."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "public" / "art"
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
LIME = "#d4e36c"
CORAL = "#e96e57"
PAPER = "#f2e8d2"
DARK = "#17383b"


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
    bg = cover(Image.open(ART / "paper-islands.webp"), (1200, 630), (0.5, 0.46))
    # Darken the left side so the type stays legible over the painted jungle.
    xs = np.arange(1200)[None, :].repeat(630, axis=0)
    alpha = np.clip(238 - (xs - 360) * 0.62, 0, 238).astype(np.uint8)
    shade = np.zeros((630, 1200, 4), np.uint8)
    shade[..., 0], shade[..., 1], shade[..., 2] = 17, 45, 48
    shade[..., 3] = alpha
    bg = Image.alpha_composite(bg.convert("RGBA"), Image.fromarray(shade, "RGBA"))

    moss = with_shadow(Image.open(ART / "moss-soldier-paper.webp").convert("RGBA").resize((350, 350), Image.LANCZOS))
    coral = with_shadow(Image.open(ART / "coral-soldier-paper.webp").convert("RGBA").resize((320, 320), Image.LANCZOS))
    bg.alpha_composite(moss, (660, 240))
    bg.alpha_composite(coral, (880, 290))

    d = ImageDraw.Draw(bg)
    title = ImageFont.truetype(FONT_BLACK, 86)
    tag = ImageFont.truetype(FONT, 22)
    body = ImageFont.truetype(FONT, 30)
    small = ImageFont.truetype(FONT, 16)
    spaced(d, (66, 92), "TINY TROOPS. BIG TROUBLE.", tag, LIME, 2)
    d.text((62, 128), "POCKET", font=title, fill=PAPER)
    d.text((62, 214), "SIEGE", font=title, fill=CORAL)
    d.text((66, 330), "Pick your angle.", font=body, fill=PAPER)
    d.text((66, 368), "Make a little chaos.", font=body, fill=PAPER)
    spaced(d, (66, 470), "CUT-PAPER ISLAND  ·  5 WEAPONS  ·  SOLO OR PASS & PLAY", small, "#e7dcc0", 1)
    d.rounded_rectangle((62, 520, 320, 574), radius=5, fill=LIME, outline=DARK, width=2)
    d.text((82, 534), "PLAY IN BROWSER", font=tag, fill=DARK)
    out = ART / "og-card.png"
    bg.convert("RGB").save(out, "PNG", optimize=True)
    print(out, bg.size)


def icon():
    size = 512
    # Paper seal on a deep-teal shadow box.
    canvas = Image.new("RGBA", (size, size), (15, 51, 55, 255))
    paper = Image.new("RGBA", (size, size), (242, 232, 210, 255))
    grain = Image.open(ART / "paper-grain.webp").convert("RGB").resize((size, size), Image.LANCZOS)
    paper = Image.composite(paper, grain.convert("RGBA"), Image.new("L", (size, size), 210))
    canvas.alpha_composite(paper)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((18, 18, size - 18, size - 18), radius=72, outline=(23, 56, 59, 255), width=8)
    badge = Image.open(ART / "paper-emblem.webp").convert("RGBA")
    badge.thumbnail((380, 380), Image.LANCZOS)
    canvas.alpha_composite(badge, ((size - badge.width) // 2, (size - badge.height) // 2))
    canvas.convert("RGB").save(ART / "icon-512.png", "PNG", optimize=True)
    for px, name in [(192, "icon-192.png"), (180, "apple-touch-icon.png"), (64, "favicon.png")]:
        canvas.convert("RGB").resize((px, px), Image.LANCZOS).save(ART / name, "PNG", optimize=True)
    print("icons written")


if __name__ == "__main__":
    share_card()
    icon()
