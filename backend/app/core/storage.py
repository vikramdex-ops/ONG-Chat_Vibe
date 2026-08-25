"""Live knowledge-base paths. The desktop app can move these onto another drive."""

from __future__ import annotations

import json
import os
import shutil
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.runtime import backend_dir, is_ephemeral_host, is_frozen, resolve_data_dir

_lock = threading.RLock()
_paths: Dict[str, Path] = {}


class LivePath:
    """Path-like object that always follows the active data folder."""

    def __init__(self, key: str):
        self._key = key

    def _raw(self) -> Path:
        with _lock:
            if not _paths:
                apply_data_dir(resolve_data_dir())
            return _paths[self._key]

    def __fspath__(self) -> str:
        return str(self._raw())

    def __str__(self) -> str:
        return str(self._raw())

    def __repr__(self) -> str:
        return f"LivePath({self._key}={self._raw()!r})"

    def __truediv__(self, other):
        return self._raw() / other

    def __eq__(self, other) -> bool:
        try:
            return self._raw() == Path(other)
        except Exception:
            return False

    def __hash__(self) -> int:
        return hash(self._raw())

    def __getattr__(self, name: str):
        return getattr(self._raw(), name)


DATA_DIR = LivePath("data")
UPLOADS_DIR = LivePath("uploads")
IMAGES_DIR = LivePath("images")
CHROMA_DIR = LivePath("chroma")
SETTINGS_FILE = LivePath("settings")
PROCESSED_FILES_LOG = LivePath("processed")
HISTORY_DB_PATH = LivePath("history")
CHUNK_SNAPSHOT_PATH = LivePath("snapshot")


def pointer_files() -> List[Path]:
    files: List[Path] = []
    if os.name == "nt":
        local = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
        files.append(local / "SQA-OG" / "storage.json")
    files.append(Path.home() / ".sqa-og" / "storage.json")
    files.append(backend_dir() / "data" / "storage.json")
    if is_frozen():
        files.append(Path(os.path.dirname(os.path.abspath(__file__))).parent.parent / "storage.json")
    # unique, keep order
    seen = set()
    out: List[Path] = []
    for item in files:
        key = str(item)
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def read_pointer() -> Optional[Path]:
    for item in pointer_files():
        if not item.exists():
            continue
        try:
            data = json.loads(item.read_text(encoding="utf-8"))
            dest = Path(str(data.get("data_dir") or "")).expanduser()
            if dest and dest.parent.exists():
                return dest
        except Exception:
            continue
    return None


