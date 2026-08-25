import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)


def test_api_health_live():
    res = client.get("/api/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "sqa-og"


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


def test_api_test_llm_gemini_missing_key():
    res = client.post(
        "/api/settings/test-llm",
        json={"url": "", "provider": "gemini", "api_key": ""},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "key" in data["message"].lower()


def test_api_test_llm_mock():
    res = client.post(
        "/api/settings/test-llm",
        json={"url": "", "provider": "mock"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "connected"


def test_api_save_gemini_settings():
    from app.core.config import settings_manager, AppSettings

    original = settings_manager.current.model_copy(deep=True)
    try:
        payload = original.model_dump()
        payload.update({
            "llm_provider": "gemini",
            "llm_server_url": "",
            "llm_api_key": "test-key",
            "llm_model_name": "default",
        })
        res = client.put("/api/settings", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["llm_provider"] == "gemini"
        assert data["llm_model_name"] == "gemini-2.5-flash"
        assert data["llm_server_url"].startswith("https://")
    finally:
        settings_manager.save_settings(original)
