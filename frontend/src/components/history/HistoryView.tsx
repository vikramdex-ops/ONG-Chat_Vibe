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
import { HistoryItem } from '../../types';
import { getHistory, deleteHistoryItem, clearHistory } from '../../services/api';

interface HistoryViewProps {
  onReopenQuery: (question: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onReopenQuery }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const items = await getHistory(search.trim() || undefined);
      setHistory(items);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoading(false);
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
      {/* Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Engineering Query History
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit past Oil &amp; Gas technical queries, synthesized answers, and referenced clauses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past questions..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-xl backdrop-blur-md">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div>No previous queries found.</div>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-md hover:border-slate-700 transition-all space-y-3"
            >
              {/* Question Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{item.timestamp}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-300">
                      <Layers className="w-3 h-3" />
                      {item.sources_count} sources
                    </span>
                    {item.images_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-indigo-300">
                          <ImageIcon className="w-3 h-3" />
                          {item.images_count} images
                        </span>
                      </>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-white">{item.question}</h4>
                </div>

                {/* Top Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onReopenQuery(item.question)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition-colors"
                    title="Load question into Ask SQA"
                  >
                    <span>Ask Again</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyAnswer(item.id, item.answer)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy Answer"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Delete query record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Answer Preview */}
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 font-sans line-clamp-3">
                {item.answer}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
