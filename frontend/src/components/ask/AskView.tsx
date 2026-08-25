import React, { useState, useEffect } from 'react';
import { QuestionComposer } from './QuestionComposer';
import { AnswerCard } from './AnswerCard';
import { SourceCard } from './SourceCard';
import { ImageGallery } from './ImageGallery';
import { DocumentViewerModal } from '../viewer/DocumentViewerModal';
import { PipelineVisualizer, PipelineStage } from './PipelineVisualizer';
import { SourceContext, ImageResult, QueryResponse, HealthStatus } from '../../types';
import { streamQuery, executeQuery } from '../../services/api';
import { Layers } from 'lucide-react';

interface AskViewProps {
  health: HealthStatus | null;
  topK: number;
  initialQuestion?: string;
  onQueryComplete?: () => void;
}

export const AskView: React.FC<AskViewProps> = ({ health, topK, initialQuestion, onQueryComplete }) => {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<SourceContext[]>([]);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceForViewer, setSelectedSourceForViewer] = useState<SourceContext | null>(null);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
  }, [initialQuestion]);

  const canAsk = question.trim().length > 0;

  const provider = (health?.details?.llm_provider as string | undefined) || 'gemini';
  const providerLabel = provider === 'gemini' ? 'Gemini LLM' : provider === 'mock' ? 'Mock LLM' : 'LLM';

  const handleClear = () => {
    setQuestion('');
    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
    setStatusMessage('');
    setExecutionTimeMs(undefined);
    setPipelineStage('idle');
  };

  const handleAsk = () => {
    if (!canAsk || isLoading) return;

    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
    setIsLoading(true);
    setStatusMessage('Preparing query…');
    setPipelineStage('query');

    const startTime = Date.now();

    streamQuery(question.trim(), topK, {
      onStatus: (msg) => {
        setStatusMessage(msg);
        const lower = msg.toLowerCase();
        if (lower.includes('generat')) setPipelineStage('llm');
        else if (lower.includes('search') || lower.includes('retriev') || lower.includes('embed')) setPipelineStage('search');
      },
      onContext: (data) => {
        setSources(data.context || []);
        setImages(data.images || []);
        setPipelineStage('context');
      },
      onToken: (token) => {
        setPipelineStage('llm');
        setAnswer((prev) => prev + token);
      },
      onComplete: (data: QueryResponse) => {
        setAnswer(data.answer);
        setSources(data.context);
        setImages(data.images);
        setIsLoading(false);
        setExecutionTimeMs(Date.now() - startTime);
        setStatusMessage('');
        setPipelineStage('complete');
        if (onQueryComplete) onQueryComplete();
      },
      onError: (err) => {
        console.warn('Streaming failed, attempting fallback non-streaming query:', err);
        setPipelineStage('llm');
        executeQuery(question.trim(), topK)
          .then((res) => {
            setAnswer(res.answer);
            setSources(res.context);
            setImages(res.images);
            setIsLoading(false);
            setExecutionTimeMs(res.execution_time_ms || (Date.now() - startTime));
            setStatusMessage('');
            setPipelineStage('complete');
            if (onQueryComplete) onQueryComplete();
          })
          .catch((nonStreamErr) => {
            setError(nonStreamErr.message || 'Failed to generate answer.');
            setIsLoading(false);
            setStatusMessage('');
            setPipelineStage('error');
          });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <QuestionComposer
        question={question}
        setQuestion={setQuestion}
        onAsk={handleAsk}
        onClear={handleClear}
        isLoading={isLoading}
        canAsk={canAsk}
      />

      <PipelineVisualizer stage={pipelineStage} providerLabel={providerLabel} topK={topK} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnswerCard
            answer={answer}
            executionTimeMs={executionTimeMs}
            isLoading={isLoading}
            statusMessage={statusMessage}
            onRegenerate={handleAsk}
            error={error}
          />
        </div>

        <div className="lg:col-span-1">
          <ImageGallery images={images} />
        </div>
      </div>

      {sources.length > 0 && (
        <div className="panel p-5">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-line">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm text-fg">Retrieved Source Context</h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                {sources.length} {sources.length === 1 ? 'clause' : 'clauses'}
              </span>
            </div>
            <span className="text-[11px] text-fg-muted">
              Click &quot;Open Source&quot; to inspect document context
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((src, idx) => (
              <SourceCard
                key={src.id || idx}
                source={src}
                index={idx}
                onOpenDocument={(s) => setSelectedSourceForViewer(s)}
              />
            ))}
          </div>
        </div>
      )}

      <DocumentViewerModal
        source={selectedSourceForViewer}
        onClose={() => setSelectedSourceForViewer(null)}
      />
    </div>
  );
};
