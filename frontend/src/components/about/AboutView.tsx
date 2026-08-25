import React from 'react';
import { Layers, ShieldCheck, Cpu, Database, Server, CheckCircle2 } from 'lucide-react';
import { BrandFooter } from '../layout/BrandFooter';
import { TiltCard } from '../ui/TiltCard';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="panel p-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/20 border border-blue-400/30 shrink-0">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-fg tracking-tight">SQA-O&amp;G</h2>
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold">
                v2.0 Web Edition
              </span>
            </div>
            <p className="text-sm text-fg/80 font-medium mt-1">
              Standard Query Assistant for Oil &amp; Gas Standards and Engineering Documentation
            </p>
            <div className="mt-5 max-w-md">
              <BrandFooter />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TiltCard className="bg-surface-card border border-line rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
            <Database className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-fg">ChromaDB Vector Store</h4>
          <p className="text-xs text-fg-muted leading-relaxed">
            Persistent local collection <code className="text-blue-600 dark:text-blue-300">pdf_knowledge_base</code> storing deterministic chunk vectors with cosine similarity indexing.
          </p>
        </TiltCard>

        <TiltCard className="bg-surface-card border border-line rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-fg">SentenceTransformers</h4>
          <p className="text-xs text-fg-muted leading-relaxed">
            High-efficiency <code className="text-indigo-600 dark:text-indigo-300">all-MiniLM-L6-v2</code> 384-dimensional dense embeddings for high-recall semantic retrieval.
          </p>
        </TiltCard>

        <TiltCard className="bg-surface-card border border-line rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Server className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-fg">Multi-Provider Inference</h4>
          <p className="text-xs text-fg-muted leading-relaxed">
            Google Gemini (recommended), local llama.cpp, OpenAI-compatible endpoints, or an offline mock engine.
          </p>
        </TiltCard>
      </div>

      <div className="panel p-6 space-y-4">
        <h4 className="font-bold text-sm text-fg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Key System Capabilities
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-fg/80">
          <div className="flex items-start gap-2.5 bg-surface-input p-3 rounded-xl border border-line">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong className="text-fg">Multi-format Parsing:</strong> High-fidelity text and embedded image extraction from PDF, PPTX, and DOCX documents.</span>
          </div>

          <div className="flex items-start gap-2.5 bg-surface-input p-3 rounded-xl border border-line">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong className="text-fg">OCR Fallback:</strong> Automatic Tesseract OCR on scanned or image-heavy PDF pages with &lt; 50 characters.</span>
          </div>

          <div className="flex items-start gap-2.5 bg-surface-input p-3 rounded-xl border border-line">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong className="text-fg">Resumable Indexing:</strong> Process tracking preventing redundant re-indexing of already vectorized engineering standards.</span>
          </div>

          <div className="flex items-start gap-2.5 bg-surface-input p-3 rounded-xl border border-line">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong className="text-fg">Light &amp; Dark Mode:</strong> Default light theme with a one-click toggle that persists in your browser.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
