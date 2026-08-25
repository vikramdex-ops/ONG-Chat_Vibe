"""Where SQA-O&G stores data, and whether that disk survives a restart."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict

DESKTOP_RELEASES_URL = "https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest"
DESKTOP_RELEASES_LIST_URL = "https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases"

_CLOUD_MARKERS = (
    "RENDER",
    "RENDER_SERVICE_ID",
    "RAILWAY_ENVIRONMENT",
    "FLY_APP_NAME",
    "SPACE_ID",
)


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"))


def is_ephemeral_host() -> bool:
    """Render / Railway / Fly free disks are wiped on sleep, deploy, and crash."""
    forced = (os.getenv("SQA_PERSISTENCE") or "").strip().lower()
    if forced in {"durable", "local", "persistent"}:
        return False
    if forced in {"ephemeral", "cloud"}:
        return True
    return any(os.getenv(key) for key in _CLOUD_MARKERS)


def bundle_root() -> Path:
    if is_frozen():
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent.parent.parent.parent


def backend_dir() -> Path:
    if is_frozen():
        return bundle_root()
    return Path(__file__).resolve().parent.parent.parent


def frontend_dist() -> Path:
    if is_frozen():
        return bundle_root() / "frontend" / "dist"
    return backend_dir().parent / "frontend" / "dist"


def resolve_data_dir() -> Path:
    override = (os.getenv("SQA_DATA_DIR") or "").strip()
    if override:
        return Path(override).expanduser().resolve()
    if is_frozen():
        if os.name == "nt":
            base = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
            return (base / "SQA-OG").resolve()
        return (Path.home() / ".local" / "share" / "sqa-og").resolve()
    return (backend_dir() / "data").resolve()


def runtime_info() -> Dict[str, Any]:
    ephemeral = is_ephemeral_host()
    if is_frozen():
        kind = "desktop"
    elif ephemeral:
        kind = "cloud"
    else:
        kind = "local"
    return {
        "runtime": kind,
        "frozen": is_frozen(),
        "persistence": "ephemeral" if ephemeral else "durable",
        "data_dir": str(resolve_data_dir()),
        "desktop_releases_url": DESKTOP_RELEASES_URL,
    }
