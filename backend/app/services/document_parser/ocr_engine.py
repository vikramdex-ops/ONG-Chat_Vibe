"""Multi-layer OCR for scanned / image-heavy engineering pages.

Layers (all free):
  1. RapidOCR ONNX — always bundled, no Tesseract binary
  2. Tesseract — if the binary is on PATH
  3. Gemini Vision — only when the visitor's own free key is present
     and local engines still produced thin text

The richest result wins. Close runners are merged so numbers from one
engine and headings from another both land in the chunk.
"""

from __future__ import annotations

import base64
import io
import os
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageFilter, ImageOps

from app.core.logging_service import app_logger

_rapid = None
_rapid_failed = False
_rapid_lock = threading.Lock()
_index_ocr_key: Optional[str] = None
_index_ocr_lock = threading.Lock()

try:
    import pytesseract
except ImportError:
    pytesseract = None

_tesseract_ok: Optional[bool] = None


@dataclass
class OcrCandidate:
    engine: str
    text: str
    score: float = 0.0


@dataclass
class OcrResult:
    text: str
    engine: str
    score: float
    layers: List[OcrCandidate] = field(default_factory=list)


def set_index_ocr_key(key: Optional[str]) -> None:
    """Capture the browser Gemini key when indexing starts (request is gone later)."""
    global _index_ocr_key
    with _index_ocr_lock:
        _index_ocr_key = (key or "").strip() or None


def active_ocr_key() -> Optional[str]:
    from app.core.request_context import request_api_key

    return request_api_key() or _index_ocr_key


def tesseract_available() -> bool:
    global _tesseract_ok
    if _tesseract_ok is not None:
        return _tesseract_ok
    if pytesseract is None:
        _tesseract_ok = False
        return False
    try:
        pytesseract.get_tesseract_version()
        _tesseract_ok = True
    except Exception:
        _tesseract_ok = False
    return _tesseract_ok


def rapidocr_available() -> bool:
    return _load_rapidocr() is not None


def engine_status() -> Dict[str, object]:
    return {
        "rapidocr": rapidocr_available(),
        "tesseract": tesseract_available(),
        "gemini_vision": bool(active_ocr_key()),
        "layers": [
            "pdf-text-layer",
            "rapidocr-onnx",
            "tesseract" if tesseract_available() else "tesseract (not installed)",
            "gemini-vision (user key, scanned pages only)",
        ],
    }


def score_text(text: str) -> float:
    """Higher is better. Rewards length, alphanumerics, and real words."""
    if not text:
        return 0.0
    cleaned = text.strip()
    if not cleaned:
        return 0.0
    alnum = sum(ch.isalnum() for ch in cleaned)
    letters = sum(ch.isalpha() for ch in cleaned)
    digits = sum(ch.isdigit() for ch in cleaned)
    ratio = alnum / max(len(cleaned), 1)
    words = [w for w in cleaned.split() if any(ch.isalnum() for ch in w)]
    # Engineering pages have lots of numbers — keep them.
    return round(len(cleaned) * (0.35 + 0.65 * ratio) + 2.4 * len(words) + 0.8 * digits + 0.15 * letters, 2)


def _load_rapidocr():
    global _rapid, _rapid_failed
    if _rapid is not None or _rapid_failed:
        return _rapid
    with _rapid_lock:
        if _rapid is not None or _rapid_failed:
            return _rapid
        try:
            try:
                from rapidocr_onnxruntime import RapidOCR
            except ImportError:
                from rapidocr import RapidOCR
            app_logger.info("OCR", "Loading ONNX RapidOCR...")
            _rapid = RapidOCR()
            app_logger.success("OCR", "ONNX RapidOCR ready.")
            return _rapid
        except Exception as exc:
            _rapid_failed = True
            app_logger.warning("OCR", f"ONNX RapidOCR unavailable ({exc}).")
            return None


def _pil_from_array(image_array: np.ndarray) -> Image.Image:
    arr = image_array
    if arr.ndim == 2:
        return Image.fromarray(arr).convert("RGB")
    if arr.shape[2] == 4:
        arr = arr[:, :, :3]
    elif arr.shape[2] == 1:
        arr = np.repeat(arr, 3, axis=2)
    return Image.fromarray(arr.astype("uint8")).convert("RGB")


def preprocess_for_ocr(image_array: np.ndarray) -> np.ndarray:
    """Upscale small scans, boost contrast, light denoise — no OpenCV required."""
    img = _pil_from_array(image_array)
    width, height = img.size
    long_edge = max(width, height)
    if long_edge < 1400:
        scale = 1400 / max(long_edge, 1)
        img = img.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
    gray = ImageOps.grayscale(img)
    gray = ImageOps.autocontrast(gray, cutoff=1)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    # Keep a 3-channel array — RapidOCR expects HxWx3.
    rgb = Image.merge("RGB", (gray, gray, gray))
    return np.asarray(rgb)


def _parse_rapid_result(result) -> str:
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


