import React, { useState } from 'react';
import { Bot, Copy, Check, RefreshCw, Clock, Sparkles, AlertCircle } from 'lucide-react';

interface AnswerCardProps {
  answer: string;
  executionTimeMs?: number;
  isLoading: boolean;
  statusMessage?: string;
  onRegenerate?: () => void;
  error?: string | null;
}

// Lightweight Markdown to HTML formatting helper for standard technical answers
function formatMarkdown(text: string): string {
  if (!text) return '';
  let html = text
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headings
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bullet lists
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    .replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>')
    // Numbered lists
    .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li>$2</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  return `<p>${html}</p>`;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  answer,
  executionTimeMs,
  isLoading,
  statusMessage,
  onRegenerate,
  error
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-md transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              Answer
              {isLoading && (
                <span className="text-[10px] font-normal font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
                  {statusMessage || 'Processing...'}
                </span>
              )}
            </h3>
            <span className="text-[11px] text-slate-400">
              Synthesized strictly from indexed knowledge base standards
            </span>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2">
          {executionTimeMs !== undefined && executionTimeMs > 0 && (
            <div className="telemetry-pill bg-slate-800/60 border-slate-700 text-slate-400">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{executionTimeMs} ms</span>
            </div>
          )}

          {answer && !isLoading && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                title="Copy Answer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                  title="Regenerate Answer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Card Body */}
      {error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-200">Query Processing Error</div>
            <div className="text-xs text-rose-300/90 mt-1 leading-relaxed">{error}</div>
          </div>
        </div>
      ) : isLoading && !answer ? (
        <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm text-slate-300 font-medium">{statusMessage || 'Searching knowledge base...'}</div>
          <div className="text-xs text-slate-400 max-w-sm">
            Retrieving vector embeddings from ChromaDB and constructing context prompt...
          </div>
        </div>
      ) : answer ? (
        <div
          className="prose-dark"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(answer) }}
        />
      ) : (
        <div className="py-8 text-center text-slate-400 text-sm">
          No answer yet. Ask a question above to retrieve context from your Oil &amp; Gas documentation.
        </div>
      )}
    </div>
  );
};
