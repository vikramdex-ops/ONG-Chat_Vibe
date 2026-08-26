import React, { useRef, useEffect } from 'react';
import { Send, Trash2, Sparkles, Loader2 } from 'lucide-react';

interface QuestionComposerProps {
  question: string;
  setQuestion: (q: string) => void;
  onAsk: () => void;
  onClear: () => void;
  isLoading: boolean;
  canAsk: boolean;
  onDemo?: () => void;
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
  canAsk,
  onDemo
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-fg-muted font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Enter your question about O&amp;G standards:
        </label>
        <span className="text-[11px] text-fg-muted font-mono">
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
          className="w-full bg-surface-input border border-line rounded-xl px-4 py-3 text-fg placeholder-fg-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none leading-relaxed disabled:opacity-50"
        />
      </div>

      {!question && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-fg-muted font-medium">Examples:</span>
          {SAMPLE_QUESTIONS.slice(0, 2).map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setQuestion(sample)}
              className="text-xs bg-surface-muted hover:bg-line text-fg hover:text-blue-600 dark:hover:text-blue-300 border border-line rounded-lg px-2.5 py-1 transition-colors truncate max-w-xs text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-line">
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-muted text-fg border border-line font-mono text-[10px]">
            Ctrl + Enter
          </kbd>
          <span>to ask</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClear}
            disabled={isLoading || (!question && true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
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
                : 'bg-surface-muted text-fg-muted cursor-not-allowed border border-line'
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
