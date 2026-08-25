from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.logging_service import app_logger
from app.core.storage import relocate_data_dir, storage_snapshot
from app.services.document_parser.ocr_engine import engine_status

router = APIRouter(prefix="/api/storage", tags=["Storage"])


class RelocateRequest(BaseModel):
    data_dir: str = Field(..., min_length=2, description="Full folder path, e.g. D:\\\\SQA-OG")
    move_existing: bool = True


@router.get("")
async def get_storage():
    snap = storage_snapshot()
    snap["ocr"] = engine_status()
    return snap


@router.post("/relocate")
async def relocate_storage(req: RelocateRequest):
    try:
        snap = relocate_data_dir(req.data_dir.strip(), move_existing=req.move_existing)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        app_logger.error("Storage", f"Relocate failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Could not move the knowledge base: {exc}") from exc
    app_logger.success("Storage", f"Knowledge base is now at {snap['data_dir']}")
    snap["ocr"] = engine_status()
    snap["success"] = True
    return snap
