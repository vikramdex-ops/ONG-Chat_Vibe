import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Play,
  Square,
  Clock,
  CheckCircle2,
  Cpu,
  Layers,
  Terminal,
  FolderOpen
} from 'lucide-react';
import { IndexStatus, LogEntry, AppSettings } from '../../types';
import {
  startIndexing,
  stopIndexing,
  getIndexStatus,
  getIndexLogs,
  uploadDocuments
} from '../../services/api';
import { ConfettiBurst } from '../ui/ConfettiBurst';
import { resolveApiUrl } from '../../lib/apiBase';

interface IndexingViewProps {
  settings: AppSettings | null;
  onIndexingFinished?: () => void;
}

export const IndexingView: React.FC<IndexingViewProps> = ({ settings, onIndexingFinished }) => {
  const [status, setStatus] = useState<IndexStatus>({
    is_running: false,
    state: 'idle',
    processed_files: 0,
    total_files: 0,
    percentage: 0,
    current_file: null,
    current_operation: 'Ready to process documents',
    elapsed_seconds: 0,
    estimated_remaining_seconds: 0,
    total_chunks_indexed: 0,
    error: null
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workerCount, setWorkerCount] = useState<number>(settings?.worker_count || 4);
  const [chunkSize, setChunkSize] = useState<number>(settings?.chunk_size || 1000);
  const [chunkOverlap, setChunkOverlap] = useState<number>(settings?.chunk_overlap || 150);
  const [customDirectory, setCustomDirectory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<string>('idle');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const fetchStatusAndLogs = async () => {
      try {
        const s = await getIndexStatus();
        setStatus(s);

        const l = await getIndexLogs(150, logFilter === 'ALL' ? undefined : logFilter);
        setLogs(l);

        if (!s.is_running && status.is_running && onIndexingFinished) {
          onIndexingFinished();
        }
      } catch (e) {
        console.error('Error fetching indexing state:', e);
      }
    };

    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, (status.is_running || status.state === 'stopping') ? 1000 : 3000);
    return () => clearInterval(interval);
  }, [status.is_running, logFilter, onIndexingFinished]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (prevStateRef.current !== 'completed' && status.state === 'completed') {
      setShowConfetti(true);
      const timer = window.setTimeout(() => setShowConfetti(false), 3200);
      prevStateRef.current = status.state;
      return () => window.clearTimeout(timer);
    }
    prevStateRef.current = status.state;
  }, [status.state]);

  const handleStart = async () => {
    try {
      const s = await startIndexing({
        directory_path: customDirectory.trim() || undefined,
        worker_count: workerCount,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
      setStatus(s);
    } catch (e: any) {
      alert(e.message || 'Failed to start indexing');
    }
  };

  const handleStop = async () => {
    try {
      const force = status.state === 'stopping';
      const s = await stopIndexing(force);
      setStatus(s);
    } catch (e: any) {
      alert(e.message || 'Failed to stop indexing');
    }
  };

  const isBusy = status.is_running || status.state === 'stopping';

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const res = await uploadDocuments(Array.from(files));
      setUploadMessage(`Successfully uploaded ${res.uploaded_count} documents to staging library.`);
    } catch (e: any) {
      setUploadMessage(`Upload error: ${e.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <ConfettiBurst active={showConfetti} />

      {(status.file_queue && status.file_queue.length > 0) && (
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-fg">Indexing deck</h4>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              {['extract', 'embed', 'write'].map((stage) => (
                <span key={stage} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${status.worker_stage === stage ? 'bg-blue-500 worker-dot' : 'bg-line'}`} />
                  {stage}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2 min-h-[88px] perspective-stack">
            {status.file_queue.slice(0, 8).map((f, i) => (
              <div
                key={f.name}
                className={`h-20 w-14 rounded-md border text-[9px] p-1 font-mono leading-tight ${
                  f.status === 'active'
                    ? 'bg-blue-600 text-white border-blue-400 -translate-y-3 z-10'
                    : f.status === 'done'
                    ? 'bg-surface-muted text-fg-muted border-line opacity-50'
                    : 'bg-surface-card text-fg border-line'
                }`}
                style={{ transform: `rotate(${(i - 3) * 4}deg)` }}
                title={f.name}
              >
                {f.name.slice(0, 18)}
              </div>
            ))}
          </div>
          {status.filmstrip_url && (
            <div className="flex items-center gap-3">
              <img src={resolveApiUrl(status.filmstrip_url)} alt="current page" className="h-20 rounded border border-line bg-white object-contain" />
              <div className="text-xs text-fg-muted">
                {status.current_file} · page {status.current_page || 1}
              </div>
            </div>
          )}
          <div className="text-[11px] text-fg-muted">
            Resume ribbon: dim cards are already written; the lifted card is extracting now.
          </div>
        </div>
      )}
      <div className="panel p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
          <div>
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-500" />
              1. Document Source &amp; Staging
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Select local folder or upload PDF, PPTX, and DOCX files into the knowledge base library.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">.pdf</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">.pptx</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">.docx</span>
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-line hover:border-emerald-500/60 rounded-xl p-8 text-center cursor-pointer transition-all bg-surface-input hover:bg-surface-muted group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.pptx,.ppt,.docx,.doc"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 text-fg-muted group-hover:text-emerald-500 mx-auto mb-3 transition-colors" />
          <div className="text-sm font-semibold text-fg group-hover:text-emerald-700 dark:group-hover:text-white">
            {isUploading ? 'Uploading documents...' : 'Click to Browse or Drag & Drop Documents Here'}
          </div>
          <div className="text-xs text-fg-muted mt-1">
            Supports Oil &amp; Gas Technical Standards, Specs, and Manuals (.pdf, .pptx, .docx)
          </div>
        </div>

        {uploadMessage && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{uploadMessage}</span>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-line flex items-center gap-3">
          <FolderOpen className="w-4 h-4 text-fg-muted shrink-0" />
          <input
            type="text"
            value={customDirectory}
            onChange={(e) => setCustomDirectory(e.target.value)}
            placeholder="Custom server directory path (Optional, e.g. D:\Engineering_Standards)"
            className="flex-1 bg-surface-input border border-line rounded-lg px-3 py-1.5 text-xs text-fg placeholder-fg-muted focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
          <div>
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              2. Processing Configuration
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Digital PDFs are chunked from the PDF text layer. Scanned pages use ONNX OCR. Vectors are written in small batches after each file — wait for “Saved N vectors” and a non-zero Indexed count before asking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isBusy ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 active:scale-[0.98] transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{status.state === 'stopping' ? 'Force stop' : 'Stop Indexing'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Indexing</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-input p-3.5 rounded-xl border border-line">
            <label className="text-xs font-semibold text-fg block mb-1">Worker Threads</label>
            <input
              type="number"
              min={1}
              max={16}
              disabled={isBusy}
              value={workerCount}
              onChange={(e) => setWorkerCount(parseInt(e.target.value) || 1)}
              className="w-full bg-surface-card border border-line rounded-lg px-3 py-1.5 text-xs text-fg font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-fg-muted mt-1 block">Parallel file extraction threads</span>
          </div>

          <div className="bg-surface-input p-3.5 rounded-xl border border-line">
            <label className="text-xs font-semibold text-fg block mb-1">Chunk Size (Words)</label>
            <input
              type="number"
              min={100}
              max={3000}
              step={50}
              disabled={status.is_running}
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value) || 1000)}
              className="w-full bg-surface-card border border-line rounded-lg px-3 py-1.5 text-xs text-fg font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-fg-muted mt-1 block">Original SQA default: 1000 words</span>
          </div>

          <div className="bg-surface-input p-3.5 rounded-xl border border-line">
            <label className="text-xs font-semibold text-fg block mb-1">Chunk Overlap (Words)</label>
            <input
              type="number"
              min={0}
              max={500}
              step={10}
              disabled={status.is_running}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 150)}
              className="w-full bg-surface-card border border-line rounded-lg px-3 py-1.5 text-xs text-fg font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-fg-muted mt-1 block">Original SQA default: 150 words</span>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-line">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-base text-fg">Current Progress</h3>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase border ${
                isBusy
                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 animate-pulse'
                  : status.state === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : status.state === 'failed'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  : 'bg-surface-muted text-fg-muted border-line'
              }`}
            >
              {status.state}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-fg-muted">
            {status.elapsed_seconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-fg-muted" />
                Elapsed: {formatSeconds(status.elapsed_seconds)}
              </span>
            )}
            {status.is_running && status.estimated_remaining_seconds > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                ETA: {formatSeconds(status.estimated_remaining_seconds)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-fg">
              {status.processed_files} / {status.total_files} documents
            </span>
            <span className="font-mono font-bold text-fg text-sm">
              {status.percentage.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-surface-input rounded-full h-3.5 p-0.5 border border-line overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status.state === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : status.state === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-500'
              }`}
              style={{ width: `${Math.max(status.percentage, status.is_running ? 4 : 0)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs bg-surface-input p-3 rounded-xl border border-line">
          <div>
            <span className="text-fg-muted">Current Document: </span>
            <span className="font-semibold text-fg font-mono">
              {status.current_file || 'None'}
            </span>
          </div>
          <div>
            <span className="text-fg-muted">Operation: </span>
            <span className="font-semibold text-fg">
              {status.current_operation || 'Idle'}
            </span>
          </div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-fg">Live Processing Logs</h3>
            <span className="text-[10px] font-mono text-fg-muted">({logs.length} entries)</span>
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLogFilter(lvl)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                  logFilter === lvl
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-surface-muted hover:bg-line text-fg'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="h-64 overflow-y-auto bg-surface-input rounded-xl p-3 font-mono text-xs border border-line space-y-1 select-text"
        >
          {logs.length === 0 ? (
            <div className="text-fg-muted text-center py-10">No processing logs recorded yet.</div>
          ) : (
            logs.map((l, idx) => {
              const colorClass =
                l.level === 'SUCCESS'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : l.level === 'WARNING'
                  ? 'text-amber-600 dark:text-amber-400'
                  : l.level === 'ERROR'
                  ? 'text-rose-600 dark:text-rose-400'
                  : l.level === 'DEBUG'
                  ? 'text-fg-muted'
                  : 'text-blue-600 dark:text-blue-300';

              return (
                <div key={idx} className="leading-relaxed flex items-start gap-2 hover:bg-surface-muted px-1.5 py-0.5 rounded">
                  <span className="text-fg-muted shrink-0 select-none">[{l.timestamp}]</span>
                  <span className={`font-bold shrink-0 w-16 select-none ${colorClass}`}>{l.level}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 shrink-0 select-none">[{l.operation}]</span>
                  {l.document && (
                    <span className="text-amber-700 dark:text-amber-300/80 shrink-0 select-none">&lt;{l.document}&gt;</span>
                  )}
                  <span className="text-fg">{l.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
