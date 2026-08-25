import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from app.core.config import UPLOADS_DIR
from app.models.schemas import DocumentInfo, DocumentChunk
from app.services.vector_db import vector_db_service
from app.services.indexer import tracker, SUPPORTED_EXTENSIONS
from app.core.logging_service import app_logger

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("", response_model=List[DocumentInfo])
async def list_documents():
    stats = vector_db_service.get_all_document_stats()
    
    # Also discover uploaded files that may not be indexed yet
    indexed_files = {s["filename"] for s in stats}
    unindexed = []
    
    if UPLOADS_DIR.exists():
        for p in UPLOADS_DIR.iterdir():
            if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
                if p.name not in indexed_files:
                    ext = p.suffix.lower()
                    file_type = "PDF" if ext == ".pdf" else ("PPTX" if ext in [".pptx", ".ppt"] else "DOCX")
                    unindexed.append(
                        DocumentInfo(
                            id=p.stem,
                            filename=p.name,
                            file_type=file_type,
                            size_bytes=p.stat().st_size,
                            page_count=0,
                            chunk_count=0,
                            image_count=0,
                            status="unindexed"
                        )
                    )

    docs = [
        DocumentInfo(
            id=s["id"],
            filename=s["filename"],
            file_type=s["file_type"],
            size_bytes=0,
            page_count=s["page_count"],
            chunk_count=s["chunk_count"],
            image_count=s["image_count"],
            status="indexed"
        )
        for s in stats
    ]
    
    return docs + unindexed


@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    saved_files = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            app_logger.warning("DocsAPI", f"Uploaded unsupported file '{file.filename}' rejected.")
            continue

        target_path = UPLOADS_DIR / file.filename
        try:
            with open(target_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(file.filename)
            app_logger.info("DocsAPI", f"Saved uploaded document: {file.filename}")
        except Exception as e:
            app_logger.error("DocsAPI", f"Failed saving file {file.filename}: {e}")

    return {
        "success": True,
        "uploaded_count": len(saved_files),
        "files": saved_files
    }


@router.get("/{filename}/chunks", response_model=List[DocumentChunk])
async def get_document_chunks(filename: str):
    chunks = vector_db_service.get_document_chunks(filename)
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for this document.")
    return chunks


@router.get("/{filename}/file")
async def get_raw_document_file(filename: str):
    # Check uploads directory first
    target = UPLOADS_DIR / filename
    if target.exists():
        return FileResponse(target)
        
    # Check if file exists across disk or in data directory
    raise HTTPException(status_code=404, detail="Original document file not found on server.")


@router.delete("/{filename}")
async def delete_document(filename: str):
    deleted_chunks = vector_db_service.delete_document_chunks(filename)
    tracker.remove(filename)
    
    # Try deleting uploaded file
    target = UPLOADS_DIR / filename
    if target.exists():
        try:
            target.unlink()
        except Exception:
            pass

    return {
        "success": True,
        "deleted_chunks": deleted_chunks,
        "filename": filename
    }
