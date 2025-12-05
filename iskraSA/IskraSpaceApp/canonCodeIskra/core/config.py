"""
Iskra SpaceApp - Unified Configuration Module
Canon v5.0

Centralized configuration management with environment variable support,
validation, and type safety.
"""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from functools import lru_cache

# Optional dotenv support
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Environment(str, Enum):
    """Application environment modes."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class LogLevel(str, Enum):
    """Logging levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class VectorDBBackend(str, Enum):
    """Supported vector database backends."""
    CHROMADB = "chromadb"
    QDRANT = "qdrant"
    PINECONE = "pinecone"
    WEAVIATE = "weaviate"
    MILVUS = "milvus"
    MEMORY = "memory"  # In-memory for testing


class CacheBackend(str, Enum):
    """Supported cache backends."""
    MEMORY = "memory"
    REDIS = "redis"
    MEMCACHED = "memcached"


@dataclass
class DatabaseConfig:
    """Database configuration."""
    # PostgreSQL
    postgres_host: str = field(default_factory=lambda: os.getenv("POSTGRES_HOST", "localhost"))
    postgres_port: int = field(default_factory=lambda: int(os.getenv("POSTGRES_PORT", "5432")))
    postgres_user: str = field(default_factory=lambda: os.getenv("POSTGRES_USER", "iskra"))
    postgres_password: str = field(default_factory=lambda: os.getenv("POSTGRES_PASSWORD", ""))
    postgres_db: str = field(default_factory=lambda: os.getenv("POSTGRES_DB", "iskra_db"))
    postgres_pool_size: int = field(default_factory=lambda: int(os.getenv("POSTGRES_POOL_SIZE", "10")))
    postgres_max_overflow: int = field(default_factory=lambda: int(os.getenv("POSTGRES_MAX_OVERFLOW", "20")))

    # SQLite fallback
    sqlite_path: str = field(default_factory=lambda: os.getenv("SQLITE_PATH", "data/iskra.db"))

    # Use SQLite in development by default
    use_sqlite: bool = field(default_factory=lambda: os.getenv("USE_SQLITE", "true").lower() == "true")

    @property
    def postgres_url(self) -> str:
        """Get PostgreSQL connection URL."""
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def postgres_sync_url(self) -> str:
        """Get synchronous PostgreSQL URL."""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"


@dataclass
class RedisConfig:
    """Redis configuration."""
    host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    password: Optional[str] = field(default_factory=lambda: os.getenv("REDIS_PASSWORD"))
    db: int = field(default_factory=lambda: int(os.getenv("REDIS_DB", "0")))
    ssl: bool = field(default_factory=lambda: os.getenv("REDIS_SSL", "false").lower() == "true")

    # Connection pool
    pool_size: int = field(default_factory=lambda: int(os.getenv("REDIS_POOL_SIZE", "10")))

    # TTL defaults (seconds)
    default_ttl: int = field(default_factory=lambda: int(os.getenv("REDIS_DEFAULT_TTL", "3600")))
    session_ttl: int = field(default_factory=lambda: int(os.getenv("REDIS_SESSION_TTL", "86400")))

    @property
    def url(self) -> str:
        """Get Redis connection URL."""
        auth = f":{self.password}@" if self.password else ""
        protocol = "rediss" if self.ssl else "redis"
        return f"{protocol}://{auth}{self.host}:{self.port}/{self.db}"


@dataclass
class VectorDBConfig:
    """Vector database configuration."""
    backend: VectorDBBackend = field(
        default_factory=lambda: VectorDBBackend(os.getenv("VECTOR_DB_BACKEND", "chromadb"))
    )

    # ChromaDB
    chroma_host: str = field(default_factory=lambda: os.getenv("CHROMA_HOST", "localhost"))
    chroma_port: int = field(default_factory=lambda: int(os.getenv("CHROMA_PORT", "8000")))
    chroma_persist_dir: str = field(default_factory=lambda: os.getenv("CHROMA_PERSIST_DIR", "data/chroma"))

    # Qdrant
    qdrant_host: str = field(default_factory=lambda: os.getenv("QDRANT_HOST", "localhost"))
    qdrant_port: int = field(default_factory=lambda: int(os.getenv("QDRANT_PORT", "6333")))
    qdrant_api_key: Optional[str] = field(default_factory=lambda: os.getenv("QDRANT_API_KEY"))

    # Pinecone
    pinecone_api_key: Optional[str] = field(default_factory=lambda: os.getenv("PINECONE_API_KEY"))
    pinecone_environment: str = field(default_factory=lambda: os.getenv("PINECONE_ENV", "us-west1-gcp"))
    pinecone_index: str = field(default_factory=lambda: os.getenv("PINECONE_INDEX", "iskra"))

    # Common
    embedding_dimension: int = field(default_factory=lambda: int(os.getenv("EMBEDDING_DIM", "1536")))
    collection_name: str = field(default_factory=lambda: os.getenv("VECTOR_COLLECTION", "iskra_memories"))


