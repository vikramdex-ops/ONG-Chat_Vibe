import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Server,
  Database,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { AppSettings, HealthStatus } from '../../types';
import { getSettings, updateSettings, testLLM } from '../../services/api';

interface SettingsViewProps {
  health: HealthStatus | null;
  onSettingsSaved?: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ health, onSettingsSaved }) => {
  const [formData, setFormData] = useState<AppSettings>({
    chroma_db_path: '',
    collection_name: 'pdf_knowledge_base',
    embedding_model_name: 'all-MiniLM-L6-v2',
    embedding_device: 'cpu',
    chunk_size: 1000,
    chunk_overlap: 150,
    top_k: 3,
    worker_count: 4,
    ocr_char_threshold: 50,
    batch_write_size: 4096,
    llm_provider: 'local',
    llm_server_url: 'http://127.0.0.1:8000',
    llm_api_key: '',
    llm_model_name: 'default',
    llm_max_tokens: 512,
    llm_temperature: 0.6,
    llm_stop_strings: ['<|im_end|>', '<|endoftext|>']
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => setFormData(s))
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testLLM(formData.llm_server_url, formData.llm_provider, formData.llm_api_key || '');
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    try {
      const updated = await updateSettings(formData);
      setFormData(updated);
      setSaveSuccess(true);
      if (onSettingsSaved) onSettingsSaved(updated);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          System &amp; Pipeline Configuration
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure inference endpoints, vector storage paths, retrieval Top-K limits, and model parameters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LLM Inference Provider Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              LLM Inference Provider
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Status: {health?.llm_server === 'connected' ? (
                <span className="text-emerald-400 font-semibold">Connected</span>
              ) : (
                <span className="text-rose-400 font-semibold">Disconnected</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Provider Type</label>
              <select
                value={formData.llm_provider}
                onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="local">Local FastAPI / llama.cpp Server (POST /generate)</option>
                <option value="openai">OpenAI Compatible (Ollama / vLLM / OpenAI)</option>
                <option value="mock">Internal Mock Engine (Offline / Test)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">LLM Server Endpoint URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.llm_server_url}
                  onChange={(e) => setFormData({ ...formData, llm_server_url: e.target.value })}
                  placeholder="http://127.0.0.1:8000"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5"
                >
                  {isTesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Test</span>
                </button>
              </div>
            </div>

            {formData.llm_provider === 'openai' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">API Key (Optional)</label>
                  <input
                    type="password"
                    value={formData.llm_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, llm_api_key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Model Name</label>
                  <input
                    type="text"
                    value={formData.llm_model_name}
                    onChange={(e) => setFormData({ ...formData, llm_model_name: e.target.value })}
                    placeholder="e.g. qwen2.5:0.5b or gpt-4o-mini"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-800/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Vector DB & Embeddings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Vector Database &amp; Embeddings
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              ChromaDB • {health?.db_count || 0} chunks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ChromaDB Path</label>
              <input
                type="text"
                value={formData.chroma_db_path}
                onChange={(e) => setFormData({ ...formData, chroma_db_path: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Collection Name</label>
              <input
                type="text"
                disabled
                value={formData.collection_name}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Locked to pdf_knowledge_base for compatibility</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Embedding Model</label>
              <input
                type="text"
                disabled
                value={formData.embedding_model_name}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">384-dimensional SentenceTransformer</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Top-K Retrieved Chunks: {formData.top_k}</label>
              <input
                type="range"
                min={1}
                max={20}
                value={formData.top_k}
                onChange={(e) => setFormData({ ...formData, top_k: parseInt(e.target.value) || 3 })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>1 chunk</span>
                <span>Default: 3</span>
                <span>20 chunks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
