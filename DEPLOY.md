# Deploy SQA-O&G (free stack)

The UI is a static Vite app. ChromaDB, uploads, OCR, and SSE streaming need an always-on FastAPI process — they cannot run on Vercel serverless.

| Piece | Free host | Why |
| --- | --- | --- |
| Frontend | [Vercel Hobby](https://vercel.com) | Static React, custom domain, HTTPS |
| API + Chroma | [Hugging Face Spaces](https://huggingface.co/spaces) (Docker, CPU Basic) | 16 GB RAM — enough for MiniLM + Chroma. Render free is 512 MB and will OOM. |
| LLM | [Google Gemini](https://aistudio.google.com/app/apikey) | Free API key, set in Space secrets or in Settings |

Do **not** proxy `/api` through Vercel. Query streaming and PDF uploads would hit Hobby timeouts. The frontend calls the API origin directly via `VITE_API_BASE`.

Production branch for this work: `arena/01a037ca-ong-chat-vibe`.

---

## 1. Live API — Hugging Face Space (recommended)

1. Open [huggingface.co/new-space](https://huggingface.co/new-space) (free account).
2. **Space name:** `sqa-og-api` (any name is fine).
3. **SDK:** Docker.
4. **Hardware:** CPU basic (free).
5. Create the Space, then **Settings → Connected to GitHub** and select `vikramdex-ops/ONG-Chat_Vibe`.
   - Or push this repo into the Space with `git remote add space https://huggingface.co/spaces/<you>/sqa-og-api` and `git push space arena/01a037ca-ong-chat-vibe:main`.
6. In the Space **Settings → Variables and secrets**:

   | Name | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | your [AI Studio](https://aistudio.google.com/app/apikey) key |
   | `SQA_WORKER_COUNT` | `1` |
   | `CORS_ORIGINS` | `https://<your-vercel-app>.vercel.app` (or `*` until Vercel exists) |
   | `PUBLIC_API_URL` | `https://<you>-sqa-og-api.hf.space` |

7. Space **App port** must be `8001` (the Dockerfile default).
8. Wait for the build. Confirm `https://<you>-sqa-og-api.hf.space/api/health/live` returns `{"status":"ok",...}`.

Free Spaces sleep after ~48 hours idle. The first request after sleep can take up to a minute — the web app shows a wake banner.

**Import a knowledge base** after the Space is up: Settings → Import KB zip. Free disks are ephemeral; export the pack before a rebuild.

---

## 2. Frontend — Vercel

1. Open [vercel.com/new](https://vercel.com/new) and import `vikramdex-ops/ONG-Chat_Vibe`.
2. **Production Branch:** `arena/01a037ca-ong-chat-vibe` (until this lands on `master`).
3. Leave Root Directory empty — `vercel.json` at the repo root builds `frontend/`.
4. Environment variable (Production + Preview):

   | Name | Value |
   | --- | --- |
   | `VITE_API_BASE` | `https://<you>-sqa-og-api.hf.space/api` |

   No trailing slash. Rebuild after changing this — Vite inlines it at build time.
5. Deploy. Open the Vercel URL, go to **Settings**, paste the same Gemini key if you did not set the Space secret, click **Test**.

---

## 3. Optional: Render instead of Hugging Face

`render.yaml` is in the repo. Render **free** web services are 512 MB and usually kill PyTorch. Use only if you upgrade to a 1–2 GB plan.

1. [dashboard.render.com/select-repo?type=blueprint](https://dashboard.render.com/select-repo?type=blueprint)
2. Set `CORS_ORIGINS`, `GEMINI_API_KEY`, `PUBLIC_API_URL=https://<service>.onrender.com`.
3. Point Vercel `VITE_API_BASE` at `https://<service>.onrender.com/api`.

Render free also sleeps after 15 minutes.

---

## Local check before you click Deploy

```bash
# API
python run_app.py --no-browser

# curl http://127.0.0.1:8001/api/health/live

# Frontend (already proxies /api → :8001)
cd frontend && npm run dev
```

Desktop `.exe` is unchanged: `npm run build` then package `run_app.py` so FastAPI serves `frontend/dist`.
