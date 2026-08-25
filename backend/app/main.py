import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from fastapi import HTTPException

from app.core.config import IMAGES_DIR, BASE_DIR, settings, cors_allow_origins
from app.core.logging_service import app_logger
from app.core.request_context import set_request_llm, reset_request_llm
from app.api.routes import health, query, documents, index, settings as settings_routes, history, workspace
from app.services.image_resolver import resolve_image_file

app = FastAPI(
    title="SQA-O&G API",
    description="Standard Query Assistant for Oil and Gas Standards (FastAPI Backend)",
    version="2.0.0"
)

_cors_origins = cors_allow_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def attach_user_llm(request, call_next):
    """Each browser sends its own Gemini key. Never require a shared server key."""
    tokens = set_request_llm(
        request.headers.get("x-gemini-api-key") or request.headers.get("x-llm-api-key"),
        request.headers.get("x-llm-model"),
        request.headers.get("x-llm-provider"),
    )
    try:
        return await call_next(request)
    finally:
        reset_request_llm(tokens)

IMAGES_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/api/images/{filename}")
async def serve_portable_image(filename: str):
    """Serve extracted figures from the active images folder or a portable KB copy."""
    path = resolve_image_file(filename)
    if not path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(path))


# Register API Routers
app.include_router(health.router)
app.include_router(query.router)
app.include_router(documents.router)
app.include_router(index.router)
app.include_router(settings_routes.router)
app.include_router(history.router)
app.include_router(workspace.router)

# Mount built frontend if available
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path in {"docs", "redoc", "openapi.json"}:
            raise HTTPException(status_code=404, detail="Not Found")
        index_path = FRONTEND_DIST / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        return {"app": "SQA-O&G Backend", "version": "2.0.0"}
else:
    @app.get("/")
    async def root():
        return {
            "app": "SQA-O&G: Standard Query Assistant",
            "version": "2.0.0",
            "status": "online",
            "docs_url": "/docs"
        }

@app.on_event("startup")
async def on_startup():
    app_logger.info("Server", "SQA-O&G Web Application starting up...")
    app_logger.info("Server", f"ChromaDB Path: {settings.chroma_db_path}")
    app_logger.info("Server", f"Collection: {settings.collection_name}")
    app_logger.info("Server", f"Embedding Model: {settings.embedding_model_name}")
    app_logger.info("Server", f"LLM Server: {settings.llm_server_url}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8001")))
