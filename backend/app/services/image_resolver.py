from pathlib import Path
from typing import List, Optional
from app.core.config import IMAGES_DIR, settings


def get_image_search_dirs() -> List[Path]:
    """Candidate folders for a portable knowledge base.

    Images are looked up by filename so a copied ChromaDB + images folder
    works even when the original absolute paths no longer exist.
    """
    dirs: List[Path] = []
    seen = set()

    def add(path: Path) -> None:
        try:
            resolved = path.expanduser().resolve()
        except Exception:
            resolved = path
        key = str(resolved)
        if key not in seen:
            seen.add(key)
            dirs.append(resolved)

    add(IMAGES_DIR)

    chroma = Path(getattr(settings, "chroma_db_path", "") or IMAGES_DIR.parent / "chroma_db")
    add(chroma.parent / "images")
    add(chroma / "images")
    add(chroma.parent)
    return dirs


def resolve_image_file(stored_or_name: str) -> Optional[Path]:
    """Resolve an image from a stored absolute path or a bare filename."""
    if not stored_or_name:
        return None

    raw = Path(str(stored_or_name).strip())
    filename = raw.name
    if not filename or filename in {".", ".."}:
        return None

    if raw.is_file():
        return raw.resolve()

    for folder in get_image_search_dirs():
        candidate = folder / filename
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            continue
    return None
