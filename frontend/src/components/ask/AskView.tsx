import React, { useState, useEffect } from 'react';
import { QuestionComposer } from './QuestionComposer';
import { AnswerCard } from './AnswerCard';
import { SourceCard } from './SourceCard';
import { ImageGallery } from './ImageGallery';
import { DocumentViewerModal } from '../viewer/DocumentViewerModal';
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

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
  }, [initialQuestion]);

  const canAsk = question.trim().length > 0;

  const handleClear = () => {
    setQuestion('');
    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
    setStatusMessage('');
    setExecutionTimeMs(undefined);
  };

  const handleAsk = () => {
    if (!canAsk || isLoading) return;

    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
    setIsLoading(true);
    setStatusMessage('Searching knowledge base...');

    const startTime = Date.now();

    streamQuery(question.trim(), topK, {
      onStatus: (msg) => {
        setStatusMessage(msg);
      },
      onContext: (data) => {
        setSources(data.context || []);
        setImages(data.images || []);
      },
      onToken: (token) => {
        setAnswer((prev) => prev + token);
      },
      onComplete: (data: QueryResponse) => {
        setAnswer(data.answer);
        setSources(data.context);
        setImages(data.images);
        setIsLoading(false);
        setExecutionTimeMs(Date.now() - startTime);
        setStatusMessage('');
        if (onQueryComplete) onQueryComplete();
      },
      onError: (err) => {
        console.warn('Streaming failed, attempting fallback non-streaming query:', err);
        executeQuery(question.trim(), topK)
          .then((res) => {
            setAnswer(res.answer);
            setSources(res.context);
            setImages(res.images);
            setIsLoading(false);
            setExecutionTimeMs(res.execution_time_ms || (Date.now() - startTime));
            setStatusMessage('');
            if (onQueryComplete) onQueryComplete();
          })
          .catch((nonStreamErr) => {
            setError(nonStreamErr.message || 'Failed to generate answer.');
            setIsLoading(false);
            setStatusMessage('');
          });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Question Composer */}
      <QuestionComposer
        question={question}
        setQuestion={setQuestion}
        onAsk={handleAsk}
        onClear={handleClear}
        isLoading={isLoading}
        canAsk={canAsk}
      />

      {/* Main Grid: Answer & Relevant Images */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Answer Card */}
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

        {/* Right 1 Col: Relevant Images Gallery */}
        <div className="lg:col-span-1">
          <ImageGallery images={images} />
        </div>
      </div>

      {/* Source Context Cards Section */}
      {sources.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-sm text-white">Retrieved Source Context</h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {sources.length} {sources.length === 1 ? 'clause' : 'clauses'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
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

      {/* Document Inspection Modal */}
      <DocumentViewerModal
        source={selectedSourceForViewer}
        onClose={() => setSelectedSourceForViewer(null)}
      />
    </div>
  );
};
