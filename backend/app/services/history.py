import sqlite3
import json
import uuid
import datetime
from pathlib import Path
from typing import List, Optional
from app.core.config import HISTORY_DB_PATH
from app.models.schemas import HistoryItem, SourceContext, ImageResult, BookmarkItem


class HistoryService:
    """Manages persistent SQLite query history and bookmarks."""

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
            cols = {row[1] for row in conn.execute("PRAGMA table_info(query_history)").fetchall()}
            if "answer_mode" not in cols:
                conn.execute("ALTER TABLE query_history ADD COLUMN answer_mode TEXT")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_history_timestamp ON query_history(timestamp DESC)")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    question TEXT NOT NULL,
                    history_id TEXT,
                    collection TEXT DEFAULT 'default',
                    created_at TEXT NOT NULL
                )
            """)
            conn.commit()

    def add_entry(
        self,
        question: str,
        answer: str,
        sources: List[SourceContext],
        images: List[ImageResult],
        answer_mode: Optional[str] = None,
    ) -> HistoryItem:
        entry_id = str(uuid.uuid4())
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        sources_json = json.dumps([s.model_dump() for s in sources])
        images_json = json.dumps([img.model_dump() for img in images])

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO query_history (id, timestamp, question, answer, sources_count, images_count, sources_json, images_json, answer_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (entry_id, timestamp, question, answer, len(sources), len(images), sources_json, images_json, answer_mode))
            conn.commit()

        return HistoryItem(
            id=entry_id,
            timestamp=timestamp,
            question=question,
            answer=answer,
            sources_count=len(sources),
            images_count=len(images),
            sources=sources,
            images=images,
            answer_mode=answer_mode,
        )

    def _bookmarked_ids(self, conn) -> set:
        rows = conn.execute("SELECT history_id FROM bookmarks WHERE history_id IS NOT NULL").fetchall()
        return {r[0] for r in rows}

    def get_entries(self, limit: int = 100, search: Optional[str] = None) -> List[HistoryItem]:
        with sqlite3.connect(self.db_path) as conn:
            marked = self._bookmarked_ids(conn)
            if search:
                cursor = conn.execute("""
                    SELECT id, timestamp, question, answer, sources_count, images_count, sources_json, images_json, answer_mode
                    FROM query_history
                    WHERE question LIKE ? OR answer LIKE ?
                    ORDER BY timestamp DESC LIMIT ?
                """, (f"%{search}%", f"%{search}%", limit))
            else:
                cursor = conn.execute("""
                    SELECT id, timestamp, question, answer, sources_count, images_count, sources_json, images_json, answer_mode
                    FROM query_history
                    ORDER BY timestamp DESC LIMIT ?
                """, (limit,))

            items = []
            for r in cursor.fetchall():
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
                    images=[ImageResult(**img) for img in images_data],
                    answer_mode=r[8] if len(r) > 8 else None,
                    bookmarked=r[0] in marked,
                ))
            return items

    def get_entry(self, entry_id: str) -> Optional[HistoryItem]:
        items = [i for i in self.get_entries(limit=500) if i.id == entry_id]
        return items[0] if items else None

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

    def add_bookmark(self, name: str, question: str, history_id: Optional[str] = None, collection: str = "default") -> BookmarkItem:
        item = BookmarkItem(
            id=str(uuid.uuid4()),
            name=name.strip() or question[:60],
            question=question,
            history_id=history_id,
            collection=collection or "default",
            created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO bookmarks (id, name, question, history_id, collection, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (item.id, item.name, item.question, item.history_id, item.collection, item.created_at),
            )
            conn.commit()
        return item

    def list_bookmarks(self) -> List[BookmarkItem]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT id, name, question, history_id, collection, created_at FROM bookmarks ORDER BY created_at DESC"
            ).fetchall()
        return [
            BookmarkItem(id=r[0], name=r[1], question=r[2], history_id=r[3], collection=r[4], created_at=r[5])
            for r in rows
        ]

    def delete_bookmark(self, bookmark_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM bookmarks WHERE id = ?", (bookmark_id,))
            conn.commit()
            return cur.rowcount > 0


history_service = HistoryService()
