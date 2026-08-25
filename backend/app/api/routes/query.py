import json
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from app.models.schemas import QueryRequest, QueryResponse, SourceContext, ImageResult
from app.services.rag import rag_service
from app.services.history import history_service
from app.core.logging_service import app_logger
from app.core.config import settings_manager
from app.core.request_context import request_api_key
from app.services.llm.factory import get_llm_provider

router = APIRouter(prefix="/api/query", tags=["Query"])


def _require_llm_ready() -> None:
    provider = (request_provider_or_settings())
    if provider == "gemini":
        key = request_api_key() or settings_manager.current.llm_api_key or settings_manager.current.gemini_api_key
        if not key:
            raise HTTPException(
                status_code=400,
                detail="Add your own Gemini API key in Settings before asking. It stays in this browser.",
            )


def request_provider_or_settings() -> str:
    from app.core.request_context import request_provider
    return (request_provider() or settings_manager.current.llm_provider or "local").lower()


def _query_kwargs(request: QueryRequest) -> dict:
    return {
        "question": request.question.strip(),
        "top_k": request.top_k,
        "answer_mode": request.answer_mode or "concise",
        "family": request.family,
        "year": request.year,
        "document": request.document,
        "compare_documents": request.compare_documents,
        "history": request.history,
    }


@router.post("", response_model=QueryResponse)
async def query_sqa(request: QueryRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question.")
    _require_llm_ready()

    try:
        response = await rag_service.execute_query(**_query_kwargs(request))
        try:
            history_service.add_entry(
                question=request.question.strip(),
                answer=response.answer,
                sources=response.context,
                images=response.images,
                answer_mode=response.answer_mode,
            )
        except Exception as hist_err:
            app_logger.warning("QueryAPI", f"Failed to record history: {hist_err}")
        return response
    except Exception as e:
        app_logger.error("QueryAPI", f"Error during query execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_query_sqa(request: QueryRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question.")
    _require_llm_ready()

    async def event_generator():
        try:
            async for event in rag_service.stream_query(**_query_kwargs(request)):
                if event.get("event") == "complete":
                    try:
                        data = event.get("data") or {}
                        sources = [SourceContext(**s) for s in data.get("context", [])]
                        images = [ImageResult(**img) for img in data.get("images", [])]
                        history_service.add_entry(
                            question=request.question.strip(),
                            answer=data.get("answer", ""),
                            sources=sources,
                            images=images,
                            answer_mode=data.get("answer_mode"),
                        )
                    except Exception as hist_err:
                        app_logger.warning("QueryStreamAPI", f"Failed to record history: {hist_err}")
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"])
                }
        except Exception as e:
            app_logger.error("QueryStreamAPI", f"Stream error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"message": f"Query streaming failed: {e}"})
            }

    return EventSourceResponse(event_generator())
