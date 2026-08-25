import time
from pathlib import Path
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.core.config import settings, public_media_url
from app.core.logging_service import app_logger
from app.models.schemas import SourceContext, ImageResult, QueryResponse, ChatTurn
from app.services.embeddings import embedding_service
from app.services.vector_db import vector_db_service
from app.services.llm.factory import get_llm_provider
from app.services.image_resolver import resolve_image_file
from app.services.standards import extract_keyword_terms


MODE_INSTRUCTIONS = {
    "concise": (
        "Answer in 3-6 short sentences. Every factual claim MUST end with a citation "
        "like [S1] or [S2] matching the source labels. If you cannot cite a claim, omit it."
    ),
    "quoted": (
        "Quote the relevant clauses verbatim, then add a one-line interpretation. "
        "Every quote and claim MUST include a citation [S1], [S2], etc."
    ),
    "checklist": (
        "Answer as a numbered checklist of requirements. Each item must end with a "
        "citation such as [S1]. Do not invent items that are not in the context."
    ),
}


def construct_prompt(
    question: str,
    sources: List[SourceContext],
    answer_mode: str = "concise",
    history: Optional[List[ChatTurn]] = None,
    compare: bool = False,
) -> str:
    """Constructs a cited Oil & Gas ChatML prompt."""
    mode = answer_mode if answer_mode in MODE_INSTRUCTIONS else "concise"
    system_prompt = (
        "You are a helpful assistant answering questions about Oil & Gas standards "
        "based ONLY on the provided context document snippets. "
        "Never invent clause numbers or requirements. "
        "If the context does not contain the necessary information, say so clearly. "
        + MODE_INSTRUCTIONS[mode]
    )

    context_pieces = []
    for idx, s in enumerate(sources, start=1):
        label = f"S{idx}"
        context_pieces.append(
            f"[{label}] Source: {s.source} (Page: {s.page})\n{s.text}"
        )
    context_text = "\n\n---\n\n".join(context_pieces)

    history_text = ""
    if history:
        turns = []
        for turn in history[-4:]:
            turns.append(f"User: {turn.question}\nAssistant: {turn.answer}")
        history_text = "Prior conversation:\n" + "\n\n".join(turns) + "\n\n"

    task = (
        "Compare the retrieved clauses from the listed documents. Note agreements, "
        "conflicts, and year/revision differences. Cite [S#] on every claim.\n\n"
        if compare else ""
    )

    full_prompt = (
        f"<|im_start|>system\n{system_prompt}\n<|im_end|>\n"
        f"<|im_start|>user\n{history_text}Based on the following context:\n\n{context_text}\n\n---\n\n"
        f"{task}Answer this question: {question}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )
    return full_prompt


def resolve_images(sources: List[SourceContext]) -> List[ImageResult]:
    """Resolve figures and drop banner / watermark ads (wide short images)."""
    image_map: Dict[str, ImageResult] = {}

    for s in sources:
        for img_path_str in s.image_paths:
            p = Path(img_path_str)
            filename = p.name
            if not filename or filename in image_map:
                continue
            resolved = resolve_image_file(img_path_str)
            if resolved and _is_banner_image(resolved):
                continue
            display_name = resolved.name if resolved else filename
            image_map[filename] = ImageResult(
                id=Path(display_name).stem,
                url=public_media_url(f"/api/images/{display_name}"),
                source=s.source,
                page=s.page,
                filename=display_name,
            )

    return sorted(list(image_map.values()), key=lambda x: (x.source, x.page))


def _is_banner_image(path: Path) -> bool:
    try:
        from PIL import Image
        with Image.open(path) as im:
            width, height = im.size
        if height <= 140 and width >= 2.8 * max(height, 1):
            return True
        if width / max(height, 1) >= 4.2:
            return True
        if width * height < 12000:
            return True
    except Exception:
        return False
    return False


class RAGService:
    """Orchestrates query embedding, hybrid retrieval, prompt generation, and LLM inference."""

    def _retrieve(
        self,
        question: str,
        top_k: int,
        family: Optional[str] = None,
        year: Optional[str] = None,
        document: Optional[str] = None,
        compare_documents: Optional[List[str]] = None,
    ) -> List[SourceContext]:
        query_embedding = embedding_service.embed_query(question)
        terms = extract_keyword_terms(question)
        per_doc = compare_documents or ([document] if document else [None])
        gathered: List[SourceContext] = []
        seen = set()
        slice_k = max(1, top_k // max(1, len(per_doc)))
        for doc_name in per_doc:
            batch = vector_db_service.query(
                query_embedding,
                top_k=slice_k if doc_name and len(per_doc) > 1 else top_k,
                family=family,
                year=year,
                document=doc_name,
                keyword_terms=terms,
            )
            for src in batch:
                if src.id in seen:
                    continue
                seen.add(src.id)
                gathered.append(src)
        gathered.sort(key=lambda s: s.score or 0, reverse=True)
        return gathered[: max(top_k, len(per_doc) * 2)]

    async def execute_query(
        self,
        question: str,
        top_k: Optional[int] = None,
        answer_mode: str = "concise",
        family: Optional[str] = None,
        year: Optional[str] = None,
        document: Optional[str] = None,
        compare_documents: Optional[List[str]] = None,
        history: Optional[List[ChatTurn]] = None,
    ) -> QueryResponse:
        start_time = time.time()
        k = top_k or settings.top_k
        db_count = vector_db_service.count()
        mode = answer_mode if answer_mode in MODE_INSTRUCTIONS else "concise"
        compare = bool(compare_documents and len(compare_documents) >= 2)

        if db_count == 0:
            return QueryResponse(
                answer="No documents are currently indexed in the knowledge base. Please upload and index documents first.",
                context=[],
                images=[],
                db_count=0,
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
                answer_mode=mode,
                compare=compare,
            )

        app_logger.info("RAG", f"Generating embedding for question: '{question[:60]}...'")
        sources = self._retrieve(question, k, family, year, document, compare_documents)

        if not sources:
            return QueryResponse(
                answer="No relevant context found in the knowledge base.",
                context=[],
                images=[],
                db_count=db_count,
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
                answer_mode=mode,
                compare=compare,
            )

        images = resolve_images(sources)
        prompt = construct_prompt(question, sources, mode, history, compare)

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
            execution_time_ms=execution_time_ms,
            answer_mode=mode,
            compare=compare,
        )

    async def stream_query(
        self,
        question: str,
        top_k: Optional[int] = None,
        answer_mode: str = "concise",
        family: Optional[str] = None,
        year: Optional[str] = None,
        document: Optional[str] = None,
        compare_documents: Optional[List[str]] = None,
        history: Optional[List[ChatTurn]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        k = top_k or settings.top_k
        db_count = vector_db_service.count()
        mode = answer_mode if answer_mode in MODE_INSTRUCTIONS else "concise"
        compare = bool(compare_documents and len(compare_documents) >= 2)

        if db_count == 0:
            yield {"event": "error", "data": {"message": "Knowledge base is empty. Please index documents first."}}
            return

        yield {"event": "status", "data": {"message": "Searching knowledge base..."}}
        sources = self._retrieve(question, k, family, year, document, compare_documents)

        if not sources:
            yield {
                "event": "complete",
                "data": {
                    "answer": "No relevant context found in the knowledge base.",
                    "context": [],
                    "images": [],
                    "db_count": db_count,
                    "answer_mode": mode,
                    "compare": compare,
                }
            }
            return

        images = resolve_images(sources)
        prompt = construct_prompt(question, sources, mode, history, compare)

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
                "db_count": db_count,
                "answer_mode": mode,
                "compare": compare,
            }
        }


rag_service = RAGService()
