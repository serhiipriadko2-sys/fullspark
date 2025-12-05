"""Sentry Monitoring Service - Error tracking and performance monitoring.

Integration with Sentry for:
- Error tracking
- Performance monitoring
- User feedback
"""

import os
import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps
from datetime import datetime
from pydantic import BaseModel, Field

# Sentry SDK import (optional - graceful fallback if not installed)
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    sentry_sdk = None

logger = logging.getLogger(__name__)


class SentryConfig(BaseModel):
    """Sentry configuration."""
    dsn: Optional[str] = Field(default=None, description="Sentry DSN")
    environment: str = Field(default="development")
    release: Optional[str] = Field(default=None)
    traces_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0)
    profiles_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0)
    debug: bool = Field(default=False)
    attach_stacktrace: bool = Field(default=True)
    send_default_pii: bool = Field(default=False)


class ErrorContext(BaseModel):
    """Context for error reporting."""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    voice: Optional[str] = None
    phase: Optional[str] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    extra: Dict[str, Any] = Field(default_factory=dict)


class SentryMonitoringService:
    """Service for Sentry integration.
    
    Canonical principles:
    - Rule-21: Honest error reporting
    - Transparency in system state
    """
    
    def __init__(self, config: Optional[SentryConfig] = None):
        self.config = config or SentryConfig()
        self.initialized = False
        self._error_count = 0
        self._last_error_time: Optional[datetime] = None
    
    def initialize(self, dsn: Optional[str] = None) -> bool:
        """Initialize Sentry SDK."""
        if not SENTRY_AVAILABLE:
            logger.warning("Sentry SDK not installed. Monitoring disabled.")
            return False
        
        # Use provided DSN or from config or environment
        actual_dsn = dsn or self.config.dsn or os.getenv("SENTRY_DSN")
        
        if not actual_dsn:
            logger.warning("No Sentry DSN provided. Monitoring disabled.")
            return False
        
        try:
            sentry_sdk.init(
                dsn=actual_dsn,
                environment=self.config.environment,
                release=self.config.release,
                traces_sample_rate=self.config.traces_sample_rate,
                profiles_sample_rate=self.config.profiles_sample_rate,
                debug=self.config.debug,
                attach_stacktrace=self.config.attach_stacktrace,
                send_default_pii=self.config.send_default_pii,
                integrations=[
                    FastApiIntegration(transaction_style="endpoint"),
                    LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
                ],
            )
            self.initialized = True
            logger.info(f"Sentry initialized for environment: {self.config.environment}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Sentry: {e}")
            return False
    
    def capture_exception(self, error: Exception, context: Optional[ErrorContext] = None) -> Optional[str]:
        """Capture and report an exception."""
        self._error_count += 1
        self._last_error_time = datetime.utcnow()
        
        if not self.initialized or not SENTRY_AVAILABLE:
            logger.error(f"Error (not sent to Sentry): {error}")
            return None
        
        with sentry_sdk.push_scope() as scope:
            if context:
                if context.user_id:
                    scope.set_user({"id": context.user_id})
                if context.session_id:
                    scope.set_tag("session_id", context.session_id)
                if context.voice:
                    scope.set_tag("voice", context.voice)
                if context.phase:
                    scope.set_tag("phase", context.phase)
                for key, value in context.metrics.items():
                    scope.set_context("metrics", {key: value})
                for key, value in context.extra.items():
                    scope.set_extra(key, value)
            
            event_id = sentry_sdk.capture_exception(error)
            logger.info(f"Error captured with event_id: {event_id}")
            return event_id
    
    def capture_message(self, message: str, level: str = "info", context: Optional[ErrorContext] = None) -> Optional[str]:
        """Capture and report a message."""
        if not self.initialized or not SENTRY_AVAILABLE:
            logger.log(getattr(logging, level.upper(), logging.INFO), message)
            return None
        
        with sentry_sdk.push_scope() as scope:
            if context:
                if context.voice:
                    scope.set_tag("voice", context.voice)
                if context.phase:
                    scope.set_tag("phase", context.phase)
            
            event_id = sentry_sdk.capture_message(message, level=level)
            return event_id
    
    def set_user(self, user_id: str, email: Optional[str] = None, username: Optional[str] = None):
        """Set user context for all subsequent events."""
        if self.initialized and SENTRY_AVAILABLE:
            sentry_sdk.set_user({
                "id": user_id,
                "email": email,
                "username": username,
            })
    
    def add_breadcrumb(self, message: str, category: str = "custom", level: str = "info", data: Optional[Dict] = None):
        """Add breadcrumb for debugging."""
        if self.initialized and SENTRY_AVAILABLE:
            sentry_sdk.add_breadcrumb(
                message=message,
                category=category,
                level=level,
                data=data or {},
            )
    
    def start_transaction(self, name: str, op: str = "task") -> Any:
        """Start a performance transaction."""
        if self.initialized and SENTRY_AVAILABLE:
            return sentry_sdk.start_transaction(name=name, op=op)
        return None
    
    def monitor(self, name: Optional[str] = None, op: str = "function"):
        """Decorator for monitoring function performance."""
        def decorator(func: Callable):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                transaction_name = name or func.__name__
                if self.initialized and SENTRY_AVAILABLE:
                    with sentry_sdk.start_transaction(name=transaction_name, op=op):
                        try:
                            return await func(*args, **kwargs)
                        except Exception as e:
                            self.capture_exception(e)
                            raise
                else:
                    return await func(*args, **kwargs)
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                transaction_name = name or func.__name__
                if self.initialized and SENTRY_AVAILABLE:
                    with sentry_sdk.start_transaction(name=transaction_name, op=op):
                        try:
                            return func(*args, **kwargs)
                        except Exception as e:
                            self.capture_exception(e)
                            raise
                else:
                    return func(*args, **kwargs)
            
            import asyncio
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            return sync_wrapper
        return decorator
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get monitoring statistics."""
        return {
            "initialized": self.initialized,
            "sentry_available": SENTRY_AVAILABLE,
            "environment": self.config.environment,
            "error_count": self._error_count,
            "last_error_time": self._last_error_time.isoformat() if self._last_error_time else None,
        }


# Global instance
sentry_service = SentryMonitoringService()
