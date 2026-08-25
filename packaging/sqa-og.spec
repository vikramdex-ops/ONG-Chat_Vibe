# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the SQA-O&G Windows desktop app (onedir, not onefile)."""

import os
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

SPECDIR = Path(SPEC).resolve().parent
ROOT = SPECDIR.parent

datas = []
binaries = []
hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "anyio._backends._asyncio",
    "chromadb",
    "chromadb.api",
    "chromadb.api.rust",
    "chromadb.utils.embedding_functions",
    "chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2",
    "onnxruntime",
    "fitz",
    "PIL",
    "rapidocr_onnxruntime",
    "pptx",
    "docx",
    "pydantic",
    "httpx",
    "numpy",
    "sse_starlette",
    "multipart",
    "app.main",
    "app.api.routes.health",
    "app.api.routes.query",
    "app.api.routes.documents",
    "app.api.routes.index",
    "app.api.routes.settings",
    "app.api.routes.history",
    "app.api.routes.workspace",
]

frontend_dist = ROOT / "frontend" / "dist"
if frontend_dist.exists():
    datas.append((str(frontend_dist), "frontend/dist"))

logo = ROOT / "frontend" / "public" / "app-logo.png"
if logo.exists():
    datas.append((str(logo), "frontend/public"))

for pkg in (
    "chromadb",
    "onnxruntime",
    "rapidocr_onnxruntime",
    "chromadb.utils.embedding_functions",
):
    try:
        pkg_datas, pkg_bins, pkg_hidden = collect_all(pkg)
        datas += pkg_datas
        binaries += pkg_bins
        hiddenimports += pkg_hidden
    except Exception:
        hiddenimports += collect_submodules(pkg)

hiddenimports = sorted(set(hiddenimports))

block_cipher = None

a = Analysis(
    [str(ROOT / "run_app.py")],
    pathex=[str(ROOT), str(ROOT / "backend")],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[str(SPECDIR / "pyi_rth_sqa.py")],
    excludes=["torch", "torchvision", "torchaudio", "tensorflow", "sentence_transformers"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

icon_path = ROOT / "frontend" / "public" / "favicon.png"
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SQA-OG",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    icon=str(icon_path) if icon_path.exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="SQA-OG",
)
