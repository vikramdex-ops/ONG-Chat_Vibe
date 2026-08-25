"""PyInstaller runtime hook — desktop defaults before app.core.config imports."""

import os

os.environ.setdefault("SQA_EMBEDDING_BACKEND", "onnx")
os.environ.setdefault("SQA_DEFAULT_PROVIDER", "gemini")
os.environ.setdefault("SQA_STORE_LLM_KEYS", "0")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "1")
