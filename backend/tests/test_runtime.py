import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.runtime import is_ephemeral_host, resolve_data_dir, runtime_info
from app.services.document_parser.pdf_parser import parse_pdf_document
from app.services.vector_db import vector_db_service


def test_runtime_is_durable_by_default(monkeypatch):
    for key in ("RENDER", "RENDER_SERVICE_ID", "RAILWAY_ENVIRONMENT", "FLY_APP_NAME", "SPACE_ID", "SQA_PERSISTENCE"):
        monkeypatch.delenv(key, raising=False)
    assert is_ephemeral_host() is False
    info = runtime_info()
    assert info["persistence"] == "durable"
    assert info["runtime"] in {"local", "desktop"}
    assert "releases" in info["desktop_releases_url"]


def test_runtime_ephemeral_on_render(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.delenv("SQA_PERSISTENCE", raising=False)
    assert is_ephemeral_host() is True
    assert runtime_info()["persistence"] == "ephemeral"
    assert runtime_info()["runtime"] == "cloud"


def test_runtime_persistence_override(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("SQA_PERSISTENCE", "durable")
    assert is_ephemeral_host() is False


def test_data_dir_env_override(monkeypatch, tmp_path):
    monkeypatch.setenv("SQA_DATA_DIR", str(tmp_path / "kb"))
    assert resolve_data_dir() == (tmp_path / "kb").resolve()


def test_health_live_reports_persistence():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    res = client.get("/api/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["persistence"] in {"durable", "ephemeral"}
    assert data["runtime"] in {"local", "desktop", "cloud"}
    assert data["data_dir"]


def test_indexed_pages_empty_is_set():
    pages = vector_db_service.indexed_pages("no-such-file.pdf")
    assert isinstance(pages, set)
    assert pages == set()


def test_pdf_skip_pages(tmp_path):
    import fitz

    pdf_path = tmp_path / "two-page.pdf"
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text((72, 72), "Flange rating page one hydrostatic test.")
    page2 = doc.new_page()
    page2.insert_text((72, 72), "Bolt circle page two ASME B16.5.")
    doc.save(str(pdf_path))
    doc.close()

    all_pages = parse_pdf_document(pdf_path)
    assert [p["page"] for p in all_pages] == [1, 2]
    resumed = parse_pdf_document(pdf_path, skip_pages={1})
    assert [p["page"] for p in resumed] == [2]
    assert "Bolt" in resumed[0]["text"] or "ASME" in resumed[0]["text"]
