import React, { useRef, useEffect } from 'react';
import { Send, Trash2, Sparkles, CornerDownLeft, Loader2 } from 'lucide-react';

interface QuestionComposerProps {
  question: string;
  setQuestion: (q: string) => void;
  onAsk: () => void;
  onClear: () => void;
  isLoading: boolean;
  canAsk: boolean;
}

const SAMPLE_QUESTIONS = [
  "What are the hydrostatic testing requirements for API 650 tanks?",
  "What is the maximum allowable working pressure per ASME B31.3?",
  "Explain the inspection intervals for pressure relief valves in API 510.",
  "What are the minimum design metal temperatures for carbon steel flanges?"
];

export const QuestionComposer: React.FC<QuestionComposerProps> = ({
  question,
  setQuestion,
  onAsk,
  onClear,
  isLoading,
  canAsk
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [question]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canAsk && !isLoading) {
        onAsk();
      }
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Enter your question about O&amp;G standards:
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          {question.length} characters
        </span>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="What are the hydrostatic testing requirements for API 650 tanks?"
          rows={3}
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none leading-relaxed disabled:opacity-50"
        />
      </div>

      {/* Suggested Quick Questions */}
      {!question && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium">Examples:</span>
          {SAMPLE_QUESTIONS.slice(0, 2).map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setQuestion(sample)}
              className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-blue-300 border border-slate-700/60 rounded-lg px-2.5 py-1 transition-colors truncate max-w-xs text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      )}

      {/* Action Controls */}
      <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
            Ctrl + Enter
          </kbd>
          <span>to ask</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClear}
            disabled={isLoading || (!question && true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            type="button"
            onClick={onAsk}
            disabled={!canAsk || isLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
              canAsk && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Query...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ask SQA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
