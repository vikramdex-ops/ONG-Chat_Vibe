"""PyInstaller runtime hook — desktop defaults before app.core.config imports."""

import os
from pathlib import Path

os.environ.setdefault("SQA_EMBEDDING_BACKEND", "onnx")
os.environ.setdefault("SQA_DEFAULT_PROVIDER", "gemini")
os.environ.setdefault("SQA_STORE_LLM_KEYS", "0")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "1")

# Point Tesseract at the copy shipped next to the .exe / inside _internal.
try:
    import sys

    roots = []
    if getattr(sys, "frozen", False):
        roots.append(Path(sys.executable).resolve().parent)
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            roots.append(Path(meipass))
    for root in roots:
        for rel in ("tesseract/tesseract.exe", "tesseract-runtime/tesseract.exe"):
            exe = root / rel
            if exe.is_file():
                os.environ.setdefault("TESSDATA_PREFIX", str(exe.parent / "tessdata"))
                os.environ.setdefault("SQA_TESSERACT_CMD", str(exe))
                raise StopIteration
except StopIteration:
    pass
