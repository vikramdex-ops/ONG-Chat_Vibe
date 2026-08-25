import sqlite3
import json
import uuid
import datetime
from pathlib import Path
from typing import List, Optional
from app.core.config import HISTORY_DB_PATH
from app.models.schemas import HistoryItem, SourceContext, ImageResult


class HistoryService:
    """Manages persistent SQLite query history for user audits and traceability."""

    def __init__(self, db_path: Path = HISTORY_DB_PATH):
        self.db_path = str(db_path)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS query_history (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    sources_count INTEGER DEFAULT 0,
                    images_count INTEGER DEFAULT 0,
                    sources_json TEXT NOT NULL,
                    images_json TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_history_timestamp ON query_history(timestamp DESC)")
            conn.commit()

    def add_entry(self, question: str, answer: str, sources: List[SourceContext], images: List[ImageResult]) -> HistoryItem:
        entry_id = str(uuid.uuid4())
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sources_json = json.dumps([s.model_dump() for s in sources])
        images_json = json.dumps([img.model_dump() for img in images])

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO query_history (id, timestamp, question, answer, sources_count, images_count, sources_json, images_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (entry_id, timestamp, question, answer, len(sources), len(images), sources_json, images_json))
            conn.commit()

        return HistoryItem(
            id=entry_id,
            timestamp=timestamp,
            question=question,
            answer=answer,
            sources_count=len(sources),
            images_count=len(images),
            sources=sources,
            images=images
        )

    def get_entries(self, limit: int = 100, search: Optional[str] = None) -> List[HistoryItem]:
        with sqlite3.connect(self.db_path) as conn:
            if search:
                cursor = conn.execute("""
                    SELECT id, timestamp, question, answer, sources_count, images_count, sources_json, images_json
                    FROM query_history
                    WHERE question LIKE ? OR answer LIKE ?
                    ORDER BY timestamp DESC LIMIT ?
                """, (f"%{search}%", f"%{search}%", limit))
            else:
                cursor = conn.execute("""
                    SELECT id, timestamp, question, answer, sources_count, images_count, sources_json, images_json
                    FROM query_history
                    ORDER BY timestamp DESC LIMIT ?
                """, (limit,))

            rows = cursor.fetchall()
            items = []
            for r in rows:
                sources_data = json.loads(r[6]) if r[6] else []
                images_data = json.loads(r[7]) if r[7] else []
                items.append(HistoryItem(
                    id=r[0],
                    timestamp=r[1],
                    question=r[2],
                    answer=r[3],
                    sources_count=r[4],
                    images_count=r[5],
                    sources=[SourceContext(**s) for s in sources_data],
                    images=[ImageResult(**img) for img in images_data]
                ))
            return items

    def delete_entry(self, entry_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM query_history WHERE id = ?", (entry_id,))
            conn.commit()
            return cursor.rowcount > 0

    def clear_all(self) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM query_history")
            conn.commit()
            return cursor.rowcount


history_service = HistoryService()
