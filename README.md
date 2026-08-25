# SQA-O&G — Standard Query Assistant

**SQA-O&G** is a modern, production-quality web application for querying Oil & Gas engineering standards (API, ASME, ISO, etc.) using local RAG (Retrieval-Augmented Generation) over your own uploaded PDFs, PPTX, and DOCX documents.

Built by **Vikram** for **Dexterity Design Services**.

---

## Features

- 📄 **Multi-Format Document Indexing** — PDF (with OCR fallback), PPTX, DOCX
- 🔍 **Vector Semantic Search** — ChromaDB + `all-MiniLM-L6-v2` embeddings
- 🤖 **LLM Providers Supported**:
  - **Google Gemini API** (free tier — `gemini-2.5-flash`, `gemini-2.5-pro`, etc.)
  - OpenAI-compatible endpoints (Ollama, vLLM, OpenAI)
  - Local FastAPI / llama.cpp server
  - Offline Mock provider
- 🖼️ **Relevant Technical Images** — Extracted from documents & displayed alongside answers
- 📚 **Document Library** — Browse indexed documents with chunk explorer
- 📜 **Query History** — Searchable SQLite audit log of all queries
- 🌗 **Light & Dark Mode** — Default light theme with 1-click toggle
- 📦 **Portable Knowledge Base** — Share the `chroma_db` folder across computers

---

## Quick Start

### Prerequisites

```bash
pip install fastapi uvicorn chromadb sentence-transformers pymupdf python-pptx python-docx pytesseract pillow httpx python-multipart
```

### Run the App

```bash
python run_app.py
```

Opens automatically at **http://127.0.0.1:8001**

### Development Mode (Hot Reload)

```bash
# Terminal 1 — Backend
python run_app.py --no-browser

# Terminal 2 — Frontend (Vite)
cd frontend
npm install
npm run dev
```

Frontend available at **http://localhost:3000**

`Ctrl+K` opens the command palette. A stable snapshot of the pre-upgrade app is tagged `stable-v2.0`.

### Deploy (free web app)

See **[DEPLOY.md](DEPLOY.md)** for the click-by-click path.

- **Vercel Hobby** hosts the Vite frontend.
- **Render free Web Service** (native Python, no Docker) hosts FastAPI + Chroma + ONNX MiniLM so it fits 512 MB.
- **Google Gemini** is the free LLM. Each visitor pastes their own key in Settings (stored in the browser, not on Render). Set `VITE_API_BASE=https://<service>.onrender.com/api` on Vercel.
- Do not put Chroma or uploads on Vercel serverless. Do not proxy SSE/uploads through Vercel.

Desktop `.exe`: `npm run build` then package `run_app.py` so FastAPI serves `frontend/dist`.

---

## Architecture

```
frontend/          React 18 + TypeScript + Vite + Tailwind CSS
backend/
  app/
    api/routes/    FastAPI route handlers
    core/          Config & logging
    models/        Pydantic schemas
    services/
      document_parser/   PDF, PPTX, DOCX parsers
      llm/               Gemini, Local, OpenAI, Mock providers
      embeddings.py      SentenceTransformer (all-MiniLM-L6-v2)
      vector_db.py       ChromaDB manager
      rag.py             RAG query pipeline (SSE streaming)
      indexer.py         Resumable background document indexer
      history.py         SQLite query history
run_app.py         Single-command launcher
```

---

## LLM Setup (Gemini — Recommended, Free)

1. Go to Settings → Provider: **Google Gemini API**
2. Click **"Get Free API Key"** → Sign in with Google at [AI Studio](https://aistudio.google.com/app/apikey)
3. Paste your key, select a model (`gemini-2.5-flash` recommended)
4. Click **Test** — status turns ✅ Connected
5. Ask your O&G question!

---

## Embedding Model

`all-MiniLM-L6-v2` is a free, open-source local SentenceTransformer model that converts text into 384-dimensional vectors for semantic search. It runs entirely on your CPU/GPU — no internet required, no API key needed.

---

## Portable Knowledge Base Distribution

1. Build your knowledge base by indexing your O&G PDFs
2. Copy the `chroma_db/` folder **and** its sibling `images/` folder to the target machine
3. In Settings, set **ChromaDB Path** to the copied `chroma_db` folder
4. Images are resolved by filename, so old absolute paths from another computer still work

---

## Developer

**Vikram** — [Dexterity Design Services](https://dexteritydesign.in)

---

## License

Internal proprietary software. All rights reserved.
