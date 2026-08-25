import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { AppSettings, HealthStatus } from '../../types';
import { getSettings, updateSettings, testLLM, kbExportUrl, importKbPack, loginTeam } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { readSession, writeSession } from '../../lib/session';

interface SettingsViewProps {
  health: HealthStatus | null;
  onSettingsSaved?: (newSettings: AppSettings) => void;
}

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (recommended)' },
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
];

const GEMINI_KEY_URL = 'https://aistudio.google.com/app/apikey';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com';

export const SettingsView: React.FC<SettingsViewProps> = ({ health, onSettingsSaved }) => {
  const { theme, setTheme } = useTheme();
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
  const [customGeminiModel, setCustomGeminiModel] = useState(false);
  const [lastOk, setLastOk] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(readSession()?.display_name || '');
  const [passcode, setPasscode] = useState('');
  const [flipPro, setFlipPro] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setFormData(s))
      .catch((err) => console.error('Failed to load settings:', err));
  }, []);

  const handleProviderChange = (provider: string) => {
    const next = { ...formData, llm_provider: provider };
    if (provider === 'gemini') {
      next.llm_server_url = GEMINI_API_URL;
      if (!next.llm_model_name || next.llm_model_name === 'default') {
        next.llm_model_name = 'gemini-2.5-flash';
      }
      setCustomGeminiModel(false);
    } else if (provider === 'mock') {
      next.llm_server_url = next.llm_server_url || 'http://mock.local';
    } else if (!next.llm_server_url || next.llm_server_url === GEMINI_API_URL) {
      next.llm_server_url = 'http://127.0.0.1:8000';
    }
    setFormData(next);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testLLM(
        formData.llm_server_url,
        formData.llm_provider,
        formData.llm_api_key || '',
        formData.llm_model_name
      );
      setTestResult(res);
      if (res.success) setLastOk(new Date().toLocaleTimeString());
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

  const isGemini = formData.llm_provider === 'gemini';
  const isMock = formData.llm_provider === 'mock';
  const showEndpoint = !isGemini && !isMock;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="panel p-6">
        <h3 className="font-bold text-base text-fg flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          System &amp; Pipeline Configuration
        </h3>
        <p className="text-xs text-fg-muted mt-0.5">
          Configure inference endpoints, vector storage paths, retrieval Top-K limits, and appearance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h4 className="font-bold text-sm text-fg flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-500" />
              Appearance
            </h4>
            <span className="text-[11px] font-mono text-fg-muted capitalize">{theme} mode</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                theme === 'light'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-surface-muted text-fg border-line hover:bg-surface-input'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-surface-muted text-fg border-line hover:bg-surface-input'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
            <span className="text-[11px] text-fg-muted ml-2">Default is light. Preference is saved in this browser.</span>
          </div>
        </div>

        <div className="panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h4 className="font-bold text-sm text-fg flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              LLM Inference Provider
            </h4>
            <span className="text-[11px] font-mono text-fg-muted flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health?.llm_server === 'connected' || testResult?.success ? 'bg-emerald-500 worker-dot' : 'bg-rose-400'}`} />
              {health?.llm_server === 'connected' || testResult?.success ? 'Connected' : 'Disconnected'}
              {lastOk && <span className="text-fg-muted">last ok {lastOk}</span>}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-fg block mb-1">Provider Type</label>
              <select
                value={formData.llm_provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="field"
              >
                <option value="gemini">Google Gemini API (recommended, free tier)</option>
                <option value="local">Local FastAPI / llama.cpp Server (POST /generate)</option>
                <option value="openai">OpenAI Compatible (Ollama / vLLM / OpenAI)</option>
                <option value="mock">Internal Mock Engine (Offline / Test)</option>
              </select>
            </div>

            {showEndpoint && (
              <div>
                <label className="text-xs font-semibold text-fg block mb-1">LLM Server Endpoint URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.llm_server_url}
                    onChange={(e) => setFormData({ ...formData, llm_server_url: e.target.value })}
                    placeholder="http://127.0.0.1:8000"
                    className="field flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3 py-2 rounded-xl bg-surface-muted hover:bg-line text-fg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 border border-line"
                  >
                    {isTesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Test</span>
                  </button>
                </div>
              </div>
            )}

            {isGemini && (
              <>
                <div>
                  <label className="text-xs font-semibold text-fg block mb-1">Gemini API Key</label>
                  <input
                    type="password"
                    value={formData.llm_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, llm_api_key: e.target.value, gemini_api_key: e.target.value })}
                    placeholder="Paste your Gemini API key"
                    className="field"
                  />
                  <a
                    href={GEMINI_KEY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Get Free API Key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <label className="text-xs font-semibold text-fg block mb-1">Gemini Model</label>
                  <div className="flex gap-2">
                    <select
                      value={customGeminiModel ? '__custom__' : (GEMINI_MODELS.some((m) => m.value === formData.llm_model_name) ? formData.llm_model_name : 'gemini-2.5-flash')}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setCustomGeminiModel(true);
                          return;
                        }
                        setCustomGeminiModel(false);
                        setFormData({ ...formData, llm_model_name: e.target.value, gemini_model_name: e.target.value });
                      }}
                      className="field flex-1"
                    >
                      {GEMINI_MODELS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                      <option value="__custom__">Custom model…</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-3 py-2 rounded-xl bg-surface-muted hover:bg-line text-fg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 border border-line"
                    >
                      {isTesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Test</span>
                    </button>
                  </div>
                  {customGeminiModel && (
                    <input
                      type="text"
                      value={formData.llm_model_name}
                      onChange={(e) => setFormData({ ...formData, llm_model_name: e.target.value, gemini_model_name: e.target.value })}
                      placeholder="e.g. gemini-2.5-flash-lite"
                      className="field mt-2"
                    />
                  )}
                </div>
              </>
            )}

            {formData.llm_provider === 'openai' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-fg block mb-1">API Key (Optional)</label>
                  <input
                    type="password"
                    value={formData.llm_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, llm_api_key: e.target.value })}
                    placeholder="sk-..."
                    className="field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-fg block mb-1">Model Name</label>
                  <input
                    type="text"
                    value={formData.llm_model_name}
                    onChange={(e) => setFormData({ ...formData, llm_model_name: e.target.value })}
                    placeholder="e.g. qwen2.5:0.5b or gpt-4o-mini"
                    className="field"
                  />
                </div>
              </>
            )}

            {isMock && (
              <div className="md:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3 py-2 rounded-xl bg-surface-muted hover:bg-line text-fg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-line"
                >
                  {isTesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Test</span>
                </button>
              </div>
            )}
          </div>

          {isGemini && (
            <>
              <p className="text-[11px] text-fg-muted">
                Sign in with Google at AI Studio, paste your key, pick a model, then click Test. Status turns connected when the key is valid.
              </p>
              <button type="button" onClick={() => {
                setFlipPro((v) => !v);
                const next = flipPro ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
                setFormData({ ...formData, llm_model_name: next, gemini_model_name: next });
              }} className="model-flip">
                <span className="font-semibold">{flipPro ? 'Pro — deeper reasoning' : 'Flash — faster answers'}</span>
                <span className="text-[11px] text-fg-muted block">Click to flip speed vs depth</span>
              </button>
            </>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h4 className="font-bold text-sm text-fg flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              Vector Database &amp; Embeddings
            </h4>
            <span className="text-[11px] font-mono text-fg-muted">
              ChromaDB • {health?.db_count || 0} chunks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-fg block mb-1">ChromaDB Path</label>
              <input
                type="text"
                value={formData.chroma_db_path}
                onChange={(e) => setFormData({ ...formData, chroma_db_path: e.target.value })}
                className="field"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-fg block mb-1">Collection Name</label>
              <input
                type="text"
                disabled
                value={formData.collection_name}
                className="field opacity-70 cursor-not-allowed"
              />
              <span className="text-[10px] text-fg-muted mt-1 block">
                Point this at a copied <code>chroma_db</code> folder. Images are resolved from a sibling <code>images</code> directory automatically.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-fg block mb-1">Embedding Model</label>
              <input
                type="text"
                disabled
                value={formData.embedding_model_name}
                className="field opacity-70 cursor-not-allowed"
              />
              <span className="text-[10px] text-fg-muted mt-1 block">384-dimensional SentenceTransformer</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-fg block mb-1">Top-K Retrieved Chunks: {formData.top_k}</label>
              <input
                type="range"
                min={1}
                max={20}
                value={formData.top_k}
                onChange={(e) => setFormData({ ...formData, top_k: parseInt(e.target.value) || 3 })}
                className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer accent-blue-500 mt-3"
              />
              <div className="flex justify-between text-[10px] text-fg-muted font-mono mt-1">
                <span>1 chunk</span>
                <span>Default: 3</span>
                <span>20 chunks</span>
              </div>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

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
