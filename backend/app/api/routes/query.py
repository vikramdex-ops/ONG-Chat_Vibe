import json
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from app.models.schemas import QueryRequest, QueryResponse, SourceContext, ImageResult
from app.services.rag import rag_service
from app.services.history import history_service
from app.core.logging_service import app_logger

router = APIRouter(prefix="/api/query", tags=["Query"])


@router.post("", response_model=QueryResponse)
async def query_sqa(request: QueryRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Please enter a question.")

    try:
        response = await rag_service.execute_query(
            question=request.question.strip(),
            top_k=request.top_k
        )
        
        # Save to history if we got a valid response
        try:
            history_service.add_entry(
                question=request.question.strip(),
                answer=response.answer,
                sources=response.context,
                images=response.images
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

    async def event_generator():
        try:
            async for event in rag_service.stream_query(
                question=request.question.strip(),
                top_k=request.top_k
            ):
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