def write_pointer(data_dir: Path) -> None:
    payload = {
        "app": "SQA-O&G",
        "data_dir": str(data_dir),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    text = json.dumps(payload, indent=2)
    for item in pointer_files():
        try:
            item.parent.mkdir(parents=True, exist_ok=True)
            item.write_text(text, encoding="utf-8")
        except Exception:
            continue


def apply_data_dir(data_dir: Path) -> Path:
    dest = Path(data_dir).expanduser().resolve()
    mapping = {
        "data": dest,
        "uploads": dest / "uploads",
        "images": dest / "images",
        "chroma": dest / "chroma_db",
        "settings": dest / "settings.json",
        "processed": dest / "processed_files.json",
        "history": dest / "history.db",
        "snapshot": dest / "chunk_snapshot.jsonl",
    }
    with _lock:
        _paths.update(mapping)
        for key in ("data", "uploads", "images", "chroma"):
            mapping[key].mkdir(parents=True, exist_ok=True)
    return dest


def ensure_storage() -> Path:
    pointed = None
    if not (os.environ.get("SQA_DATA_DIR") or "").strip():
        pointed = read_pointer()
    return apply_data_dir(pointed or resolve_data_dir())


def current_paths() -> Dict[str, str]:
    with _lock:
        if not _paths:
            ensure_storage()
        return {key: str(value) for key, value in _paths.items()}


def _folder_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += (Path(root) / name).stat().st_size
            except OSError:
                continue
    return total


def list_volumes() -> List[Dict[str, Any]]:
    volumes: List[Dict[str, Any]] = []
    if os.name == "nt":
        import string

        for letter in string.ascii_uppercase:
            root = Path(f"{letter}:/")
            if not root.exists():
                continue
            try:
                usage = shutil.disk_usage(root)
            except OSError:
                continue
            volumes.append({
                "id": letter,
                "path": f"{letter}:\\",
                "label": f"Drive {letter}:",
                "free_gb": round(usage.free / (1024 ** 3), 1),
                "total_gb": round(usage.total / (1024 ** 3), 1),
                "suggested": f"{letter}:\\SQA-OG",
            })
        return volumes

    for root, label, suggested in (
        (Path.home(), "Home", str(Path.home() / "SQA-OG")),
        (Path("/"), "System", str(Path.home() / "SQA-OG")),
    ):
        if not root.exists():
            continue
        try:
            usage = shutil.disk_usage(root)
        except OSError:
            continue
        volumes.append({
            "id": label.lower(),
            "path": str(root),
            "label": label,
            "free_gb": round(usage.free / (1024 ** 3), 1),
            "total_gb": round(usage.total / (1024 ** 3), 1),
            "suggested": suggested,
        })
    return volumes


def storage_snapshot() -> Dict[str, Any]:
    paths = current_paths()
    data = Path(paths["data"])
    try:
        usage = shutil.disk_usage(data)
        disk = {
            "free_gb": round(usage.free / (1024 ** 3), 1),
            "total_gb": round(usage.total / (1024 ** 3), 1),
        }
    except OSError:
        disk = {"free_gb": None, "total_gb": None}
    used = _folder_bytes(data)
    ephemeral = is_ephemeral_host()
    return {
        "data_dir": paths["data"],
        "uploads_dir": paths["uploads"],
        "images_dir": paths["images"],
        "chroma_db_path": paths["chroma"],
        "history_db": paths["history"],
        "used_mb": round(used / (1024 ** 2), 1),
        "disk": disk,
        "volumes": list_volumes(),
        "ephemeral": ephemeral,
        "can_relocate": not ephemeral,
        "frozen": is_frozen(),
        "pointer_files": [str(p) for p in pointer_files()],
    }


def _merge_tree(src: Path, dest: Path) -> None:
    if not src.exists():
        dest.mkdir(parents=True, exist_ok=True)
        return
    if src.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        return
    dest.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        target = dest / item.name
        if item.is_dir():
            _merge_tree(item, target)
        else:
            shutil.copy2(item, target)


def relocate_data_dir(dest: str, move_existing: bool = True) -> Dict[str, Any]:
    """Move or retarget the whole knowledge base onto another drive/folder."""
    if is_ephemeral_host():
        raise ValueError("This host wipes disk on restart. Relocate storage on the desktop app.")

    target = Path(dest).expanduser()
    if not target.is_absolute():
        raise ValueError("Please enter a full path, for example D:\\SQA-OG or E:\\Engineering\\KB.")
    target = target.resolve()

    current = Path(current_paths()["data"])
    if target == current:
        write_pointer(target)
        return storage_snapshot()

    try:
        target.mkdir(parents=True, exist_ok=True)
        probe = target / ".sqa-write-test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except Exception as exc:
        raise ValueError(f"Cannot write to {target}: {exc}") from exc

    try:
        if current.resolve() in target.parents:
            raise ValueError("New folder cannot sit inside the current knowledge-base folder.")
    except ValueError:
        raise
    except Exception:
        pass

    from app.services.indexer import indexing_service

    if indexing_service.get_status().is_running:
        raise ValueError("Stop indexing before moving the knowledge base.")

    from app.services.vector_db import vector_db_service

    vector_db_service.close()

    if move_existing and current.exists():
        for name in ("uploads", "images", "chroma_db"):
            _merge_tree(current / name, target / name)
        for name in ("settings.json", "processed_files.json", "history.db", "chunk_snapshot.jsonl"):
            src = current / name
            if src.exists() and src.is_file():
                shutil.copy2(src, target / name)

    apply_data_dir(target)
    write_pointer(target)

    from app.core.config import settings_manager, AppSettings

    settings_manager.settings_path = Path(current_paths()["settings"])
    current_settings = settings_manager.current.model_copy(deep=True)
    current_settings.chroma_db_path = current_paths()["chroma"]
    try:
        settings_manager.save_settings(current_settings)
    except Exception:
        settings_manager._settings = current_settings
        settings_manager.settings_path.parent.mkdir(parents=True, exist_ok=True)
        settings_manager.settings_path.write_text(current_settings.model_dump_json(indent=2), encoding="utf-8")

    vector_db_service.remount(current_paths()["chroma"])

    from app.services.history import history_service

    history_service.remount(Path(current_paths()["history"]))

    from app.services.indexer import tracker

    tracker.remount(Path(current_paths()["processed"]))

    return storage_snapshot()


ensure_storage()
