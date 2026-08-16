from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
INPUTS = ("library", "export-history", "settings")
LEFT_GUTTER = 56


def main() -> None:
    for name in INPUTS:
        source = ASSETS / f"{name}.png"
        target = ASSETS / f"{name}-view.png"
        with Image.open(source).convert("RGB") as image:
            cropped = image.crop((LEFT_GUTTER, 0, image.width, image.height))
            cropped.save(target, format="PNG", optimize=True)
        print(f"Created {target.name}")


if __name__ == "__main__":
    main()
