"""
Iskra SpaceApp - Authentication & Authorization Service
Canon v5.0

JWT token management, API key authentication, and rate limiting.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

# JWT support
try:
    import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False


class AuthError(Exception):
    """Base authentication error."""
    pass


class TokenExpiredError(AuthError):
    """Token has expired."""
    pass


class TokenInvalidError(AuthError):
    """Token is invalid."""
    pass


class RateLimitExceededError(AuthError):
    """Rate limit exceeded."""
    pass


class InsufficientPermissionsError(AuthError):
    """Insufficient permissions for the requested action."""
    pass


class Scope(str, Enum):
    """API permission scopes."""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    METRICS = "metrics"
    RITUALS = "rituals"
    EXPORT = "export"


@dataclass
class TokenPayload:
    """JWT token payload."""
    user_id: str
    session_id: str
    scopes: List[str]
    issued_at: datetime
    expires_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    def has_scope(self, scope: Scope) -> bool:
        return scope.value in self.scopes or Scope.ADMIN.value in self.scopes


@dataclass
class AuthConfig:
    """Authentication configuration."""
    jwt_secret: str = field(default_factory=lambda: secrets.token_hex(32))
    jwt_algorithm: str = "HS256"
    token_expiry_hours: int = 24
    refresh_token_expiry_days: int = 30
    api_key_header: str = "X-API-Key"
    bearer_header: str = "Authorization"

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # API keys (hash -> metadata)
    api_keys: Dict[str, Dict[str, Any]] = field(default_factory=dict)


class JWTManager:
    """JWT token management."""

    def __init__(self, config: AuthConfig):
        if not HAS_JWT:
            raise ImportError("PyJWT is required. Install with: pip install PyJWT")
        self.config = config

    def create_token(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        scopes: Optional[List[str]] = None,
        expiry_hours: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a new JWT token."""
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(hours=expiry_hours or self.config.token_expiry_hours)

        payload = {
            "sub": user_id,
            "sid": session_id or secrets.token_hex(16),
            "iat": now.timestamp(),
            "exp": expiry.timestamp(),
            "scopes": scopes or [Scope.READ.value, Scope.WRITE.value],
        }

        if metadata:
            payload["meta"] = metadata

        return jwt.encode(
            payload,
            self.config.jwt_secret,
            algorithm=self.config.jwt_algorithm
        )

    def create_refresh_token(self, user_id: str, session_id: str) -> str:
        """Create a refresh token with longer expiry."""
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(days=self.config.refresh_token_expiry_days)

        payload = {
            "sub": user_id,
            "sid": session_id,
            "type": "refresh",
            "iat": now.timestamp(),
            "exp": expiry.timestamp(),
        }

        return jwt.encode(
            payload,
            self.config.jwt_secret,
            algorithm=self.config.jwt_algorithm
        )

    def verify_token(self, token: str) -> TokenPayload:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret,
                algorithms=[self.config.jwt_algorithm]
            )

            return TokenPayload(
                user_id=payload["sub"],
                session_id=payload.get("sid", ""),
                scopes=payload.get("scopes", []),
                issued_at=datetime.fromtimestamp(payload["iat"], tz=timezone.utc),
                expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
                metadata=payload.get("meta", {})
            )
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise TokenInvalidError(f"Invalid token: {e}")

    def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        """
        Use refresh token to get new access and refresh tokens.
        Returns (access_token, new_refresh_token).
        """
        try:
            payload = jwt.decode(
                refresh_token,
                self.config.jwt_secret,
                algorithms=[self.config.jwt_algorithm]
            )

            if payload.get("type") != "refresh":
                raise TokenInvalidError("Not a refresh token")

            user_id = payload["sub"]
            session_id = payload["sid"]

            # Create new tokens
            access_token = self.create_token(user_id, session_id)
            new_refresh_token = self.create_refresh_token(user_id, session_id)

            return access_token, new_refresh_token

        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Refresh token has expired")
        except jwt.InvalidTokenError as e:
            raise TokenInvalidError(f"Invalid refresh token: {e}")


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(
        self,
        max_requests: int = 100,
        window_seconds: int = 60,
        burst_multiplier: float = 1.5
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.burst_limit = int(max_requests * burst_multiplier)

        # {identifier: [(timestamp, count), ...]}
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # 5 minutes

    def _cleanup_old_requests(self):
        """Remove expired request records."""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return

        cutoff = now - self.window_seconds * 2
        for key in list(self._requests.keys()):
            self._requests[key] = [
                ts for ts in self._requests[key] if ts > cutoff
            ]
            if not self._requests[key]:
                del self._requests[key]

        self._last_cleanup = now

    def check_rate_limit(self, identifier: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is allowed.
        Returns (allowed, rate_limit_info).
        """
        self._cleanup_old_requests()

        now = time.time()
        window_start = now - self.window_seconds

        # Filter requests within window
        recent = [ts for ts in self._requests[identifier] if ts > window_start]
        self._requests[identifier] = recent

        current_count = len(recent)
        remaining = max(0, self.max_requests - current_count)
        reset_time = window_start + self.window_seconds

        info = {
            "limit": self.max_requests,
            "remaining": remaining,
            "reset": int(reset_time),
            "window": self.window_seconds
        }

        if current_count >= self.burst_limit:
            return False, info

        # Record this request
        self._requests[identifier].append(now)

        return current_count < self.max_requests, info

    def get_wait_time(self, identifier: str) -> float:
        """Get seconds to wait before next allowed request."""
        now = time.time()
        window_start = now - self.window_seconds

        recent = [ts for ts in self._requests[identifier] if ts > window_start]

        if len(recent) < self.max_requests:
            return 0.0

        # Oldest request in window + window = when slot opens
        oldest = min(recent)
        return max(0.0, (oldest + self.window_seconds) - now)


class APIKeyManager:
    """API key authentication management."""

    def __init__(self, config: AuthConfig):
        self.config = config
        # Store hashed keys -> metadata
        self._keys: Dict[str, Dict[str, Any]] = {}

        # Initialize from config
        for key_hash, meta in config.api_keys.items():
            self._keys[key_hash] = meta

    @staticmethod
    def generate_key(prefix: str = "isk") -> Tuple[str, str]:
        """Generate a new API key. Returns (key, hash)."""
        key = f"{prefix}_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        return key, key_hash

    @staticmethod
    def hash_key(key: str) -> str:
        """Hash an API key."""
        return hashlib.sha256(key.encode()).hexdigest()

    def register_key(
        self,
        key_hash: str,
        user_id: str,
        scopes: Optional[List[str]] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Register an API key hash."""
        self._keys[key_hash] = {
            "user_id": user_id,
            "scopes": scopes or [Scope.READ.value],
            "expires_at": expires_at.isoformat() if expires_at else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {}
        }

    def verify_key(self, key: str) -> Optional[Dict[str, Any]]:
        """Verify an API key and return its metadata."""
        key_hash = self.hash_key(key)

        if key_hash not in self._keys:
            return None

        key_data = self._keys[key_hash]

        # Check expiry
        if key_data.get("expires_at"):
            expires = datetime.fromisoformat(key_data["expires_at"])
            if datetime.now(timezone.utc) > expires:
                return None

        return key_data

    def revoke_key(self, key_hash: str) -> bool:
        """Revoke an API key."""
        if key_hash in self._keys:
            del self._keys[key_hash]
            return True
        return False


class AuthMiddleware:
    """
    FastAPI middleware for authentication.

    Usage:
        app = FastAPI()
        auth = AuthMiddleware(auth_config)

        @app.get("/protected")
        async def protected(token: TokenPayload = Depends(auth.require_auth)):
            return {"user": token.user_id}
    """

    def __init__(self, config: AuthConfig):
        self.config = config
        self.jwt_manager = JWTManager(config)
        self.api_key_manager = APIKeyManager(config)
        self.rate_limiter = RateLimiter(
            max_requests=config.rate_limit_requests,
            window_seconds=config.rate_limit_window_seconds
        )

    def _extract_bearer_token(self, auth_header: str) -> Optional[str]:
        """Extract token from Bearer header."""
        if auth_header.startswith("Bearer "):
            return auth_header[7:]
        return None

    async def authenticate(
        self,
        authorization: Optional[str] = None,
        api_key: Optional[str] = None,
        client_ip: str = "unknown"
    ) -> Optional[TokenPayload]:
        """
        Authenticate request via JWT or API key.
        Returns TokenPayload or None if unauthenticated.
        """
        # Try JWT first
        if authorization:
            token = self._extract_bearer_token(authorization)
            if token:
                try:
                    return self.jwt_manager.verify_token(token)
                except AuthError:
                    pass

        # Try API key
        if api_key:
            key_data = self.api_key_manager.verify_key(api_key)
            if key_data:
                return TokenPayload(
                    user_id=key_data["user_id"],
                    session_id=f"api_key_{self.api_key_manager.hash_key(api_key)[:8]}",
                    scopes=key_data.get("scopes", []),
                    issued_at=datetime.fromisoformat(key_data["created_at"]),
                    expires_at=datetime.fromisoformat(key_data["expires_at"])
                              if key_data.get("expires_at") else datetime.max.replace(tzinfo=timezone.utc),
                    metadata=key_data.get("metadata", {})
                )

        return None

    def require_auth(self, scopes: Optional[List[Scope]] = None):
        """
        Dependency for requiring authentication.

        Usage:
            @app.get("/admin")
            async def admin(token = Depends(auth.require_auth([Scope.ADMIN]))):
                ...
        """
        required_scopes = scopes or []

        async def dependency(
            authorization: Optional[str] = None,
            x_api_key: Optional[str] = None
        ) -> TokenPayload:
            token = await self.authenticate(authorization, x_api_key)

            if not token:
                raise AuthError("Authentication required")

            # Check scopes
            for scope in required_scopes:
                if not token.has_scope(scope):
                    raise InsufficientPermissionsError(
                        f"Required scope: {scope.value}"
                    )

            return token

        return dependency

    def rate_limit(self, identifier_fn: Optional[Callable] = None):
        """
        Decorator for rate limiting.

        Usage:
            @app.get("/api/ask")
            @auth.rate_limit(lambda req: req.client.host)
            async def ask(...):
                ...
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract identifier
                identifier = "global"
                if identifier_fn and args:
                    identifier = identifier_fn(args[0])

                allowed, info = self.rate_limiter.check_rate_limit(identifier)

                if not allowed:
                    wait_time = self.rate_limiter.get_wait_time(identifier)
                    raise RateLimitExceededError(
                        f"Rate limit exceeded. Try again in {wait_time:.1f}s"
                    )

                return await func(*args, **kwargs)
            return wrapper
        return decorator


# Utility functions

def create_auth_config_from_env() -> AuthConfig:
    """Create AuthConfig from environment variables."""
    import os

    api_keys = {}
    raw_keys = os.getenv("API_KEYS", "")
    for key in raw_keys.split(","):
        key = key.strip()
        if key:
            key_hash = APIKeyManager.hash_key(key)
            api_keys[key_hash] = {
                "user_id": "env_user",
                "scopes": [Scope.READ.value, Scope.WRITE.value]
            }

    return AuthConfig(
        jwt_secret=os.getenv("JWT_SECRET", secrets.token_hex(32)),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        token_expiry_hours=int(os.getenv("JWT_EXPIRY_HOURS", "24")),
        rate_limit_requests=int(os.getenv("RATE_LIMIT_REQUESTS", "100")),
        rate_limit_window_seconds=int(os.getenv("RATE_LIMIT_WINDOW", "60")),
        api_keys=api_keys
    )


__all__ = [
    "AuthConfig",
    "AuthError",
    "TokenExpiredError",
    "TokenInvalidError",
    "RateLimitExceededError",
    "InsufficientPermissionsError",
    "Scope",
    "TokenPayload",
    "JWTManager",
    "RateLimiter",
    "APIKeyManager",
    "AuthMiddleware",
    "create_auth_config_from_env",
]
