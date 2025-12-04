"""
SQLite persistence adapter for Iskra sessions (async wrapper).

This module provides an async-compatible SQLite backend that implements
the PersistenceBackend interface. It wraps the synchronous sqlite3
operations using asyncio.to_thread for non-blocking operation.

For development and small deployments, SQLite offers:
- Zero configuration
- No external dependencies
- File-based storage
- Good performance for single-user scenarios

For production with multiple users, consider PostgresPersistenceBackend.
"""

from __future__ import annotations

import asyncio
import json
import sqlite3
import logging
from typing import Optional, List

from services.persistence_base import PersistenceBackend
from services.persistence import UserSession
from config import DB_PATH


logger = logging.getLogger(__name__)


class SQLitePersistenceBackend(PersistenceBackend):
    """
    SQLite-based persistence backend with async interface.
    
    Uses asyncio.to_thread to wrap synchronous sqlite3 operations,
    providing non-blocking behavior in async applications.
    """
    
    def __init__(self, db_path: str = DB_PATH) -> None:
        """
        Initialize SQLite backend.
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize database schema."""
        await asyncio.to_thread(self._init_db_sync)
        self._initialized = True
    
    def _init_db_sync(self) -> None:
        """Synchronous database initialization."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        user_id TEXT PRIMARY KEY,
                        session_data TEXT NOT NULL,
                        created_at TEXT DEFAULT (datetime('now')),
                        updated_at TEXT DEFAULT (datetime('now'))
                    )
                """)
                
                # Add updated_at column if not exists (migration)
                try:
                    cursor.execute("""
                        ALTER TABLE sessions ADD COLUMN 
                        created_at TEXT DEFAULT (datetime('now'))
                    """)
                except sqlite3.OperationalError:
                    pass  # Column already exists
                
                try:
                    cursor.execute("""
                        ALTER TABLE sessions ADD COLUMN 
                        updated_at TEXT DEFAULT (datetime('now'))
                    """)
                except sqlite3.OperationalError:
                    pass  # Column already exists
                
                conn.commit()
            logger.info(f"[SQLitePersistence] DB initialized at {self.db_path}")
        except sqlite3.Error as exc:
            logger.error(f"[SQLitePersistence] CRITICAL: Failed to initialize: {exc}")
            raise
    
    async def save_session(self, user_id: str, session: UserSession) -> bool:
        """Persist a session snapshot."""
        return await asyncio.to_thread(
            self._save_session_sync, user_id, session
        )
    
    def _save_session_sync(self, user_id: str, session: UserSession) -> bool:
        """Synchronous session save."""
        try:
            payload = json.dumps(session.to_dict(), ensure_ascii=False)
        except TypeError as exc:
            logger.error(
                f"[SQLitePersistence] Session for {user_id} is not JSON-serializable: {exc}"
            )
            return False
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO sessions 
                    (user_id, session_data, updated_at) 
                    VALUES (?, ?, datetime('now'))
                """, (user_id, payload))
                conn.commit()
            return True
        except sqlite3.Error as exc:
            logger.error(
                f"[SQLitePersistence] Failed to save session for {user_id}: {exc}"
            )
            return False
    
    async def load_session(self, user_id: str) -> Optional[UserSession]:
        """Load a session."""
        return await asyncio.to_thread(self._load_session_sync, user_id)
    
    def _load_session_sync(self, user_id: str) -> Optional[UserSession]:
        """Synchronous session load."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT session_data FROM sessions WHERE user_id = ?",
                    (user_id,)
                )
                row = cursor.fetchone()
        except sqlite3.Error as exc:
            logger.error(
                f"[SQLitePersistence] Failed to load session for {user_id}: {exc}"
            )
            return None
        
        if not row:
            return None
        
        try:
            data = json.loads(row[0])
            return UserSession.from_dict(data)
        except (json.JSONDecodeError, Exception) as exc:
            logger.error(
                f"[SQLitePersistence] Failed to hydrate session for {user_id}: {exc}"
            )
            return None
    
    async def delete_session(self, user_id: str) -> bool:
        """Delete a session."""
        return await asyncio.to_thread(self._delete_session_sync, user_id)
    
    def _delete_session_sync(self, user_id: str) -> bool:
        """Synchronous session delete."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "DELETE FROM sessions WHERE user_id = ?",
                    (user_id,)
                )
                conn.commit()
            return True
        except sqlite3.Error as exc:
            logger.error(
                f"[SQLitePersistence] Failed to delete session for {user_id}: {exc}"
            )
            return False
    
    async def close(self) -> None:
        """Close resources (no-op for SQLite, connections are short-lived)."""
        self._initialized = False
        logger.info("[SQLitePersistence] Closed")
    
    async def health_check(self) -> bool:
        """Check if database is accessible."""
        return await asyncio.to_thread(self._health_check_sync)
    
    def _health_check_sync(self) -> bool:
        """Synchronous health check."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                return cursor.fetchone()[0] == 1
        except Exception:
            return False
    
    async def list_sessions(
        self, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[str]:
        """List user_ids of stored sessions."""
        return await asyncio.to_thread(
            self._list_sessions_sync, limit, offset
        )
    
    def _list_sessions_sync(self, limit: int, offset: int) -> List[str]:
        """Synchronous session listing."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT user_id FROM sessions 
                    ORDER BY updated_at DESC 
                    LIMIT ? OFFSET ?
                """, (limit, offset))
                return [row[0] for row in cursor.fetchall()]
        except sqlite3.Error as exc:
            logger.error(f"[SQLitePersistence] Failed to list sessions: {exc}")
            return []
    
    async def count_sessions(self) -> int:
        """Count total sessions."""
        return await asyncio.to_thread(self._count_sessions_sync)
    
    def _count_sessions_sync(self) -> int:
        """Synchronous session count."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM sessions")
                return cursor.fetchone()[0]
        except sqlite3.Error:
            return 0
    
    async def vacuum(self) -> None:
        """Run VACUUM on the database."""
        await asyncio.to_thread(self._vacuum_sync)
    
    def _vacuum_sync(self) -> None:
        """Synchronous vacuum."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("VACUUM")
            logger.info("[SQLitePersistence] VACUUM completed")
        except sqlite3.Error as exc:
            logger.warning(f"[SQLitePersistence] VACUUM failed: {exc}")
