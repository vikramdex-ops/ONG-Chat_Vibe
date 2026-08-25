import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Play,
  Square,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Layers,
  Terminal,
  Trash2,
  RefreshCw,
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

  // Poll status & logs periodically
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
    const interval = setInterval(fetchStatusAndLogs, status.is_running ? 1000 : 3000);
    return () => clearInterval(interval);
  }, [status.is_running, logFilter, onIndexingFinished]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
      const s = await stopIndexing();
      setStatus(s);
    } catch (e: any) {
      alert(e.message || 'Failed to stop indexing');
    }
  };

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
      {/* 1. Document Source & Upload Area */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              1. Document Source &amp; Staging
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select local folder or upload PDF, PPTX, and DOCX files into the knowledge base library.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">.pdf</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">.pptx</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">.docx</span>
          </div>
        </div>

        {/* Drag & Drop Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.pptx,.ppt,.docx,.doc"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-emerald-400 mx-auto mb-3 transition-colors" />
          <div className="text-sm font-semibold text-slate-200 group-hover:text-white">
            {isUploading ? 'Uploading documents...' : 'Click to Browse or Drag & Drop Documents Here'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Supports Oil &amp; Gas Technical Standards, Specs, and Manuals (.pdf, .pptx, .docx)
          </div>
        </div>

        {uploadMessage && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{uploadMessage}</span>
          </div>
        )}

        {/* Optional Custom Server Directory Entry */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-3">
          <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={customDirectory}
            onChange={(e) => setCustomDirectory(e.target.value)}
            placeholder="Custom server directory path (Optional, e.g. D:\Engineering_Standards)"
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {/* 2. Processing Parameters & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              2. Processing Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure worker threads, chunking windows, and launch resumable vectorization.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {status.is_running ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 active:scale-[0.98] transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Indexing</span>
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
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Worker Threads</label>
            <input
              type="number"
              min={1}
              max={16}
              disabled={status.is_running}
              value={workerCount}
              onChange={(e) => setWorkerCount(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Parallel file extraction threads</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Chunk Size (Words)</label>
            <input
              type="number"
              min={100}
              max={3000}
              step={50}
              disabled={status.is_running}
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value) || 1000)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Original SQA default: 1000 words</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Chunk Overlap (Words)</label>
            <input
              type="number"
              min={0}
              max={500}
              step={10}
              disabled={status.is_running}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 150)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Original SQA default: 150 words</span>
          </div>
        </div>
      </div>

      {/* 3. Live Progress & Status Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-white">Current Progress</h3>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded uppercase border ${
                status.is_running
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse'
                  : status.state === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : status.state === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {status.state}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            {status.elapsed_seconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Elapsed: {formatSeconds(status.elapsed_seconds)}
              </span>
            )}
            {status.is_running && status.estimated_remaining_seconds > 0 && (
              <span className="text-amber-400">
                ETA: {formatSeconds(status.estimated_remaining_seconds)}
              </span>
            )}
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              {status.processed_files} / {status.total_files} documents
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {status.percentage.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
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

        {/* Telemetry info row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400">Current Document: </span>
            <span className="font-semibold text-slate-200 font-mono">
              {status.current_file || 'None'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Operation: </span>
            <span className="font-semibold text-slate-300">
              {status.current_operation || 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Real-time Structured Processing Logs Terminal */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Live Processing Logs</h3>
            <span className="text-[10px] font-mono text-slate-400">({logs.length} entries)</span>
          </div>

          {/* Level Filter Buttons */}
          <div className="flex items-center gap-1.5">
            {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLogFilter(lvl)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                  logFilter === lvl
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Log Console */}
        <div
          ref={logContainerRef}
          className="h-64 overflow-y-auto bg-slate-950 rounded-xl p-3 font-mono text-xs border border-slate-800/80 space-y-1 select-text"
        >
          {logs.length === 0 ? (
            <div className="text-slate-400 text-center py-10">No processing logs recorded yet.</div>
          ) : (
            logs.map((l, idx) => {
              const colorClass =
                l.level === 'SUCCESS'
                  ? 'text-emerald-400'
                  : l.level === 'WARNING'
                  ? 'text-amber-400'
                  : l.level === 'ERROR'
                  ? 'text-rose-400'
                  : l.level === 'DEBUG'
                  ? 'text-slate-400'
                  : 'text-blue-300';

              return (
                <div key={idx} className="leading-relaxed flex items-start gap-2 hover:bg-slate-900/50 px-1.5 py-0.5 rounded">
                  <span className="text-slate-400 shrink-0 select-none">[{l.timestamp}]</span>
                  <span className={`font-bold shrink-0 w-16 select-none ${colorClass}`}>{l.level}</span>
                  <span className="text-indigo-400 shrink-0 select-none">[{l.operation}]</span>
                  {l.document && (
                    <span className="text-amber-300/80 shrink-0 select-none">&lt;{l.document}&gt;</span>
                  )}
                  <span className="text-slate-200">{l.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
