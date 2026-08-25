import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { AskView } from './components/ask/AskView';
import { IndexingView } from './components/indexing/IndexingView';
import { DocumentsView } from './components/documents/DocumentsView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { AboutView } from './components/about/AboutView';
import { TabType, HealthStatus, AppSettings } from './types';
import { getHealth, getSettings, getDocuments } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ask');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [prefilledQuestion, setPrefilledQuestion] = useState<string>('');

  const refreshGlobalState = async () => {
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
    return () => clearInterval(interval);
  }, []);

  const handleReopenQuery = (q: string) => {
    setPrefilledQuestion(q);
    setActiveTab('ask');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      <Header
        health={health}
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
          {activeTab === 'ask' && (
            <AskView
              health={health}
              topK={settings?.top_k || 3}
              initialQuestion={prefilledQuestion}
              onQueryComplete={refreshGlobalState}
            />
          )}

          {activeTab === 'indexing' && (
            <IndexingView
              settings={settings}
              onIndexingFinished={refreshGlobalState}
            />
          )}

          {activeTab === 'documents' && <DocumentsView />}

          {activeTab === 'history' && (
            <HistoryView onReopenQuery={handleReopenQuery} />
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
        </main>
      </div>
    </div>
  );
};

export default App;
