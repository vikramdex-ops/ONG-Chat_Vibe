import React from 'react';
import {
  MessageSquare,
  UploadCloud,
  FileSpreadsheet,
  History,
  Settings,
  Info,
  ChevronRight
} from 'lucide-react';
import { TabType } from '../../types';
import { BrandFooter } from './BrandFooter';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  documentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, documentCount }) => {
  const navItems = [
    {
      id: 'ask' as TabType,
      label: 'Ask SQA',
      description: 'Query standards & specs',
      icon: MessageSquare,
      color: 'text-blue-500',
      activeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    },
    {
      id: 'indexing' as TabType,
      label: 'Knowledge Base',
      description: 'Index PDF, PPTX, DOCX',
      icon: UploadCloud,
      color: 'text-emerald-500',
      activeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'documents' as TabType,
      label: 'Document Library',
      description: 'Inspect indexed files',
      icon: FileSpreadsheet,
      color: 'text-amber-500',
      badge: documentCount > 0 ? documentCount : undefined,
      activeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    },
    {
      id: 'history' as TabType,
      label: 'Query History',
      description: 'Past engineering queries',
      icon: History,
      color: 'text-purple-500',
      activeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      description: 'LLM & DB configuration',
      icon: Settings,
      color: 'text-cyan-600 dark:text-cyan-400',
      activeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30'
    },
    {
      id: 'about' as TabType,
      label: 'About',
      description: 'Dexterity Design Services',
      icon: Info,
      color: 'text-fg-muted',
      activeBg: 'bg-surface-muted text-fg border-line'
    },
  ];

  return (
    <aside className="w-64 border-r border-line bg-surface-card/80 flex flex-col justify-between py-5 px-3 select-none">
      <div className="space-y-1.5">
        <div className="px-3 pb-3 text-[11px] font-bold uppercase tracking-wider text-fg-muted font-mono">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all group ${
                isActive
                  ? `${item.activeBg} shadow-sm font-semibold`
                  : 'border-transparent text-fg/80 hover:text-fg hover:bg-surface-muted font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : 'text-fg-muted group-hover:text-fg'}`} />
                <div className="min-w-0">
                  <div className="text-sm truncate">{item.label}</div>
                  <div className="text-[10px] text-fg-muted truncate font-normal">{item.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-surface-muted text-fg border border-line">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-3 pt-4 border-t border-line">
        <div className="text-[11px] text-fg-muted font-medium leading-tight">
          Developed for <span className="text-fg font-semibold">Dexterity Design Services</span>
        </div>
        <div className="text-[10px] text-fg-muted mt-0.5">
          By Vikram • Production Build 2.0
        </div>
      </div>
    </aside>
  );
};
