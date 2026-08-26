<p align="center">
  <img src="docs/readme-banner.png" alt="SQA-O&G — a plant library that lives on your desk" width="100%">
</p>

<h1 align="center">SQA-O&amp;G</h1>
<p align="center"><em>Standard Query Assistant · Oil &amp; Gas</em></p>
<p align="center">
  <strong>Not a website. Not a rented disk. A desk instrument.</strong><br>
  Built by <a href="https://dexteritydesign.in">Vikram</a> for Dexterity Design Services.
</p>

<p align="center">
  <a href="https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest"><img src="https://img.shields.io/badge/Download-SQA--OG--windows.zip-0f766e?style=for-the-badge" alt="Download desktop zip"></a>
  <img src="https://img.shields.io/badge/Runs_on-your_PC-1e3a5f?style=for-the-badge" alt="Runs on your PC">
  <img src="https://img.shields.io/badge/KB_disk-C_D_or_E-b45309?style=for-the-badge" alt="KB on any drive">
</p>

---

A standards library does not belong on a free host that goes to sleep and forgets every chunk. **SQA-O&G is a Windows app.** One zip. One `SQA-OG.exe`. The UI, the API, Chroma, the PDFs, the figures — all on the machine in front of you.

You ask like an engineer. It answers from *your* ASME / API / ISO pages, with citations and the drawings that sat next to the clause.

```
  [ PDF / PPTX / DOCX ]
            │
            ▼
   text layer ──or── RapidOCR + Tesseract
            │
            ▼
     page written to Chroma     ← survives a stop at page 180
            │
            ▼
     Ask  →  retrieve  →  your Gemini key  →  inked answer
```

---

## Ignition

| Step | What you do |
| ---: | --- |
| 1 | Grab [`SQA-OG-windows.zip`](https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest) |
| 2 | Unzip anywhere. Double-click `SQA-OG.exe` |
| 3 | Browser opens at **http://127.0.0.1:8001** |
| 4 | Settings → **Get Free API Key** → paste. That key is for *answers*, never for OCR |
| 5 | Indexing → drop PDFs → **Start Indexing** |
| 6 | Wait for `Saved N vectors` and a non-zero **Indexed** count. Then ask |

Need more disk? **Settings → Knowledge base location** → click `D:` / `E:` or type `D:\SQA-OG` → **Apply location**.

Field notes: **[DESKTOP.md](DESKTOP.md)**

---

## How the plant is laid out

| Station | Lives where |
| --- | --- |
| App + UI | The `.exe` (FastAPI serves the built React app) |
| Vectors | `chroma_db` on **your** drive |
| Originals | `uploads` |
| Figures | `images` |
| Resume marks | `processed_files.json` + per-page writes |
| Answers | Your Gemini key, in this browser only |

Default root: `%LOCALAPPDATA%\SQA-OG`  
Updating the exe does **not** wipe that folder.

---

## What it actually does

**Reads the page the way a checker would.** Born-digital PDFs are chunked from the text layer and tables. Scans go through two free local engines — RapidOCR (ONNX) and Tesseract — and the richer text wins. Close calls are merged. No cloud vision. No page image leaving the machine for OCR.

**Does not throw away a 236-page flange spec.** Each page is embedded and saved as it finishes. Stop at 180, start again — those 180 pages stay.

**Answers with a paper trail.** Hybrid search, citations, side figures (watermarks filtered), typewriter ink, a P&ID-style live rail. `Ctrl+K` if you live on the keyboard.

**Travels.** Settings → Export KB pack. Carry `chroma_db` + images to another desk. Import. Ask.

---

## For people who keep the hood open

```bash
python run_app.py          # full app at :8001
```

```bash
# hot UI
cd frontend && npm install && npm run dev     # :3000
python run_app.py --no-browser                # API :8001
```

```powershell
powershell -ExecutionPolicy Bypass -File packaging/build_windows.ps1
```

Gemini is still the recommended *answer* engine (free AI Studio key). OCR never calls it. Mock / Ollama / llama.cpp are there if the yard has no outbound.

---

## What this is not

It is not a Vercel site. It is not a Render demo. Those hosts wipe a knowledge base the moment they sleep. We stopped pretending that was a product.

Ship the zip. Keep the library.

<p align="center"><sub>Internal instrument · Dexterity Design Services · all rights reserved</sub></p>
