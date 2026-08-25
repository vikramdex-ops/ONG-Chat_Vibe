import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.storage import current_paths, list_volumes, relocate_data_dir, storage_snapshot
from app.services.document_parser.ocr_engine import merge_texts, pick_best, score_text, OcrCandidate


def test_storage_snapshot_has_paths():
    snap = storage_snapshot()
    assert Path(snap["data_dir"]).name
    assert snap["uploads_dir"].endswith("uploads")
    assert snap["chroma_db_path"].endswith("chroma_db")
    assert "can_relocate" in snap
    assert isinstance(snap["volumes"], list)


def test_list_volumes_non_empty():
    vols = list_volumes()
    assert vols
    assert "suggested" in vols[0]
    assert vols[0]["free_gb"] is not None


def test_relocate_and_restore(tmp_path):
    original = current_paths()["data"]
    dest = tmp_path / "other-drive" / "SQA-OG"
    try:
        snap = relocate_data_dir(str(dest), move_existing=True)
        assert Path(snap["data_dir"]) == dest.resolve()
        assert (dest / "uploads").is_dir()
        assert (dest / "images").is_dir()
        assert (dest / "chroma_db").is_dir()
        assert current_paths()["data"] == str(dest.resolve())
    finally:
        relocate_data_dir(original, move_existing=False)
    assert Path(current_paths()["data"]) == Path(original)


def test_relocate_rejects_relative_path():
    try:
        relocate_data_dir("relative-folder")
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "full path" in str(exc).lower()


def test_ocr_score_prefers_real_words():
    junk = "|||| ...."
    spec = "ASME B16.5 hydrostatic test shall be 1.5 times design pressure."
    assert score_text(spec) > score_text(junk)
    assert score_text("") == 0


def test_ocr_pick_best_merges_complementary_lines():
    a = OcrCandidate("rapidocr", "Flange class 150 rating\nBolt circle 190.5 mm")
    b = OcrCandidate("tesseract", "Flange class 150 rating\nHydrostatic test 1.5x")
    result = pick_best([a, b])
    assert "Bolt circle" in result.text
    assert "Hydrostatic" in result.text
    assert "rapidocr" in result.engine or "tesseract" in result.engine


def test_ocr_merge_skips_duplicates():
    merged = merge_texts("Line A\nLine B", "Line B\nLine C extra")
    assert merged.count("Line B") == 1
    assert "Line C extra" in merged


def test_api_storage_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    res = client.get("/api/storage")
    assert res.status_code == 200
    data = res.json()
    assert "data_dir" in data
    assert "ocr" in data
    assert "rapidocr" in data["ocr"]
    assert "layers" in data["ocr"]
    assert "gemini_vision" not in data["ocr"]
    assert not any("gemini" in str(layer).lower() for layer in data["ocr"]["layers"])
