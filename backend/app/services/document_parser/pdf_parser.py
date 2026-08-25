from pathlib import Path
from typing import List, Dict, Any, Optional, Callable, Set, Iterable, Tuple
import fitz  # PyMuPDF
from app.core.config import IMAGES_DIR, settings
from app.core.logging_service import app_logger
from app.services.vector_db import sanitize_filename
from app.services.document_parser.ocr_engine import (
    ocr_multilayer,
    page_to_array,
    score_text,
)


class IndexingCancelled(Exception):
    """Raised when the user stops indexing mid-document."""


def _native_page_text(page) -> str:
    """Pull the PDF text layer. This is the primary chunk source — not OCR."""
    text = (page.get_text("text", sort=True) or "").strip()
    blocks = page.get_text("blocks") or []
    parts = []
    for block in blocks:
        if len(block) >= 5 and isinstance(block[4], str) and block[4].strip():
            parts.append(block[4].strip())
    joined = "\n".join(parts).strip()
    if score_text(joined) > score_text(text):
        text = joined
    try:
        finder = getattr(page, "find_tables", None)
        if finder:
            tables = finder()
            rows = []
            for table in getattr(tables, "tables", []) or []:
                for row in table.extract() or []:
                    cells = [str(c).strip() for c in row if c and str(c).strip()]
                    if cells:
                        rows.append(" | ".join(cells))
            table_text = "\n".join(rows).strip()
            if table_text and score_text(table_text) > 40:
                text = (text + "\n" + table_text).strip() if text else table_text
    except Exception:
        pass
    return text


def _ocr_page(page, native_text: str = "") -> Tuple[str, str]:
    """Run RapidOCR + Tesseract (+ Gemini vision if the page is still thin)."""
    arr = page_to_array(page, dpi=200)
    result = ocr_multilayer(arr, allow_online=True, native_text=native_text)
    return result.text, result.engine


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

            native_score = score_text(page_text)
            needs_ocr = len(page_text) < settings.ocr_char_threshold or native_score < 90
            if needs_ocr:
                if should_stop and should_stop():
                    doc.close()
                    raise IndexingCancelled(f"Stopped while reading {file_path.name} at page {page_num + 1}")
                ocr_text, ocr_engine = _ocr_page(page, native_text=page_text)
                if score_text(ocr_text) > native_score and len(ocr_text) > len(page_text):
                    page_text = ocr_text
                    source = ocr_engine or "ocr"
                    ocr_pages += 1
                    app_logger.info(
                        "PDFParser",
                        f"Page {page_num + 1}: OCR layers produced {len(page_text)} chars via {source}.",
                        document=file_path.name,
                    )
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
