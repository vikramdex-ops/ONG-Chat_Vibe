"""Live Gemini model ids. 2.5 and older are blocked for new API keys."""

from typing import Optional

DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"

_RETIRED_GEMINI = {
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "default",
}


def normalize_gemini_model(model: Optional[str]) -> str:
    name = (model or "").strip()
    if name.startswith("models/"):
        name = name[len("models/") :]
    if not name or name in _RETIRED_GEMINI:
        return DEFAULT_GEMINI_MODEL
    return name
