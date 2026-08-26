"""
SQA-O&G: Standard Query Assistant
Single Entry Point Application Launcher
"""

import os
import sys
import webbrowser
import argparse
import uvicorn
from pathlib import Path

# Add backend directory to sys.path (PyInstaller unpacks into _MEIPASS)
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    BASE_DIR = Path(sys._MEIPASS)
    sys.path.insert(0, str(BASE_DIR))
    sys.path.insert(0, str(BASE_DIR / "backend"))
else:
    BASE_DIR = Path(__file__).resolve().parent
    sys.path.insert(0, str(BASE_DIR / "backend"))

from app.main import app
from app.core.config import settings
from app.core.runtime import is_frozen, runtime_info

def main():
    if is_frozen():
        os.environ.setdefault("SQA_EMBEDDING_BACKEND", "onnx")
        os.environ.setdefault("SQA_DEFAULT_PROVIDER", "gemini")

    parser = argparse.ArgumentParser(description="SQA-O&G Standard Query Assistant Web Application")
    parser.add_argument("--host", default="127.0.0.1" if is_frozen() else "0.0.0.0", help="Host address to bind")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8001")), help="Port to bind (default: 8001 or $PORT)")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open default web browser")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")

    args = parser.parse_args()

    info = runtime_info()
    browse_host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    url = f"http://{browse_host}:{args.port}"
    print("=" * 70)
    print("  SQA-O&G: Standard Query Assistant")
    print(f"  Developed for Dexterity Design Services | By Vikram")
    print("=" * 70)
    print(f"  Server URL      : {url}")
    print(f"  API Docs        : {url}/docs")
    print(f"  Runtime         : {info['runtime']} ({info['persistence']} disk)")
    print(f"  Data folder     : {info['data_dir']}")
    print(f"  ChromaDB Path   : {settings.chroma_db_path}")
    print(f"  Collection      : {settings.collection_name}")
    print(f"  Embedding Model : {settings.embedding_model_name}")
    print(f"  LLM Server      : {settings.llm_server_url}")
    if info["persistence"] == "ephemeral":
        print("  WARNING         : This host wipes the knowledge base on restart.")
        print(f"  Desktop app     : {info['desktop_releases_url']}")
    print("=" * 70)

    if not args.no_browser:
        import threading
        import time
        def open_browser():
            time.sleep(1.2)
            webbrowser.open(url)
        threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(app, host=args.host, port=args.port, reload=args.reload)

if __name__ == "__main__":
    main()
