import time
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, AsyncGenerator
from app.core.config import settings
from app.core.logging_service import app_logger
from app.models.schemas import SourceContext, ImageResult, QueryResponse
from app.services.embeddings import embedding_service
from app.services.vector_db import vector_db_service
from app.services.llm.factory import get_llm_provider


def construct_prompt(question: str, sources: List[SourceContext]) -> str:
    """Constructs strict Oil & Gas ChatML prompt matching original SQA-O&G logic."""
    system_prompt = (
        "You are a helpful assistant answering questions about Oil & Gas standards "
        "based ONLY on the provided context document snippets. Be concise and clear. "
        "If the context doesn't contain the information needed to answer the question accurately, "
        "state that the provided context does not contain the necessary information."
    )
    
    context_pieces = [
        f"Source: {s.source} (Page: {s.page})\n{s.text}"
        for s in sources
    ]
    context_text = "\n\n---\n\n".join(context_pieces)
    
    full_prompt = (
        f"<|im_start|>system\n{system_prompt}\n<|im_end|>\n"
        f"<|im_start|>user\nBased on the following context:\n\n{context_text}\n\n---\n\n"
        f"Answer this question: {question}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )
    return full_prompt


def resolve_images(sources: List[SourceContext]) -> List[ImageResult]:
    """Resolves and dedupes all associated images from retrieved source chunks into safe ImageResults."""
    image_map: Dict[str, ImageResult] = {}
    
    for s in sources:
        for img_path_str in s.image_paths:
            p = Path(img_path_str)
            filename = p.name
            img_id = p.stem
            if filename not in image_map:
                image_map[filename] = ImageResult(
                    id=img_id,
                    url=f"/api/images/{filename}",
                    source=s.source,
                    page=s.page,
                    filename=filename
                )
                
    return sorted(list(image_map.values()), key=lambda x: (x.source, x.page))


class RAGService:
    """Orchestrates query embedding, vector retrieval, prompt generation, and LLM inference."""

    async def execute_query(self, question: str, top_k: Optional[int] = None) -> QueryResponse:
        start_time = time.time()
        k = top_k or settings.top_k
        db_count = vector_db_service.count()

        if db_count == 0:
            return QueryResponse(
                answer="No documents are currently indexed in the knowledge base. Please upload and index documents first.",
                context=[],
                images=[],
                db_count=0,
                execution_time_ms=round((time.time() - start_time) * 1000, 2)
            )

        # 1. Embed Question
        app_logger.info("RAG", f"Generating embedding for question: '{question[:60]}...'")
        query_embedding = embedding_service.embed_query(question)

        # 2. Retrieve Context from ChromaDB
        app_logger.info("RAG", f"Retrieving top {k} chunks from ChromaDB...")
        sources = vector_db_service.query(query_embedding, top_k=k)

        if not sources:
            app_logger.warning("RAG", "No relevant context returned from vector database.")
            return QueryResponse(
                answer="No relevant context found in the knowledge base.",
                context=[],
                images=[],
                db_count=db_count,
                execution_time_ms=round((time.time() - start_time) * 1000, 2)
            )

        # 3. Resolve Images
        images = resolve_images(sources)

        # 4. Construct Prompt
        prompt = construct_prompt(question, sources)

        # 5. Call LLM
        app_logger.info("RAG", f"Calling LLM provider ({settings.llm_provider})...")
        llm = get_llm_provider()
        try:
            answer = await llm.generate(
                prompt=prompt,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
                stop=settings.llm_stop_strings
            )
            if not answer:
                answer = "(LLM generated no text for this query)"
        except Exception as e:
            app_logger.error("RAG", f"LLM generation failed: {e}")
            answer = f"Error generating answer from LLM server: {e}"

        execution_time_ms = round((time.time() - start_time) * 1000, 2)
        app_logger.success("RAG", f"Query completed in {execution_time_ms} ms.")

        return QueryResponse(
            answer=answer,
            context=sources,
            images=images,
            db_count=db_count,
            execution_time_ms=execution_time_ms
        )

    async def stream_query(self, question: str, top_k: Optional[int] = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Generator yielding SSE event chunks for true real-time streaming."""
        k = top_k or settings.top_k
        db_count = vector_db_service.count()

        if db_count == 0:
            yield {
                "event": "error",
                "data": {"message": "Knowledge base is empty. Please index documents first."}
            }
            return

        # 1. Retrieval Phase
        yield {"event": "status", "data": {"message": "Searching knowledge base..."}}
        query_embedding = embedding_service.embed_query(question)
        sources = vector_db_service.query(query_embedding, top_k=k)

        if not sources:
            yield {
                "event": "complete",
                "data": {
                    "answer": "No relevant context found in the knowledge base.",
                    "context": [],
                    "images": [],
                    "db_count": db_count
                }
            }
            return

        images = resolve_images(sources)
        prompt = construct_prompt(question, sources)

        # 2. Generation Phase
        yield {
            "event": "context",
            "data": {
                "context": [s.model_dump() for s in sources],
                "images": [img.model_dump() for img in images],
                "db_count": db_count
            }
        }
        yield {"event": "status", "data": {"message": "Generating answer..."}}

        llm = get_llm_provider()
        accumulated_text = ""
        try:
            async for token in llm.stream_generate(
                prompt=prompt,
                max_tokens=settings.llm_max_tokens,
                temperature=settings.llm_temperature,
                stop=settings.llm_stop_strings
            ):
                accumulated_text += token
                yield {"event": "token", "data": {"text": token}}
        except Exception as e:
            app_logger.error("RAGStream", f"LLM stream error: {e}")
            yield {"event": "error", "data": {"message": f"LLM generation failed: {e}"}}

        yield {
            "event": "complete",
            "data": {
                "answer": accumulated_text,
                "context": [s.model_dump() for s in sources],
                "images": [img.model_dump() for img in images],
                "db_count": db_count
            }
        }


rag_service = RAGService()
