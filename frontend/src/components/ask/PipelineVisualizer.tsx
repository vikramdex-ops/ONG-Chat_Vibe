import React, { useEffect, useMemo, useState } from 'react';
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
  { id: 'query', tag: 'Q-01', label: 'Query', unit: 'INLET', hint: 'Normalize the engineering question into a retrieval prompt.', metric: 'prompt in' },
  { id: 'search', tag: 'E-02', label: 'MiniLM', unit: 'EMBED', hint: 'Embed the question and search the Chroma vector store.', metric: '384-d' },
  { id: 'context', tag: 'R-03', label: 'Context', unit: 'RANK', hint: 'Rank and keep the top-K cited clauses.', metric: 'cosine' },
  { id: 'llm', tag: 'L-04', label: 'LLM', unit: 'SYNTH', hint: 'Synthesize only from retrieved context.', metric: 'stream' },
  { id: 'complete', tag: 'A-05', label: 'Answer', unit: 'OUTLET', hint: 'Stream the grounded answer with sources.', metric: 'cited' },
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
  const [elapsed, setElapsed] = useState(0);
  const focus = pinned || hovered;
  const focusMeta = STAGES.find((s) => s.id === focus);
  const live = stage !== 'idle' && stage !== 'complete' && stage !== 'error';
  const progress = stage === 'complete' ? 100 : stage === 'idle' || stage === 'error' ? 0 : Math.max(10, ((current - 1) / 4) * 100);

  useEffect(() => {
    if (stage === 'query') setElapsed(0);
    if (stage === 'idle') setElapsed(0);
  }, [stage]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  const caption = useMemo(() => {
    if (stage === 'error') return statusMessage || 'Pipeline fault';
    if (stage === 'idle') return 'Standby — product line is charged. Ask to start flow.';
    if (stage === 'complete') return `Grounded outlet • ${sourceCount} clause${sourceCount === 1 ? '' : 's'} on spec`;
    return statusMessage || 'Product moving through retrieval units…';
  }, [stage, statusMessage, sourceCount]);

  const ticks = [
    { k: 'vec', v: '384-d' },
    { k: 'k', v: `top-${topK}` },
    { k: 'src', v: `${sourceCount} ctx` },
    { k: 't', v: live || stage === 'complete' ? `${elapsed.toFixed(0)}s` : '0s' },
    { k: 'mode', v: live ? 'FLOW' : stage === 'complete' ? 'HOLD' : 'IDLE' },
  ];

  return (
    <div className={`rag-rail ${live ? 'is-live' : ''} ${stage === 'complete' ? 'is-done' : ''} ${stage === 'error' ? 'is-fault' : ''}`}>
      <div className="rag-blueprint" aria-hidden />

      <div className="flex items-start justify-between gap-3 mb-3 relative">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rag-dwg">SQA-P&amp;ID-01</span>
            <h3 className="text-sm font-semibold text-fg tracking-tight">Live RAG Pipeline</h3>
            {live && <span className="rag-live-pill">LIVE</span>}
            {stage === 'complete' && <span className="rag-seal">GROUNDED</span>}
            {stage === 'error' && <span className="rag-fault">FAULT</span>}
          </div>
          <p className="text-[11px] text-fg-muted mt-0.5">{caption}</p>
        </div>
        <div className="rag-gauge" title="Line progress" aria-hidden>
          <svg viewBox="0 0 48 28" className="w-12 h-7">
            <path d="M4 24 A20 20 0 0 1 44 24" fill="none" stroke="currentColor" className="text-line" strokeWidth="3" />
            <path
              d="M4 24 A20 20 0 0 1 44 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeDasharray="63"
              strokeDashoffset={63 - (63 * progress) / 100}
              strokeLinecap="round"
            />
          </svg>
          <span className="rag-needle" style={{ transform: `rotate(${-80 + (progress * 160) / 100}deg)` }} />
        </div>
      </div>

      <div className="relative pt-1 pb-1">
        <div className="rag-track" aria-hidden>
          <div className="rag-track-fill" style={{ width: `${progress}%` }} />
          <div className="rag-chevrons" />
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
                <span className="rag-tag">{node.tag}</span>
                <span className="rag-orb">
                  <Icon className="w-3.5 h-3.5" />
                  {isActive && <span className="rag-sonar" />}
                </span>
                <span className="rag-label">{label}</span>
                <span className="rag-unit">{node.unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rag-ticker" aria-hidden={false}>
        {ticks.map((t) => (
          <span key={t.k} className="rag-tick">
            <em>{t.k}</em>
            {t.v}
          </span>
        ))}
      </div>

      {focusMeta && (
        <div className="rag-detail">
          <span className="rag-detail-tag">{focusMeta.tag}</span>
          <span className="font-semibold text-fg">{focusMeta.id === 'llm' ? providerLabel : focusMeta.label}</span>
          <span className="text-fg-muted"> — {focusMeta.hint}</span>
        </div>
      )}
    </div>
  );
};
