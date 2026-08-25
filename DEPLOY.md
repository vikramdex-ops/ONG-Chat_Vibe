# Deploy SQA-O&G (free stack)

The UI is a static Vite app. ChromaDB, uploads, and SSE streaming need an always-on FastAPI process — they cannot run on Vercel serverless.

| Piece | Free host | Why |
| --- | --- | --- |
| Frontend | [Vercel Hobby](https://vercel.com) | Static React, custom domain, HTTPS |
| API + Chroma | [Render](https://dashboard.render.com) **Web Service** (free) | Native Python, no Docker. Uses ONNX MiniLM so it fits 512 MB. |
| LLM | Each visitor's own [Google Gemini](https://aistudio.google.com/app/apikey) key | Quotas stay per user. The host never holds a shared key. |

Do **not** proxy `/api` through Vercel. Query streaming and PDF uploads would hit Hobby timeouts.

Production branch: `arena/01a037ca-ong-chat-vibe`.

---

## 1. Live API — Render Web Service

On [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** (not Static Site).

| Field | Value |
| --- | --- |
| Name | `sqa-og-api` |
| Branch | `arena/01a037ca-ong-chat-vibe` |
| Language / Runtime | **Python 3** |
| Root Directory | *(leave empty)* |
| Build Command | `pip install -r requirements-render.txt` |
| Start Command | `PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance type | **Free** |

Environment variables — **do not add `GEMINI_API_KEY`**:

| Key | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.11.9` |
| `SQA_EMBEDDING_BACKEND` | `onnx` |
| `SQA_WORKER_COUNT` | `1` |
| `SQA_DEFAULT_PROVIDER` | `gemini` |
| `SQA_STORE_LLM_KEYS` | `0` |
| `CORS_ORIGINS` | `*` until Vercel exists, then `https://….vercel.app` |
| `PUBLIC_API_URL` | `https://<service>.onrender.com` |

Create the service. Confirm `https://<service>.onrender.com/api/health/live` returns `{"status":"ok",...}`.

Each visitor opens Settings → **Get Free API Key** → pastes their own key. It stays in that browser and is sent only with their questions.

---

## 2. Keep the free instance from sleeping

Render free **will** spin down after ~15 minutes with no traffic. That warning is expected. We keep it warm with two free layers:

1. **UptimeRobot** (recommended): free HTTP monitor, 5 minute interval, URL `https://<service>.onrender.com/api/health/live`.
2. **Open browser tab**: the app heartbeats `/api/health/live` every 4 minutes while someone is using it.

If a ping is missed, the first visitor sees the amber wake banner for up to a minute. That is the free-tier tradeoff — persistent disks and no-sleep need a paid Render plan.

---

## 3. Frontend — Vercel

1. [vercel.com/new](https://vercel.com/new) → import `vikramdex-ops/ONG-Chat_Vibe`.
2. Production Branch: `arena/01a037ca-ong-chat-vibe`.
3. Leave Root Directory empty.
4. Env (Production + Preview): `VITE_API_BASE=https://<service>.onrender.com/api` (no trailing slash).
5. Deploy. Visitors add their own Gemini key in Settings.

---

## 4. Desktop .exe — GitHub Releases (real knowledge base)

Render free **cannot** keep Chroma. The disk is empty after every sleep, OOM kill, and redeploy. That is why Indexed went back to 0.

Every push to this branch rebuilds a portable Windows app:

**https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest**

| Item | Value |
| --- | --- |
| File | `SQA-OG-windows.zip` |
| Run | `SQA-OG.exe` |
| Data | `%LOCALAPPDATA%\SQA-OG` (survives updates) |
| Workflow | `.github/workflows/release-desktop.yml` |

If Actions never runs, paste `packaging/github-release-desktop.yml` once under **Actions → New workflow**. GitHub **Releases** is the download page. **Packages** is for Docker/npm — we do not put the `.exe` there.

Local rebuild:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/build_windows.ps1
```

Details: **[DESKTOP.md](DESKTOP.md)**.

---

## Local check

```bash
python run_app.py --no-browser
cd frontend && npm run dev
```
