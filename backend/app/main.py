import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import IMAGES_DIR, BASE_DIR, settings
from app.core.logging_service import app_logger
from app.api.routes import health, query, documents, index, settings as settings_routes, history

app = FastAPI(
    title="SQA-O&G API",
    description="Standard Query Assistant for Oil and Gas Standards (FastAPI Backend)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount extracted images static directory
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Register API Routers
app.include_router(health.router)
app.include_router(query.router)
app.include_router(documents.router)
app.include_router(index.router)
app.include_router(settings_routes.router)
app.include_router(history.router)

# Mount built frontend if available
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            return {"detail": "Not Found"}
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
    uvicorn.run(app, host="127.0.0.1", port=8001)
