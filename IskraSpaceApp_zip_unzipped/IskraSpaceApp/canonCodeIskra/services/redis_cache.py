"""Redis Cache Service - High-performance caching.

Canonical principles:
- Performance optimization
- Memory efficiency
- TTL-based expiration
"""

import os
import json
import logging
import hashlib
from typing import Optional, Any, Dict, List, Union, Callable
from datetime import datetime, timedelta
from functools import wraps
from pydantic import BaseModel, Field

# Redis import (optional - graceful fallback if not installed)
try:
    import redis
    from redis.asyncio import Redis as AsyncRedis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None
    AsyncRedis = None

logger = logging.getLogger(__name__)


class RedisConfig(BaseModel):
    """Redis configuration."""
    host: str = Field(default="localhost")
    port: int = Field(default=6379)
    db: int = Field(default=0)
    password: Optional[str] = Field(default=None)
    ssl: bool = Field(default=False)
    default_ttl: int = Field(default=3600, description="Default TTL in seconds")
    key_prefix: str = Field(default="iskra:")
    max_connections: int = Field(default=10)


class CacheEntry(BaseModel):
    """Cache entry metadata."""
    key: str
    value_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ttl: Optional[int] = None
    hits: int = Field(default=0)


class RedisCacheService:
    """Redis caching service.
    
    Provides:
    - Key-value caching
    - TTL management
    - Cache statistics
    - Decorator for function caching
    """
    
    def __init__(self, config: Optional[RedisConfig] = None):
        self.config = config or RedisConfig()
        self._client: Optional[Any] = None
        self._async_client: Optional[Any] = None
        self.connected = False
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
        }
        # In-memory fallback cache
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
    
    def connect(self) -> bool:
        """Connect to Redis."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not installed. Using in-memory cache.")
            return False
        
        try:
            # Get connection params from config or environment
            host = os.getenv("REDIS_HOST", self.config.host)
            port = int(os.getenv("REDIS_PORT", self.config.port))
            password = os.getenv("REDIS_PASSWORD", self.config.password)
            
            self._client = redis.Redis(
                host=host,
                port=port,
                db=self.config.db,
                password=password,
                ssl=self.config.ssl,
                decode_responses=True,
                max_connections=self.config.max_connections,
            )
            
            # Test connection
            self._client.ping()
            self.connected = True
            logger.info(f"Connected to Redis at {host}:{port}")
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Using in-memory cache.")
            self.connected = False
            return False
    
    def _make_key(self, key: str) -> str:
        """Create prefixed cache key."""
        return f"{self.config.key_prefix}{key}"
    
    def _serialize(self, value: Any) -> str:
        """Serialize value for storage."""
        if isinstance(value, (dict, list)):
            return json.dumps(value, default=str)
        elif isinstance(value, BaseModel):
            return value.model_dump_json()
        else:
            return json.dumps(value, default=str)
    
    def _deserialize(self, data: str) -> Any:
        """Deserialize stored value."""
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            return data
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        full_key = self._make_key(key)
        
        if self.connected and self._client:
            try:
                data = self._client.get(full_key)
                if data:
                    self._stats["hits"] += 1
                    return self._deserialize(data)
                self._stats["misses"] += 1
                return None
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to memory cache
        if full_key in self._memory_cache:
            entry = self._memory_cache[full_key]
            if entry.get("expires_at") and datetime.utcnow() > entry["expires_at"]:
                del self._memory_cache[full_key]
                self._stats["misses"] += 1
                return None
            self._stats["hits"] += 1
            return entry["value"]
        
        self._stats["misses"] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache."""
        full_key = self._make_key(key)
        ttl = ttl or self.config.default_ttl
        serialized = self._serialize(value)
        
        if self.connected and self._client:
            try:
                self._client.setex(full_key, ttl, serialized)
                self._stats["sets"] += 1
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to memory cache
        expires_at = datetime.utcnow() + timedelta(seconds=ttl) if ttl else None
        self._memory_cache[full_key] = {
            "value": value,
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
        }
        self._stats["sets"] += 1
        return True
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        full_key = self._make_key(key)
        
        if self.connected and self._client:
            try:
                self._client.delete(full_key)
                self._stats["deletes"] += 1
                return True
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        if full_key in self._memory_cache:
            del self._memory_cache[full_key]
            self._stats["deletes"] += 1
            return True
        
        return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists."""
        full_key = self._make_key(key)
        
        if self.connected and self._client:
            try:
                return bool(self._client.exists(full_key))
            except Exception as e:
                logger.error(f"Redis exists error: {e}")
        
        if full_key in self._memory_cache:
            entry = self._memory_cache[full_key]
            if entry.get("expires_at") and datetime.utcnow() > entry["expires_at"]:
                del self._memory_cache[full_key]
                return False
            return True
        
        return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        full_pattern = self._make_key(pattern)
        deleted = 0
        
        if self.connected and self._client:
            try:
                keys = self._client.keys(full_pattern)
                if keys:
                    deleted = self._client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis clear pattern error: {e}")
        
        # Also clear from memory cache
        to_delete = [k for k in self._memory_cache if k.startswith(full_pattern.replace("*", ""))]
        for k in to_delete:
            del self._memory_cache[k]
            deleted += 1
        
        return deleted
    
    def cache(self, ttl: Optional[int] = None, key_prefix: str = ""):
        """Decorator for caching function results."""
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key from function name and arguments
                key_parts = [key_prefix or func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
                
                # Try to get from cache
                cached = self.get(cache_key)
                if cached is not None:
                    return cached
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                return result
            
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                key_parts = [key_prefix or func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
                
                cached = self.get(cache_key)
                if cached is not None:
                    return cached
                
                result = await func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                return result
            
            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            return wrapper
        return decorator
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self._stats["hits"] + self._stats["misses"]
        hit_rate = self._stats["hits"] / total if total > 0 else 0.0
        
        return {
            "connected": self.connected,
            "redis_available": REDIS_AVAILABLE,
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "sets": self._stats["sets"],
            "deletes": self._stats["deletes"],
            "hit_rate": round(hit_rate, 3),
            "memory_cache_size": len(self._memory_cache),
        }
    
    def cleanup_expired(self) -> int:
        """Clean up expired entries from memory cache."""
        now = datetime.utcnow()
        expired = [k for k, v in self._memory_cache.items() 
                   if v.get("expires_at") and now > v["expires_at"]]
        for k in expired:
            del self._memory_cache[k]
        return len(expired)


# Global instance
cache_service = RedisCacheService()
