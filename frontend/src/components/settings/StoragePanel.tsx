import React, { useEffect, useState } from 'react';
import { HardDrive, FolderInput, Loader2, AlertCircle, CheckCircle2, ScanText } from 'lucide-react';
import { getStorage, relocateStorage, StorageSnapshot } from '../../services/api';

interface StoragePanelProps {
  onRelocated?: () => void;
}

export const StoragePanel: React.FC<StoragePanelProps> = ({ onRelocated }) => {
  const [snap, setSnap] = useState<StorageSnapshot | null>(null);
  const [path, setPath] = useState('');
  const [moveExisting, setMoveExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await getStorage();
      setSnap(data);
      setPath(data.data_dir);
    } catch (err: any) {
      setError(err.message || 'Could not load storage info');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const apply = async () => {
    const next = path.trim();
    if (!next) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await relocateStorage(next, moveExisting);
      setSnap(data);
      setPath(data.data_dir);
      setMessage(`Knowledge base is now at ${data.data_dir}`);
      if (onRelocated) onRelocated();
    } catch (err: any) {
      setError(err.message || 'Could not change location');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-6 space-y-4 border-2 border-sky-400/50">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <h4 className="font-bold text-sm text-fg flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-sky-500" />
          Knowledge base location
        </h4>
        <span className="text-[11px] font-mono text-fg-muted">
          {snap ? `${snap.used_mb} MB used` : '…'}
        </span>
      </div>

      <p className="text-xs text-fg-muted">
        Put Chroma, uploads, images, and history on another drive (for example <code>D:\SQA-OG</code> or <code>E:\Engineering\KB</code>). The next launch remembers this folder.
      </p>

      {snap?.ephemeral && (
        <div className="text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 rounded-xl px-3 py-2">
          This cloud host wipes disk on restart. Change the folder on the Windows desktop app.
        </div>
      )}

      {snap?.volumes && snap.volumes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {snap.volumes.map((vol) => (
            <button
              key={vol.id}
              type="button"
              disabled={busy || snap.ephemeral}
              onClick={() => setPath(vol.suggested)}
              className="px-3 py-1.5 rounded-xl border border-line bg-surface-muted hover:bg-surface-input text-[11px] font-semibold disabled:opacity-50"
              title={`${vol.free_gb} GB free of ${vol.total_gb} GB`}
            >
              {vol.label}
              <span className="text-fg-muted font-mono ml-1">{vol.free_gb} GB free</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-fg block mb-1">Folder path</label>
        <input
          type="text"
          value={path}
          disabled={busy || snap?.ephemeral}
          onChange={(e) => setPath(e.target.value)}
          placeholder="D:\SQA-OG"
          className="field font-mono"
        />
      </div>

      {snap && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-fg-muted">
          <div>uploads → {snap.uploads_dir}</div>
          <div>images → {snap.images_dir}</div>
          <div>chroma_db → {snap.chroma_db_path}</div>
          <div>history → {snap.history_db}</div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-fg">
        <input
          type="checkbox"
          checked={moveExisting}
          disabled={busy || snap?.ephemeral}
          onChange={(e) => setMoveExisting(e.target.checked)}
        />
        Copy existing files to the new folder
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={busy || snap?.ephemeral || !path.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderInput className="w-3.5 h-3.5" />}
          Apply location
        </button>
        {snap?.disk?.free_gb != null && (
          <span className="text-[11px] text-fg-muted">
            This volume has {snap.disk.free_gb} GB free
          </span>
        )}
      </div>

      {snap?.ocr && (
        <div className="pt-2 border-t border-line">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg mb-2">
            <ScanText className="w-3.5 h-3.5 text-amber-500" />
            OCR layers for chunk text
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-400/50 text-emerald-700 dark:text-emerald-300">
              PDF text layer
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${snap.ocr.rapidocr ? 'border-emerald-400/50 text-emerald-700 dark:text-emerald-300' : 'border-line text-fg-muted'}`}>
              RapidOCR {snap.ocr.rapidocr ? 'ready' : 'off'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${snap.ocr.tesseract ? 'border-emerald-400/50 text-emerald-700 dark:text-emerald-300' : 'border-line text-fg-muted'}`}>
              Tesseract {snap.ocr.tesseract ? 'ready' : 'not installed'}
            </span>
          </div>
          <p className="text-[11px] text-fg-muted mt-2">
            Digital PDFs stay on the text layer. Scanned pages run RapidOCR and Tesseract together — no cloud vision.
          </p>
        </div>
      )}

      {message && (
        <div className="text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/50 rounded-xl px-3 py-2 flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/50 rounded-xl px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
