import React from 'react';
import { CompanyName, DeveloperName } from '../brand/AppLogo';

interface BrandFooterProps {
  compact?: boolean;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({ compact = false }) => {
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <div className={`${compact ? 'text-[11px]' : 'text-xs'} text-fg-muted leading-snug`}>
        Built for <CompanyName />
      </div>
      <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-fg-muted`}>
        Developed by <DeveloperName />
        {!compact && <span className="text-fg-muted/70"> · Production 2.0</span>}
      </div>
    </div>
  );
};
