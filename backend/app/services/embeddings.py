import os
import threading
from typing import List, Optional

from app.core.config import settings
from app.core.logging_service import app_logger

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("ORT_NUM_THREADS", "1")


def choose_embedding_backend() -> str:
    """torch/sentence-transformers locally; ONNX MiniLM on slim hosts like Render free."""
    forced = (os.getenv("SQA_EMBEDDING_BACKEND") or "").strip().lower()
    if forced in {"onnx", "minilm-onnx", "chroma"}:
        return "onnx"
    if forced in {"torch", "st", "sentence-transformers"}:
        return "torch"
    try:
        import sentence_transformers  # noqa: F401
        import torch  # noqa: F401
        return "torch"
    except Exception:
        return "onnx"


class EmbeddingService:
    """Manages sentence embedding generation using all-MiniLM-L6-v2."""

    _instance: Optional["EmbeddingService"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(EmbeddingService, cls).__new__(cls)
                cls._instance._model = None
                cls._instance._backend = choose_embedding_backend()
                cls._instance._model_name = settings.embedding_model_name
                cls._instance._device = cls._detect_device(cls._instance._backend)
                cls._instance._init_lock = threading.Lock()
            return cls._instance

    @staticmethod
    def _detect_device(backend: str) -> str:
        if backend == "onnx":
            return "onnx-cpu"
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

    @property
    def backend(self) -> str:
        return self._backend

    def get_model(self):
        if self._model is None:
            with self._init_lock:
                if self._model is None:
                    if self._backend == "onnx":
                        self._model = self._load_onnx()
                    else:
                        self._model = self._load_torch()
        return self._model

    def _load_onnx(self):
        from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

        app_logger.info("Embeddings", "Loading ONNX MiniLM-L6-v2 (torch-free, Render-safe)...")
        model = ONNXMiniLM_L6_V2()
        app_logger.success("Embeddings", "ONNX MiniLM-L6-v2 ready.")
        return model

    def _load_torch(self):
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            app_logger.warning(
                "Embeddings",
                "sentence-transformers unavailable; falling back to ONNX MiniLM.",
            )
            self._backend = "onnx"
            self._device = "onnx-cpu"
            return self._load_onnx()
        app_logger.info("Embeddings", f"Loading embedding model '{self._model_name}' on {self._device}...")
        model = SentenceTransformer(self._model_name, device=self._device)
        app_logger.success("Embeddings", f"Embedding model '{self._model_name}' loaded successfully.")
        return model

    def is_loaded(self) -> bool:
        return self._model is not None

    def embed_texts(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        if not texts:
            return []
        model = self.get_model()
        if self._backend == "onnx":
            step = min(batch_size, 16)
            vectors: List[List[float]] = []
            for i in range(0, len(texts), step):
                raw = model(texts[i:i + step])
                vectors.extend(self._coerce_vectors(raw))
            if len(vectors) != len(texts):
                raise RuntimeError(f"Embedding count mismatch: got {len(vectors)} for {len(texts)} texts")
            return vectors
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return self._coerce_vectors(embeddings)

    def embed_query(self, query: str) -> List[float]:
        vectors = self.embed_texts([query], batch_size=1)
        if not vectors:
            raise RuntimeError("Failed to embed query")
        return vectors[0]

    @staticmethod
    def _coerce_vectors(raw) -> List[List[float]]:
        if raw is None:
            return []
        if hasattr(raw, "tolist"):
            raw = raw.tolist()
        rows = []
        for vec in raw:
            if hasattr(vec, "tolist"):
                vec = vec.tolist()
            rows.append([float(x) for x in vec])
        return rows


embedding_service = EmbeddingService()
