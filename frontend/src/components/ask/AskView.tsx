import React, { useEffect, useRef, useState } from 'react';
import { QuestionComposer } from './QuestionComposer';
import { AnswerCard } from './AnswerCard';
import { SourceCard } from './SourceCard';
import { ImageGallery } from './ImageGallery';
import { DocumentViewerModal } from '../viewer/DocumentViewerModal';
import { PipelineVisualizer, PipelineStage } from './PipelineVisualizer';
import { AnswerMode, ChatTurn, DocumentInfo, HealthStatus, ImageResult, QueryResponse, SourceContext } from '../../types';
import { createBookmark, executeQuery, exportBriefingHtml, getDocuments, streamQuery } from '../../services/api';
import { bestSourceForSentence, splitSentences } from '../../lib/citations';
import { Layers } from 'lucide-react';

const DEMO_Q = 'What are the hydrostatic testing requirements for API 650 tanks?';

interface AskViewProps {
  health: HealthStatus | null;
  topK: number;
  initialQuestion?: string;
  replay?: { question: string; answer: string; sources: SourceContext[]; images: ImageResult[] } | null;
  onReplayConsumed?: () => void;
  onQueryComplete?: () => void;
}

export const AskView: React.FC<AskViewProps> = ({
  health,
  topK,
  initialQuestion,
  replay,
  onReplayConsumed,
  onQueryComplete,
}) => {
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
  const [answerMode, setAnswerMode] = useState<AnswerMode>('concise');
  const [family, setFamily] = useState('');
  const [year, setYear] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [followUp, setFollowUp] = useState(true);
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const [pulsedId, setPulsedId] = useState<string | null>(null);
  const [tracedId, setTracedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (initialQuestion) setQuestion(initialQuestion);
  }, [initialQuestion]);

  useEffect(() => {
    getDocuments().then(setDocs).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!replay) return;
    setQuestion(replay.question);
    setAnswer(replay.answer);
    setSources(replay.sources || []);
    setImages(replay.images || []);
    setError(null);
    setIsLoading(false);
    const stages: PipelineStage[] = ['query', 'search', 'context', 'llm', 'complete'];
    let i = 0;
    setPipelineStage('query');
    const timer = window.setInterval(() => {
      i += 1;
      if (i >= stages.length) {
        window.clearInterval(timer);
        onReplayConsumed?.();
        return;
      }
      setPipelineStage(stages[i]);
    }, 280);
    return () => window.clearInterval(timer);
  }, [replay, onReplayConsumed]);

  useEffect(() => {
    if (!answer || !sources.length) return;
    const sentences = splitSentences(answer);
    const last = sentences[sentences.length - 1];
    const src = bestSourceForSentence(last, sources);
    if (src) setPulsedId(src.id);
  }, [answer, sources]);

  const extras = () => ({
    answer_mode: answerMode,
    family: family || undefined,
    year: year || undefined,
    document: documentFilter || undefined,
    compare_documents: compareA && compareB ? [compareA, compareB] : undefined,
    history: followUp ? thread : undefined,
  });

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
    setThread([]);
    setActiveSentence(null);
    setTracedId(null);
  };

  const handleAsk = (override?: string) => {
    const q = (override ?? question).trim();
    if (!q || isLoading) return;
    if (override) setQuestion(override);

    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
    setIsLoading(true);
    setStatusMessage('Preparing query…');
    setPipelineStage('query');
    setActiveSentence(null);

    const startTime = Date.now();
    streamQuery(
      q,
      topK,
      {
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
          setThread((prev) => [...prev.slice(-3), { question: q, answer: data.answer }]);
          if (onQueryComplete) onQueryComplete();
        },
        onError: () => {
          setPipelineStage('llm');
          executeQuery(q, topK, extras())
            .then((res) => {
              setAnswer(res.answer);
              setSources(res.context);
              setImages(res.images);
              setIsLoading(false);
              setExecutionTimeMs(res.execution_time_ms || Date.now() - startTime);
              setPipelineStage('complete');
              setThread((prev) => [...prev.slice(-3), { question: q, answer: res.answer }]);
              if (onQueryComplete) onQueryComplete();
            })
            .catch((err) => {
              setError(err.message || 'Failed to generate answer.');
              setIsLoading(false);
              setPipelineStage('error');
            });
        },
      },
      extras()
    );
  };

  const handleTrace = (idx: number, source: SourceContext | null) => {
    setActiveSentence(idx);
    if (!source) return;
    setTracedId(source.id);
    cardRefs.current[source.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleExport = async () => {
    const html = await exportBriefingHtml({
      question,
      answer,
      sources,
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sqa-briefing.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBookmark = async () => {
    await createBookmark({ name: question.slice(0, 72), question });
  };

  const indexed = docs.filter((d) => d.status === 'indexed');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <QuestionComposer
        question={question}
        setQuestion={setQuestion}
        onAsk={() => handleAsk()}
        onClear={handleClear}
        isLoading={isLoading}
        canAsk={canAsk}
        onDemo={() => handleAsk(DEMO_Q)}
      />

      <div className="panel p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <label className="text-[11px] text-fg-muted">
          Mode
          <select value={answerMode} onChange={(e) => setAnswerMode(e.target.value as AnswerMode)} className="field mt-1">
            <option value="concise">Concise</option>
            <option value="quoted">Clause-quoted</option>
            <option value="checklist">Checklist</option>
          </select>
        </label>
        <label className="text-[11px] text-fg-muted">
          Family
          <select value={family} onChange={(e) => setFamily(e.target.value)} className="field mt-1">
            <option value="">All</option>
            <option value="API">API</option>
            <option value="ASME">ASME</option>
            <option value="ISO">ISO</option>
            <option value="ASTM">ASTM</option>
          </select>
        </label>
        <label className="text-[11px] text-fg-muted">
          Year
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="1996" className="field mt-1" />
        </label>
        <label className="text-[11px] text-fg-muted">
          Document
          <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)} className="field mt-1">
            <option value="">All indexed</option>
            {indexed.map((d) => (
              <option key={d.filename} value={d.filename}>{d.filename}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-fg-muted">
          Compare A
          <select value={compareA} onChange={(e) => setCompareA(e.target.value)} className="field mt-1">
            <option value="">—</option>
            {indexed.map((d) => <option key={d.filename} value={d.filename}>{d.filename}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-fg-muted">
          Compare B
          <select value={compareB} onChange={(e) => setCompareB(e.target.value)} className="field mt-1">
            <option value="">—</option>
            {indexed.map((d) => <option key={d.filename} value={d.filename}>{d.filename}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-fg-muted flex items-end gap-2 pb-2">
          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
          Follow-up chat
        </label>
      </div>

      <PipelineVisualizer
        stage={pipelineStage}
        providerLabel={providerLabel}
        topK={topK}
        sourceCount={sources.length}
        statusMessage={statusMessage || error || ''}
      />

      {thread.length > 0 && followUp && (
        <div className="text-[11px] text-fg-muted">Follow-up context: {thread.length} prior turn{thread.length === 1 ? '' : 's'} attached.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnswerCard
            answer={answer}
            executionTimeMs={executionTimeMs}
            isLoading={isLoading}
            statusMessage={statusMessage}
            onRegenerate={() => handleAsk()}
            error={error}
            sources={sources}
            activeSentence={activeSentence}
            onTraceSentence={handleTrace}
            onExport={answer ? handleExport : undefined}
            onBookmark={answer ? handleBookmark : undefined}
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
                {sources.length} clauses
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((src, idx) => (
              <SourceCard
                key={src.id || idx}
                source={src}
                index={idx}
                onOpenDocument={(s) => setSelectedSourceForViewer(s)}
                active={tracedId === src.id}
                pulsed={pulsedId === src.id && tracedId !== src.id}
                cardRef={(el) => { cardRefs.current[src.id] = el; }}
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
