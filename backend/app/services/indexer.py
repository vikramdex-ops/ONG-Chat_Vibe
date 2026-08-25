import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from app.core.config import (
    UPLOADS_DIR,
    PROCESSED_FILES_LOG,
    settings,
    SETTINGS_FILE
)
from app.core.logging_service import app_logger
from app.models.schemas import IndexStatus, IndexStartRequest
from app.services.vector_db import (
    vector_db_service,
    generate_chunk_id,
    sanitize_filename
)
from app.services.embeddings import embedding_service
from app.services.document_parser.chunker import simple_chunker
from app.services.document_parser.pdf_parser import parse_pdf_document
from app.services.document_parser.pptx_parser import parse_pptx_document
from app.services.document_parser.docx_parser import parse_docx_document


SUPPORTED_EXTENSIONS = {".pdf", ".pptx", ".docx"}


class ProcessedFilesTracker:
    """Tracks successfully indexed files for resumable indexing."""

    def __init__(self, log_path: Path = PROCESSED_FILES_LOG):
        self.log_path = log_path
        self._lock = threading.Lock()
        self.processed_files: Set[str] = self._load()

    def _load(self) -> Set[str]:
        if self.log_path.exists():
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return set(data)
            except Exception as e:
                app_logger.warning("Indexer", f"Could not load processed files log: {e}")
        return set()

    def is_processed(self, file_path: str) -> bool:
        with self._lock:
            return str(Path(file_path).resolve()) in self.processed_files or Path(file_path).name in self.processed_files

    def mark_processed(self, file_path: str):
        with self._lock:
            self.processed_files.add(str(Path(file_path).resolve()))
            self.processed_files.add(Path(file_path).name)
            self._save()

    def remove(self, filename: str):
        with self._lock:
            to_remove = [f for f in self.processed_files if Path(f).name == filename or f == filename]
            for f in to_remove:
                self.processed_files.discard(f)
            self._save()

    def _save(self):
        try:
            with open(self.log_path, "w", encoding="utf-8") as f:
                json.dump(list(self.processed_files), f, indent=2)
        except Exception as e:
            app_logger.error("Indexer", f"Failed to save processed files log: {e}")


tracker = ProcessedFilesTracker()


