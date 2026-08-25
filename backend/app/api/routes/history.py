from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.models.schemas import HistoryItem
from app.services.history import history_service

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=List[HistoryItem])
async def get_history(limit: int = 50, search: Optional[str] = None):
    return history_service.get_entries(limit=limit, search=search)


@router.delete("/{entry_id}")
async def delete_history_item(entry_id: str):
    deleted = history_service.delete_entry(entry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found.")
    return {"success": True}


@router.delete("")
async def clear_history():
    count = history_service.clear_all()
    return {"success": True, "cleared_count": count}
