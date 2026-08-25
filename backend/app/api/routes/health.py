from fastapi import APIRouter
from app.models.schemas import HealthStatus
from app.core.config import settings
from app.services.vector_db import vector_db_service
from app.services.embeddings import embedding_service
from app.services.llm.factory import get_llm_provider

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("/live")
async def liveness():
    """Cheap probe for Render / Hugging Face / Cloud Run. Does not touch Chroma or the LLM."""
    return {"status": "ok", "service": "sqa-og", "version": "2.0.0"}


@router.get("", response_model=HealthStatus)
async def get_overall_health():
    # Vector DB
    db_count = 0
    vector_db_status = "healthy"
    try:
        db_count = vector_db_service.count()
    except Exception as e:
        vector_db_status = f"error: {e}"

    # Embeddings
    embedding_status = "ready" if embedding_service.is_loaded() else "ready_on_demand"

    # LLM
    llm = get_llm_provider()
    llm_health = await llm.check_health()
    llm_status = llm_health.get("status", "disconnected")

    return HealthStatus(
        status="ok",
        backend="healthy",
        vector_db=vector_db_status,
        embedding_model=embedding_status,
        llm_server=llm_status,
        db_count=db_count,
        embedding_device=embedding_service.device,
        details={
            "collection_name": settings.collection_name,
            "embedding_model": settings.embedding_model_name,
            "embedding_backend": embedding_service.backend,
            "llm_provider": settings.llm_provider,
            "llm_url": settings.llm_server_url,
            "llm_details": llm_health
        }
    )


@router.get("/llm")
async def get_llm_health():
    llm = get_llm_provider()
    return await llm.check_health()


@router.get("/vector-db")
async def get_vector_db_health():
    try:
        count = vector_db_service.count()
        return {
            "status": "connected",
            "collection": settings.collection_name,
            "indexed_chunks": count,
            "path": settings.chroma_db_path
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
