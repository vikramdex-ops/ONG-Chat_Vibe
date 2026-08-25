import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Copy, Check, RefreshCw, Clock, AlertCircle, Download, BookmarkPlus } from 'lucide-react';
import { SourceContext } from '../../types';
import { bestSourceForSentence, citationIndex, splitSentences } from '../../lib/citations';
import { useInkType } from '../../lib/useInkType';

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
  const streamRef = useRef<HTMLDivElement>(null);
  const ink = useInkType(answer, isLoading || (!!answer && false) ? true : isLoading);
  const visible = isLoading || ink.length < answer.length ? ink : answer;
  const stillWriting = visible.length < answer.length || isLoading;
  const sentences = useMemo(() => splitSentences(visible), [visible]);

  useEffect(() => {
    if (!stillWriting) return;
    streamRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [visible, stillWriting]);

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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-fg flex items-center gap-2">
              SQA
              {stillWriting && (
                <span className="text-[10px] font-normal font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {visible ? 'Inking…' : statusMessage || 'Charging…'}
                </span>
              )}
            </h3>
            <span className="text-[11px] text-fg-muted">
              {stillWriting ? 'Plotting the grounded answer' : answer ? 'Click a sentence to trace its clause' : 'Answers appear here as they are written'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {executionTimeMs !== undefined && executionTimeMs > 0 && !stillWriting && (
            <div className="telemetry-pill bg-surface-muted border-line text-fg-muted">
              <Clock className="w-3 h-3 text-fg-muted" />
              <span>{executionTimeMs} ms</span>
            </div>
          )}
          {answer && !stillWriting && (
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
      ) : stillWriting && !visible ? (
        <SightGlass label={statusMessage || 'Charging the retrieval line'} />
      ) : stillWriting ? (
        <div ref={streamRef} className="stream-body text-sm leading-7 text-fg">
          {visible}
          <span className="type-caret" aria-hidden />
        </div>
      ) : visible ? (
        <div className="prose-answer space-y-1.5">
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
      ) : null}
    </div>
  );
};

const SightGlass: React.FC<{ label: string }> = ({ label }) => (
  <div className="py-6 flex items-center gap-4">
    <div className="sight-glass" aria-hidden>
      <span className="sight-bead" />
      <span className="sight-bead" />
      <span className="sight-bead" />
    </div>
    <div>
      <div className="text-sm font-medium text-fg">Line charging</div>
      <div className="text-xs text-fg-muted mt-0.5">{label}</div>
    </div>
  </div>
);
