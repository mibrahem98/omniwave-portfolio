from math import cos, pi, sin
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


SIZE = 1024
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "images" / "icon.png"


def lerp(start: int, end: int, amount: float) -> int:
    return round(start + (end - start) * amount)


def radial_gradient() -> Image.Image:
    image = Image.new("RGB", (SIZE, SIZE))
    pixels = image.load()
    for y in range(SIZE):
        for x in range(SIZE):
            lens_distance = min(1.0, (((x - SIZE * 0.54) / SIZE) ** 2 + ((y - SIZE * 0.40) / SIZE) ** 2) ** 0.5 * 1.42)
            vertical = y / SIZE
            edge = (5, 10, 20)
            center = (18, 72, 83) if vertical < 0.55 else (31, 19, 71)
            pixels[x, y] = tuple(lerp(center[index], edge[index], lens_distance) for index in range(3))
    return image


def draw_wave(draw: ImageDraw.ImageDraw, color: tuple[int, int, int, int]) -> None:
    cx, cy = SIZE // 2, SIZE // 2
    bars = [98, 168, 258, 342, 258, 168, 98]
    start_x = cx - 252
    for index, height in enumerate(bars):
        x = start_x + index * 84
        draw.rounded_rectangle((x, cy - height // 2, x + 38, cy + height // 2), radius=19, fill=color)


def make_icon() -> Image.Image:
    image = radial_gradient().convert("RGBA")
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((150, 150, 874, 874), outline=(49, 233, 196, 120), width=78)
    draw_wave(glow_draw, (74, 239, 212, 168))
    glow = glow.filter(ImageFilter.GaussianBlur(46))
    image.alpha_composite(glow)

    draw = ImageDraw.Draw(image)
    for radius, color, width in ((366, (10, 23, 43, 255), 34), (332, (46, 80, 119, 255), 9)):
        draw.ellipse((SIZE // 2 - radius, SIZE // 2 - radius, SIZE // 2 + radius, SIZE // 2 + radius), outline=color, width=width)
    draw.ellipse((182, 182, 842, 842), outline=(49, 233, 196, 255), width=54)
    draw.ellipse((236, 236, 788, 788), outline=(165, 148, 255, 150), width=8)
    draw_wave(draw, (227, 255, 249, 255))
    draw_wave(draw, (49, 233, 196, 255))

    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    for step in range(16):
        alpha = max(0, 55 - step * 3)
        inset = 72 + step * 6
        highlight_draw.arc((inset, inset, SIZE - inset, SIZE - inset), 202, 332, fill=(159, 134, 255, alpha), width=5)
    image.alpha_composite(highlight)
    return image.convert("RGB")


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    make_icon().save(OUTPUT, "PNG", optimize=True)