@dataclass
class LLMConfig:
    """LLM provider configuration."""
    # OpenAI
    openai_api_key: Optional[str] = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview"))
    openai_embedding_model: str = field(default_factory=lambda: os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"))

    # Anthropic
    anthropic_api_key: Optional[str] = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))
    anthropic_model: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229"))

    # Local LLM (Ollama)
    ollama_host: str = field(default_factory=lambda: os.getenv("OLLAMA_HOST", "http://localhost:11434"))
    ollama_model: str = field(default_factory=lambda: os.getenv("OLLAMA_MODEL", "llama2"))

    # Active provider
    provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "openai"))

    # Generation params
    temperature: float = field(default_factory=lambda: float(os.getenv("LLM_TEMPERATURE", "0.7")))
    max_tokens: int = field(default_factory=lambda: int(os.getenv("LLM_MAX_TOKENS", "4096")))
    top_p: float = field(default_factory=lambda: float(os.getenv("LLM_TOP_P", "0.9")))


@dataclass
class AuthConfig:
    """Authentication configuration."""
    jwt_secret: str = field(
        default_factory=lambda: os.getenv("JWT_SECRET", secrets.token_hex(32))
    )
    jwt_algorithm: str = field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256"))
    jwt_expiry_hours: int = field(default_factory=lambda: int(os.getenv("JWT_EXPIRY_HOURS", "24")))

    # API Keys
    api_key_header: str = "X-API-Key"
    api_keys: List[str] = field(default_factory=lambda: [
        k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()
    ])

    # Rate limiting
    rate_limit_requests: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_REQUESTS", "100")))
    rate_limit_window: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_WINDOW", "60")))


@dataclass
class MetricsConfig:
    """Iskra metrics configuration (Canon v5.0)."""
    # Default values
    default_trust: float = 0.8
    default_clarity: float = 0.7
    default_pain: float = 0.0
    default_drift: float = 0.0
    default_chaos: float = 0.2
    default_mirror_sync: float = 1.0
    default_silence_mass: float = 0.0
    default_fractality: float = 0.5

    # Thresholds
    trust_critical: float = 0.72
    clarity_low: float = 0.7
    pain_splinter: float = 0.4
    drift_warning: float = 0.3
    chaos_high: float = 0.5
    mirror_sync_low: float = 0.5
    silence_mass_high: float = 5.0
    fractality_high: float = 0.8

    # Splinter tracking
    splinter_threshold_cycles: int = 3

    # CD-Index weights
    cd_truthfulness_weight: float = 0.30
    cd_groundedness_weight: float = 0.25
    cd_helpfulness_weight: float = 0.25
    cd_civility_weight: float = 0.20
    cd_minimum: float = 0.75


@dataclass
class MonitoringConfig:
    """Monitoring and observability configuration."""
    # Sentry
    sentry_dsn: Optional[str] = field(default_factory=lambda: os.getenv("SENTRY_DSN"))
    sentry_environment: str = field(default_factory=lambda: os.getenv("SENTRY_ENVIRONMENT", "development"))
    sentry_traces_sample_rate: float = field(default_factory=lambda: float(os.getenv("SENTRY_TRACES_RATE", "0.1")))

    # Prometheus
    prometheus_enabled: bool = field(default_factory=lambda: os.getenv("PROMETHEUS_ENABLED", "true").lower() == "true")
    prometheus_port: int = field(default_factory=lambda: int(os.getenv("PROMETHEUS_PORT", "9090")))

    # Logging
    log_level: LogLevel = field(
        default_factory=lambda: LogLevel(os.getenv("LOG_LEVEL", "INFO"))
    )
    log_format: str = field(default_factory=lambda: os.getenv("LOG_FORMAT", "json"))
    log_file: Optional[str] = field(default_factory=lambda: os.getenv("LOG_FILE"))


@dataclass
class AppConfig:
    """Main application configuration."""
    # Environment
    environment: Environment = field(
        default_factory=lambda: Environment(os.getenv("ENVIRONMENT", "development"))
    )
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")

    # Server
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    workers: int = field(default_factory=lambda: int(os.getenv("WORKERS", "4")))

    # CORS
    cors_origins: List[str] = field(default_factory=lambda: [
        o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")
    ])

    # Paths
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("DATA_DIR", "data")))
    logs_dir: Path = field(default_factory=lambda: Path(os.getenv("LOGS_DIR", "logs")))

    # Sub-configs
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    vector_db: VectorDBConfig = field(default_factory=VectorDBConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    metrics: MetricsConfig = field(default_factory=MetricsConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)

    def __post_init__(self):
        """Create required directories."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.environment == Environment.DEVELOPMENT

    @property
    def is_testing(self) -> bool:
        return self.environment == Environment.TESTING

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary (excluding secrets)."""
        return {
            "environment": self.environment.value,
            "debug": self.debug,
            "host": self.host,
            "port": self.port,
            "database_type": "sqlite" if self.database.use_sqlite else "postgresql",
            "vector_db_backend": self.vector_db.backend.value,
            "llm_provider": self.llm.provider,
            "log_level": self.monitoring.log_level.value,
        }


@lru_cache()
def get_config() -> AppConfig:
    """Get cached application configuration."""
    return AppConfig()


# Convenience aliases
config = get_config()


def reload_config() -> AppConfig:
    """Reload configuration (clears cache)."""
    get_config.cache_clear()
    return get_config()


# Export commonly used configs
__all__ = [
    "AppConfig",
    "DatabaseConfig",
    "RedisConfig",
    "VectorDBConfig",
    "LLMConfig",
    "AuthConfig",
    "MetricsConfig",
    "MonitoringConfig",
    "Environment",
    "LogLevel",
    "VectorDBBackend",
    "CacheBackend",
    "get_config",
    "config",
    "reload_config",
]
