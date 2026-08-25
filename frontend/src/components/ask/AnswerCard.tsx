import React, { useMemo, useState } from 'react';
import { Bot, Copy, Check, RefreshCw, Clock, Sparkles, AlertCircle, Download, BookmarkPlus } from 'lucide-react';
import { SourceContext } from '../../types';
import { bestSourceForSentence, citationIndex, splitSentences } from '../../lib/citations';

interface AnswerCardProps {
  answer: string;
  executionTimeMs?: number;
  isLoading: boolean;
  statusMessage?: string;
  onRegenerate?: () => void;
  error?: string | null;
  sources?: SourceContext[];
  activeSentence?: number | null;
  onTraceSentence?: (index: number, source: SourceContext | null) => void;
  onExport?: () => void;
  onBookmark?: () => void;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  executionTimeMs,
  isLoading,
  statusMessage,
  onRegenerate,
  error,
  sources = [],
  activeSentence,
  onTraceSentence,
  onExport,
  onBookmark,
}) => {
  const [copied, setCopied] = useState(false);
  const sentences = useMemo(() => splitSentences(answer), [answer]);

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="panel p-5 transition-all">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-fg flex items-center gap-2">
              Answer
              {isLoading && (
                <span className="text-[10px] font-normal font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 animate-pulse">
                  {statusMessage || 'Processing...'}
                </span>
              )}
            </h3>
            <span className="text-[11px] text-fg-muted">
              Click a sentence to trace its source clause
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {executionTimeMs !== undefined && executionTimeMs > 0 && (
            <div className="telemetry-pill bg-surface-muted border-line text-fg-muted">
              <Clock className="w-3 h-3 text-fg-muted" />
              <span>{executionTimeMs} ms</span>
            </div>
          )}
          {answer && !isLoading && (
            <>
              {onBookmark && (
                <button type="button" onClick={onBookmark} className="p-1.5 rounded-lg bg-surface-muted border border-line text-fg" title="Bookmark">
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
              )}
              {onExport && (
                <button type="button" onClick={onExport} className="p-1.5 rounded-lg bg-surface-muted border border-line text-fg" title="Export briefing">
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg bg-surface-muted hover:bg-line border border-line"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              {onRegenerate && (
                <button type="button" onClick={onRegenerate} className="p-1.5 rounded-lg text-fg-muted bg-surface-muted border border-line" title="Regenerate">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Query Processing Error</div>
            <div className="text-xs mt-1">{error}</div>
          </div>
        </div>
      ) : isLoading && !answer ? (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-sm text-fg font-medium">{statusMessage || 'Searching knowledge base...'}</div>
        </div>
      ) : answer ? (
        <div className="prose-answer space-y-2">
          {sentences.map((sentence, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const cited = citationIndex(sentence);
                const src = cited !== null && sources[cited] ? sources[cited] : bestSourceForSentence(sentence, sources);
                onTraceSentence?.(idx, src);
              }}
              className={`block w-full text-left text-sm leading-relaxed rounded-lg px-2 py-1 transition-colors ${
                activeSentence === idx ? 'bg-amber-100 dark:bg-amber-900/30 text-fg' : 'hover:bg-surface-muted text-fg/90'
              }`}
            >
              {sentence}
            </button>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-fg-muted text-sm">
          No answer yet. Ask a question or run the demo query to watch the pipeline.
        </div>
      )}
    </div>
  );
};
