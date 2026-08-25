const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined;
export const API_BASE = (envBase && envBase.trim()) || '/api';
