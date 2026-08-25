import io
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
import fitz  # PyMuPDF
from PIL import Image
from app.core.config import IMAGES_DIR, settings
from app.core.logging_service import app_logger
from app.services.vector_db import sanitize_filename

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
        app_logger.info("PDFParser", "Tesseract is not installed; OCR fallback is disabled.")
    return _tesseract_available


def parse_pdf_document(
    file_path: Path,
    should_stop: Optional[Callable[[], bool]] = None,
    on_page: Optional[Callable[[int, int], None]] = None,
) -> List[Dict[str, Any]]:
    """
    Extracts text and images from each page of a PDF document.
    Performs OCR fallback when page text is less than ocr_char_threshold (default 50 chars).
    Returns list of dicts: [{'page': int, 'text': str, 'image_paths': List[str]}, ...]
    """
    pdf_base_name = sanitize_filename(file_path.stem)
    page_data_list = []

    try:
        doc = fitz.open(file_path)
        total_pages = len(doc)
        app_logger.debug("PDFParser", f"Parsing PDF '{file_path.name}' ({total_pages} pages)", document=file_path.name)

        for page_num in range(total_pages):
            if should_stop and should_stop():
                doc.close()
                raise IndexingCancelled(f"Stopped while reading {file_path.name} at page {page_num + 1}")
            if on_page:
                on_page(page_num + 1, total_pages)

            page = doc[page_num]
            page_text = page.get_text("text", sort=True)
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

            if len(page_text.strip()) < settings.ocr_char_threshold and tesseract_available():
                try:
                    pix = page.get_pixmap(dpi=300)
                    img_data = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_data))
                    ocr_text = pytesseract.image_to_string(img, lang="eng")
                    if len(ocr_text.strip()) > len(page_text.strip()) + 100:
                        app_logger.info("PDFParser", f"Page {page_num + 1}: OCR improved text length from {len(page_text)} to {len(ocr_text)} chars", document=file_path.name)
                        page_text = ocr_text
                except Exception as ocr_err:
                    app_logger.debug("PDFParser", f"Page {page_num + 1}: OCR skipped/failed ({ocr_err})", document=file_path.name)

            if page_text.strip() or image_paths_on_page:
                page_data_list.append({
                    "page": page_num + 1,
                    "text": page_text.strip(),
                    "image_paths": image_paths_on_page
                })

        doc.close()
        return page_data_list
    except IndexingCancelled:
        raise
    except Exception as e:
        app_logger.error("PDFParser", f"Failed to parse PDF {file_path.name}: {e}", document=file_path.name)
        raise
