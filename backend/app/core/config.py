import json
import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
IMAGES_DIR = DATA_DIR / "images"
CHROMA_DIR = DATA_DIR / "chroma_db"
SETTINGS_FILE = DATA_DIR / "settings.json"
PROCESSED_FILES_LOG = DATA_DIR / "processed_files.json"
HISTORY_DB_PATH = DATA_DIR / "history.db"

# Ensure directories exist
for directory in [DATA_DIR, UPLOADS_DIR, IMAGES_DIR, CHROMA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


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
    llm_provider: str = "local"  # "local", "openai", "ollama", "mock"
    llm_server_url: str = "http://127.0.0.1:8000"
    llm_api_key: Optional[str] = None
    llm_model_name: str = "default"
    llm_max_tokens: int = 512
    llm_temperature: float = 0.6
    llm_stop_strings: List[str] = ["<|im_end|>", "<|endoftext|>", "\n\nUser:", "\n\nUSER:"]


class SettingsManager:
    """Manages application settings with persistent JSON storage."""
    
    def __init__(self, settings_path: Path = SETTINGS_FILE):
        self.settings_path = settings_path
        self._settings = self.load_settings()

    def load_settings(self) -> AppSettings:
        if self.settings_path.exists():
            try:
                with open(self.settings_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return AppSettings(**data)
            except Exception as e:
                print(f"[Config] Error loading settings, falling back to defaults: {e}")
        return AppSettings()

    def save_settings(self, settings: AppSettings) -> AppSettings:
        # Validate LLM URL
        if settings.llm_server_url:
            settings.llm_server_url = settings.llm_server_url.strip().rstrip("/")
            if not (settings.llm_server_url.startswith("http://") or settings.llm_server_url.startswith("https://")):
                raise ValueError("LLM server URL must begin with http:// or https://")
        
        # Validate Top-K
        if not (1 <= settings.top_k <= 20):
            raise ValueError("Top-K must be between 1 and 20")
            
        # Validate Chunking
        if settings.chunk_size < 100 or settings.chunk_size > 5000:
            raise ValueError("Chunk size must be between 100 and 5000 words")
        if settings.chunk_overlap < 0 or settings.chunk_overlap >= settings.chunk_size:
            raise ValueError("Chunk overlap must be non-negative and smaller than chunk size")

        self._settings = settings
        with open(self.settings_path, "w", encoding="utf-8") as f:
            f.write(settings.model_dump_json(indent=2))
        return self._settings

    @property
    def current(self) -> AppSettings:
        return self._settings


settings_manager = SettingsManager()
settings = settings_manager.current
