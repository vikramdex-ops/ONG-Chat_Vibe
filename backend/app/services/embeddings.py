import threading
from typing import List, Optional
from app.core.config import settings
from app.core.logging_service import app_logger


class EmbeddingService:
    """Manages sentence embedding generation using all-MiniLM-L6-v2."""

    _instance: Optional["EmbeddingService"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(EmbeddingService, cls).__new__(cls)
                cls._instance._model = None
                cls._instance._model_name = settings.embedding_model_name
                cls._instance._device = cls._detect_device()
                cls._instance._init_lock = threading.Lock()
            return cls._instance

    @staticmethod
    def _detect_device() -> str:
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def device(self) -> str:
        return self._device

    def get_model(self):
        if self._model is None:
            with self._init_lock:
                if self._model is None:
                    try:
                        from sentence_transformers import SentenceTransformer
                    except ImportError as exc:
                        raise RuntimeError(
                            "sentence-transformers is not installed. "
                            "Install it to generate embeddings and run queries."
                        ) from exc
                    app_logger.info("Embeddings", f"Loading embedding model '{self._model_name}' on {self._device}...")
                    self._model = SentenceTransformer(self._model_name, device=self._device)
                    app_logger.success("Embeddings", f"Embedding model '{self._model_name}' loaded successfully.")
        return self._model

    def is_loaded(self) -> bool:
        return self._model is not None

    def embed_texts(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        if not texts:
            return []
        model = self.get_model()
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        model = self.get_model()
        embedding = model.encode(
            query,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.tolist()


embedding_service = EmbeddingService()
