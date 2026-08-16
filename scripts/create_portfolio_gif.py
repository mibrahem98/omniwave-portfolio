from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
OUTPUT = ASSETS / "omniwave-flow.gif"
INPUTS = [ASSETS / "library.png", ASSETS / "export-history.png", ASSETS / "settings.png"]
WIDTH = 280
BACKGROUND = "#06080E"


def load_frame(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image = image.crop((56, 0, image.width, image.height))
    height = round(image.height * WIDTH / image.width)
    image = image.resize((WIDTH, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (WIDTH + 24, height + 52), BACKGROUND)
    canvas.paste(image, (12, 40))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((12, 8, 124, 30), radius=11, fill="#102B31")
    draw.text((24, 13), "OMNIWAVE FLOW", fill="#31E9C4", font=ImageFont.load_default())
    return canvas


def main() -> None:
    base_frames = [load_frame(path) for path in INPUTS]
    frames: list[Image.Image] = []
    durations: list[int] = []
    for index, current in enumerate(base_frames):
        frames.append(current)
        durations.append(1100)
        following = base_frames[(index + 1) % len(base_frames)]
        for step in range(1, 6):
            frames.append(Image.blend(current, following, step / 6))
            durations.append(100)
    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
