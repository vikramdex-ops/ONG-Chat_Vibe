import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  rounded?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 40, className = '', rounded = true }) => (
  <img
    src="/app-logo.png"
    alt="SQA-O&G"
    width={size}
    height={size}
    className={`object-cover shrink-0 ${rounded ? 'rounded-xl' : ''} ${className}`}
    draggable={false}
  />
);

export const CompanyName: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`credit-company ${className}`}>Dexterity Design Services</span>
);

export const DeveloperName: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`credit-developer ${className}`}>Vikram</span>
);
