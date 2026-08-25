import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { PersistenceNotice } from './components/layout/PersistenceNotice';
import { AskView } from './components/ask/AskView';
import { IndexingView } from './components/indexing/IndexingView';
import { DocumentsView } from './components/documents/DocumentsView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { AboutView } from './components/about/AboutView';
import { TabType, HealthStatus, AppSettings, ImageResult, SourceContext } from './types';
import { getHealth, getSettings, getDocuments, getLive, LiveStatus } from './services/api';
import { API_BASE } from './lib/apiBase';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ask');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [prefilledQuestion, setPrefilledQuestion] = useState<string>('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [replay, setReplay] = useState<{ question: string; answer: string; sources: SourceContext[]; images: ImageResult[] } | null>(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const lastLiveOk = useRef<number>(0);
  const isRemoteApi = /^https?:\/\//i.test(API_BASE);

  const refreshGlobalState = async () => {
    try {
      const probe = await getLive();
      lastLiveOk.current = Date.now();
      setLive(probe);
      setApiReady(true);
    } catch {
      // Indexing can starve the CPU for a few seconds without the process being down.
      if (Date.now() - lastLiveOk.current < 120_000) {
        return;
      }
      if (!isRemoteApi) {
        setApiReady(true);
        return;
      }
      setApiReady(false);
      return;
    }
    try {
      const [h, s, docs] = await Promise.all([
        getHealth(),
        getSettings(),
        getDocuments()
      ]);
      setHealth(h);
      setSettings(s);
      setDocumentCount(docs.filter(d => d.status === 'indexed').length);
    } catch (e) {
      console.warn('Telemetry polling notice:', e);
    }
  };

  useEffect(() => {
    refreshGlobalState();
    const interval = setInterval(refreshGlobalState, 10000);
    const heartbeat = window.setInterval(() => {
      getLive().catch(() => undefined);
    }, 4 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleReopenQuery = (q: string) => {
    setPrefilledQuestion(q);
    setLastQuestion(q);
    setActiveTab('ask');
  };

  const handleReplay = (payload: { question: string; answer: string; sources: SourceContext[]; images: ImageResult[] }) => {
    setReplay(payload);
    setLastQuestion(payload.question);
    setActiveTab('ask');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      <Header
        health={health}
        live={live}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        topK={settings?.top_k || 3}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          documentCount={documentCount}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-surface via-blue-50/40 to-surface dark:via-slate-900/40">
          {apiReady === false && (
            <div className="max-w-4xl mx-auto mb-4 rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
              Waking the live API… free hosts sleep when idle, so the first request can take up to a minute. This banner disappears when <span className="font-mono">/api/health/live</span> answers. Long indexing can make other requests slow without the API being down.
            </div>
          )}
          <div key={activeTab} className="tab-pane">
            {activeTab === 'ask' && (
              <AskView
                health={health}
                topK={settings?.top_k || 3}
                initialQuestion={prefilledQuestion}
                replay={replay}
                onReplayConsumed={() => setReplay(null)}
                onQueryComplete={() => {
                  setLastQuestion(prefilledQuestion);
                  refreshGlobalState();
                }}
              />
            )}

            {activeTab === 'indexing' && (
              <IndexingView
                settings={settings}
                health={health}
                live={live}
                onIndexingFinished={refreshGlobalState}
              />
            )}

            {activeTab === 'documents' && <DocumentsView />}

            {activeTab === 'history' && (
              <HistoryView onReopenQuery={handleReopenQuery} onReplay={handleReplay} />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                health={health}
                onSettingsSaved={(newSettings) => {
                  setSettings(newSettings);
                  refreshGlobalState();
                }}
              />
            )}

            {activeTab === 'about' && <AboutView />}
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setActiveTab={setActiveTab}
        lastQuestion={lastQuestion || prefilledQuestion}
        onAskLast={() => {
          if (lastQuestion || prefilledQuestion) {
            setPrefilledQuestion(lastQuestion || prefilledQuestion);
            setActiveTab('ask');
          }
        }}
      />
    </div>
  );
};

export default App;
