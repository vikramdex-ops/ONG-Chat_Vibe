import json
import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

from app.core.runtime import backend_dir
from app.core.gemini_models import DEFAULT_GEMINI_MODEL, normalize_gemini_model
from app.core.storage import (
    DATA_DIR,
    UPLOADS_DIR,
    IMAGES_DIR,
    CHROMA_DIR,
    SETTINGS_FILE,
    PROCESSED_FILES_LOG,
    HISTORY_DB_PATH,
    CHUNK_SNAPSHOT_PATH,
    ensure_storage,
)

BASE_DIR = backend_dir()
ensure_storage()

GEMINI_API_BASE = "https://generativelanguage.googleapis.com"


def public_media_url(path: str) -> str:
    """Prefix a /api/... media path when PUBLIC_API_URL is set (split Vercel deploy)."""
    if not path:
        return path
    if path.startswith("http://") or path.startswith("https://"):
        return path
    base = (os.getenv("PUBLIC_API_URL") or "").strip().rstrip("/")
    if not base:
        return path
    if path.startswith("/api/") and base.endswith("/api"):
        return f"{base}/{path[len('/api/'):]}"
    if path.startswith("/") and not base.endswith("/api"):
        return f"{base}{path}"
    return f"{base}/{path.lstrip('/')}"


def cors_allow_origins() -> List[str]:
    raw = (os.getenv("CORS_ORIGINS") or "*").strip()
    if raw == "*":
        return ["*"]
    origins = [part.strip() for part in raw.split(",") if part.strip()]
    return origins or ["*"]

class AppSettings(BaseModel):
    # Vector Database
    chroma_db_path: str = str(CHROMA_DIR)
    collection_name: str = "pdf_knowledge_base"

    # Embedding Model
    embedding_model_name: str = "all-MiniLM-L6-v2"
    embedding_device: str = "cpu"

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 150

    # Retrieval
    top_k: int = 3

    # Indexer
    worker_count: int = max(1, os.cpu_count() // 2 if os.cpu_count() else 2)
    ocr_char_threshold: int = 50
    batch_write_size: int = 4096

    # LLM Provider Configuration
    # "gemini", "local", "openai", "ollama", "vllm", "mock"
    llm_provider: str = "local"
    llm_server_url: Optional[str] = "http://127.0.0.1:8000"
    llm_api_key: Optional[str] = None
    llm_model_name: str = "default"
    gemini_api_key: Optional[str] = None
    gemini_model_name: Optional[str] = None
    llm_max_tokens: int = 512
    llm_temperature: float = 0.6
    llm_stop_strings: List[str] = ["<|im_end|>", "<|endoftext|>", "\n\nUser:", "\n\nUSER:"]


class SettingsManager:
    """Manages application settings with persistent JSON storage."""

    def __init__(self, settings_path: Path = SETTINGS_FILE):
        self.settings_path = settings_path
        self._settings = self.load_settings()

    def load_settings(self) -> AppSettings:
        loaded: Optional[AppSettings] = None
        persisted = False
        if self.settings_path.exists():
            try:
                with open(self.settings_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    loaded = AppSettings(**data)
                    persisted = True
            except Exception as e:
                print(f"[Config] Error loading settings, falling back to defaults: {e}")
        current = self._apply_env_overrides(loaded or AppSettings(), persisted=persisted)
        if (current.llm_provider or "").lower() == "gemini":
            current.llm_model_name = normalize_gemini_model(current.llm_model_name)
            current.gemini_model_name = normalize_gemini_model(
                current.gemini_model_name or current.llm_model_name
            )
        return current

    @staticmethod
    def store_llm_keys() -> bool:
        return (os.getenv("SQA_STORE_LLM_KEYS") or "1").strip() != "0"

    @staticmethod
    def _apply_env_overrides(current: AppSettings, persisted: bool = False) -> AppSettings:
        """Host env can pick a default provider. User Gemini keys stay in the browser."""
        default_provider = (os.getenv("SQA_DEFAULT_PROVIDER") or "").strip().lower()
        if default_provider and not persisted:
            current.llm_provider = default_provider
            if default_provider == "gemini":
                current.llm_server_url = GEMINI_API_BASE
                if not current.llm_model_name or current.llm_model_name == "default":
                    current.llm_model_name = DEFAULT_GEMINI_MODEL
                if not current.gemini_model_name:
                    current.gemini_model_name = current.llm_model_name
        workers = (os.getenv("SQA_WORKER_COUNT") or "").strip()
        if workers:
            try:
                current.worker_count = max(1, int(workers))
            except ValueError:
                pass
        return current

    def save_settings(self, new_settings: AppSettings) -> AppSettings:
        provider = (new_settings.llm_provider or "local").lower()

        if provider == "gemini":
            if new_settings.gemini_api_key and not new_settings.llm_api_key:
                new_settings.llm_api_key = new_settings.gemini_api_key
            if new_settings.llm_api_key and not new_settings.gemini_api_key:
                new_settings.gemini_api_key = new_settings.llm_api_key
            if new_settings.gemini_model_name and (
                not new_settings.llm_model_name or new_settings.llm_model_name == "default"
            ):
                new_settings.llm_model_name = new_settings.gemini_model_name
            if not new_settings.llm_server_url:
                new_settings.llm_server_url = GEMINI_API_BASE
            else:
                new_settings.llm_server_url = new_settings.llm_server_url.strip().rstrip("/")
            if not new_settings.llm_model_name or new_settings.llm_model_name == "default":
                new_settings.llm_model_name = DEFAULT_GEMINI_MODEL
            new_settings.llm_model_name = normalize_gemini_model(new_settings.llm_model_name)
            new_settings.gemini_model_name = normalize_gemini_model(
                new_settings.gemini_model_name or new_settings.llm_model_name
            )
        elif provider == "mock":
            if not new_settings.llm_server_url:
                new_settings.llm_server_url = "http://mock.local"
            else:
                new_settings.llm_server_url = new_settings.llm_server_url.strip().rstrip("/")
        else:
            if not new_settings.llm_server_url:
                raise ValueError("LLM server URL is required for this provider")
            new_settings.llm_server_url = new_settings.llm_server_url.strip().rstrip("/")
            if not (
                new_settings.llm_server_url.startswith("http://")
                or new_settings.llm_server_url.startswith("https://")
            ):
                raise ValueError("LLM server URL must begin with http:// or https://")

        if not (1 <= new_settings.top_k <= 20):
            raise ValueError("Top-K must be between 1 and 20")

        if new_settings.chunk_size < 100 or new_settings.chunk_size > 5000:
            raise ValueError("Chunk size must be between 100 and 5000 words")
        if new_settings.chunk_overlap < 0 or new_settings.chunk_overlap >= new_settings.chunk_size:
            raise ValueError("Chunk overlap must be non-negative and smaller than chunk size")

        if not self.store_llm_keys():
            new_settings.llm_api_key = None
            new_settings.gemini_api_key = None

        self._settings = new_settings
        with open(self.settings_path, "w", encoding="utf-8") as f:
            f.write(new_settings.model_dump_json(indent=2))
        return self._settings

    @property
    def current(self) -> AppSettings:
        return self._settings


class _LiveSettings:
    """Always reads SettingsManager.current so saved settings apply without restart."""

    def __getattr__(self, name: str):
        return getattr(settings_manager.current, name)

    def __repr__(self) -> str:
        return repr(settings_manager.current)


settings_manager = SettingsManager()
settings = _LiveSettings()
