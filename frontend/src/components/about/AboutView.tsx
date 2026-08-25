import React from 'react';
import { Layers, ShieldCheck, Cpu, Database, Server, FileText, CheckCircle2 } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Hero Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl shadow-black/40 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/20 border border-blue-400/30 shrink-0">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">SQA-O&amp;G</h2>
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                v2.0 Web Edition
              </span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-1">
              Standard Query Assistant for Oil &amp; Gas Standards and Engineering Documentation
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Developed for: </span>
                <span className="text-white font-semibold">Dexterity Design Services</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Developed by: </span>
                <span className="text-white font-semibold">Vikram</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Database className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-white">ChromaDB Vector Store</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Persistent local collection <code className="text-blue-300">pdf_knowledge_base</code> storing deterministic chunk vectors with cosine similarity indexing.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-white">SentenceTransformers</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            High-efficiency <code className="text-indigo-300">all-MiniLM-L6-v2</code> 384-dimensional dense embeddings for high-recall semantic retrieval.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-white">Strict RAG Inference</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Non-hallucinating ChatML prompt execution via local GGUF / llama.cpp or external OpenAI/Ollama API providers.
          </p>
        </div>
      </div>

      {/* Engineering Features */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md space-y-4">
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Key System Capabilities
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Multi-format Parsing:</strong> High-fidelity text and embedded image extraction from PDF, PPTX, and DOCX documents.</span>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>OCR Fallback:</strong> Automatic Tesseract OCR on scanned or image-heavy PDF pages with &lt; 50 characters.</span>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Resumable Indexing:</strong> Process tracking preventing redundant re-indexing of already vectorized engineering standards.</span>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Source Traceability:</strong> Every synthesized answer provides direct links to specific document clauses and page numbers.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
