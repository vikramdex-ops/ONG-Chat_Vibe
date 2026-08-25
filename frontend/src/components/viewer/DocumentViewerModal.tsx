import React from 'react';
import {
  X,
  FileText,
  Download,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { SourceContext } from '../../types';

interface DocumentViewerModalProps {
  source: SourceContext | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ source, onClose }) => {
  if (!source) return null;

  const fileUrl = `/api/documents/${encodeURIComponent(source.source)}/file`;
  const isPdf = source.source.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card border border-line rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="h-14 px-6 border-b border-line flex items-center justify-between bg-surface-muted/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-fg truncate max-w-md">{source.source}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  Page {source.page}
                </span>
              </div>
              <p className="text-[11px] text-fg-muted">Inspecting retrieved engineering context</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={fileUrl}
              download={source.source}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg hover:text-fg bg-surface-muted hover:bg-line transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          <div className="p-6 overflow-y-auto border-r border-line flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Retrieved Context Snippet
                </span>
                {source.score !== undefined && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {Math.round(source.score * 100)}% Similarity
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-surface-input border border-line font-mono text-xs text-fg leading-relaxed whitespace-pre-wrap selection:bg-amber-500 selection:text-black">
                {source.text}
              </div>

              {source.image_paths && source.image_paths.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted font-mono flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    Associated Page Images ({source.image_paths.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {source.image_paths.map((imgPath, idx) => {
                      const filename = imgPath.split(/[\\/]/).pop() || '';
                      return (
                        <div key={idx} className="bg-surface-input border border-line rounded-lg p-2 flex flex-col items-center">
                          <img
                            src={`/api/images/${filename}`}
                            alt={filename}
                            className="max-h-32 object-contain rounded"
                          />
                          <span className="text-[10px] text-fg-muted font-mono mt-1 truncate max-w-full">
                            {filename}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line text-[11px] text-fg-muted font-mono flex items-center justify-between">
              <span>Chunk ID: {source.id}</span>
              <span>Chunk #{source.chunk} on Page</span>
            </div>
          </div>

          <div className="bg-surface-input flex flex-col items-center justify-center p-4 overflow-hidden relative">
            {isPdf ? (
              <iframe
                src={`${fileUrl}#page=${source.page}`}
                className="w-full h-full rounded-xl border border-line bg-white"
                title="PDF Page Preview"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-surface-muted border border-line flex items-center justify-center mx-auto text-fg">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-sm text-fg">{source.source}</h4>
                <p className="text-xs text-fg-muted max-w-xs">
                  Native slide / document representation. All text and images from Page {source.page} have been extracted and vectorized into ChromaDB.
                </p>
                <a
                  href={fileUrl}
                  download={source.source}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md shadow-blue-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Original File
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
