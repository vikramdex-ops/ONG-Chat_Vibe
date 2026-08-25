import React, { useState } from 'react';
import {
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { SourceContext } from '../../types';

interface DocumentViewerModalProps {
  source: SourceContext | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ source, onClose }) => {
  const [currentPage, setCurrentPage] = useState<number>(source?.page || 1);

  if (!source) return null;

  const fileUrl = `/api/documents/${encodeURIComponent(source.source)}/file`;
  const isPdf = source.source.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white truncate max-w-md">{source.source}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Page {source.page}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Inspecting retrieved engineering context</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={fileUrl}
              download={source.source}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          {/* Left Column: Retrieved Chunk & Metadata */}
          <div className="p-6 overflow-y-auto border-r border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Retrieved Context Snippet
                </span>
                {source.score !== undefined && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {Math.round(source.score * 100)}% Similarity
                  </span>
                )}
              </div>

              {/* Chunk text highlight container */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-amber-500 selection:text-black">
                {source.text}
              </div>

              {/* Page Images if available */}
              {source.image_paths && source.image_paths.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Associated Page Images ({source.image_paths.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {source.image_paths.map((imgPath, idx) => {
                      const filename = imgPath.split(/[\\/]/).pop() || '';
                      return (
                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col items-center">
                          <img
                            src={`/api/images/${filename}`}
                            alt={filename}
                            className="max-h-32 object-contain rounded"
                          />
                          <span className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-full">
                            {filename}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Chunk ID metadata */}
            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Chunk ID: {source.id}</span>
              <span>Chunk #{source.chunk} on Page</span>
            </div>
          </div>

          {/* Right Column: Embedded Document Preview Frame */}
          <div className="bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden relative">
            {isPdf ? (
              <iframe
                src={`${fileUrl}#page=${source.page}`}
                className="w-full h-full rounded-xl border border-slate-800 bg-white"
                title="PDF Page Preview"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-300">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-sm text-white">{source.source}</h4>
                <p className="text-xs text-slate-400 max-w-xs">
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
