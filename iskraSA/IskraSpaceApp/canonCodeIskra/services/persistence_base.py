"""
Abstract base class for persistence adapters.

This module defines the contract that all persistence backends must implement.
Currently supported backends:
- SQLite (default, lightweight)
- PostgreSQL (production-grade, scalable)

The abstraction allows seamless switching between backends via configuration.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from services.persistence import UserSession


class PersistenceBackend(ABC):
    """
    Abstract base class for persistence backends.
    
    All persistence implementations must inherit from this class
    and implement the required methods.
    """
    
    @abstractmethod
    async def initialize(self) -> None:
        """
        Initialize the database connection and schema.
        
        This method should:
        - Establish connection(s) to the database
        - Create necessary tables if they don't exist
        - Handle any migration logic if needed
        
        Raises:
            Exception: If initialization fails
        """
        pass
    
    @abstractmethod
    async def save_session(self, user_id: str, session: "UserSession") -> bool:
        """
        Persist a session snapshot for the given user_id.
        
        Args:
            user_id: Unique identifier for the user
            session: The UserSession object to persist
            
        Returns:
            True if save was successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def load_session(self, user_id: str) -> Optional["UserSession"]:
        """
        Load a session for the given user_id.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            UserSession if found and valid, None otherwise
        """
        pass
    
    @abstractmethod
    async def delete_session(self, user_id: str) -> bool:
        """
        Delete persisted data for the given user_id.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            True if deletion was successful (or user didn't exist), False on error
        """
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """
        Clean up resources and close connections.
        
        This method should be called during application shutdown.
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """
        Check if the database connection is healthy.
        
        Returns:
            True if connection is healthy, False otherwise
        """
        pass
    
    # Optional methods with default implementations
    
    async def list_sessions(self, limit: int = 100, offset: int = 0) -> list[str]:
        """
        List user_ids of stored sessions.
        
        Args:
            limit: Maximum number of results to return
            offset: Number of results to skip
            
        Returns:
            List of user_ids
        """
        raise NotImplementedError("list_sessions not implemented for this backend")
    
    async def count_sessions(self) -> int:
        """
        Count total number of stored sessions.
        
        Returns:
            Number of sessions in storage
        """
        raise NotImplementedError("count_sessions not implemented for this backend")
    
    async def vacuum(self) -> None:
        """
        Perform database maintenance (vacuum, analyze, etc.).
        
        This is backend-specific and optional.
        """
        pass
