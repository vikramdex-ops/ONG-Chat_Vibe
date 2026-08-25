import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  FileText,
  Trash2,
  Layers,
  RefreshCw,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { DocumentInfo, DocumentChunk } from '../../types';
import { getDocuments, deleteDocument, getDocumentChunks } from '../../services/api';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<string | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to remove '${filename}' from the indexed knowledge base?`)) {
      return;
    }
    try {
      await deleteDocument(filename);
      await fetchDocs();
    } catch (e: any) {
      alert(`Failed to delete document: ${e.message}`);
    }
  };

  const handleInspectChunks = async (filename: string) => {
    setSelectedDocForChunks(filename);
    setIsLoadingChunks(true);
    try {
      const chunks = await getDocumentChunks(filename);
      setDocChunks(chunks);
    } catch (e) {
      console.error('Failed to get chunks:', e);
      setDocChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-fg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            Knowledge Base Document Library
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Browse indexed engineering standards, inspect extracted vector chunks, or remove obsolete files.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-surface-input border border-line rounded-xl pl-9 pr-3 py-1.5 text-xs text-fg placeholder-fg-muted focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={fetchDocs}
            className="p-2 rounded-xl text-fg-muted hover:text-fg bg-surface-muted hover:bg-line border border-line transition-colors"
            title="Refresh document catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-muted/80 border-b border-line text-fg-muted font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-5">Filename</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Pages / Slides</th>
                <th className="py-3.5 px-4">Indexed Chunks</th>
                <th className="py-3.5 px-4">Extracted Images</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-fg-muted text-xs">
                    {search ? 'No matching documents found.' : 'No documents indexed in knowledge base yet.'}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-muted/60 transition-colors group">
                    <td className="py-3.5 px-5 font-semibold text-fg flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate max-w-sm" title={doc.filename}>{doc.filename}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-muted text-fg border border-line">
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-fg">
                      {doc.page_count > 0 ? doc.page_count : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-fg">
                      {doc.chunk_count > 0 ? doc.chunk_count : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-fg">
                      {doc.image_count > 0 ? (
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                          <ImageIcon className="w-3 h-3" />
                          {doc.image_count}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          doc.status === 'indexed'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      {doc.status === 'indexed' && (
                        <button
                          type="button"
                          onClick={() => handleInspectChunks(doc.filename)}
                          className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-line text-fg border border-line text-[11px] transition-colors"
                        >
                          Inspect Chunks
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.filename)}
                        className="p-1.5 rounded-lg text-fg-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete document chunks from vector database"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDocForChunks && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-line rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="h-14 px-6 border-b border-line flex items-center justify-between bg-surface-muted/60 shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-fg">Chunks in {selectedDocForChunks}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  {docChunks.length} chunks
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocForChunks(null)}
                className="p-1.5 text-fg-muted hover:text-fg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {isLoadingChunks ? (
                <div className="py-12 text-center text-fg-muted text-xs">Loading chunks from ChromaDB...</div>
              ) : docChunks.length === 0 ? (
                <div className="py-12 text-center text-fg-muted text-xs">No chunks retrieved for this document.</div>
              ) : (
                docChunks.map((chunk, idx) => (
                  <div key={idx} className="bg-surface-input p-4 rounded-xl border border-line space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted pb-1 border-b border-line">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">Page {chunk.page_number} • Chunk #{chunk.chunk_index}</span>
                      <span>ID: {chunk.id}</span>
                    </div>
                    <div className="font-mono text-xs text-fg leading-relaxed whitespace-pre-wrap">
                      {chunk.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
