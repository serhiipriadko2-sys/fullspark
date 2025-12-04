"""
Factory for creating persistence backends based on configuration.

This module provides a unified way to instantiate the appropriate
persistence backend based on environment configuration.

Usage:
    from services.persistence_factory import create_persistence_backend
    
    # Uses environment variable or config to determine backend
    backend = await create_persistence_backend()
    
    # Or explicitly specify
    backend = await create_persistence_backend(backend_type="postgresql")
"""

from __future__ import annotations

import os
import logging
from typing import Optional, Literal

from services.persistence_base import PersistenceBackend
from services.persistence_sqlite import SQLitePersistenceBackend

logger = logging.getLogger(__name__)

# Backend type literal for type hints
BackendType = Literal["sqlite", "postgresql"]


def get_configured_backend_type() -> BackendType:
    """
    Determine which backend to use from environment/config.
    
    Environment variables checked:
    - ISKRA_DB_BACKEND: "sqlite" or "postgresql"
    - DATABASE_URL: If starts with "postgres", uses PostgreSQL
    
    Returns:
        Backend type string
    """
    # Check explicit backend setting
    backend = os.getenv("ISKRA_DB_BACKEND", "").lower()
    if backend in ("postgresql", "postgres", "pg"):
        return "postgresql"
    if backend == "sqlite":
        return "sqlite"
    
    # Check DATABASE_URL pattern
    db_url = os.getenv("DATABASE_URL", "")
    if db_url.startswith(("postgres://", "postgresql://")):
        return "postgresql"
    
    # Default to SQLite
    return "sqlite"


async def create_persistence_backend(
    backend_type: Optional[BackendType] = None,
    **kwargs
) -> PersistenceBackend:
    """
    Create and initialize a persistence backend.
    
    Args:
        backend_type: Explicit backend type ("sqlite" or "postgresql")
                     If None, uses get_configured_backend_type()
        **kwargs: Backend-specific configuration options
        
    Returns:
        Initialized PersistenceBackend instance
        
    Raises:
        ImportError: If PostgreSQL backend requested but asyncpg not installed
        Exception: If backend initialization fails
    """
    if backend_type is None:
        backend_type = get_configured_backend_type()
    
    logger.info(f"[PersistenceFactory] Creating {backend_type} backend")
    
    if backend_type == "sqlite":
        backend = SQLitePersistenceBackend(
            db_path=kwargs.get("db_path", os.getenv("ISKRA_DB_PATH", "iskra.db"))
        )
        await backend.initialize()
        return backend
    
    elif backend_type == "postgresql":
        # Import here to avoid dependency if not using PostgreSQL
        from services.persistence_postgres import (
            PostgresPersistenceBackend,
            PostgresConfig
        )
        
        # Build config from kwargs or environment
        config = PostgresConfig(
            host=kwargs.get("host", os.getenv("PGHOST", "localhost")),
            port=int(kwargs.get("port", os.getenv("PGPORT", "5432"))),
            database=kwargs.get("database", os.getenv("PGDATABASE", "iskra")),
            user=kwargs.get("user", os.getenv("PGUSER", "iskra")),
            password=kwargs.get("password", os.getenv("PGPASSWORD", "")),
            min_pool_size=int(kwargs.get("min_pool_size", 2)),
            max_pool_size=int(kwargs.get("max_pool_size", 10)),
        )
        
        backend = PostgresPersistenceBackend(config=config)
        await backend.initialize()
        return backend
    
    else:
        raise ValueError(f"Unknown backend type: {backend_type}")


class PersistenceManager:
    """
    Singleton manager for the persistence backend.
    
    Provides global access to the persistence layer with proper
    lifecycle management (initialization, health checks, shutdown).
    """
    
    _instance: Optional["PersistenceManager"] = None
    _backend: Optional[PersistenceBackend] = None
    
    def __new__(cls) -> "PersistenceManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def initialize(self, **kwargs) -> None:
        """Initialize the persistence backend."""
        if self._backend is None:
            self._backend = await create_persistence_backend(**kwargs)
    
    @property
    def backend(self) -> PersistenceBackend:
        """Get the current backend (raises if not initialized)."""
        if self._backend is None:
            raise RuntimeError("PersistenceManager not initialized")
        return self._backend
    
    async def shutdown(self) -> None:
        """Gracefully shutdown the backend."""
        if self._backend:
            await self._backend.close()
            self._backend = None
    
    async def health_check(self) -> bool:
        """Check backend health."""
        if self._backend:
            return await self._backend.health_check()
        return False


# Global instance for convenience
persistence_manager = PersistenceManager()


async def get_persistence() -> PersistenceBackend:
    """
    Get the global persistence backend.
    
    Convenience function for dependency injection in FastAPI:
    
        @app.get("/sessions")
        async def list_sessions(
            persistence: PersistenceBackend = Depends(get_persistence)
        ):
            return await persistence.list_sessions()
    """
    return persistence_manager.backend
