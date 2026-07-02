from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src-tauri" / "icons" / "previews"
SIZE = 512


def gradient(stops: list[tuple[float, tuple[int, int, int]]]) -> Image.Image:
    image = Image.new("RGB", (SIZE, SIZE))
    pixels = image.load()
    for y in range(SIZE):
        t = y / (SIZE - 1)
        color = stops[-1][1]
        for index in range(len(stops) - 1):
            left_t, left = stops[index]
            right_t, right = stops[index + 1]
            if left_t <= t <= right_t:
                local = (t - left_t) / (right_t - left_t)
                color = tuple(round(left[channel] * (1 - local) + right[channel] * local) for channel in range(3))
                break
        for x in range(SIZE):
            pixels[x, y] = color
    return image.convert("RGBA")


def rounded_icon_bg(stops: list[tuple[float, tuple[int, int, int]]], radius: int = 108) -> Image.Image:
    image = gradient(stops)
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=radius, fill=255)
    image.putalpha(mask)
    return image


def star_points(cx: float, cy: float, outer: float, inner: float, count: int = 4) -> list[tuple[float, float]]:
    points = []
    for i in range(count * 2):
        angle = -math.pi / 2 + i * math.pi / count
        radius = outer if i % 2 == 0 else inner
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return points


def add_shadow(layer: Image.Image, ellipse: tuple[int, int, int, int], opacity: int = 44, blur: int = 18) -> None:
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse(ellipse, fill=(52, 67, 73, opacity))
    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur)))


def draw_face(draw: ImageDraw.ImageDraw, y: int, color: tuple[int, int, int], smile: str = "soft") -> None:
    draw.ellipse((208, y, 232, y + 24), fill=color)
    draw.ellipse((280, y, 304, y + 24), fill=color)
    if smile == "wide":
        draw.arc((206, y + 28, 306, y + 92), start=20, end=160, fill=color, width=10)
    else:
        draw.arc((222, y + 34, 290, y + 78), start=20, end=160, fill=color, width=8)
    draw.ellipse((178, y + 40, 206, y + 68), fill=(255, 181, 169, 190))
    draw.ellipse((306, y + 40, 334, y + 68), fill=(255, 181, 169, 190))


def draw_soft(seed: int = 0) -> Image.Image:
    image = rounded_icon_bg([(0, (255, 242, 225)), (0.58, (230, 244, 230)), (1, (205, 229, 237))])
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    add_shadow(layer, (132, 400, 380, 462), 30, 20)
    draw = ImageDraw.Draw(layer)
    draw.ellipse((94, 104, 108, 118), fill=(249, 199, 95, 215))
    draw.polygon(star_points(394, 386, 17, 7), fill=(231, 150, 150, 170))
    draw.line((252, 272, 250, 214, 272, 146), fill=(75, 141, 111), width=18)
    draw.ellipse((152, 184, 260, 276), fill=(111, 183, 128))
    draw.ellipse((260, 148, 368, 248), fill=(62, 158, 139))
    draw.line((210, 230, 254, 258), fill=(232, 247, 214, 165), width=8)
    draw.line((284, 208, 338, 174), fill=(231, 246, 221, 165), width=8)
    draw.rounded_rectangle((132, 214, 380, 288), radius=38, fill=(249, 181, 133))
    draw.polygon([(154, 272), (358, 272), (338, 416), (304, 446), (208, 446), (174, 416)], fill=(224, 119, 94))
    draw.polygon([(170, 286), (342, 286), (326, 404), (298, 430), (214, 430), (186, 404)], fill=(235, 132, 101))
    draw.line((156, 280, 356, 280), fill=(177, 91, 78, 82), width=9)
    draw.arc((184, 286, 328, 382), 26, 154, fill=(255, 224, 198, 130), width=8)
    draw_face(draw, 330, (88, 57, 54), "wide")
    image.alpha_composite(layer)
    return image


def draw_minimal() -> Image.Image:
    image = rounded_icon_bg([(0, (244, 250, 246)), (1, (211, 235, 236))], radius=96)
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    add_shadow(layer, (150, 404, 362, 450), 28, 16)
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((132, 204, 380, 292), radius=34, fill=(237, 135, 92))
    draw.rounded_rectangle((158, 272, 354, 430), radius=28, fill=(215, 106, 84))
    draw.rectangle((178, 272, 334, 306), fill=(238, 132, 93))
    draw.line((256, 206, 256, 126), fill=(41, 128, 103), width=18)
    draw.ellipse((182, 128, 260, 214), fill=(91, 177, 112))
    draw.ellipse((260, 126, 342, 214), fill=(43, 151, 127))
    draw.line((206, 170, 252, 206), fill=(230, 250, 218), width=7)
    draw.line((284, 174, 258, 206), fill=(230, 250, 218), width=7)
    draw.ellipse((224, 344, 238, 358), fill=(93, 56, 52))
    draw.ellipse((274, 344, 288, 358), fill=(93, 56, 52))
    draw.arc((226, 356, 286, 394), 20, 160, fill=(93, 56, 52), width=6)
    image.alpha_composite(layer)
    return image


