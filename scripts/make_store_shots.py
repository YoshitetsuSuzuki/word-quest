#!/usr/bin/env python3
# App Store用マーケティングスクショ生成: キャッチコピー＋ブランド背景＋端末フレーム
# 出力は正確に 1320x2868 px（iPhone 6.9インチ）
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE = "/Users/yoshitetsu/英単語資産アプリ/appstore-screenshots"
OUT = os.path.join(BASE, "enhanced")
os.makedirs(OUT, exist_ok=True)

# 出力サイズ: (接尾辞, 幅, 高さ)。6.9=1320x2868 / 6.5=1284x2778
SIZES = [("6.9", 1320, 2868), ("6.5", 1284, 2778)]
JP = "/System/Library/Fonts/ヒラギノ丸ゴ ProN W4.ttc"

# ブランド配色（アプリのダーク＋アクセント紫/ティール）
TOP = (46, 40, 92)      # 上: 紫がかった濃紺
BOT = (13, 15, 30)      # 下: ほぼ黒紺
TEAL = (51, 224, 192)
WHITE = (245, 247, 255)
SUB = (176, 182, 214)

# 独自性(4.3対策)を先頭に。ペット育成・冒険マップ・協力レイド・週次リーグを前面へ。
# コピーは「フック＋ベネフィット」の二段で刺す(元の「勉強じゃなく、ゲーム。/だから、続く。」の系譜)。
SHOTS = [
    ("u1-pet.png",    ["相棒がいれば、続く。", "育てて覚える、英単語。"],   1),
    ("u2-world.png",  ["単語が、冒険になる。", "地図を旅して世界制覇。"],   1),
    ("u3-raid.png",   ["勉強を、ひとりにしない。", "仲間とボスに挑む。"],   1),
    ("u4-league.png", ["今週、何位になれる？", "世界と競う週替りリーグ。"], 1),
    ("u5-quiz.png",   ["4択で、サクサク。", "発音まで、聞ける。"],         1),
    ("u6-study.png",  ["英・中・韓ほか10言語。", "29,000語、全部検証済み。"], 1),
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


def render(src, lines, W, H):
    s = W / 1320.0  # 1320基準からの拡大率（幅で比例スケール）
    canvas = gradient(W, H, TOP, BOT).convert("RGBA")
    # 奥行きのある光: 上に紫の主光、端末肩に紫の弱光、下にティールの受け光
    glow(canvas, W // 2, int(120 * s), int(680 * s), (124, 104, 255), 95)
    glow(canvas, int(W * 0.78), int(760 * s), int(440 * s), (108, 92, 231), 55)
    glow(canvas, W // 2, H - int(96 * s), int(560 * s), (51, 224, 192), 48)

    # --- キャッチコピー（ソフトシャドウで浮かせる） ---
    fh = ImageFont.truetype(JP, int(108 * s))
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    y = int(150 * s)
    for ln in lines:
        draw_center(sd, W // 2 + int(2 * s), y + int(7 * s), ln, fh, (0, 0, 0, 170))
        y += int(150 * s)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(int(11 * s)))
    canvas.alpha_composite(shadow_layer)

    d = ImageDraw.Draw(canvas)
    y = int(150 * s)
    for i, ln in enumerate(lines):
        col = WHITE if i == 0 else TEAL
        draw_center(d, W // 2, y, ln, fh, col, stroke=2, stroke_fill=col)
        y += int(150 * s)
    d.rounded_rectangle([W // 2 - int(76 * s), y + int(8 * s), W // 2 + int(76 * s), y + int(21 * s)], radius=int(7 * s), fill=TEAL)

    # --- 端末スクショ（角丸＋影） ---
    shot = Image.open(src).convert("RGBA")
    dw = int(902 * s)
    dh = int(dw * shot.size[1] / shot.size[0])
    shot = shot.resize((dw, dh), Image.LANCZOS)
    rad = int(76 * s)
    shot = rounded(shot, rad)

    dx = (W - dw) // 2
    dy = int(690 * s)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([dx, dy + int(26 * s), dx + dw, dy + dh + int(26 * s)], radius=rad, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(40 * s)))
    canvas.alpha_composite(shadow)
    border = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle([dx - 3, dy - 3, dx + dw + 3, dy + dh + 3], radius=rad + 3, outline=(255, 255, 255, 40), width=3)
    canvas.alpha_composite(border)
    canvas.alpha_composite(shot, (dx, dy))
    return canvas.convert("RGB")


for fname, lines, _ in SHOTS:
    src = os.path.join(BASE, fname)
    if not os.path.exists(src):
        print("skip (not found):", fname); continue
    stem, ext = os.path.splitext(fname)
    for label, w, h in SIZES:
        # 6.9はそのまま(01-home.png)、6.5は名前に明示(01-home_6.5inch.png)
        out_name = fname if label == "6.9" else f"{stem}_6.5inch{ext}"
        out = os.path.join(OUT, out_name)
        render(src, lines, w, h).save(out, "PNG")
        print("made:", out_name, f"({w}x{h})")

print("DONE")
