import re
import threading
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Set
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings, CHROMA_DIR
from app.core.logging_service import app_logger
from app.models.schemas import SourceContext, DocumentChunk


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to alphanumeric and underscores for deterministic IDs."""
    name = Path(filename).name
    clean = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    return clean.strip('_')


def generate_chunk_id(filename: str, page_num: int, chunk_idx: int) -> str:
    """Deterministic chunk ID format: <sanitized_filename>_page_<page>_chunk_<chunk_index>"""
    clean_name = sanitize_filename(filename)
    return f"{clean_name}_page_{page_num}_chunk_{chunk_idx}"


class VectorDBService:
    """Manages ChromaDB persistent vector storage for pdf_knowledge_base."""
    
    _instance: Optional["VectorDBService"] = None
    _lock = threading.RLock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(VectorDBService, cls).__new__(cls)
                cls._instance._client = None
                cls._instance._collection = None
                cls._instance._db_path = settings.chroma_db_path
                cls._instance._collection_name = settings.collection_name
                cls._instance._init_lock = threading.RLock()
            return cls._instance

    def _get_client(self) -> chromadb.PersistentClient:
        with self._init_lock:
            if self._client is None or self._db_path != settings.chroma_db_path:
                self._db_path = settings.chroma_db_path
                self._collection_name = settings.collection_name
                Path(self._db_path).mkdir(parents=True, exist_ok=True)
                app_logger.info("VectorDB", f"Connecting to ChromaDB at: {self._db_path}")
                self._client = chromadb.PersistentClient(
                    path=self._db_path,
                    settings=ChromaSettings(anonymized_telemetry=False, is_persistent=True)
                )
                self._collection = None
            return self._client

    def get_collection(self):
        with self._init_lock:
            if self._collection is None or self._collection_name != settings.collection_name:
                client = self._get_client()
                self._collection_name = settings.collection_name
                app_logger.info("VectorDB", f"Accessing collection: {self._collection_name}")
                self._collection = client.get_or_create_collection(
                    name=self._collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
            return self._collection

    def count(self) -> int:
        """Return total indexed chunks in the collection."""
        try:
            coll = self.get_collection()
            return coll.count()
        except Exception as e:
            app_logger.error("VectorDB", f"Failed to get collection count: {e}")
            return 0

    def query(self, query_embedding: List[float], top_k: int = 3) -> List[SourceContext]:
        """Perform similarity search for Top-K most relevant chunks."""
        coll = self.get_collection()
        total_count = coll.count()
        if total_count == 0:
            return []

        actual_k = min(top_k, total_count)
        results = coll.query(
            query_embeddings=[query_embedding],
            n_results=actual_k,
            include=["documents", "metadatas", "distances"]
        )

        sources: List[SourceContext] = []
        if not results or not results["documents"] or not results["documents"][0]:
            return sources

        docs = results["documents"][0]
        metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
        ids = results["ids"][0] if results.get("ids") else [""] * len(docs)
        distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

        for doc_id, doc_text, meta, dist in zip(ids, docs, metadatas, distances):
            meta = meta or {}
            source_file = meta.get("source", "Unknown Document")
            page = int(meta.get("page", 1))
            chunk_num = int(meta.get("chunk_in_page", 1))
            image_paths_str = meta.get("image_paths_str", "")
            
            image_paths = [p.strip() for p in image_paths_str.split("|") if p.strip()] if image_paths_str else []
            similarity = max(0.0, min(1.0, 1.0 - float(dist)))

            sources.append(
                SourceContext(
                    id=doc_id,
                    source=source_file,
                    page=page,
                    chunk=chunk_num,
                    text=doc_text,
                    score=round(similarity, 4),
                    image_paths=image_paths
                )
            )

        return sources

    def add_chunks_batch(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]]
    ) -> int:
        """Batch write chunks to ChromaDB with duplicate filtering."""
        if not ids:
            return 0

        coll = self.get_collection()
        
        try:
            existing_result = coll.get(ids=ids)
            existing_ids: Set[str] = set(existing_result.get("ids", [])) if existing_result else set()
        except Exception:
            existing_ids = set()

        filtered_ids = []
        filtered_docs = []
        filtered_embs = []
        filtered_metas = []

        for cid, doc, emb, meta in zip(ids, documents, embeddings, metadatas):
            if cid not in existing_ids:
                filtered_ids.append(cid)
                filtered_docs.append(doc)
                filtered_embs.append(emb)
                filtered_metas.append(meta)

        if not filtered_ids:
            app_logger.info("VectorDB", f"All {len(ids)} chunks already exist in database. Skipping duplicate insertion.")
            return 0

        batch_size = settings.batch_write_size
        total_added = 0
        for i in range(0, len(filtered_ids), batch_size):
            b_ids = filtered_ids[i:i + batch_size]
            b_docs = filtered_docs[i:i + batch_size]
            b_embs = filtered_embs[i:i + batch_size]
            b_metas = filtered_metas[i:i + batch_size]

            coll.upsert(
                ids=b_ids,
                documents=b_docs,
                embeddings=b_embs,
                metadatas=b_metas
            )
            total_added += len(b_ids)

        app_logger.success("VectorDB", f"Added {total_added} new chunks to ChromaDB collection '{self._collection_name}'.")
        return total_added

    def delete_document_chunks(self, filename: str) -> int:
        """Delete all chunks for a specific document filename."""
        coll = self.get_collection()
        try:
            results = coll.get(where={"source": filename})
            ids_to_delete = results.get("ids", [])
            if ids_to_delete:
                coll.delete(ids=ids_to_delete)
                app_logger.info("VectorDB", f"Deleted {len(ids_to_delete)} chunks for '{filename}'.")
                return len(ids_to_delete)
        except Exception as e:
            app_logger.error("VectorDB", f"Failed to delete chunks for '{filename}': {e}")
        return 0

    def get_all_document_stats(self) -> List[Dict[str, Any]]:
        """Get summary of indexed documents with chunk and page counts."""
        coll = self.get_collection()
        try:
            results = coll.get(include=["metadatas"])
            metadatas = results.get("metadatas", [])
            
            doc_map: Dict[str, Dict[str, Any]] = {}
            for meta in metadatas:
                if not meta:
                    continue
                source = meta.get("source", "Unknown")
                page = int(meta.get("page", 1))
                image_paths_str = meta.get("image_paths_str", "")
                img_count = len([p for p in image_paths_str.split("|") if p.strip()]) if image_paths_str else 0

                if source not in doc_map:
                    doc_map[source] = {
                        "filename": source,
                        "chunk_count": 0,
                        "pages": set(),
                        "image_count": 0
                    }
                doc_map[source]["chunk_count"] += 1
                doc_map[source]["pages"].add(page)
                doc_map[source]["image_count"] += img_count

            summary = []
            for src, data in doc_map.items():
                ext = Path(src).suffix.lower()
                file_type = "PDF" if ext == ".pdf" else ("PPTX" if ext in [".pptx", ".ppt"] else ("DOCX" if ext in [".docx", ".doc"] else "OTHER"))
                summary.append({
                    "id": sanitize_filename(src),
                    "filename": src,
                    "file_type": file_type,
                    "page_count": len(data["pages"]),
                    "chunk_count": data["chunk_count"],
                    "image_count": data["image_count"],
                    "status": "indexed"
                })
            return summary
        except Exception as e:
            app_logger.error("VectorDB", f"Failed to get document stats: {e}")
            return []

    def get_document_chunks(self, filename: str) -> List[DocumentChunk]:
        """Retrieve all indexed chunks for a specific document."""
        coll = self.get_collection()
        try:
            results = coll.get(where={"source": filename}, include=["documents", "metadatas"])
            ids = results.get("ids", [])
            docs = results.get("documents", [])
            metas = results.get("metadatas", [])

            chunks: List[DocumentChunk] = []
            for cid, doc, meta in zip(ids, docs, metas):
                meta = meta or {}
                page = int(meta.get("page", 1))
                chunk_idx = int(meta.get("chunk_in_page", 1))
                img_str = meta.get("image_paths_str", "")
                img_list = [p.strip() for p in img_str.split("|") if p.strip()] if img_str else []

                chunks.append(
                    DocumentChunk(
                        id=cid,
                        doc_name=filename,
                        page_number=page,
                        chunk_index=chunk_idx,
                        text=doc,
                        image_paths=img_list
                    )
                )
            chunks.sort(key=lambda x: (x.page_number, x.chunk_index))
            return chunks
        except Exception as e:
            app_logger.error("VectorDB", f"Failed to get chunks for '{filename}': {e}")
            return []


vector_db_service = VectorDBService()
