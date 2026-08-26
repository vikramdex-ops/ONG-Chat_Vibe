const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
export const API_BASE = (envBase && envBase.trim()) || '/api';

/** Turn a backend-relative `/api/...` path into a URL that works on Vercel + a remote API. */
export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE.replace(/\/$/, '');
  if (path.startsWith('/api/')) {
    return `${base}/${path.slice('/api/'.length)}`;
  }
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}

export function documentFileUrl(filename: string): string {
  return resolveApiUrl(`/api/documents/${encodeURIComponent(filename)}/file`);
}

export function imageFileUrl(filename: string): string {
  return resolveApiUrl(`/api/images/${encodeURIComponent(filename)}`);
}
