import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  Clock,
  Layers,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import { HistoryItem, ImageResult, SourceContext } from '../../types';
import { getHistory, deleteHistoryItem, clearHistory, createBookmark } from '../../services/api';
import { Play } from 'lucide-react';

interface HistoryViewProps {
  onReopenQuery: (question: string) => void;
  onReplay?: (payload: { question: string; answer: string; sources: SourceContext[]; images: ImageResult[] }) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onReopenQuery, onReplay }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const items = await getHistory(search.trim() || undefined);
      setHistory(items);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all query history?')) return;
    try {
      await clearHistory();
      setHistory([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const handleCopyAnswer = (id: string, answer: string) => {
    navigator.clipboard.writeText(answer);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-fg flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            Engineering Query History
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Audit past Oil &amp; Gas technical queries, synthesized answers, and referenced clauses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past questions..."
              className="w-full bg-surface-input border border-line rounded-xl pl-9 pr-3 py-1.5 text-xs text-fg placeholder-fg-muted focus:outline-none focus:border-purple-500"
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 border border-rose-200 dark:border-rose-800/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 relative pl-4">
        <div className="absolute left-1 top-2 bottom-2 w-px bg-line" />
        {history.length === 0 ? (
          <div className="panel p-12 text-center text-fg-muted text-xs">
            <MessageSquare className="w-8 h-8 text-fg-muted mx-auto mb-2" />
            <div>No previous queries found.</div>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="panel p-5 hover:border-blue-300 dark:hover:border-slate-600 transition-all space-y-3 relative"
              title={`${item.question} · ${item.sources_count} sources`}
            >
              <span className="absolute -left-[18px] top-6 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-surface-card" />
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-fg-muted font-mono">
                    <Clock className="w-3 h-3 text-fg-muted" />
                    <span>{item.timestamp}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-300">
                      <Layers className="w-3 h-3" />
                      {item.sources_count} sources
                    </span>
                    {item.images_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                          <ImageIcon className="w-3 h-3" />
                          {item.images_count} images
                        </span>
                      </>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-fg">{item.question}</h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onReplay && (
                    <button
                      type="button"
                      onClick={() => onReplay({ question: item.question, answer: item.answer, sources: item.sources, images: item.images })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-line bg-surface-muted"
                      title="Replay pipeline without a new LLM call"
                    >
                      <Play className="w-3 h-3" /> Replay
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => createBookmark({ name: item.question.slice(0, 60), question: item.question, history_id: item.id })}
                    className="px-2 py-1.5 rounded-lg text-[11px] border border-line"
                  >
                    Pin
                  </button>
                  <button
                    type="button"
                    onClick={() => onReopenQuery(item.question)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white border border-blue-500/30 transition-colors"
                    title="Load question into Ask SQA"
                  >
                    <span>Ask Again</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAnswer(item.id, item.answer)}
                    className="p-1.5 rounded-lg bg-surface-muted hover:bg-line text-fg transition-colors"
                    title="Copy Answer"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-fg-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete query record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-fg/80 leading-relaxed bg-surface-input p-3.5 rounded-xl border border-line font-sans line-clamp-3">
                {item.answer}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
