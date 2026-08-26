import React, { useState } from 'react';
import { FileText, ExternalLink, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { SourceContext } from '../../types';
import { TiltCard } from '../ui/TiltCard';
import { prefersReducedMotion } from '../../lib/motion';

interface SourceCardProps {
  source: SourceContext;
  index: number;
  onOpenDocument: (source: SourceContext) => void;
  active?: boolean;
  pulsed?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  index,
  onOpenDocument,
  active,
  pulsed,
  cardRef,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const percent = source.score !== undefined ? Math.round(source.score * 100) : null;
  const reduce = prefersReducedMotion();

  return (
    <div ref={cardRef} id={`source-card-${source.id}`}>
      <TiltCard
        className={`bg-surface-card border rounded-xl p-4 transition-all group flex flex-col justify-between h-full ${
          active
            ? 'border-amber-400 ring-2 ring-amber-400/40'
            : pulsed
            ? 'border-blue-400 ring-2 ring-blue-400/30'
            : 'border-line hover:border-blue-300 dark:hover:border-slate-600'
        } ${pulsed && !reduce ? 'source-pulse' : ''}`}
      >
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                S{index + 1}
              </span>
              {percent !== null && (
                <span
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-line text-fg"
                  title={source.rank_reason || 'Hybrid retrieval rank'}
                >
                  {percent}%
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenDocument(source)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors font-medium"
            >
              <span>Open Source</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {percent !== null && (
            <div className="mb-2 group/heat" title={source.rank_reason || 'Why this clause ranked'}>
              <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={`h-full rounded-full heat-bar ${percent >= 70 ? 'bg-emerald-500' : percent >= 45 ? 'bg-amber-400' : 'bg-slate-400'}`}
                  style={{ width: `${Math.max(percent, 6)}%` }}
                />
              </div>
              <div className="hidden group-hover/heat:block text-[10px] text-fg-muted mt-1">
                {source.rank_reason || 'Ranked by vector similarity plus clause-keyword overlap.'}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-fg-muted shrink-0" />
            <span className="text-xs font-semibold text-fg truncate" title={source.source}>
              {source.source}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-fg-muted shrink-0">
              Page {source.page}
            </span>
            {source.family && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                {source.family}
              </span>
            )}
            {source.image_paths && source.image_paths.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 shrink-0">
                <ImageIcon className="w-2.5 h-2.5" />
                {source.image_paths.length}
              </span>
            )}
          </div>

          <div
            className={`text-xs text-fg/80 leading-relaxed font-mono bg-surface-input p-3 rounded-lg border border-line overflow-hidden ${
              isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-4'
            }`}
          >
            {source.text}
          </div>
        </div>

        {source.text.length > 200 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2.5 flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg transition-colors self-start"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isExpanded ? 'Show less' : 'Show full chunk'}</span>
          </button>
        )}
      </TiltCard>
    </div>
  );
};
