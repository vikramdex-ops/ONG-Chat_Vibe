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
import { ChevronDown, Layers, MessageCircle, SlidersHorizontal } from 'lucide-react';

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
  const [asked, setAsked] = useState('');
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
  const [showRefine, setShowRefine] = useState(false);
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
    setAsked(replay.question);
    setAnswer(replay.answer);
    setSources(replay.sources || []);
    setImages(replay.images || []);
    setError(null);
    setIsLoading(false);
    setPipelineStage('complete');
    onReplayConsumed?.();
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
  const hasTurn = !!asked || isLoading;

  const handleClear = () => {
    setQuestion('');
    setAsked('');
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

    setAsked(q);
    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
    setIsLoading(true);
    setStatusMessage('Reading your question…');
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
    const html = await exportBriefingHtml({ question: asked || question, answer, sources });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sqa-briefing.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBookmark = async () => {
    await createBookmark({ name: (asked || question).slice(0, 72), question: asked || question });
  };

  const indexed = docs.filter((d) => d.status === 'indexed');
  const stageLabel =
    pipelineStage === 'search' ? 'Searching standards' :
    pipelineStage === 'context' ? 'Gathering clauses' :
    pipelineStage === 'llm' ? 'Writing answer' :
    pipelineStage === 'complete' ? 'Done' :
    statusMessage || 'Working';

  const provider = (health?.details?.llm_provider as string | undefined) || 'gemini';
  const providerLabel = provider === 'gemini' ? 'Gemini' : provider === 'mock' ? 'Mock' : 'LLM';

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <QuestionComposer
            question={question}
            setQuestion={setQuestion}
            onAsk={() => handleAsk()}
            onClear={handleClear}
            isLoading={isLoading}
            canAsk={canAsk}
            onDemo={() => handleAsk(DEMO_Q)}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRefine((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted hover:text-fg px-2.5 py-1 rounded-lg border border-line bg-surface-card"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Refine
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRefine ? 'rotate-180' : ''}`} />
            </button>
            {isLoading && (
              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">
                {stageLabel}
              </span>
            )}
          </div>

          {showRefine && (
            <div className="panel p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="text-[11px] text-fg-muted">
                Answer style
                <select value={answerMode} onChange={(e) => setAnswerMode(e.target.value as AnswerMode)} className="field mt-1">
                  <option value="concise">Concise</option>
                  <option value="quoted">Clause-quoted</option>
                  <option value="checklist">Checklist</option>
                </select>
              </label>
              <label className="text-[11px] text-fg-muted">
                Limit to a family
                <select value={family} onChange={(e) => setFamily(e.target.value)} className="field mt-1">
                  <option value="">All standards</option>
                  <option value="API">API</option>
                  <option value="ASME">ASME</option>
                  <option value="ISO">ISO</option>
                  <option value="ASTM">ASTM</option>
                </select>
              </label>
              <label className="text-[11px] text-fg-muted">
                Year
                <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Any year" className="field mt-1" />
              </label>
              <label className="text-[11px] text-fg-muted md:col-span-3">
                One document
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
            </div>
          )}

          {hasTurn && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="chat-user max-w-[85%] text-white text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-br-md">
                  {asked}
                </div>
              </div>

              {images.length > 0 && <ImageGallery images={images} />}

              <AnswerCard
                answer={answer}
                executionTimeMs={executionTimeMs}
                isLoading={isLoading}
                statusMessage={statusMessage}
                onRegenerate={() => handleAsk(asked)}
                error={error}
                sources={sources}
                activeSentence={activeSentence}
                onTraceSentence={handleTrace}
                onExport={answer ? handleExport : undefined}
                onBookmark={answer ? handleBookmark : undefined}
              />
            </div>
          )}

          {sources.length > 0 && (
            <div className="panel p-5">
              <div className="flex items-center gap-2 pb-3.5 mb-4 border-b border-line">
                <Layers className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-fg">Retrieved clauses</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {sources.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <aside className="lg:sticky lg:top-20 space-y-3">
          <div className="panel p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <MessageCircle className="w-4 h-4 text-indigo-500" />
                Follow-up
              </div>
              <button
                type="button"
                onClick={() => setFollowUp((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors ${followUp ? 'bg-indigo-600' : 'bg-line'}`}
                aria-pressed={followUp}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${followUp ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              {followUp
                ? 'Your next question keeps this thread. SQA will remember the last few turns.'
                : 'Each ask starts fresh, with no prior conversation attached.'}
            </p>
            {followUp && thread.length > 0 && (
              <div className="mt-3 space-y-2">
                {thread.map((turn, i) => (
                  <button
                    key={`${turn.question}-${i}`}
                    type="button"
                    onClick={() => setQuestion(turn.question)}
                    className="block w-full text-left text-[11px] px-2.5 py-2 rounded-lg bg-surface-muted border border-line text-fg hover:border-indigo-300"
                  >
                    <span className="block font-medium truncate">{turn.question}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <DocumentViewerModal
        source={selectedSourceForViewer}
        onClose={() => setSelectedSourceForViewer(null)}
      />
    </div>
  );
};
