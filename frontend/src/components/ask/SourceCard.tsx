import React, { useState } from 'react';
import { FileText, ExternalLink, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { SourceContext } from '../../types';
import { TiltCard } from '../ui/TiltCard';

interface SourceCardProps {
  source: SourceContext;
  index: number;
  onOpenDocument: (source: SourceContext) => void;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, index, onOpenDocument }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreBadge = (score?: number) => {
    if (score === undefined) return null;
    const percent = Math.round(score * 100);
    const color =
      percent >= 75
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        : percent >= 50
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
        : 'bg-surface-muted text-fg border-line';

    return (
      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${color}`}>
        {percent}% match
      </span>
    );
  };

  return (
    <TiltCard className="bg-surface-card border border-line hover:border-blue-300 dark:hover:border-slate-600 rounded-xl p-4 transition-all group flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
              SOURCE {index + 1}
            </span>
            {getScoreBadge(source.score)}
          </div>

          <button
            type="button"
            onClick={() => onOpenDocument(source)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors font-medium"
            title="Inspect in document viewer"
          >
            <span>Open Source</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-fg-muted shrink-0" />
          <span className="text-xs font-semibold text-fg truncate" title={source.source}>
            {source.source}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-muted text-fg-muted shrink-0">
            Page {source.page}
          </span>
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
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Show full chunk</span>
            </>
          )}
        </button>
      )}
    </TiltCard>
  );
};
