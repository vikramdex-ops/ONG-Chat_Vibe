from typing import Optional
import numpy as np
from app.core.logging_service import app_logger

_engine = None
_engine_failed = False


def _load_rapidocr():
    global _engine, _engine_failed
    if _engine is not None or _engine_failed:
        return _engine
    try:
        try:
            from rapidocr_onnxruntime import RapidOCR
        except ImportError:
            from rapidocr import RapidOCR
        app_logger.info("OCR", "Loading ONNX RapidOCR (no Tesseract binary required)...")
        _engine = RapidOCR()
        app_logger.success("OCR", "ONNX RapidOCR is ready for scanned pages.")
        return _engine
    except Exception as exc:
        _engine_failed = True
        app_logger.warning("OCR", f"ONNX OCR unavailable ({exc}). Scanned pages will have little text.")
        return None


def ocr_image_array(image_array: np.ndarray) -> str:
    engine = _load_rapidocr()
    if engine is None:
        return ""
    try:
        result = engine(image_array)
        # rapidocr_onnxruntime: (list|None, elapse)
        # rapidocr >=1.4: RapidOCROutput with .txts
        if result is None:
            return ""
        if isinstance(result, tuple):
            rows = result[0] or []
            texts = []
            for row in rows:
                if isinstance(row, (list, tuple)) and len(row) >= 2:
                    texts.append(str(row[1]))
            return "\n".join(t for t in texts if t.strip())
        txts = getattr(result, "txts", None)
        if txts:
            return "\n".join(str(t) for t in txts if str(t).strip())
        return ""
    except Exception as exc:
        app_logger.debug("OCR", f"ONNX OCR failed on a page: {exc}")
        return ""
