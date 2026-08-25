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
from app.core.config import settings


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


def test_vector_db_service_count():
    count = vector_db_service.count()
    assert isinstance(count, int)
    assert count >= 0
