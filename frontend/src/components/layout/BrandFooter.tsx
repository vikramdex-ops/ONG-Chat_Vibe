import React from 'react';
import { Layers } from 'lucide-react';

interface BrandFooterProps {
  compact?: boolean;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({ compact = false }) => {
  return (
    <div className={`brand-footer rounded-2xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-center gap-3">
        <div className={`${compact ? 'w-9 h-9' : 'w-11 h-11'} rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30 shrink-0`}>
          <Layers className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
        </div>
        <div className="min-w-0">
          <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-fg truncate`}>
            Dexterity Design Services
          </div>
          <div className="text-[10px] text-fg-muted">
            Developed by <span className="font-semibold text-fg">Vikram</span>
          </div>
          {!compact && (
            <div className="text-[10px] text-fg-muted mt-0.5 font-mono">SQA-O&amp;G • Production 2.0</div>
          )}
        </div>
      </div>
    </div>
  );
};