def draw_glass() -> Image.Image:
    image = rounded_icon_bg([(0, (235, 248, 255)), (0.5, (224, 245, 236)), (1, (214, 224, 249))])
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    add_shadow(layer, (118, 400, 394, 470), 36, 22)
    draw = ImageDraw.Draw(layer)
    draw.ellipse((74, 92, 138, 156), fill=(255, 232, 167, 140))
    draw.ellipse((360, 102, 438, 180), fill=(119, 181, 232, 80))
    draw.line((254, 284, 252, 210, 284, 134), fill=(48, 150, 122, 230), width=20)
    draw.ellipse((146, 172, 266, 274), fill=(85, 194, 118, 230))
    draw.ellipse((272, 132, 396, 252), fill=(48, 178, 143, 230))
    draw.rounded_rectangle((118, 214, 394, 300), radius=42, fill=(255, 188, 140, 215), outline=(255, 255, 255, 140), width=4)
    draw.rounded_rectangle((150, 278, 362, 444), radius=42, fill=(225, 110, 88, 220), outline=(255, 255, 255, 90), width=4)
    draw.arc((190, 312, 322, 412), 28, 152, fill=(255, 229, 207, 170), width=8)
    draw_face(draw, 340, (84, 53, 59), "soft")
    draw.line((156, 238, 356, 238), fill=(255, 255, 255, 120), width=10)
    image.alpha_composite(layer)
    return image


def draw_desktop_badge() -> Image.Image:
    image = rounded_icon_bg([(0, (247, 241, 224)), (0.6, (216, 237, 224)), (1, (196, 218, 238))])
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((82, 92, 430, 390), radius=48, fill=(82, 93, 108), outline=(54, 64, 77), width=10)
    draw.rounded_rectangle((104, 120, 408, 344), radius=32, fill=(237, 251, 243))
    draw.rounded_rectangle((184, 360, 328, 398), radius=18, fill=(82, 93, 108))
    draw.rounded_rectangle((154, 394, 358, 424), radius=16, fill=(82, 93, 108))
    add_shadow(layer, (126, 408, 386, 466), 28, 16)
    draw.line((256, 240, 256, 180, 286, 138), fill=(47, 137, 111), width=16)
    draw.ellipse((176, 178, 258, 252), fill=(95, 180, 113))
    draw.ellipse((266, 148, 354, 232), fill=(37, 151, 129))
    draw.rounded_rectangle((166, 246, 346, 306), radius=28, fill=(255, 174, 120))
    draw.rounded_rectangle((188, 294, 324, 360), radius=24, fill=(232, 116, 88))
    draw.ellipse((220, 324, 234, 338), fill=(96, 58, 54))
    draw.ellipse((278, 324, 292, 338), fill=(96, 58, 54))
    draw.arc((226, 334, 286, 372), 20, 160, fill=(96, 58, 54), width=6)
    draw.polygon(star_points(384, 118, 15, 6), fill=(255, 211, 99, 220))
    image.alpha_composite(layer)
    return image


def draw_pixel() -> Image.Image:
    small = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    draw = ImageDraw.Draw(small)
    draw.rounded_rectangle((0, 0, 127, 127), radius=24, fill=(234, 242, 219))
    draw.rectangle((48, 30, 54, 54), fill=(54, 132, 95))
    draw.rectangle((36, 40, 56, 58), fill=(88, 174, 104))
    draw.rectangle((57, 36, 80, 54), fill=(37, 151, 124))
    draw.rectangle((28, 56, 100, 72), fill=(245, 160, 103))
    draw.rectangle((34, 72, 94, 104), fill=(219, 101, 77))
    draw.rectangle((40, 104, 88, 112), fill=(198, 86, 72))
    draw.rectangle((50, 86, 56, 92), fill=(82, 50, 48))
    draw.rectangle((72, 86, 78, 92), fill=(82, 50, 48))
    draw.rectangle((56, 98, 72, 102), fill=(82, 50, 48))
    draw.rectangle((21, 24, 25, 28), fill=(255, 207, 91))
    draw.rectangle((101, 94, 105, 98), fill=(247, 154, 156))
    return small.resize((SIZE, SIZE), Image.Resampling.NEAREST)


def make_sheet(images: list[tuple[str, Image.Image]]) -> Image.Image:
    cell = 300
    sheet = Image.new("RGBA", (cell * 2, cell * 2 + 56), (248, 249, 245, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, image) in enumerate(images):
        x = (index % 2) * cell
        y = (index // 2) * cell
        preview = image.resize((224, 224), Image.Resampling.LANCZOS)
        sheet.alpha_composite(preview, (x + 38, y + 26))
        draw.text((x + 38, y + 258), label, fill=(47, 55, 60), font=font)
    draw.text((38, cell * 2 + 18), "Potmate / Xiao Pen You icon style previews", fill=(47, 55, 60), font=font)
    return sheet


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    variants = [
        ("A soft companion", draw_soft()),
        ("B minimal app icon", draw_minimal()),
        ("C glass sticker", draw_glass()),
        ("D desktop badge", draw_desktop_badge()),
        ("E pixel buddy", draw_pixel()),
    ]
    for index, (label, image) in enumerate(variants, start=1):
        slug = label.lower().replace(" ", "-")
        image.save(OUT_DIR / f"potmate-style-{index}-{slug}.png")
    make_sheet(variants[:4]).save(OUT_DIR / "potmate-style-sheet.png")
    make_sheet(variants[1:5]).save(OUT_DIR / "potmate-style-sheet-2.png")
    print(f"Generated {len(variants)} Potmate style previews in {OUT_DIR}")


if __name__ == "__main__":
    main()
