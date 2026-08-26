import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { TabType } from '../../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  setActiveTab: (tab: TabType) => void;
  lastQuestion?: string;
  onAskLast?: () => void;
}

const COMMANDS: { id: string; label: string; hint: string; run: (p: CommandPaletteProps) => void }[] = [
  { id: 'ask', label: 'Go to Ask SQA', hint: 'Query standards', run: (p) => p.setActiveTab('ask') },
  { id: 'index', label: 'Go to Knowledge Base', hint: 'Index documents', run: (p) => p.setActiveTab('indexing') },
  { id: 'docs', label: 'Go to Document Library', hint: 'Inspect chunks', run: (p) => p.setActiveTab('documents') },
  { id: 'history', label: 'Go to Query History', hint: 'Replay past answers', run: (p) => p.setActiveTab('history') },
  { id: 'settings', label: 'Go to Settings', hint: 'LLM and team', run: (p) => p.setActiveTab('settings') },
  { id: 'about', label: 'Go to About', hint: 'Product info', run: (p) => p.setActiveTab('about') },
];

export const CommandPalette: React.FC<CommandPaletteProps> = (props) => {
  const { open, onClose } = props;
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const items = useMemo(() => {
    const extra = props.lastQuestion
      ? [{ id: 'last', label: `Ask last: ${props.lastQuestion.slice(0, 48)}`, hint: 'Reuse last question', run: (p: CommandPaletteProps) => p.onAskLast?.() }]
      : [];
    return [...extra, ...COMMANDS].filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
  }, [q, props.lastQuestion]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="w-full max-w-lg panel overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
          <Search className="w-4 h-4 text-fg-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to Ask, Index, Settings…"
            className="flex-1 bg-transparent text-sm text-fg outline-none py-2"
          />
          <kbd className="text-[10px] font-mono text-fg-muted border border-line rounded px-1.5">Esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { item.run(props); onClose(); }}
              className="w-full text-left px-4 py-2.5 hover:bg-surface-muted"
            >
              <div className="text-sm text-fg">{item.label}</div>
              <div className="text-[11px] text-fg-muted">{item.hint}</div>
            </button>
          ))}
          {items.length === 0 && <div className="px-4 py-6 text-xs text-fg-muted">No matches</div>}
        </div>
      </div>
    </div>
  );
};
