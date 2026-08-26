"""Build a multi-size Windows .ico from the flame/circuit app mark."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "frontend" / "public" / "app-logo.png"
PUBLIC = ROOT / "frontend" / "public"
PACKAGING = ROOT / "packaging"
SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source mark: {SOURCE}")
    mark = Image.open(SOURCE).convert("RGBA")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    PACKAGING.mkdir(parents=True, exist_ok=True)

    ico_pack = PACKAGING / "sqa-og.ico"
    ico_public = PUBLIC / "favicon.ico"
    mark.save(ico_pack, format="ICO", sizes=SIZES)
    mark.save(ico_public, format="ICO", sizes=SIZES)

    fav = mark.copy()
    fav.thumbnail((256, 256), Image.Resampling.LANCZOS)
    fav.save(PUBLIC / "favicon.png", format="PNG", optimize=True)

    data = ico_pack.read_bytes()
    count = int.from_bytes(data[4:6], "little")
    if count < 3 or ico_pack.stat().st_size < 10_000:
        raise SystemExit(f"ICO looks incomplete ({count} sizes, {ico_pack.stat().st_size} bytes)")
    print(f"Wrote {ico_pack} ({ico_pack.stat().st_size} bytes, {count} sizes)")
    print(f"Wrote {ico_public}")
    print(f"Wrote {PUBLIC / 'favicon.png'}")


if __name__ == "__main__":
    main()
