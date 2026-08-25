const KEY = 'sqa-og-session';

export interface TeamSession {
  display_name: string;
  team_name?: string;
}

export function readSession(): TeamSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: TeamSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
