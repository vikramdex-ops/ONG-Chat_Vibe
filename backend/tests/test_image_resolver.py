import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.models.schemas import SourceContext
from app.services.image_resolver import (
    resolve_image_file,
    get_image_search_dirs,
    to_portable_image_refs,
    remount_image_paths,
)
from app.services.rag import resolve_images


def test_resolve_image_by_filename_in_portable_folder(tmp_path, monkeypatch):
    kb_root = tmp_path / "portable_kb"
    chroma = kb_root / "chroma_db"
    images = kb_root / "images"
    images.mkdir(parents=True)
    chroma.mkdir(parents=True)
    target = images / "asme_b165_fig12.png"
    target.write_bytes(b"png")

    from app.core import config as config_mod

    original = config_mod.settings_manager.current.model_copy(deep=True)
    updated = original.model_copy(update={"chroma_db_path": str(chroma)})
    config_mod.settings_manager._settings = updated
    try:
        found = resolve_image_file("/old/machine/storage/images/asme_b165_fig12.png")
        assert found is not None
        assert found.name == "asme_b165_fig12.png"
        assert found.exists()
        dirs = get_image_search_dirs()
        assert any(d == images.resolve() for d in dirs)
    finally:
        config_mod.settings_manager._settings = original


def test_resolve_images_uses_filename_url():
    sources = [
        SourceContext(
            id="t1",
            source="ASME.pdf",
            page=12,
            chunk=1,
            text="figure",
            image_paths=["D:/old-pc/kb/images/fig_a.png"],
        )
    ]
    images = resolve_images(sources)
    assert len(images) == 1
    assert images[0].filename == "fig_a.png"
    assert images[0].url == "/api/images/fig_a.png"


def test_portable_image_refs_keep_filenames_only():
    refs = to_portable_image_refs([
        "/old/machine/kb/images/fig_a.png",
        r"D:\kb\images\fig_b.png",
        "/old/machine/kb/images/fig_a.png",
        "",
    ])
    assert refs == ["fig_a.png", "fig_b.png"]


def test_remount_image_paths_finds_copied_kb(tmp_path):
    kb_root = tmp_path / "portable_kb"
    chroma = kb_root / "chroma_db"
    images = kb_root / "images"
    images.mkdir(parents=True)
    chroma.mkdir(parents=True)
    (images / "clause.png").write_bytes(b"png")

    from app.core import config as config_mod

    original = config_mod.settings_manager.current.model_copy(deep=True)
    config_mod.settings_manager._settings = original.model_copy(update={"chroma_db_path": str(chroma)})
    try:
        remounted = remount_image_paths(["/legacy/abs/clause.png"])
        assert remounted[0].endswith("clause.png")
        assert Path(remounted[0]).exists()
    finally:
        config_mod.settings_manager._settings = original
