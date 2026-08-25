import React from 'react';
import { Database, Cpu, Bot, Settings as SettingsIcon, Layers } from 'lucide-react';
import { HealthStatus, TabType } from '../../types';

interface HeaderProps {
  health: HealthStatus | null;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  topK: number;
}

export const Header: React.FC<HeaderProps> = ({ health, setActiveTab, topK }) => {
  const isLlmConnected = health?.llm_server === 'connected';
  const isDbConnected = health?.vector_db === 'healthy';

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-white tracking-tight">SQA-O&amp;G</h1>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              v2.0 Web
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Standard Query Assistant • Oil &amp; Gas Engineering</p>
        </div>
      </div>

      {/* Right: Live Telemetry Badges & Settings */}
      <div className="flex items-center gap-3">
        {/* Knowledge Base Chunks Count */}
        <div className="telemetry-pill bg-slate-800/80 border-slate-700 text-slate-300">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>Indexed:</span>
          <span className="font-bold text-white font-mono">{health?.db_count?.toLocaleString() ?? 0}</span>
          <span className="text-[10px] text-slate-400">chunks</span>
        </div>

        {/* Embedding Model */}
        <div className="telemetry-pill bg-slate-800/80 border-slate-700 text-slate-300 hidden md:inline-flex">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Embed:</span>
          <span className="text-indigo-300 font-mono">MiniLM-L6</span>
          <span className="text-[10px] text-slate-400">({health?.embedding_device ?? 'cpu'})</span>
        </div>

        {/* Top-K Indicator */}
        <div className="telemetry-pill bg-slate-800/80 border-slate-700 text-slate-300 hidden lg:inline-flex">
          <span>Top-K:</span>
          <span className="font-bold text-amber-400 font-mono">{topK}</span>
        </div>

        {/* LLM Connection Status Pill */}
        <div
          className={`telemetry-pill cursor-pointer transition-all ${
            isLlmConnected
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
          onClick={() => setActiveTab('settings')}
          title="Click to configure LLM settings"
        >
          <Bot className={`w-3.5 h-3.5 ${isLlmConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="w-2 h-2 rounded-full relative flex items-center justify-center">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLlmConnected ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isLlmConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            ></span>
          </span>
          <span className="font-semibold">{isLlmConnected ? 'LLM Connected' : 'LLM Disconnected'}</span>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setActiveTab('settings')}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
          title="Open Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
