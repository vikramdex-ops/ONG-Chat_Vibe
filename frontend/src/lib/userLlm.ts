const STORAGE_KEY = 'sqa-og-user-llm';

export interface UserLlmPrefs {
  apiKey: string;
  model: string;
  provider: string;
}

const RETIRED = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'default',
]);

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

function liveModel(model?: string): string {
  const name = (model || '').replace(/^models\//, '').trim();
  if (!name || RETIRED.has(name)) return DEFAULT_GEMINI_MODEL;
  return name;
}

const defaults: UserLlmPrefs = {
  apiKey: '',
  model: DEFAULT_GEMINI_MODEL,
  provider: 'gemini',
};

export function loadUserLlm(): UserLlmPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<UserLlmPrefs>;
    const next = {
      apiKey: parsed.apiKey || '',
      model: liveModel(parsed.model || defaults.model),
      provider: parsed.provider || defaults.provider,
    };
    if (parsed.model && parsed.model !== next.model) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  } catch {
    return { ...defaults };
  }
}

export function saveUserLlm(prefs: Partial<UserLlmPrefs>): UserLlmPrefs {
  const merged = { ...loadUserLlm(), ...prefs };
  const next = { ...merged, model: liveModel(merged.model) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function userLlmHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const prefs = loadUserLlm();
  const headers: Record<string, string> = { ...extra };
  if (prefs.apiKey) headers['X-Gemini-Api-Key'] = prefs.apiKey;
  if (prefs.model) headers['X-LLM-Model'] = prefs.model;
  if (prefs.provider) headers['X-LLM-Provider'] = prefs.provider;
  return headers;
}
