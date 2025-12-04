"""
PostgreSQL persistence adapter for Iskra sessions.

This module provides a production-grade PostgreSQL backend for session
persistence. Features include:
- Async operations via asyncpg
- Connection pooling for high concurrency
- JSONB storage for efficient querying
- Automatic schema migrations
- Health checks and graceful shutdown

Usage:
    from services.persistence_postgres import PostgresPersistenceBackend
    
    backend = PostgresPersistenceBackend(
        host="localhost",
        port=5432,
        database="iskra",
        user="iskra_user",
        password="secret"
    )
    await backend.initialize()
    await backend.save_session("user123", session)
"""

from __future__ import annotations

import json
import logging
from typing import Optional, List, Any
from dataclasses import dataclass

from services.persistence_base import PersistenceBackend
from services.persistence import UserSession

# Optional import - asyncpg may not be installed
try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    asyncpg = None


logger = logging.getLogger(__name__)


@dataclass
class PostgresConfig:
    """Configuration for PostgreSQL connection."""
    host: str = "localhost"
    port: int = 5432
    database: str = "iskra"
    user: str = "iskra"
    password: str = ""
    
    # Connection pool settings
    min_pool_size: int = 2
    max_pool_size: int = 10
    
    # Connection settings
    command_timeout: float = 60.0
    statement_cache_size: int = 100
    
    # SSL settings (for production)
    ssl: Optional[str] = None  # "require", "prefer", "disable"
    
    @property
    def dsn(self) -> str:
        """Generate PostgreSQL connection string."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class PostgresPersistenceBackend(PersistenceBackend):
    """
    PostgreSQL-based persistence backend using asyncpg.
    
    This backend is designed for production use with:
    - Connection pooling for high concurrency
    - JSONB storage for flexible schema
    - Proper error handling and logging
    - Health checks for monitoring
    """
    
    # Schema version for migrations
    SCHEMA_VERSION = 1
    
    def __init__(self, config: Optional[PostgresConfig] = None, **kwargs) -> None:
        """
        Initialize PostgreSQL backend.
        
        Args:
            config: PostgresConfig object with connection settings
            **kwargs: Alternative way to pass connection parameters
        """
        if not ASYNCPG_AVAILABLE:
            raise ImportError(
                "asyncpg is required for PostgreSQL backend. "
                "Install with: pip install asyncpg"
            )
        
        if config:
            self.config = config
        else:
            self.config = PostgresConfig(**kwargs)
        
        self._pool: Optional[asyncpg.Pool] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """
        Initialize connection pool and create schema.
        
        Creates the sessions table with JSONB storage and
        necessary indexes for efficient querying.
        """
        if self._initialized:
            logger.warning("PostgresPersistenceBackend already initialized")
            return
        
        try:
            # Create connection pool
            self._pool = await asyncpg.create_pool(
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                min_size=self.config.min_pool_size,
                max_size=self.config.max_pool_size,
                command_timeout=self.config.command_timeout,
                statement_cache_size=self.config.statement_cache_size,
            )
            
            # Create schema
            await self._create_schema()
            
            self._initialized = True
            logger.info(
                f"[PostgresPersistence] Initialized with pool size "
                f"{self.config.min_pool_size}-{self.config.max_pool_size}"
            )
            
        except Exception as exc:
            logger.error(f"[PostgresPersistence] CRITICAL: Failed to initialize: {exc}")
            raise
    
    async def _create_schema(self) -> None:
        """Create database schema if it doesn't exist."""
        async with self._pool.acquire() as conn:
            # Create sessions table with JSONB for flexible schema
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    user_id TEXT PRIMARY KEY,
                    session_data JSONB NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            
            # Create indexes for common queries
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_updated_at 
                ON sessions (updated_at DESC)
            """)
            
            # Index for JSONB queries on metrics (optional, for analytics)
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_metrics_pain 
                ON sessions ((session_data->'metrics'->>'pain'))
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_metrics_trust 
                ON sessions ((session_data->'metrics'->>'trust'))
            """)
            
            # Create schema_version table for migrations
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            
            # Insert current version if not exists
            await conn.execute("""
                INSERT INTO schema_version (version) 
                VALUES ($1) 
                ON CONFLICT (version) DO NOTHING
            """, self.SCHEMA_VERSION)
            
            logger.info("[PostgresPersistence] Schema initialized/verified")
    
    async def save_session(self, user_id: str, session: UserSession) -> bool:
        """
        Persist a session snapshot using UPSERT.
        
        Uses PostgreSQL's ON CONFLICT for atomic upsert operation.
        """
        if not self._initialized or not self._pool:
            logger.error("[PostgresPersistence] Not initialized")
            return False
        
        try:
            payload = session.to_dict()
        except Exception as exc:
            logger.error(
                f"[PostgresPersistence] Session for {user_id} is not serializable: {exc}"
            )
            return False
        
        try:
            async with self._pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO sessions (user_id, session_data, updated_at)
                    VALUES ($1, $2::jsonb, NOW())
                    ON CONFLICT (user_id) DO UPDATE SET
                        session_data = EXCLUDED.session_data,
                        updated_at = NOW()
                """, user_id, json.dumps(payload))
                
            return True
            
        except Exception as exc:
            logger.error(
                f"[PostgresPersistence] Failed to save session for {user_id}: {exc}"
            )
            return False
    
    async def load_session(self, user_id: str) -> Optional[UserSession]:
        """
        Load a session from PostgreSQL.
        
        Returns None if not found or if data is corrupt.
        """
        if not self._initialized or not self._pool:
            logger.error("[PostgresPersistence] Not initialized")
            return None
        
        try:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT session_data FROM sessions WHERE user_id = $1",
                    user_id
                )
        except Exception as exc:
            logger.error(
                f"[PostgresPersistence] Failed to load session for {user_id}: {exc}"
            )
            return None
        
        if not row:
            return None
        
        try:
            # asyncpg returns JSONB as dict directly
            data = row['session_data']
            if isinstance(data, str):
                data = json.loads(data)
            return UserSession.from_dict(data)
        except Exception as exc:
            logger.error(
                f"[PostgresPersistence] Failed to hydrate session for {user_id}: {exc}"
            )
            return None
    
    async def delete_session(self, user_id: str) -> bool:
        """Delete a session from PostgreSQL."""
        if not self._initialized or not self._pool:
            logger.error("[PostgresPersistence] Not initialized")
            return False
        
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM sessions WHERE user_id = $1",
                    user_id
                )
            return True
        except Exception as exc:
            logger.error(
                f"[PostgresPersistence] Failed to delete session for {user_id}: {exc}"
            )
            return False
    
    async def close(self) -> None:
        """Close the connection pool gracefully."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            self._initialized = False
            logger.info("[PostgresPersistence] Connection pool closed")
    
    async def health_check(self) -> bool:
        """Check if the database connection is healthy."""
        if not self._initialized or not self._pool:
            return False
        
        try:
            async with self._pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                return result == 1
        except Exception as exc:
            logger.warning(f"[PostgresPersistence] Health check failed: {exc}")
            return False
    
    async def list_sessions(
        self, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[str]:
        """
        List user_ids of stored sessions, ordered by last update.
        
        Args:
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of user_ids
        """
        if not self._initialized or not self._pool:
            return []
        
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT user_id FROM sessions 
                    ORDER BY updated_at DESC 
                    LIMIT $1 OFFSET $2
                """, limit, offset)
                return [row['user_id'] for row in rows]
        except Exception as exc:
            logger.error(f"[PostgresPersistence] Failed to list sessions: {exc}")
            return []
    
    async def count_sessions(self) -> int:
        """Count total number of stored sessions."""
        if not self._initialized or not self._pool:
            return 0
        
        try:
            async with self._pool.acquire() as conn:
                count = await conn.fetchval(
                    "SELECT COUNT(*) FROM sessions"
                )
                return count or 0
        except Exception as exc:
            logger.error(f"[PostgresPersistence] Failed to count sessions: {exc}")
            return 0
    
    async def vacuum(self) -> None:
        """Run VACUUM ANALYZE on the sessions table."""
        if not self._initialized or not self._pool:
            return
        
        try:
            async with self._pool.acquire() as conn:
                await conn.execute("VACUUM ANALYZE sessions")
            logger.info("[PostgresPersistence] VACUUM ANALYZE completed")
        except Exception as exc:
            logger.warning(f"[PostgresPersistence] VACUUM failed: {exc}")
    
    # Additional PostgreSQL-specific methods
    
    async def get_sessions_by_metric(
        self,
        metric_name: str,
        min_value: float,
        max_value: float,
        limit: int = 100
    ) -> List[str]:
        """
        Find sessions where a specific metric falls within a range.
        
        This leverages PostgreSQL's JSONB indexing capabilities.
        
        Args:
            metric_name: Name of the metric (e.g., 'pain', 'trust')
            min_value: Minimum value (inclusive)
            max_value: Maximum value (inclusive)
            limit: Maximum number of results
            
        Returns:
            List of user_ids matching the criteria
        """
        if not self._initialized or not self._pool:
            return []
        
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT user_id FROM sessions
                    WHERE (session_data->'metrics'->>$1)::float >= $2
                    AND (session_data->'metrics'->>$1)::float <= $3
                    ORDER BY (session_data->'metrics'->>$1)::float DESC
                    LIMIT $4
                """, metric_name, min_value, max_value, limit)
                return [row['user_id'] for row in rows]
        except Exception as exc:
            logger.error(
                f"[PostgresPersistence] Failed to query by metric {metric_name}: {exc}"
            )
            return []
    
    async def get_high_pain_sessions(self, threshold: float = 0.7) -> List[str]:
        """
        Find sessions with high pain metric for monitoring/intervention.
        
        This is a convenience method for a common Iskra use case.
        
        Args:
            threshold: Pain level threshold (0.0-1.0)
            
        Returns:
            List of user_ids with pain >= threshold
        """
        return await self.get_sessions_by_metric('pain', threshold, 1.0, limit=1000)
    
    async def get_session_stats(self) -> dict:
        """
        Get aggregate statistics across all sessions.
        
        Returns:
            Dict with session statistics
        """
        if not self._initialized or not self._pool:
            return {}
        
        try:
            async with self._pool.acquire() as conn:
                stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_sessions,
                        AVG((session_data->'metrics'->>'pain')::float) as avg_pain,
                        AVG((session_data->'metrics'->>'trust')::float) as avg_trust,
                        AVG((session_data->'metrics'->>'clarity')::float) as avg_clarity,
                        AVG((session_data->'metrics'->>'mirror_sync')::float) as avg_mirror_sync,
                        MIN(created_at) as oldest_session,
                        MAX(updated_at) as newest_update
                    FROM sessions
                """)
                
                return {
                    'total_sessions': stats['total_sessions'],
                    'avg_pain': float(stats['avg_pain'] or 0),
                    'avg_trust': float(stats['avg_trust'] or 0),
                    'avg_clarity': float(stats['avg_clarity'] or 0),
                    'avg_mirror_sync': float(stats['avg_mirror_sync'] or 0),
                    'oldest_session': stats['oldest_session'],
                    'newest_update': stats['newest_update'],
                }
        except Exception as exc:
            logger.error(f"[PostgresPersistence] Failed to get stats: {exc}")
            return {}
