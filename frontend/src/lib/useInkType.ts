import { useEffect, useState } from 'react';

/** Reveal target text in uneven word packets — like ink feeding a plotter. */
export function useInkType(target: string): string {
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (!target) {
      setShown('');
      return;
    }
    if (shown && !target.startsWith(shown.slice(0, Math.min(shown.length, target.length)))) {
      setShown('');
      return;
    }
    if (shown.length >= target.length) {
      if (shown !== target) setShown(target);
      return;
    }
    const remain = target.slice(shown.length);
    const word = remain.match(/^\s*\S{1,16}/)?.[0] || remain.slice(0, 1);
    const delay = 16 + Math.min(word.length * 8, 64) + Math.floor(Math.random() * 22);
    const id = window.setTimeout(() => {
      setShown(target.slice(0, shown.length + word.length));
    }, delay);
    return () => window.clearTimeout(id);
  }, [target, shown]);

  return shown;
}