def ocr_rapidocr(image_array: np.ndarray) -> str:
    engine = _load_rapidocr()
    if engine is None:
        return ""
    try:
        prepared = preprocess_for_ocr(image_array)
        return _parse_rapid_result(engine(prepared)).strip()
    except Exception as exc:
        app_logger.debug("OCR", f"RapidOCR failed: {exc}")
        return ""


def ocr_tesseract(image_array: np.ndarray) -> str:
    if not tesseract_available():
        return ""
    try:
        prepared = preprocess_for_ocr(image_array)
        img = Image.fromarray(prepared)
        # psm 6 = block of text (standards, datasheets). oem 3 = default LSTM.
        text = pytesseract.image_to_string(img, lang="eng", config="--oem 3 --psm 6") or ""
        return text.strip()
    except Exception as exc:
        app_logger.debug("OCR", f"Tesseract failed: {exc}")
        return ""


def ocr_gemini_vision(image_array: np.ndarray) -> str:
    """Free-tier Gemini vision using the visitor's own key. Last resort for scans."""
    key = active_ocr_key()
    if not key:
        return ""
    try:
        import httpx

        img = _pil_from_array(image_array)
        # Cap payload so a 200 dpi A1 sheet does not blow the request.
        img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82)
        b64 = base64.standard_b64encode(buf.getvalue()).decode("ascii")
        model = os.getenv("SQA_OCR_GEMINI_MODEL") or "gemini-2.5-flash"
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={key}"
        )
        payload = {
            "contents": [{
                "parts": [
                    {
                        "text": (
                            "Extract every readable character from this engineering page. "
                            "Keep original numbers, units, table rows, and clause IDs. "
                            "Return plain text only — no markdown, no commentary."
                        )
                    },
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                ]
            }],
            "generationConfig": {"temperature": 0.0, "maxOutputTokens": 2048},
        }
        with httpx.Client(timeout=25.0) as client:
            res = client.post(url, json=payload)
        if res.status_code >= 400:
            app_logger.debug("OCR", f"Gemini vision HTTP {res.status_code}")
            return ""
        data = res.json()
        parts = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [])
        )
        text = "".join(str(p.get("text") or "") for p in parts).strip()
        return text
    except Exception as exc:
        app_logger.debug("OCR", f"Gemini vision OCR failed: {exc}")
        return ""


def merge_texts(primary: str, secondary: str) -> str:
    """Keep primary, append lines from secondary that are not already present."""
    if not secondary:
        return primary
    if not primary:
        return secondary
    have = {line.strip().lower() for line in primary.splitlines() if line.strip()}
    extra = []
    for line in secondary.splitlines():
        key = line.strip().lower()
        if key and key not in have and len(key) > 3:
            extra.append(line.strip())
            have.add(key)
    if not extra:
        return primary
    return (primary.rstrip() + "\n" + "\n".join(extra)).strip()


def pick_best(candidates: List[OcrCandidate]) -> OcrResult:
    scored = []
    for item in candidates:
        text = (item.text or "").strip()
        if not text:
            continue
        scored.append(OcrCandidate(item.engine, text, score_text(text)))
    if not scored:
        return OcrResult(text="", engine="none", score=0.0, layers=candidates)
    scored.sort(key=lambda c: c.score, reverse=True)
    best = scored[0]
    merged = best.text
    used = [best.engine]
    for other in scored[1:]:
        if other.score >= best.score * 0.55:
            merged = merge_texts(merged, other.text)
            used.append(other.engine)
    return OcrResult(
        text=merged,
        engine="+".join(used),
        score=score_text(merged),
        layers=scored,
    )


def ocr_image_array(image_array: np.ndarray, allow_online: bool = True) -> str:
    """Back-compat helper used by older callers."""
    return ocr_multilayer(image_array, allow_online=allow_online).text


def ocr_multilayer(
    image_array: np.ndarray,
    allow_online: bool = True,
    native_text: str = "",
) -> OcrResult:
    candidates: List[OcrCandidate] = []
    if native_text and native_text.strip():
        candidates.append(OcrCandidate("pdf-text", native_text.strip(), score_text(native_text)))

    rapid = ocr_rapidocr(image_array)
    if rapid:
        candidates.append(OcrCandidate("rapidocr", rapid, score_text(rapid)))

    tess = ocr_tesseract(image_array)
    if tess:
        candidates.append(OcrCandidate("tesseract", tess, score_text(tess)))

    local = pick_best(candidates)
    local_thin = local.score < 180 or len(local.text) < 80
    if allow_online and local_thin:
        vision = ocr_gemini_vision(image_array)
        if vision:
            candidates.append(OcrCandidate("gemini-vision", vision, score_text(vision)))
            local = pick_best(candidates)
    return local


def page_to_array(page, dpi: int = 200) -> np.ndarray:
    pix = page.get_pixmap(dpi=dpi)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        arr = arr[:, :, :3]
    elif pix.n == 1:
        arr = np.repeat(arr, 3, axis=2)
    return arr
