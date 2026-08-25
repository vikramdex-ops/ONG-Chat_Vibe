import React from 'react';
import { Database, Cpu, Bot, Settings as SettingsIcon, Layers, Sun, Moon } from 'lucide-react';
import { HealthStatus, TabType } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  health: HealthStatus | null;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  topK: number;
}

export const Header: React.FC<HeaderProps> = ({ health, setActiveTab, topK }) => {
  const { theme, toggleTheme } = useTheme();
  const isLlmConnected = health?.llm_server === 'connected';

  return (
    <header className="h-16 border-b border-line bg-surface-card/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-fg tracking-tight">SQA-O&amp;G</h1>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold">
              v2.0 Web
            </span>
          </div>
          <p className="text-xs text-fg-muted font-medium">Standard Query Assistant • Oil &amp; Gas Engineering</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="telemetry-pill bg-surface-muted border-line text-fg">
          <Database className="w-3.5 h-3.5 text-blue-500" />
          <span>Indexed:</span>
          <span className="font-bold text-fg font-mono">{health?.db_count?.toLocaleString() ?? 0}</span>
          <span className="text-[10px] text-fg-muted">chunks</span>
        </div>

        <div className="telemetry-pill bg-surface-muted border-line text-fg hidden md:inline-flex">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          <span>Embed:</span>
          <span className="text-indigo-600 dark:text-indigo-300 font-mono">MiniLM-L6</span>
          <span className="text-[10px] text-fg-muted">({health?.embedding_device ?? 'cpu'})</span>
        </div>

        <div className="telemetry-pill bg-surface-muted border-line text-fg hidden lg:inline-flex">
          <span>Top-K:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{topK}</span>
        </div>

        <div
          className={`telemetry-pill cursor-pointer transition-all ${
            isLlmConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400/50 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-400/50 text-rose-700 dark:text-rose-300'
          }`}
          onClick={() => setActiveTab('settings')}
          title="Click to configure LLM settings"
        >
          <Bot className={`w-3.5 h-3.5 ${isLlmConnected ? 'text-emerald-500' : 'text-rose-500'}`} />
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

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-muted border border-line transition-colors"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label="Toggle light and dark mode"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-muted border border-line transition-colors"
          title="Open Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
