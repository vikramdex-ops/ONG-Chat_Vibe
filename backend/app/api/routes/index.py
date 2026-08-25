from typing import Optional, List
from fastapi import APIRouter, HTTPException
from app.models.schemas import IndexStatus, IndexStartRequest
from app.core.logging_service import app_logger, LogEntry
from app.services.indexer import indexing_service, tracker

router = APIRouter(prefix="/api/index", tags=["Indexing"])


@router.post("/start", response_model=IndexStatus)
async def start_indexing_job(req: IndexStartRequest):
    current = indexing_service.get_status()
    if current.is_running and current.state != "stopping":
        raise HTTPException(status_code=400, detail="Indexing job is already running. Click Force stop first.")

    started = indexing_service.start_indexing(req)
    if not started:
        raise HTTPException(
            status_code=400,
            detail="Indexer is still winding down. Click Force stop, then Start again.",
        )

    return indexing_service.get_status()


@router.post("/stop", response_model=IndexStatus)
async def stop_indexing_job(force: bool = False):
    return indexing_service.stop_indexing(force=force)


@router.get("/status", response_model=IndexStatus)
async def get_indexing_status():
    return indexing_service.get_status()


@router.get("/logs", response_model=List[LogEntry])
async def get_indexing_logs(limit: int = 150, level: Optional[str] = None):
    return app_logger.get_recent_logs(limit=limit, level=level)


@router.post("/clear-logs")
async def clear_logs():
    app_logger.clear()
    return {"success": True}
