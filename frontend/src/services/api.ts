import {
  HealthStatus,
  AppSettings,
  QueryResponse,
  QueryRequest,
  DocumentInfo,
  DocumentChunk,
  IndexStatus,
  LogEntry,
  HistoryItem,
  BookmarkItem,
  SourceContext
} from '../types';
import { API_BASE } from '../lib/apiBase';

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health status');
  return res.json();
}

export async function getSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateSettings(settings: AppSettings): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update settings' }));
    throw new Error(errorData.detail || 'Failed to update settings');
  }
  return res.json();
}

export async function testLLM(
  url: string,
  provider: string = 'local',
  apiKey: string = '',
  model: string = ''
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/settings/test-llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, provider, api_key: apiKey, model })
  });
  return res.json();
}

export async function executeQuery(question: string, topK?: number, extras: Partial<QueryRequest> = {}): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK, ...extras })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Query failed' }));
    throw new Error(err.detail || 'Query execution failed');
  }
  return res.json();
}

export function streamQuery(
  question: string,
  topK: number | undefined,
  callbacks: {
    onStatus?: (status: string) => void;
    onContext?: (data: { context: any[]; images: any[]; db_count: number }) => void;
    onToken?: (token: string) => void;
    onComplete?: (data: QueryResponse) => void;
    onError?: (error: string) => void;
  },
  extras: Partial<QueryRequest> = {}
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/query/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK, ...extras }),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedAnswer = '';
      let receivedContext: any[] = [];
      let receivedImages: any[] = [];
      let dbCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'status' && callbacks.onStatus) {
                callbacks.onStatus(data.message);
              } else if (currentEvent === 'context' && callbacks.onContext) {
                receivedContext = data.context || [];
                receivedImages = data.images || [];
                dbCount = data.db_count || 0;
                callbacks.onContext(data);
              } else if (currentEvent === 'token' && callbacks.onToken) {
                accumulatedAnswer += data.text || '';
                callbacks.onToken(data.text || '');
              } else if (currentEvent === 'complete' && callbacks.onComplete) {
                callbacks.onComplete({
                  answer: data.answer || accumulatedAnswer,
                  context: data.context || receivedContext,
                  images: data.images || receivedImages,
                  db_count: data.db_count || dbCount,
                  execution_time_ms: 0
                });
              } else if (currentEvent === 'error' && callbacks.onError) {
                callbacks.onError(data.message || 'Stream error');
              }
            } catch (e) {
              console.error('Failed parsing SSE JSON data:', line, e);
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError' && callbacks.onError) {
        callbacks.onError(err.message || 'Connection lost');
      }
    });

  return () => controller.abort();
}

export async function getDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to list documents');
  return res.json();
}

export async function uploadDocuments(files: File[]): Promise<any> {
  const formData = new FormData();
  for (const f of files) {
    formData.append('files', f);
  }
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed uploading documents');
  return res.json();
}

export async function getDocumentChunks(filename: string): Promise<DocumentChunk[]> {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}/chunks`);
  if (!res.ok) throw new Error('Failed fetching document chunks');
  return res.json();
}

export async function deleteDocument(filename: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function startIndexing(req?: { directory_path?: string; worker_count?: number; chunk_size?: number; chunk_overlap?: number }): Promise<IndexStatus> {
  const res = await fetch(`${API_BASE}/index/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req || {})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start indexing' }));
    throw new Error(err.detail || 'Failed to start indexing');
  }
  return res.json();
}

export async function stopIndexing(): Promise<IndexStatus> {
  const res = await fetch(`${API_BASE}/index/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop indexing');
  return res.json();
}

export async function getIndexStatus(): Promise<IndexStatus> {
  const res = await fetch(`${API_BASE}/index/status`);
  if (!res.ok) throw new Error('Failed to get index status');
  return res.json();
}

export async function getIndexLogs(limit: number = 150, level?: string): Promise<LogEntry[]> {
  const url = level ? `${API_BASE}/index/logs?limit=${limit}&level=${level}` : `${API_BASE}/index/logs?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function getHistory(search?: string): Promise<HistoryItem[]> {
  const url = search ? `${API_BASE}/history?search=${encodeURIComponent(search)}` : `${API_BASE}/history`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch query history');
  return res.json();
}

export async function deleteHistoryItem(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete history entry');
  return res.json();
}

export async function clearHistory(): Promise<any> {
  const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
  return res.json();
}

export async function getHistoryItem(id: string): Promise<HistoryItem> {
  const res = await fetch(`${API_BASE}/history/${id}`);
  if (!res.ok) throw new Error('Failed to load history item');
  return res.json();
}

export async function reindexDocument(filename: string): Promise<any> {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}/reindex`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Re-index failed' }));
    throw new Error(err.detail || 'Re-index failed');
  }
  return res.json();
}

export async function getBookmarks(): Promise<BookmarkItem[]> {
  const res = await fetch(`${API_BASE}/bookmarks`);
  if (!res.ok) throw new Error('Failed to load bookmarks');
  return res.json();
}

export async function createBookmark(payload: { name: string; question: string; history_id?: string; collection?: string }): Promise<BookmarkItem> {
  const res = await fetch(`${API_BASE}/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to save bookmark');
  return res.json();
}

export async function deleteBookmark(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/bookmarks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete bookmark');
}

export async function loginTeam(display_name: string, passcode?: string): Promise<{ success: boolean; display_name: string; team_name: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name, passcode })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export function kbExportUrl(): string {
  return `${API_BASE}/kb/export`;
}

export async function importKbPack(file: File): Promise<any> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/kb/import`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Import failed' }));
    throw new Error(err.detail || 'Import failed');
  }
  return res.json();
}

export async function exportBriefingHtml(payload: { question: string; answer: string; sources: SourceContext[]; user_name?: string }): Promise<string> {
  const res = await fetch(`${API_BASE}/export/briefing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to export briefing');
  return res.text();
}
