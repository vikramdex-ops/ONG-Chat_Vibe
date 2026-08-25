const STORAGE_KEY = 'sqa-og-user-llm';

export interface UserLlmPrefs {
  apiKey: string;
  model: string;
  provider: string;
}

const defaults: UserLlmPrefs = {
  apiKey: '',
  model: 'gemini-2.5-flash',
  provider: 'gemini',
};

export function loadUserLlm(): UserLlmPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<UserLlmPrefs>;
    return {
      apiKey: parsed.apiKey || '',
      model: parsed.model || defaults.model,
      provider: parsed.provider || defaults.provider,
    };
  } catch {
    return { ...defaults };
  }
}

export function saveUserLlm(prefs: Partial<UserLlmPrefs>): UserLlmPrefs {
  const next = { ...loadUserLlm(), ...prefs };
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
