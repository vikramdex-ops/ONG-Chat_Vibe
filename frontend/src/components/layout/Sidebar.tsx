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
      color: 'text-blue-400',
      activeBg: 'bg-blue-600/10 text-blue-400 border-blue-500/30'
    },
    {
      id: 'indexing' as TabType,
      label: 'Knowledge Base',
      description: 'Index PDF, PPTX, DOCX',
      icon: UploadCloud,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'documents' as TabType,
      label: 'Document Library',
      description: 'Inspect indexed files',
      icon: FileSpreadsheet,
      color: 'text-amber-400',
      badge: documentCount > 0 ? documentCount : undefined,
      activeBg: 'bg-amber-600/10 text-amber-400 border-amber-500/30'
    },
    {
      id: 'history' as TabType,
      label: 'Query History',
      description: 'Past engineering queries',
      icon: History,
      color: 'text-purple-400',
      activeBg: 'bg-purple-600/10 text-purple-400 border-purple-500/30'
    },
    {
      id: 'settings' as TabType,
      label: 'Settings',
      description: 'LLM & DB configuration',
      icon: Settings,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/30'
    },
    {
      id: 'about' as TabType,
      label: 'About',
      description: 'Dexterity Design Services',
      icon: Info,
      color: 'text-slate-400',
      activeBg: 'bg-slate-800 text-white border-slate-700'
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-900/60 flex flex-col justify-between py-5 px-3 select-none">
      <div className="space-y-1.5">
        <div className="px-3 pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
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
                  : 'border-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : 'text-slate-400 group-hover:text-slate-200'}`} />
                <div className="min-w-0">
                  <div className="text-sm truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-400 truncate font-normal">{item.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Attribution Tag */}
      <div className="px-3 pt-4 border-t border-slate-800/60">
        <div className="text-[11px] text-slate-400 font-medium leading-tight">
          Developed for <span className="text-slate-200 font-semibold">Dexterity Design Services</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          By Vikram • Production Build 2.0
        </div>
      </div>
    </aside>
  );
};
