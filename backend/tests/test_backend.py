import pytest
import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.document_parser.chunker import simple_chunker
from app.services.vector_db import sanitize_filename, generate_chunk_id, vector_db_service
from app.services.rag import construct_prompt, resolve_images
from app.models.schemas import SourceContext, ImageResult
from app.core.config import settings, public_media_url, cors_allow_origins


def test_chunker_short_text():
    text = "Short text example for testing."
    chunks = simple_chunker(text, chunk_size=100, chunk_overlap=20)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunker_overlap():
    words = [f"word{i}" for i in range(100)]
    text = " ".join(words)
    chunk_size = 50
    chunk_overlap = 15
    chunks = simple_chunker(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    assert len(chunks) > 1
    for c in chunks:
        assert len(c) <= chunk_size or len(c.split()) == 1


def test_deterministic_chunk_ids():
    fn = "API 650 Standards (2020).pdf"
    clean = sanitize_filename(fn)
    assert " " not in clean
    assert "(" not in clean
    
    cid = generate_chunk_id(fn, page_num=42, chunk_idx=3)
    assert cid == "API_650_Standards__2020__pdf_page_42_chunk_3"


def test_prompt_construction():
    sources = [
        SourceContext(
            id="test_1",
            source="API_650.pdf",
            page=42,
            chunk=1,
            text="Hydrostatic test shall be conducted at 1.5 times design pressure."
        )
    ]
    question = "What is the test pressure for API 650?"
    prompt = construct_prompt(question, sources)
    
    assert "<|im_start|>system" in prompt
    assert "Oil & Gas standards" in prompt
    assert "API_650.pdf (Page: 42)" in prompt
    assert "Hydrostatic test shall be conducted" in prompt
    assert f"Answer this question: {question}" in prompt


def test_resolve_images():
    sources = [
        SourceContext(
            id="test_1",
            source="API_650.pdf",
            page=42,
            chunk=1,
            text="Text snippet",
            image_paths=["/storage/images/api650_p42_img0.png", "/storage/images/api650_p42_img1.png"]
        ),
        SourceContext(
            id="test_2",
            source="API_650.pdf",
            page=42,
            chunk=2,
            text="Text snippet 2",
            image_paths=["/storage/images/api650_p42_img0.png"]  # duplicate image on same page
        )
    ]
    images = resolve_images(sources)
    assert len(images) == 2  # Deduplicated
    assert images[0].filename == "api650_p42_img0.png"
    assert images[0].url == "/api/images/api650_p42_img0.png"


def test_public_media_url_passthrough(monkeypatch):
    monkeypatch.delenv("PUBLIC_API_URL", raising=False)
    assert public_media_url("/api/images/fig.png") == "/api/images/fig.png"


def test_public_media_url_prefix(monkeypatch):
    monkeypatch.setenv("PUBLIC_API_URL", "https://demo.hf.space")
    assert public_media_url("/api/images/fig.png") == "https://demo.hf.space/api/images/fig.png"
    monkeypatch.setenv("PUBLIC_API_URL", "https://demo.hf.space/api")
    assert public_media_url("/api/images/fig.png") == "https://demo.hf.space/api/images/fig.png"


def test_cors_origins_star(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    assert cors_allow_origins() == ["*"]


def test_vector_db_service_count():
    count = vector_db_service.count()
    assert isinstance(count, int)
    assert count >= 0


def test_factory_returns_gemini():
    from app.services.llm.factory import get_llm_provider
    from app.services.llm.gemini_llm import GeminiLLMProvider

    provider = get_llm_provider("gemini")
    assert isinstance(provider, GeminiLLMProvider)


def test_factory_returns_mock():
    from app.services.llm.factory import get_llm_provider
    from app.services.llm.mock_llm import MockLLMProvider

    provider = get_llm_provider("mock")
    assert isinstance(provider, MockLLMProvider)


def test_standard_meta_and_hybrid_keywords():
    from app.services.standards import parse_standard_meta, extract_keyword_terms, matches_filters, keyword_boost

    meta = parse_standard_meta("ASME B16.5-1996.pdf")
    assert meta["family"] == "ASME"
    assert meta["year"] == "1996"
    terms = extract_keyword_terms("What is API 650 5.2.2 hydrotest?")
    assert any("650" in t or t.upper() == "API" for t in terms)
    assert matches_filters("API 650 2020.pdf", family="API", year="2020")
    assert not matches_filters("ISO 9001.pdf", family="API")
    assert keyword_boost("API 650 hydrostatic test", ["API 650"]) > 0


def test_prompt_requires_citations():
    sources = [
        SourceContext(
            id="test_1",
            source="API_650.pdf",
            page=42,
            chunk=1,
            text="Hydrostatic test shall be conducted at 1.5 times design pressure."
        )
    ]
    prompt = construct_prompt("What is the test pressure for API 650?", sources, answer_mode="quoted")
    assert "[S1]" in prompt
    assert "citation" in prompt.lower() or "Cite" in prompt or "MUST" in prompt
