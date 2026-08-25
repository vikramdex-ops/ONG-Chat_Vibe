import datetime
from collections import deque
from typing import List, Optional
from pydantic import BaseModel


class LogEntry(BaseModel):
    timestamp: str
    level: str  # "DEBUG", "INFO", "SUCCESS", "WARNING", "ERROR"
    operation: str
    document: Optional[str] = None
    message: str


class StructuredLogger:
    """In-memory circular log buffer with subscriber support for real-time frontend streaming."""
    
    def __init__(self, maxlen: int = 1000):
        self.logs: deque = deque(maxlen=maxlen)

    def log(self, level: str, operation: str, message: str, document: Optional[str] = None) -> LogEntry:
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        entry = LogEntry(
            timestamp=timestamp,
            level=level.upper(),
            operation=operation,
            document=document,
            message=message
        )
        self.logs.append(entry)
        doc_tag = f" [{document}]" if document else ""
        print(f"[{entry.timestamp}] [{entry.level:7s}] [{entry.operation:15s}]{doc_tag} {message}")
        return entry

    def info(self, operation: str, message: str, document: Optional[str] = None) -> LogEntry:
        return self.log("INFO", operation, message, document)

    def success(self, operation: str, message: str, document: Optional[str] = None) -> LogEntry:
        return self.log("SUCCESS", operation, message, document)

    def warning(self, operation: str, message: str, document: Optional[str] = None) -> LogEntry:
        return self.log("WARNING", operation, message, document)

    def error(self, operation: str, message: str, document: Optional[str] = None) -> LogEntry:
        return self.log("ERROR", operation, message, document)

    def debug(self, operation: str, message: str, document: Optional[str] = None) -> LogEntry:
        return self.log("DEBUG", operation, message, document)

    def get_recent_logs(self, limit: int = 200, level: Optional[str] = None) -> List[LogEntry]:
        items = list(self.logs)
        if level:
            level = level.upper()
            items = [l for l in items if l.level == level]
        return items[-limit:]

    def clear(self):
        self.logs.clear()


app_logger = StructuredLogger()
