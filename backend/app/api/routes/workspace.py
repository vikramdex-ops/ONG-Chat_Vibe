import io
import json
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, StreamingResponse

from app.core.config import DATA_DIR, IMAGES_DIR, settings, settings_manager
from app.models.schemas import AuthRequest, BookmarkCreate, BookmarkItem, BriefingRequest
from app.services.history import history_service

router = APIRouter(prefix="/api", tags=["Workspace"])


@router.post("/auth/login")
async def login(req: AuthRequest):
    name = (req.display_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Display name is required.")
    expected = (settings.team_passcode or "").strip()
    if expected and (req.passcode or "").strip() != expected:
        raise HTTPException(status_code=403, detail="Team passcode is incorrect.")
    return {
        "success": True,
        "display_name": name,
        "team_name": settings.team_name or "SQA-O&G Team",
        "shared_history": True,
    }


@router.get("/bookmarks", response_model=List[BookmarkItem])
async def list_bookmarks():
    return history_service.list_bookmarks()


@router.post("/bookmarks", response_model=BookmarkItem)
async def create_bookmark(req: BookmarkCreate):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")
    return history_service.add_bookmark(req.name, req.question.strip(), req.history_id, req.collection)


@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str):
    if not history_service.delete_bookmark(bookmark_id):
        raise HTTPException(status_code=404, detail="Bookmark not found.")
    return {"success": True}


@router.get("/history/{entry_id}")
async def get_history_entry(entry_id: str):
    item = history_service.get_entry(entry_id)
    if not item:
        raise HTTPException(status_code=404, detail="History entry not found.")
    return item


@router.get("/kb/export")
async def export_kb_pack():
    chroma = Path(settings.chroma_db_path)
    images = Path(IMAGES_DIR)
    sibling_images = chroma.parent / "images"
    buf = io.BytesIO()
    manifest = {
        "app": "SQA-O&G",
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "collection": settings.collection_name,
        "embedding_model": settings.embedding_model_name,
    }
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
        if chroma.exists():
            for path in chroma.rglob("*"):
                if path.is_file():
                    zf.write(path, arcname=str(Path("chroma_db") / path.relative_to(chroma)))
        image_root = sibling_images if sibling_images.exists() else images
        if image_root.exists():
            for path in image_root.rglob("*"):
                if path.is_file():
                    zf.write(path, arcname=str(Path("images") / path.relative_to(image_root)))
    buf.seek(0)
    filename = f"sqa-kb-{datetime.utcnow().strftime('%Y%m%d')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/kb/import")
async def import_kb_pack(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip knowledge-base pack.")
    dest = DATA_DIR / "imported_kb"
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    raw = await file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            zf.extractall(dest)
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=400, detail="Invalid zip file.") from exc

    chroma = dest / "chroma_db"
    if not chroma.exists():
        raise HTTPException(status_code=400, detail="Pack is missing a chroma_db folder.")
    current = settings_manager.current.model_copy(deep=True)
    current.chroma_db_path = str(chroma)
    settings_manager.save_settings(current)
    return {
        "success": True,
        "chroma_db_path": str(chroma),
        "images_path": str(dest / "images") if (dest / "images").exists() else None,
    }


@router.post("/export/briefing", response_class=HTMLResponse)
async def export_briefing(req: BriefingRequest):
    rows = []
    for idx, src in enumerate(req.sources, start=1):
        excerpt = (src.text or "").replace("<", "&lt;")[:800]
        rows.append(
            f"<section><h3>S{idx} — {src.source} · p.{src.page}</h3><pre>{excerpt}</pre></section>"
        )
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>SQA Briefing</title>
<style>body{{font-family:Inter,Segoe UI,sans-serif;max-width:880px;margin:40px auto;color:#0f172a}}
pre{{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px}}
.meta{{color:#64748b;font-size:12px}}</style></head>
<body>
<h1>Engineering Query Briefing</h1>
<p class="meta">{req.user_name or "SQA-O&G"} · generated locally</p>
<h2>Question</h2><p>{req.question}</p>
<h2>Answer</h2><p>{req.answer.replace("<", "&lt;").replace(chr(10), "<br/>")}</p>
<h2>Sources</h2>{''.join(rows)}
</body></html>"""
    return HTMLResponse(content=html)
