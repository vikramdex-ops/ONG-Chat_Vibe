import React, { useMemo, useState } from 'react';
import { MessageSquare, Cpu, Database, Bot, Sparkles } from 'lucide-react';

export type PipelineStage = 'idle' | 'query' | 'search' | 'context' | 'llm' | 'complete' | 'error';

interface PipelineVisualizerProps {
  stage: PipelineStage;
  providerLabel?: string;
  topK?: number;
  sourceCount?: number;
  statusMessage?: string;
}

const STAGES = [
  { id: 'query', label: 'Query', hint: 'Normalize the engineering question into a retrieval prompt.' },
  { id: 'search', label: 'MiniLM', hint: 'Embed the question and search the Chroma vector store.' },
  { id: 'context', label: 'Context', hint: 'Rank and keep the top-K cited clauses.' },
  { id: 'llm', label: 'LLM', hint: 'Synthesize only from retrieved context.' },
  { id: 'complete', label: 'Answer', hint: 'Stream the grounded answer with sources.' },
] as const;

const ICONS = [MessageSquare, Cpu, Database, Bot, Sparkles];
const ORDER: PipelineStage[] = ['idle', 'query', 'search', 'context', 'llm', 'complete'];

function rank(stage: PipelineStage): number {
  if (stage === 'error') return -1;
  return ORDER.indexOf(stage);
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  stage,
  providerLabel = 'Gemini',
  topK = 3,
  sourceCount = 0,
  statusMessage = '',
}) => {
  const current = rank(stage);
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const focus = pinned || hovered;
  const focusMeta = STAGES.find((s) => s.id === focus);
  const live = stage !== 'idle' && stage !== 'complete' && stage !== 'error';
  const progress = stage === 'complete' ? 100 : stage === 'idle' || stage === 'error' ? 0 : Math.max(8, ((current - 1) / 4) * 100);

  const caption = useMemo(() => {
    if (stage === 'error') return statusMessage || 'Pipeline error';
    if (stage === 'idle') return 'Waiting — ask a question to watch retrieval live.';
    if (stage === 'complete') return `Grounded • ${sourceCount} clause${sourceCount === 1 ? '' : 's'} cited`;
    return statusMessage || 'Running retrieval-augmented generation…';
  }, [stage, statusMessage, sourceCount]);

  return (
    <div className={`rag-rail ${live ? 'is-live' : ''} ${stage === 'complete' ? 'is-done' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-fg tracking-tight">Live RAG Pipeline</h3>
            {live && <span className="rag-live-pill">LIVE</span>}
          </div>
          <p className="text-[11px] text-fg-muted mt-0.5">{caption}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-muted border border-line text-fg-muted">k={topK}</span>
          {sourceCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
              {sourceCount} ctx
            </span>
          )}
        </div>
      </div>

      <div className="relative pt-1 pb-2">
        <div className="rag-track" aria-hidden>
          <div className="rag-track-fill" style={{ width: `${progress}%` }} />
          {live && <span className="rag-spark" style={{ left: `${progress}%` }} />}
        </div>

        <div className="relative z-[1] grid grid-cols-5 gap-1">
          {STAGES.map((node, idx) => {
            const Icon = ICONS[idx];
            const nodeRank = idx + 1;
            const isActive = stage !== 'idle' && stage !== 'error' && current === nodeRank;
            const isDone = stage === 'complete' || (current > nodeRank && stage !== 'error');
            const label = node.id === 'llm' ? providerLabel : node.id === 'context' ? `Top-${topK}` : node.label;
            const selected = focus === node.id;

            return (
              <button
                key={node.id}
                type="button"
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setPinned((p) => (p === node.id ? null : node.id))}
                className={`rag-node ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''} ${selected ? 'is-selected' : ''}`}
              >
                <span className="rag-orb">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="rag-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {focusMeta && (
        <div className="rag-detail">
          <span className="font-semibold text-fg">{focusMeta.id === 'llm' ? providerLabel : focusMeta.label}</span>
          <span className="text-fg-muted"> — {focusMeta.hint}</span>
        </div>
      )}
    </div>
  );
};
