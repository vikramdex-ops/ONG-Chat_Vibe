import { SourceContext } from '../types';

export function splitSentences(text: string): string[] {
  return (text || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function overlapScore(sentence: string, chunk: string): number {
  const words = sentence.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (!words.length) return 0;
  const hay = (chunk || '').toLowerCase();
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length;
}

export function bestSourceForSentence(sentence: string, sources: SourceContext[]): SourceContext | null {
  if (!sources.length) return null;
  const labeled = sources.map((s, idx) => {
    const tagBoost = new RegExp(`\\[S${idx + 1}\\]`, 'i').test(sentence) ? 0.5 : 0;
    return { source: s, score: overlapScore(sentence, `${s.source} ${s.text}`) + tagBoost };
  });
  labeled.sort((a, b) => b.score - a.score);
  return labeled[0].score > 0.12 ? labeled[0].source : sources[0];
}

export function citationIndex(sentence: string): number | null {
  const m = sentence.match(/\[S(\d+)\]/i);
  if (!m) return null;
  return parseInt(m[1], 10) - 1;
}
