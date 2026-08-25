import React, { useState } from 'react';
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
  { id: 'query', label: 'Query', hint: 'Normalize the engineering question', icon: MessageSquare },
  { id: 'search', label: 'MiniLM Search', hint: 'Embed and search ChromaDB', icon: Cpu },
  { id: 'context', label: 'Top-K Context', hint: 'Retrieve ranked clauses', icon: Database },
  { id: 'llm', label: 'LLM', hint: 'Synthesize from retrieved context', icon: Bot },
  { id: 'complete', label: 'Standard Answer', hint: 'Grounded answer + sources', icon: Sparkles },
] as const;

const ORDER: PipelineStage[] = ['idle', 'query', 'search', 'context', 'llm', 'complete'];

function rank(stage: PipelineStage): number {
  if (stage === 'error') return -1;
  return ORDER.indexOf(stage);
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  stage,
  providerLabel = 'Gemini LLM',
  topK = 3,
  sourceCount = 0,
  statusMessage = '',
}) => {
  const current = rank(stage);
  const [hovered, setHovered] = useState<string | null>(null);

  const caption =
    stage === 'error'
      ? statusMessage || 'Pipeline error'
      : stage === 'idle'
      ? 'Waiting for a question'
      : stage === 'complete'
      ? `Answer ready • ${sourceCount} source${sourceCount === 1 ? '' : 's'}`
      : statusMessage || 'Running retrieval-augmented generation…';

  return (
    <div className="panel p-4 overflow-hidden relative pipeline-stage">
      <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between mb-3 px-1 relative">
        <div>
          <h3 className="text-sm font-semibold text-fg">Live RAG Pipeline</h3>
          <p className="text-[11px] text-fg-muted">
            Query → MiniLM vector search → Top-K context → {providerLabel} → synthesized answer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-muted border border-line text-fg-muted">
            k={topK}
          </span>
          {sourceCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
              {sourceCount} ctx
            </span>
          )}
        </div>
      </div>

      <div className="pipeline-3d flex items-stretch gap-0">
        {STAGES.map((node, idx) => {
          const Icon = node.icon;
          const nodeRank = idx + 1;
          const isActive = stage !== 'idle' && stage !== 'error' && current === nodeRank;
          const isDone = stage === 'complete' || (current > nodeRank && stage !== 'error');
          const label = node.id === 'llm' ? providerLabel : node.id === 'context' ? `Top-${topK} Context` : node.label;

          return (
            <React.Fragment key={node.id}>
              <button
                type="button"
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className={`pipeline-node flex-1 min-w-0 rounded-xl border px-2.5 py-3 text-center transition-all duration-300 ${
                  isActive
                    ? 'pipeline-node-active border-blue-400 bg-blue-50 dark:bg-blue-950/40 shadow-lg shadow-blue-500/20'
                    : isDone
                    ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/80 dark:bg-emerald-950/30'
                    : 'border-line bg-surface-input'
                }`}
                style={{ transform: isActive ? 'translateZ(22px) rotateX(4deg)' : hovered === node.id ? 'translateZ(10px)' : 'translateZ(0)' }}
              >
                <div
                  className={`mx-auto mb-1.5 w-8 h-8 rounded-lg flex items-center justify-center border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500'
                      : isDone
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-surface-card text-fg-muted border-line'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className={`text-[10px] md:text-[11px] font-semibold truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-fg'}`}>
                  {label}
                </div>
                {hovered === node.id && (
                  <div className="mt-1 text-[10px] text-fg-muted leading-tight">{node.hint}</div>
                )}
              </button>
              {idx < STAGES.length - 1 && (
                <div className="hidden sm:flex items-center px-0.5">
                  <span className={`pipeline-flow ${isDone || isActive ? 'pipeline-flow-on' : ''}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] font-mono text-fg-muted px-1">{caption}</div>
    </div>
  );
};
