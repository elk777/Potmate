from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "src-tauri" / "icons"


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def vertical_gradient(size: int, stops: list[tuple[float, tuple[int, int, int]]]) -> Image.Image:
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    for y in range(size):
        t = y / (size - 1)
        for index in range(len(stops) - 1):
            left_t, left_color = stops[index]
            right_t, right_color = stops[index + 1]
            if left_t <= t <= right_t:
                local = (t - left_t) / (right_t - left_t)
                color = tuple(round(left_color[channel] * (1 - local) + right_color[channel] * local) for channel in range(3))
                break
        else:
            color = stops[-1][1]
        for x in range(size):
            pixels[x, y] = color
    return image


def draw_leaf(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int]) -> None:
    draw.polygon(points, fill=fill)
    draw.line(points[:1] + [points[len(points) // 2]], fill=(226, 248, 214, 190), width=18, joint="curve")


def star_points(cx: float, cy: float, outer: float, inner: float, count: int = 4) -> list[tuple[float, float]]:
    points = []
    for i in range(count * 2):
        angle = -math.pi / 2 + i * math.pi / count
        radius = outer if i % 2 == 0 else inner
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return points


def make_icon(size: int) -> Image.Image:
    scale = size / 1024
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg = vertical_gradient(
        size,
        [
            (0, (255, 243, 218)),
            (0.55, (223, 243, 231)),
            (1, (185, 215, 239)),
        ],
    ).convert("RGBA")
    canvas.alpha_composite(bg)
    mask = rounded_mask(size, round(size * 0.22))
    canvas.putalpha(mask)

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    s = scale

    draw.ellipse(tuple(round(v * s) for v in (196, 200, 224, 228)), fill=(255, 209, 106, 230))
    draw.ellipse(tuple(round(v * s) for v in (812, 298, 832, 318)), fill=(125, 181, 232, 205))
    draw.polygon([(x * s, y * s) for x, y in star_points(760, 754, 30, 12)], fill=(245, 164, 160, 180))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(tuple(round(v * s) for v in (242, 776, 782, 894)), fill=(72, 84, 91, 54))
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(18 * s)))
    layer.alpha_composite(shadow)

    draw = ImageDraw.Draw(layer)
    draw.line([(508 * s, 560 * s), (488 * s, 464 * s), (498 * s, 368 * s), (546 * s, 270 * s)], fill=(63, 143, 112, 255), width=round(34 * s), joint="curve")

    left_leaf = [(506 * s, 500 * s), (430 * s, 408 * s), (296 * s, 422 * s), (370 * s, 546 * s)]
    right_leaf = [(532 * s, 452 * s), (610 * s, 326 * s), (744 * s, 330 * s), (674 * s, 486 * s)]
    draw.polygon(left_leaf, fill=(74, 168, 102, 255))
    draw.polygon(right_leaf, fill=(39, 155, 132, 255))
    draw.line([(500 * s, 500 * s), (354 * s, 438 * s)], fill=(220, 244, 190, 190), width=round(14 * s))
    draw.line([(532 * s, 452 * s), (672 * s, 358 * s)], fill=(226, 248, 214, 190), width=round(14 * s))

    draw.rounded_rectangle(tuple(round(v * s) for v in (268, 394, 756, 570)), radius=round(54 * s), fill=(255, 173, 119, 255))
    draw.line([(306 * s, 500 * s), (718 * s, 500 * s)], fill=(200, 94, 78, 100), width=round(18 * s))
    draw.polygon(
        [(306 * s, 548 * s), (718 * s, 548 * s), (672 * s, 830 * s), (622 * s, 890 * s), (402 * s, 890 * s), (352 * s, 830 * s)],
        fill=(210, 101, 82, 255),
    )
    draw.polygon(
        [(330 * s, 560 * s), (694 * s, 560 * s), (658 * s, 810 * s), (610 * s, 858 * s), (414 * s, 858 * s), (366 * s, 810 * s)],
        fill=(238, 126, 91, 255),
    )
    draw.arc(tuple(round(v * s) for v in (424, 692, 600, 804)), start=28, end=152, fill=(102, 63, 58, 255), width=round(18 * s))
    draw.ellipse(tuple(round(v * s) for v in (428, 650, 474, 696)), fill=(102, 63, 58, 255))
    draw.ellipse(tuple(round(v * s) for v in (550, 650, 596, 696)), fill=(102, 63, 58, 255))
    draw.ellipse(tuple(round(v * s) for v in (374, 704, 424, 754)), fill=(255, 182, 165, 180))
    draw.ellipse(tuple(round(v * s) for v in (600, 704, 650, 754)), fill=(255, 182, 165, 180))
    draw.arc(tuple(round(v * s) for v in (348, 574, 676, 692)), start=18, end=162, fill=(255, 197, 147, 150), width=round(22 * s))

    canvas.alpha_composite(layer)
    return canvas


def save_pngs() -> None:
    sizes = {
        "potmate-icon.png": 512,
        "potmate-32x32.png": 32,
        "potmate-128x128.png": 128,
        "potmate-128x128@2x.png": 256,
        "potmate-Square30x30Logo.png": 30,
        "potmate-Square44x44Logo.png": 44,
        "potmate-Square71x71Logo.png": 71,
        "potmate-Square89x89Logo.png": 89,
        "potmate-Square107x107Logo.png": 107,
        "potmate-Square142x142Logo.png": 142,
        "potmate-Square150x150Logo.png": 150,
        "potmate-Square284x284Logo.png": 284,
        "potmate-Square310x310Logo.png": 310,
        "potmate-StoreLogo.png": 50,
    }
    for name, size in sizes.items():
        make_icon(size).save(ICON_DIR / name)


def save_ico() -> None:
    base = make_icon(256)
    base.save(
        ICON_DIR / "potmate-icon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


def save_icns() -> None:
    if shutil.which("iconutil") is None:
        return
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "potmate.iconset"
        iconset.mkdir()
        mapping = {
            "icon_16x16.png": 16,
            "icon_16x16@2x.png": 32,
            "icon_32x32.png": 32,
            "icon_32x32@2x.png": 64,
            "icon_128x128.png": 128,
            "icon_128x128@2x.png": 256,
            "icon_256x256.png": 256,
            "icon_256x256@2x.png": 512,
            "icon_512x512.png": 512,
            "icon_512x512@2x.png": 1024,
        }
        for name, size in mapping.items():
            make_icon(size).save(iconset / name)
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(ICON_DIR / "potmate-icon.icns")], check=True)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    save_pngs()
    save_ico()
    save_icns()
    print(f"Generated Potmate icons in {ICON_DIR}")


if __name__ == "__main__":
    main()