class IndexingService:
    """Manages multithreaded, resumable background document indexing."""

    _instance: Optional["IndexingService"] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(IndexingService, cls).__new__(cls)
                cls._instance._is_running = False
                cls._instance._stop_requested = False
                cls._instance._thread: Optional[threading.Thread] = None
                cls._instance._status = IndexStatus()
                cls._instance._status_lock = threading.Lock()
            return cls._instance

    def get_status(self) -> IndexStatus:
        with self._status_lock:
            return self._status.model_copy()

    def stop_indexing(self) -> bool:
        if not self._is_running:
            return False
        app_logger.warning("Indexer", "Stop indexing requested by user.")
        self._stop_requested = True
        with self._status_lock:
            self._status.state = "stopping"
            self._status.current_operation = "Stopping background workers..."
        return True

    def start_indexing(self, req: IndexStartRequest) -> bool:
        if self._is_running:
            return False

        self._is_running = True
        self._stop_requested = False
        self._thread = threading.Thread(
            target=self._run_indexing_job,
            args=(req,),
            daemon=True
        )
        self._thread.start()
        return True

    def _scan_directory(self, directory: Path) -> List[Path]:
        found_files = []
        if not directory.exists():
            return found_files

        for ext in SUPPORTED_EXTENSIONS:
            found_files.extend(list(directory.rglob(f"*{ext}")))
            found_files.extend(list(directory.rglob(f"*{ext.upper()}")))

        # Deduplicate
        unique_paths = {}
        for p in found_files:
            unique_paths[str(p.resolve())] = p
        return list(unique_paths.values())

    def _process_single_file(
        self,
        file_path: Path,
        chunk_size: int,
        chunk_overlap: int
    ) -> List[Dict[str, Any]]:
        """Extract pages and create text chunks for a single file."""
        ext = file_path.suffix.lower()
        file_name = file_path.name
        
        if ext == ".pdf":
            pages_data = parse_pdf_document(file_path)
        elif ext == ".pptx":
            pages_data = parse_pptx_document(file_path)
        elif ext == ".docx":
            pages_data = parse_docx_document(file_path)
        else:
            app_logger.warning("Indexer", f"Skipping unsupported file type: {file_name}")
            return []

        chunks = []
        for page_data in pages_data:
            page_num = page_data["page"]
            page_text = page_data["text"]
            img_paths = page_data["image_paths"]

            page_chunks = simple_chunker(page_text, chunk_size, chunk_overlap)
            if not page_chunks and img_paths:
                page_chunks = [f"Images present on page/slide {page_num}."]

            for i, chunk_text in enumerate(page_chunks):
                cid = generate_chunk_id(file_name, page_num, i)
                meta = {
                    "source": file_name,
                    "page": int(page_num),
                    "chunk_in_page": int(i + 1),
                    "image_paths_str": "|".join(img_paths)
                }
                chunks.append({
                    "id": cid,
                    "text": chunk_text,
                    "metadata": meta
                })

        return chunks

    def _run_indexing_job(self, req: IndexStartRequest):
        start_time = time.time()
        target_dir = Path(req.directory_path) if req.directory_path else UPLOADS_DIR
        worker_count = req.worker_count or settings.worker_count
        chunk_size = req.chunk_size or settings.chunk_size
        chunk_overlap = req.chunk_overlap or settings.chunk_overlap

        app_logger.info("Indexer", f"Starting indexing scan in directory: {target_dir}")
        with self._status_lock:
            self._status = IndexStatus(
                is_running=True,
                state="scanning",
                current_operation="Scanning document library...",
                total_files=0,
                processed_files=0
            )

        try:
            # 1. Discover files
            all_files = self._scan_directory(target_dir)
            total_discovered = len(all_files)

            # 2. Filter out already processed files (Resumable feature)
            pending_files = [f for f in all_files if not tracker.is_processed(str(f))]
            skipped_count = total_discovered - len(pending_files)

            app_logger.info("Indexer", f"Scan complete: {total_discovered} found, {skipped_count} previously indexed, {len(pending_files)} new.")

            if not pending_files:
                app_logger.info("Indexer", "All discovered files are already indexed. Knowledge base is up to date.")
                with self._status_lock:
                    self._status.state = "completed"
                    self._status.is_running = False
                    self._status.percentage = 100.0
                    self._status.current_operation = "All documents up to date"
                return

            with self._status_lock:
                self._status.total_files = len(pending_files)
                self._status.state = "processing"

            total_chunks_added = 0
            accumulated_chunks = []

            for index, file_path in enumerate(pending_files):
                if self._stop_requested:
                    app_logger.warning("Indexer", "Indexing stopped by user during file processing.")
                    with self._status_lock:
                        self._status.state = "stopped"
                        self._status.is_running = False
                        self._status.current_operation = "Stopped by user"
                    return

                file_name = file_path.name
                elapsed = time.time() - start_time
                percent = round((index / len(pending_files)) * 100, 1)
                eta = round((elapsed / (index + 1)) * (len(pending_files) - index), 1) if index > 0 else 0.0

                with self._status_lock:
                    self._status.processed_files = index
                    self._status.percentage = percent
                    self._status.current_file = file_name
                    self._status.current_operation = f"Extracting & chunking ({index + 1}/{len(pending_files)})"
                    self._status.elapsed_seconds = round(elapsed, 1)
                    self._status.estimated_remaining_seconds = eta

                app_logger.info("Indexer", f"Processing {file_name}...", document=file_name)

                try:
                    file_chunks = self._process_single_file(file_path, chunk_size, chunk_overlap)
                    if file_chunks:
                        accumulated_chunks.extend(file_chunks)
                        app_logger.success("Indexer", f"Extracted {len(file_chunks)} chunks from {file_name}", document=file_name)

                    # Mark file as successfully processed
                    tracker.mark_processed(str(file_path))

                except Exception as file_err:
                    app_logger.error("Indexer", f"Error processing {file_name}: {file_err}", document=file_name)

                # Batch embed & write when buffer reaches threshold
                if len(accumulated_chunks) >= settings.batch_write_size:
                    total_chunks_added += self._flush_chunks(accumulated_chunks)
                    accumulated_chunks.clear()

            # Flush remaining chunks
            if accumulated_chunks:
                total_chunks_added += self._flush_chunks(accumulated_chunks)
                accumulated_chunks.clear()

            elapsed_total = round(time.time() - start_time, 1)
            app_logger.success("Indexer", f"Indexing completed successfully! Added {total_chunks_added} chunks in {elapsed_total}s.")

            with self._status_lock:
                self._status.is_running = False
                self._status.state = "completed"
                self._status.processed_files = len(pending_files)
                self._status.percentage = 100.0
                self._status.current_file = None
                self._status.current_operation = "Indexing completed"
                self._status.elapsed_seconds = elapsed_total
                self._status.estimated_remaining_seconds = 0.0
                self._status.total_chunks_indexed = total_chunks_added

        except Exception as e:
            app_logger.error("Indexer", f"Indexing job failed: {e}")
            with self._status_lock:
                self._status.is_running = False
                self._status.state = "failed"
                self._status.error = str(e)
                self._status.current_operation = f"Failed: {e}"
        finally:
            self._is_running = False

    def _flush_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Embeds and writes chunk batch to ChromaDB."""
        if not chunks:
            return 0

        app_logger.info("Indexer", f"Generating embeddings for {len(chunks)} chunks...")
        with self._status_lock:
            self._status.current_operation = f"Generating embeddings for {len(chunks)} chunks..."

        texts = [c["text"] for c in chunks]
        embeddings = embedding_service.embed_texts(texts)

        ids = [c["id"] for c in chunks]
        metas = [c["metadata"] for c in chunks]

        app_logger.info("Indexer", f"Writing {len(chunks)} vectors to ChromaDB...")
        with self._status_lock:
            self._status.current_operation = f"Writing {len(chunks)} vectors to ChromaDB..."

        added = vector_db_service.add_chunks_batch(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metas
        )
        return added


indexing_service = IndexingService()
