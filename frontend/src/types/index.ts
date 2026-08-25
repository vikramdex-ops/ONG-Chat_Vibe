export interface SourceContext {
  id: string;
  source: string;
  page: number;
  chunk: number;
  text: string;
  score?: number;
  image_paths: string[];
  family?: string | null;
  year?: string | null;
  rank_reason?: string | null;
}

export interface ImageResult {
  id: string;
  url: string;
  source: string;
  page: number;
  filename: string;
}

export interface ChatTurn {
  question: string;
  answer: string;
}

export type AnswerMode = 'concise' | 'quoted' | 'checklist';

export interface QueryRequest {
  question: string;
  top_k?: number;
  answer_mode?: AnswerMode;
  family?: string;
  year?: string;
  document?: string;
  compare_documents?: string[];
  history?: ChatTurn[];
}

export interface QueryResponse {
  answer: string;
  context: SourceContext[];
  images: ImageResult[];
  db_count: number;
  execution_time_ms: number;
  answer_mode?: AnswerMode;
  compare?: boolean;
}

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  page_count: number;
  chunk_count: number;
  image_count: number;
  indexed_at?: string;
  status: 'indexed' | 'processing' | 'failed' | 'unindexed';
  family?: string | null;
  year?: string | null;
  pages?: number[];
}

export interface DocumentChunk {
  id: string;
  doc_name: string;
  page_number: number;
  chunk_index: number;
  text: string;
  image_paths: string[];
}

export interface FileQueueItem {
  name: string;
  status: 'pending' | 'active' | 'done' | 'skipped' | string;
}

export interface IndexStatus {
  is_running: boolean;
  state: 'idle' | 'scanning' | 'extracting' | 'ocr' | 'chunking' | 'embedding' | 'writing' | 'completed' | 'failed' | 'stopping' | 'stopped' | 'processing';
  processed_files: number;
  total_files: number;
  percentage: number;
  current_file?: string | null;
  current_operation?: string | null;
  elapsed_seconds: number;
  estimated_remaining_seconds: number;
  total_chunks_indexed: number;
  error?: string | null;
  current_page?: number | null;
  total_pages?: number | null;
  worker_stage?: string | null;
  filmstrip_url?: string | null;
  file_queue?: FileQueueItem[];
}

export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  operation: string;
  document?: string | null;
  message: string;
}

export interface AppSettings {
  chroma_db_path: string;
  collection_name: string;
  embedding_model_name: string;
  embedding_device: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  worker_count: number;
  ocr_char_threshold: number;
  batch_write_size: number;
  llm_provider: string;
  llm_server_url: string;
  llm_api_key?: string | null;
  llm_model_name: string;
  gemini_api_key?: string | null;
  gemini_model_name?: string | null;
  llm_max_tokens: number;
  llm_temperature: number;
  llm_stop_strings: string[];
}

export interface HealthStatus {
  status: string;
  backend: string;
  vector_db: string;
  embedding_model: string;
  llm_server: string;
  db_count: number;
  embedding_device: string;
  details: Record<string, any>;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  question: string;
  answer: string;
  sources_count: number;
  images_count: number;
  sources: SourceContext[];
  images: ImageResult[];
  answer_mode?: string | null;
  bookmarked?: boolean;
}

export interface BookmarkItem {
  id: string;
  name: string;
  question: string;
  history_id?: string | null;
  collection: string;
  created_at: string;
}

export type TabType = 'ask' | 'indexing' | 'documents' | 'history' | 'settings' | 'about';
