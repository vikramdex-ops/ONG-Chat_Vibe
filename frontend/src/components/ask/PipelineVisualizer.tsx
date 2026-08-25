import React from 'react';
import { MessageSquare, Cpu, Database, Bot, Sparkles, ChevronRight } from 'lucide-react';

export type PipelineStage = 'idle' | 'query' | 'search' | 'context' | 'llm' | 'complete' | 'error';

interface PipelineVisualizerProps {
  stage: PipelineStage;
  providerLabel?: string;
  topK?: number;
}

const STAGES = [
  { id: 'query', label: 'Query', icon: MessageSquare },
  { id: 'search', label: 'MiniLM Search', icon: Cpu },
  { id: 'context', label: 'Top-K Context', icon: Database },
  { id: 'llm', label: 'LLM', icon: Bot },
  { id: 'complete', label: 'Standard Answer', icon: Sparkles },
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
}) => {
  const current = rank(stage);

  return (
    <div className="panel p-4 overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-500 to-emerald-500" />
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h3 className="text-sm font-semibold text-fg">Live RAG Pipeline</h3>
          <p className="text-[11px] text-fg-muted">Query → MiniLM vector search → Top-K context → {providerLabel} → synthesized answer</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-muted border border-line text-fg-muted">
          k={topK}
        </span>
      </div>

      <div className="flex items-stretch gap-1.5 md:gap-2">
        {STAGES.map((node, idx) => {
          const Icon = node.icon;
          const nodeRank = idx + 1;
          const isActive = stage !== 'idle' && stage !== 'error' && current === nodeRank;
          const isDone = stage === 'complete' || (current > nodeRank && stage !== 'error');
          const label = node.id === 'llm' ? providerLabel : node.id === 'context' ? `Top-${topK} Context` : node.label;

          return (
            <React.Fragment key={node.id}>
              <div
                className={`pipeline-node flex-1 min-w-0 rounded-xl border px-2.5 py-3 text-center transition-all duration-300 ${
                  isActive
                    ? 'pipeline-node-active border-blue-400 bg-blue-50 dark:bg-blue-950/40 shadow-lg shadow-blue-500/20'
                    : isDone
                    ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/80 dark:bg-emerald-950/30'
                    : 'border-line bg-surface-input'
                }`}
                style={{ transform: isActive ? 'translateZ(18px) scale(1.03)' : 'translateZ(0)' }}
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
              </div>
              {idx < STAGES.length - 1 && (
                <div className="hidden sm:flex items-center">
                  <ChevronRight
                    className={`w-4 h-4 ${isDone || isActive ? 'text-blue-500' : 'text-fg-muted/50'}`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
