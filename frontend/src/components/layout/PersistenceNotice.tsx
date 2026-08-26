import React from 'react';
import { HardDrive, MonitorDown } from 'lucide-react';
import { HealthStatus } from '../../types';
import { LiveStatus } from '../../services/api';

const FALLBACK_RELEASE = 'https://github.com/vikramdex-ops/ONG-Chat_Vibe/releases/tag/desktop-latest';

interface PersistenceNoticeProps {
  health: HealthStatus | null;
  live: LiveStatus | null;
}

export const PersistenceNotice: React.FC<PersistenceNoticeProps> = ({ health, live }) => {
  const persistence = live?.persistence || health?.details?.persistence;
  const runtime = live?.runtime || health?.details?.runtime;
  const releases = live?.desktop_releases_url || health?.details?.desktop_releases_url || FALLBACK_RELEASE;
  if (persistence !== 'ephemeral') return null;

  return (
    <div className="max-w-4xl mx-auto mb-4 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-950 dark:text-rose-100">
      <div className="flex items-start gap-2">
        <HardDrive className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
        <div className="space-y-1 min-w-0">
          <p className="font-semibold">
            This {runtime === 'cloud' ? 'cloud host' : 'server'} wipes the knowledge base on every sleep, crash, and redeploy.
          </p>
          <p className="text-rose-900/80 dark:text-rose-100/80">
            That is why Indexed went back to 0. For hundreds of PDFs or thousand-page standards, run the Windows app — Chroma lives in your user folder and survives updates.
          </p>
          <a
            href={releases}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-1 font-semibold text-rose-800 dark:text-rose-100 underline underline-offset-2"
          >
            <MonitorDown className="w-3.5 h-3.5" />
            Download SQA-OG-windows.zip from GitHub Releases
          </a>
        </div>
      </div>
    </div>
  );
};
