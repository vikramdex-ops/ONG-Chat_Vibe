# Deploy SQA-O&G (free stack)

The UI is a static Vite app. ChromaDB, uploads, and SSE streaming need an always-on FastAPI process — they cannot run on Vercel serverless.

| Piece | Free host | Why |
| --- | --- | --- |
| Frontend | [Vercel Hobby](https://vercel.com) | Static React, custom domain, HTTPS |
| API + Chroma | [Render](https://dashboard.render.com) **Web Service** (free) | Native Python, no Docker. Uses ONNX MiniLM so it fits 512 MB. |
| LLM | [Google Gemini](https://aistudio.google.com/app/apikey) | Free API key |

Do **not** proxy `/api` through Vercel. Query streaming and PDF uploads would hit Hobby timeouts. The frontend calls the API origin directly via `VITE_API_BASE`.

Production branch: `arena/01a037ca-ong-chat-vibe`.

Hugging Face free Spaces cannot run Docker — skip HF.

---

## 1. Live API — Render Web Service

On [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** (not Static Site).

1. Connect GitHub repo `vikramdex-ops/ONG-Chat_Vibe`.
2. Fill the form:

| Field | Value |
| --- | --- |
| Name | `sqa-og-api` |
| Branch | `arena/01a037ca-ong-chat-vibe` |
| Language / Runtime | **Python 3** |
| Root Directory | *(leave empty)* |
| Build Command | `pip install -r requirements-render.txt` |
| Start Command | `PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance type | **Free** |

3. Environment variables:

| Key | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.11.9` |
| `SQA_EMBEDDING_BACKEND` | `onnx` |
| `SQA_WORKER_COUNT` | `1` |
| `GEMINI_API_KEY` | your [AI Studio](https://aistudio.google.com/app/apikey) key |
| `CORS_ORIGINS` | `*` until Vercel exists, then your `https://….vercel.app` |
| `PUBLIC_API_URL` | `https://sqa-og-api.onrender.com` (use the URL Render shows) |

4. Create Web Service. First build takes several minutes (ONNX MiniLM download).
5. Confirm `https://<service>.onrender.com/api/health/live` returns `{"status":"ok",...}`.

Render free sleeps after ~15 minutes idle. The first request after sleep can take up to a minute — the web app shows a wake banner.

Disk is ephemeral on free. Export a KB zip from Settings before a rebuild.

Do **not** pick Docker / Static Site / Private Service / Postgres for this API.

---

## 2. Frontend — Vercel

1. Open [vercel.com/new](https://vercel.com/new) and import `vikramdex-ops/ONG-Chat_Vibe`.
2. **Production Branch:** `arena/01a037ca-ong-chat-vibe`.
3. Leave Root Directory empty — `vercel.json` at the repo root builds `frontend/`.
4. Environment variable (Production + Preview):

| Name | Value |
| --- | --- |
| `VITE_API_BASE` | `https://<service>.onrender.com/api` |

No trailing slash. Rebuild after changing this — Vite inlines it at build time.

5. Deploy. Open the Vercel URL → Settings → Test Gemini if the Render env did not seed the key.

---

## Local check

```bash
python run_app.py --no-browser
# curl http://127.0.0.1:8001/api/health/live
cd frontend && npm run dev
```

Desktop `.exe` is unchanged: `npm run build` then package `run_app.py` so FastAPI serves `frontend/dist`.
