from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    question: str
    answer: str = ""


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Question to ask SQA")
    top_k: Optional[int] = Field(None, ge=1, le=20)
    stream: bool = Field(False)
    answer_mode: str = Field("concise", description="concise | quoted | checklist")
    family: Optional[str] = None
    year: Optional[str] = None
    document: Optional[str] = None
    compare_documents: Optional[List[str]] = None
    history: Optional[List[ChatTurn]] = None


class SourceContext(BaseModel):
    id: str
    source: str
    page: int
    chunk: int
    text: str
    score: Optional[float] = None
    image_paths: List[str] = []
    family: Optional[str] = None
    year: Optional[str] = None
    rank_reason: Optional[str] = None


class ImageResult(BaseModel):
    id: str
    url: str
    source: str
    page: int
    filename: str


class QueryResponse(BaseModel):
    answer: str
    context: List[SourceContext]
    images: List[ImageResult]
    db_count: int
    execution_time_ms: float = 0.0
    answer_mode: str = "concise"
    compare: bool = False


class DocumentInfo(BaseModel):
    id: str
    filename: str
    file_type: str
    size_bytes: int
    page_count: int = 0
    chunk_count: int = 0
    image_count: int = 0
    indexed_at: Optional[str] = None
    status: str = "indexed"
    family: Optional[str] = None
    year: Optional[str] = None
    pages: List[int] = []


class DocumentChunk(BaseModel):
    id: str
    doc_name: str
    page_number: int
    chunk_index: int
    text: str
    image_paths: List[str] = []


class IndexStartRequest(BaseModel):
    directory_path: Optional[str] = None
    worker_count: Optional[int] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    ocr_char_threshold: Optional[int] = None
    filenames: Optional[List[str]] = None


class FileQueueItem(BaseModel):
    name: str
    status: str = "pending"  # pending | active | done | skipped


class IndexStatus(BaseModel):
    is_running: bool = False
    state: str = "idle"
    processed_files: int = 0
    total_files: int = 0
    percentage: float = 0.0
    current_file: Optional[str] = None
    current_operation: Optional[str] = None
    elapsed_seconds: float = 0.0
    estimated_remaining_seconds: float = 0.0
    total_chunks_indexed: int = 0
    error: Optional[str] = None
    current_page: Optional[int] = None
    worker_stage: Optional[str] = None  # extract | embed | write
    filmstrip_url: Optional[str] = None
    file_queue: List[FileQueueItem] = []


class HealthStatus(BaseModel):
    status: str = "ok"
    backend: str = "healthy"
    vector_db: str = "unknown"
    embedding_model: str = "unknown"
    llm_server: str = "unknown"
    db_count: int = 0
    embedding_device: str = "cpu"
    details: Dict[str, Any] = {}


class HistoryItem(BaseModel):
    id: str
    timestamp: str
    question: str
    answer: str
    sources_count: int = 0
    images_count: int = 0
    sources: List[SourceContext] = []
    images: List[ImageResult] = []
    answer_mode: Optional[str] = None
    bookmarked: bool = False


class BookmarkItem(BaseModel):
    id: str
    name: str
    question: str
    history_id: Optional[str] = None
    created_at: str
    collection: str = "default"


class BookmarkCreate(BaseModel):
    name: str
    question: str
    history_id: Optional[str] = None
    collection: str = "default"


class BriefingRequest(BaseModel):
    question: str
    answer: str
    sources: List[SourceContext] = []
