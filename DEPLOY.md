# SQA-O&G is a desktop app

Vercel and Render are **not** the product. Free cloud disks wipe the knowledge base. The `.exe` is the whole system: UI, FastAPI, Chroma, uploads, images, history.

## Install

1. Download [`SQA-OG-windows.zip`](https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest)
2. Unzip anywhere
3. Run `SQA-OG.exe`
4. Browser opens at http://127.0.0.1:8001
5. Settings → paste your own Gemini key (answers only — OCR stays local)
6. Index PDFs. Wait for `Saved N vectors`

Data default: `%LOCALAPPDATA%\SQA-OG`  
Move it: Settings → Knowledge base location → `D:\SQA-OG`

Full notes: **[DESKTOP.md](DESKTOP.md)**

## Build the zip yourself

```powershell
powershell -ExecutionPolicy Bypass -File packaging/build_windows.ps1
```

## From source (developers)

```bash
python run_app.py
```

or Vite on `:3000` plus the API on `:8001`.
