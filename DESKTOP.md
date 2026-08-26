# SQA-O&G Desktop (Windows .exe)

This is the product. One unzip, one `.exe`, the whole assistant — UI, API, Chroma, uploads — on your machine.

## Download

Every push to `arena/01a037ca-ong-chat-vibe` refreshes:

**https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest**

File: `SQA-OG-windows.zip`

## Install

1. Unzip anywhere (Desktop, `C:\Apps\SQA-OG`, a USB drive).
2. Double-click `SQA-OG.exe` or `Launch-SQA-OG.bat`. The flame/circuit mark is the file icon and the taskbar icon.
3. The browser opens at **http://127.0.0.1:8001**.
4. Settings → **Get Free API Key** → paste your Gemini key (stays in this browser).
5. Indexing → upload PDFs → **Start Indexing**. Wait for `Saved N vectors` and a non-zero Indexed count.

## Where the knowledge base lives

Default: `%LOCALAPPDATA%\SQA-OG`

To put it on another drive: **Settings → Knowledge base location** → click `D:` / `E:` or type `D:\SQA-OG` → **Apply location**. Tick **Copy existing files** if you already indexed. The path is remembered in `%LOCALAPPDATA%\SQA-OG\storage.json` so the next launch opens the same folder.

| Folder | Contents |
| --- | --- |
| `chroma_db` | Vector store |
| `uploads` | Original PDFs |
| `images` | Extracted figures |
| `chunk_snapshot.jsonl` | Replay file if Chroma is empty |
| `processed_files.json` | Resume marks |

Updating the `.exe` does **not** wipe this folder. Uninstall = delete the zip folder **and** `%LOCALAPPDATA%\SQA-OG`.

## Large libraries (hundreds of PDFs / thousands of pages)

- Vectors are written **per page**. If the app stops at page 180 of 236, start again — those 180 pages stay.
- Digital PDFs use the text layer. Scanned pages run RapidOCR + the Tesseract binary shipped inside the zip.
- Keep the console window open while indexing. Closing it stops the server.
- Export a KB pack from Settings after a big index as an off-machine backup.

## Build it yourself

```powershell
powershell -ExecutionPolicy Bypass -File packaging/build_windows.ps1
```

Output: `dist-desktop\SQA-OG-windows.zip`

## GitHub Release automation

Workflow: `.github/workflows/release-desktop.yml`

If Actions never appears, paste `packaging/github-release-desktop.yml` once under **Actions → New workflow**. After that, every push rebuilds the `.exe`.

GitHub **Releases** is the download page. **Packages** is for Docker/npm — we do not publish the `.exe` there.
