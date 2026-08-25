from pathlib import Path
from typing import List, Dict, Any, Optional, Callable, Set, Iterable
import fitz  # PyMuPDF
import numpy as np
from app.core.config import IMAGES_DIR, settings
from app.core.logging_service import app_logger
from app.services.vector_db import sanitize_filename
from app.services.document_parser.ocr_engine import ocr_image_array

try:
    import pytesseract
except ImportError:
    pytesseract = None

_tesseract_available: Optional[bool] = None


class IndexingCancelled(Exception):
    """Raised when the user stops indexing mid-document."""


def tesseract_available() -> bool:
    global _tesseract_available
    if _tesseract_available is not None:
        return _tesseract_available
    if pytesseract is None:
        _tesseract_available = False
        return False
    try:
        pytesseract.get_tesseract_version()
        _tesseract_available = True
    except Exception:
        _tesseract_available = False
        return False
    return _tesseract_available


def _native_page_text(page) -> str:
    """Pull the PDF text layer. This is the primary chunk source — not OCR."""
    text = (page.get_text("text", sort=True) or "").strip()
    if len(text) >= settings.ocr_char_threshold:
        return text
    blocks = page.get_text("blocks") or []
    parts = []
    for block in blocks:
        if len(block) >= 5 and isinstance(block[4], str) and block[4].strip():
            parts.append(block[4].strip())
    joined = "\n".join(parts).strip()
    return joined if len(joined) > len(text) else text


def _ocr_page(page) -> str:
    """Fallback for scanned / image-only pages. Tesseract if present, else ONNX RapidOCR."""
    pix = page.get_pixmap(dpi=150)
    if tesseract_available():
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            return (pytesseract.image_to_string(img, lang="eng") or "").strip()
        except Exception:
            pass
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        arr = arr[:, :, :3]
    elif pix.n == 1:
        arr = np.repeat(arr, 3, axis=2)
    return ocr_image_array(arr)


def parse_pdf_document(
    file_path: Path,
    should_stop: Optional[Callable[[], bool]] = None,
    on_page: Optional[Callable[[int, int], None]] = None,
    skip_pages: Optional[Iterable[int]] = None,
) -> List[Dict[str, Any]]:
    """
    Build per-page text for chunking:
      1) PDF text layer (PyMuPDF) — works for born-digital standards
      2) OCR fallback — scanned pages only, when the text layer is thin
    """
    pdf_base_name = sanitize_filename(file_path.stem)
    page_data_list = []
    text_pages = 0
    ocr_pages = 0
    empty_pages = 0

    try:
        doc = fitz.open(file_path)
        total_pages = len(doc)
        app_logger.info(
            "PDFParser",
            f"Extracting text from '{file_path.name}' ({total_pages} pages) via PDF text layer, OCR only if a page is nearly empty.",
            document=file_path.name,
        )

        already: Set[int] = {int(p) for p in (skip_pages or [])}
        if already:
            app_logger.info(
                "PDFParser",
                f"Resuming '{file_path.name}' — skipping {len(already)} pages already in the store.",
                document=file_path.name,
            )

        for page_num in range(total_pages):
            if should_stop and should_stop():
                doc.close()
                raise IndexingCancelled(f"Stopped while reading {file_path.name} at page {page_num + 1}")
            if on_page:
                on_page(page_num + 1, total_pages)
            if (page_num + 1) in already:
                continue

            page = doc[page_num]
            page_text = _native_page_text(page)
            source = "text-layer"
            image_paths_on_page = []

            try:
                img_list = page.get_images(full=True)
                if img_list:
                    for img_index, img_info in enumerate(img_list):
                        if should_stop and should_stop():
                            doc.close()
                            raise IndexingCancelled(f"Stopped while reading {file_path.name} at page {page_num + 1}")
                        xref = img_info[0]
                        try:
                            base_image = page.parent.extract_image(xref)
                            if base_image:
                                image_bytes = base_image["image"]
                                image_ext = base_image.get("ext", "png")
                                image_filename = f"{pdf_base_name}_page_{page_num + 1}_img_{img_index}.{image_ext}"
                                save_path = IMAGES_DIR / image_filename
                                with open(save_path, "wb") as img_file:
                                    img_file.write(image_bytes)
                                image_paths_on_page.append(str(save_path))
                        except Exception as ex_img:
                            app_logger.warning("PDFParser", f"Page {page_num + 1}: Error extracting image xref {xref}: {ex_img}", document=file_path.name)
            except IndexingCancelled:
                raise
            except Exception as img_err:
                app_logger.warning("PDFParser", f"Page {page_num + 1}: Error scanning images: {img_err}", document=file_path.name)

            if len(page_text) < settings.ocr_char_threshold:
                if should_stop and should_stop():
                    doc.close()
                    raise IndexingCancelled(f"Stopped while reading {file_path.name} at page {page_num + 1}")
                ocr_text = _ocr_page(page)
                if len(ocr_text) > len(page_text):
                    page_text = ocr_text
                    source = "ocr"
                    ocr_pages += 1
                elif page_text:
                    text_pages += 1
                else:
                    empty_pages += 1
                    page_text = f"[Page {page_num + 1} has no extractable text layer. Figures on this page are stored as images.]"
            else:
                text_pages += 1

            page_data_list.append({
                "page": page_num + 1,
                "text": page_text.strip(),
                "image_paths": image_paths_on_page,
                "text_source": source,
            })

        doc.close()
        app_logger.success(
            "PDFParser",
            f"{file_path.name}: {text_pages} pages from PDF text, {ocr_pages} pages from OCR, {empty_pages} pages with no text.",
            document=file_path.name,
        )
        return page_data_list
    except IndexingCancelled:
        raise
    except Exception as e:
        app_logger.error("PDFParser", f"Failed to parse PDF {file_path.name}: {e}", document=file_path.name)
        raise
