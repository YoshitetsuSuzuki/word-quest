#!/usr/bin/env python3
# App Store用マーケティングスクショ生成: キャッチコピー＋ブランド背景＋端末フレーム
# 出力は正確に 1320x2868 px（iPhone 6.9インチ）
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE = "/Users/yoshitetsu/英単語資産アプリ/appstore-screenshots"
OUT = os.path.join(BASE, "enhanced")
os.makedirs(OUT, exist_ok=True)

W, H = 1320, 2868
JP = "/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc"

# ブランド配色（アプリのダーク＋アクセント紫/ティール）
TOP = (46, 40, 92)      # 上: 紫がかった濃紺
BOT = (13, 15, 30)      # 下: ほぼ黒紺
TEAL = (51, 224, 192)
WHITE = (245, 247, 255)
SUB = (176, 182, 214)

SHOTS = [
    ("01-home.png",    ["勉強じゃなく、ゲーム。", "だから、続く。"],      1),
    ("02-quiz.png",    ["4択でサクサク。", "発音まで聞ける。"],          1),
    ("03-ranking.png", ["世界と競って、", "もっと夢中に。"],            1),
    ("04-study.png",   ["英・中・韓ほか多言語。", "7,700語を制覇。"],    1),
]


def gradient(w, h, top, bot):
    base = Image.new("RGB", (w, h), top)
    grad = Image.new("L", (1, h))
    for y in range(h):
        grad.putpixel((0, y), int(255 * y / h))
    grad = grad.resize((w, h))
    return Image.composite(Image.new("RGB", (w, h), bot), base, grad)


def glow(img, cx, cy, radius, color, alpha):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(radius // 2))
    img.alpha_composite(layer)


def rounded(img, rad):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0], img.size[1]], radius=rad, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def draw_center(draw, cx, y, text, font, fill, stroke=0, stroke_fill=None):
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke)
    w = bbox[2] - bbox[0]
    draw.text((cx - w / 2 - bbox[0], y), text, font=font, fill=fill,
              stroke_width=stroke, stroke_fill=stroke_fill)
    return bbox[3] - bbox[1]


for fname, lines, _ in SHOTS:
    src = os.path.join(BASE, fname)
    if not os.path.exists(src):
        print("skip (not found):", fname); continue

    canvas = gradient(W, H, TOP, BOT).convert("RGBA")
    glow(canvas, W // 2, 120, 620, (108, 92, 231), 90)   # 上部に紫の光
    glow(canvas, W // 2, 2760, 520, (51, 224, 192), 40)  # 下部に淡いティール

    # --- キャッチコピー ---
    fh = ImageFont.truetype(JP, 108)
    d = ImageDraw.Draw(canvas)
    y = 150
    for i, ln in enumerate(lines):
        col = WHITE if i == 0 else TEAL
        h_line = draw_center(d, W // 2, y, ln, fh, col, stroke=3, stroke_fill=col)
        y += 150
    # アクセント下線
    d.rounded_rectangle([W // 2 - 70, y + 8, W // 2 + 70, y + 20], radius=6, fill=TEAL)

    # --- 端末スクショ（角丸＋影） ---
    shot = Image.open(src).convert("RGBA")
    dw = 902
    dh = int(dw * shot.size[1] / shot.size[0])
    shot = shot.resize((dw, dh), Image.LANCZOS)
    shot = rounded(shot, 76)

    dx = (W - dw) // 2
    dy = 690
    # 影
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([dx, dy + 26, dx + dw, dy + dh + 26], radius=76, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    canvas.alpha_composite(shadow)
    # 枠(細いライン)
    border = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle([dx - 3, dy - 3, dx + dw + 3, dy + dh + 3], radius=79, outline=(255, 255, 255, 40), width=3)
    canvas.alpha_composite(border)
    canvas.alpha_composite(shot, (dx, dy))

    out = os.path.join(OUT, fname)
    canvas.convert("RGB").save(out, "PNG")
    print("made:", out, canvas.size)

print("DONE")
