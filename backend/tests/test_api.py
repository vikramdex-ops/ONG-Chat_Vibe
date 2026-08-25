import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)


def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["backend"] == "healthy"
    assert "db_count" in data


def test_api_settings():
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["collection_name"] == "pdf_knowledge_base"
    assert data["embedding_model_name"] == "all-MiniLM-L6-v2"
    assert data["chunk_size"] == 1000
    assert data["chunk_overlap"] == 150


def test_api_documents_list():
    res = client.get("/api/documents")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_api_indexing_status():
    res = client.get("/api/index/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_running" in data
    assert "state" in data


def test_api_query_validation():
    # Empty question should return 422 or 400
    res = client.post("/api/query", json={"question": ""})
    assert res.status_code in [400, 422]


def test_api_query_mock_flow():
    # Test query when empty or with mock provider
    res = client.post("/api/query", json={"question": "What is API 650 standard?"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "context" in data
    assert "images" in data
    assert "db_count" in data
