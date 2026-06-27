#!/usr/bin/env python3
"""こっこナビ リッチメニュー画像生成（2500x1686, 3列x2行の6ボタン）"""
from PIL import Image, ImageDraw, ImageFont

W, H = 2500, 1686
COL = W // 3            # 833
ROW = H // 2            # 843
PEACH = (255, 140, 97)       # #FF8C61
PEACH_DK = (235, 110, 70)
PEACH_LT = (255, 241, 234)   # #FFF1EA
WARM = (255, 249, 245)
GRAY = (90, 90, 90)
LINE = (240, 224, 214)
WHITE = (255, 255, 255)

FONT_PATH = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
label_font = ImageFont.truetype(FONT_PATH, 92)

img = Image.new("RGB", (W, H), WHITE)
d = ImageDraw.Draw(img)

# セル背景（交互に淡いピーチ/ウォームで区切り感）
cells = [
    (0, 0, "支援情報を探す", "search"),
    (1, 0, "診断", "compass"),
    (2, 0, "公式Webサイト", "globe"),
    (0, 1, "質問・相談", "chat"),
    (1, 1, "プロフィール変更", "person"),
    (2, 1, "よくある質問", "faq"),
]

def cell_bg(ci, ri):
    # 診断セルだけ目立たせる（淡いピーチ）
    if (ci, ri) == (1, 0):
        return PEACH_LT
    return WHITE if (ci + ri) % 2 == 0 else WARM

def center_text(cx, cy, text, font, fill):
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1]), text, font=font, fill=fill)

def icon(kind, cx, cy, accent):
    r = 92
    lw = 16
    if kind == "search":
        d.ellipse([cx-r, cy-r-10, cx+r-30, cy+r-40], outline=accent, width=lw)
        d.line([cx+r-55, cy+r-65, cx+r+10, cy+r], fill=accent, width=lw+4)
    elif kind == "compass":
        d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent, width=lw)
        # 針（ひし形）
        d.polygon([(cx, cy-55), (cx+30, cy), (cx, cy+55), (cx-30, cy)], outline=accent, width=10)
        d.ellipse([cx-12, cy-12, cx+12, cy+12], fill=accent)
    elif kind == "globe":
        d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent, width=lw)
        d.line([cx-r, cy, cx+r, cy], fill=accent, width=lw)
        d.line([cx, cy-r, cx, cy+r], fill=accent, width=lw)
        d.arc([cx-r//2, cy-r, cx+r//2, cy+r], 0, 360, fill=accent, width=lw)
    elif kind == "chat":
        d.rounded_rectangle([cx-r, cy-r+10, cx+r, cy+r-30], radius=40, outline=accent, width=lw)
        d.polygon([(cx-30, cy+r-30), (cx-30, cy+r+20), (cx+25, cy+r-30)], fill=accent)
        for dy in (-25, 25):
            d.line([cx-45, cy+dy-15, cx+45, cy+dy-15], fill=accent, width=12)
    elif kind == "person":
        d.ellipse([cx-50, cy-r, cx+50, cy-r+100], outline=accent, width=lw)
        d.arc([cx-r, cy-10, cx+r, cy+r+90], 180, 360, fill=accent, width=lw)
    elif kind == "faq":
        d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent, width=lw)
        center_text(cx, cy-6, "?", ImageFont.truetype(FONT_PATH, 150), accent)

# 描画
for ci, ri, label, kind in cells:
    x0, y0 = ci * COL, ri * ROW
    x1, y1 = x0 + COL, y0 + ROW
    accent = PEACH
    d.rectangle([x0, y0, x1, y1], fill=cell_bg(ci, ri))
    cx = x0 + COL // 2
    icon(kind, cx, y0 + ROW // 2 - 70, accent if (ci, ri) != (1, 0) else PEACH_DK)
    center_text(cx, y0 + ROW - 150, label, label_font, GRAY if (ci, ri) != (1, 0) else PEACH_DK)

# グリッド線
for ci in (1, 2):
    d.line([ci * COL, 0, ci * COL, H], fill=LINE, width=6)
d.line([0, ROW, W, ROW], fill=LINE, width=6)

img.save("/home/user/kokkoNavi/richmenu.png")
print("saved richmenu.png", img.size)
