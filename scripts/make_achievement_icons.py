#!/usr/bin/env python3
# Game Center 実績アイコン生成（1024x1024・ブランド配色・透過なし）
# App Store Connect の実績画像要件: 正方形・512px以上・RGB・透過不可
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "/Users/yoshitetsu/英単語資産アプリ/appstore-screenshots/achievements"
os.makedirs(OUT, exist_ok=True)
JP = "/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc"

S = 1024
TOP = (46, 40, 92)
BOT = (13, 15, 30)
TEAL = (51, 224, 192)
GOLD = (255, 205, 90)
WHITE = (245, 247, 255)

# (ファイル名, 絵文字風の大きな記号, 下段ラベル, アクセント色)
ITEMS = [
    ("correct100.png", "100", "正解", TEAL),
    ("correct1000.png", "1000", "正解", GOLD),
    ("streak7.png", "7", "日連続", TEAL),
    ("streak30.png", "30", "日連続", GOLD),
]


def gradient(w, h, top, bot):
    base = Image.new("RGB", (w, h), top)
    grad = Image.new("L", (1, h))
    for y in range(h):
        grad.putpixel((0, y), int(255 * y / h))
    grad = grad.resize((w, h))
    return Image.composite(Image.new("RGB", (w, h), bot), base, grad)


def glow(img, cx, cy, r, color, a):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (a,))
    layer = layer.filter(ImageFilter.GaussianBlur(r // 2))
    img.alpha_composite(layer)


def center(d, cx, y, text, font, fill):
    b = d.textbbox((0, 0), text, font=font)
    w = b[2] - b[0]
    d.text((cx - w / 2 - b[0], y), text, font=font, fill=fill)
    return b[3] - b[1]


for fname, big, label, accent in ITEMS:
    img = gradient(S, S, TOP, BOT).convert("RGBA")
    glow(img, S // 2, int(S * 0.42), int(S * 0.42), accent, 70)
    d = ImageDraw.Draw(img)
    # 星マーク（絵文字は丸ゴフォントで文字化けするため★を使用）
    fstar = ImageFont.truetype(JP, 130)
    center(d, S // 2, int(S * 0.12), "★", fstar, accent)
    # 大きな数字
    fbig = ImageFont.truetype(JP, 290)
    center(d, S // 2, int(S * 0.33), big, fbig, WHITE)
    # ラベル
    flabel = ImageFont.truetype(JP, 120)
    center(d, S // 2, int(S * 0.70), label, flabel, accent)
    # 枠線
    d.rounded_rectangle([16, 16, S - 16, S - 16], radius=90, outline=accent + (140,), width=10)
    img.convert("RGB").save(os.path.join(OUT, fname), "PNG")
    print("made:", fname)

print("DONE ->", OUT)
