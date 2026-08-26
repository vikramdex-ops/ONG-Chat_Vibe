import React, { useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

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

export const CompanyName: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [lit, setLit] = useState(false);
  const [x, setX] = useState(50);

  return (
    <span
      className={`company-mark ${lit ? 'is-lit' : ''} ${className}`}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setX(((e.clientX - r.left) / r.width) * 100);
      }}
      style={{ ['--sheen-x' as string]: `${x}%` }}
    >
      Dexterity Design Services
    </span>
  );
};

export const DeveloperName: React.FC<{ className?: string }> = ({ className = '' }) => {
  const letters = 'Vikram'.split('');
  const [hot, setHot] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const reduce = prefersReducedMotion();

  return (
    <span
      className={`dev-mark ${active ? 'is-active' : ''} ${className}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => {
        setActive(false);
        setHot(null);
      }}
    >
      {letters.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={`dev-letter ${hot === i ? 'is-hot' : ''}`}
          style={{ animationDelay: `${i * 70}ms` }}
          onMouseEnter={() => setHot(i)}
        >
          {ch}
        </span>
      ))}
      <span className={`dev-spark ${active && !reduce ? 'is-on' : ''}`} aria-hidden>
        ✦
      </span>
    </span>
  );
};
