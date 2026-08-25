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

    raw = Path(str(stored_or_name).strip().replace("\\", "/"))
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


def to_portable_image_refs(paths: List[str]) -> List[str]:
    """Store only filenames so a copied knowledge base stays portable."""
    names: List[str] = []
    seen = set()
    for raw in paths or []:
        name = Path(str(raw).replace("\\", "/")).name
        if not name or name in {".", ".."} or name in seen:
            continue
        seen.add(name)
        names.append(name)
    return names


def remount_image_paths(paths: List[str]) -> List[str]:
    """Rewrite stored image refs to files that exist on this machine."""
    remounted: List[str] = []
    for raw in paths or []:
        resolved = resolve_image_file(raw)
        remounted.append(str(resolved) if resolved else Path(str(raw)).name)
    return remounted
