"""
JWT Authentication and Rate Limiting Service for Iskra.

Provides:
- JWT token generation and validation
- Rate limiting middleware
- API key authentication

Canon v5.0 Compliant
"""

import os
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
import asyncio
from functools import wraps

try:
    import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False
    jwt = None


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class AuthConfig:
    """Authentication configuration."""
    jwt_secret: str = field(default_factory=lambda: os.getenv('JWT_SECRET', secrets.token_hex(32)))
    jwt_algorithm: str = 'HS256'
    jwt_expiry_hours: int = 24
    rate_limit_per_minute: int = int(os.getenv('RATE_LIMIT_PER_MINUTE', '60'))
    rate_limit_burst: int = int(os.getenv('RATE_LIMIT_BURST', '10'))
    api_key_header: str = 'X-API-Key'
    enable_auth: bool = os.getenv('ENABLE_AUTH', 'false').lower() == 'true'


# ============================================================================
# Token Management
# ============================================================================

@dataclass
class TokenPayload:
    """JWT token payload."""
    user_id: str
    session_id: str
    issued_at: datetime
    expires_at: datetime
    scopes: list = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class JWTManager:
    """JWT token management."""
    
    def __init__(self, config: Optional[AuthConfig] = None):
        self.config = config or AuthConfig()
        if not HAS_JWT:
            raise ImportError("PyJWT is required for JWT authentication. Install with: pip install PyJWT")
    
    def create_token(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        scopes: Optional[list] = None,
        expiry_hours: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """Create a new JWT token."""
        now = datetime.utcnow()
        expiry = now + timedelta(hours=expiry_hours or self.config.jwt_expiry_hours)
        
        payload = {
            'sub': user_id,
            'sid': session_id or secrets.token_hex(16),
            'iat': now.timestamp(),
            'exp': expiry.timestamp(),
            'scopes': scopes or ['read', 'write'],
            'meta': metadata or {}
        }
        
        return jwt.encode(payload, self.config.jwt_secret, algorithm=self.config.jwt_algorithm)
    
    def validate_token(self, token: str) -> Tuple[bool, Optional[TokenPayload], Optional[str]]:
        """Validate a JWT token.
        
        Returns:
            Tuple of (is_valid, payload, error_message)
        """
        try:
            decoded = jwt.decode(
                token,
                self.config.jwt_secret,
                algorithms=[self.config.jwt_algorithm]
            )
            
            payload = TokenPayload(
                user_id=decoded['sub'],
                session_id=decoded['sid'],
                issued_at=datetime.fromtimestamp(decoded['iat']),
                expires_at=datetime.fromtimestamp(decoded['exp']),
                scopes=decoded.get('scopes', []),
                metadata=decoded.get('meta', {})
            )
            
            return True, payload, None
            
        except jwt.ExpiredSignatureError:
            return False, None, 'Token has expired'
        except jwt.InvalidTokenError as e:
            return False, None, f'Invalid token: {str(e)}'
    
    def refresh_token(self, token: str) -> Optional[str]:
        """Refresh an existing token."""
        is_valid, payload, _ = self.validate_token(token)
        if not is_valid or not payload:
            return None
        
        return self.create_token(
            user_id=payload.user_id,
            session_id=payload.session_id,
            scopes=payload.scopes,
            metadata=payload.metadata
        )


# ============================================================================
# Rate Limiting
# ============================================================================

@dataclass
class RateLimitEntry:
    """Rate limit tracking entry."""
    tokens: float
    last_update: float


class RateLimiter:
    """
    Token bucket rate limiter.
    
    Implements a token bucket algorithm for rate limiting:
    - Tokens are added at a constant rate (rate_limit_per_minute / 60)
    - Each request consumes one token
    - Burst capacity allows temporary spikes
    """
    
    def __init__(self, config: Optional[AuthConfig] = None):
        self.config = config or AuthConfig()
        self._buckets: Dict[str, RateLimitEntry] = {}
        self._lock = asyncio.Lock()
        
        # Calculate refill rate (tokens per second)
        self.refill_rate = self.config.rate_limit_per_minute / 60.0
        self.max_tokens = self.config.rate_limit_per_minute + self.config.rate_limit_burst
    
    async def check_rate_limit(self, identifier: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: Unique identifier (user_id, IP, API key hash)
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        async with self._lock:
            now = time.time()
            
            if identifier not in self._buckets:
                # New client - start with full bucket
                self._buckets[identifier] = RateLimitEntry(
                    tokens=self.max_tokens,
                    last_update=now
                )
            
            entry = self._buckets[identifier]
            
            # Calculate tokens to add based on time elapsed
            elapsed = now - entry.last_update
            tokens_to_add = elapsed * self.refill_rate
            new_tokens = min(self.max_tokens, entry.tokens + tokens_to_add)
            
            rate_info = {
                'limit': self.config.rate_limit_per_minute,
                'remaining': int(new_tokens),
                'reset': int(now + (self.max_tokens - new_tokens) / self.refill_rate)
            }
            
            if new_tokens >= 1:
                # Allow request, consume token
                entry.tokens = new_tokens - 1
                entry.last_update = now
                return True, rate_info
            else:
                # Deny request
                entry.last_update = now
                return False, rate_info
    
    async def get_rate_limit_info(self, identifier: str) -> Dict[str, Any]:
        """Get current rate limit info without consuming a token."""
        async with self._lock:
            now = time.time()
            
            if identifier not in self._buckets:
                return {
                    'limit': self.config.rate_limit_per_minute,
                    'remaining': self.max_tokens,
                    'reset': int(now)
                }
            
            entry = self._buckets[identifier]
            elapsed = now - entry.last_update
            tokens_to_add = elapsed * self.refill_rate
            current_tokens = min(self.max_tokens, entry.tokens + tokens_to_add)
            
            return {
                'limit': self.config.rate_limit_per_minute,
                'remaining': int(current_tokens),
                'reset': int(now + (self.max_tokens - current_tokens) / self.refill_rate)
            }
    
    def cleanup_old_entries(self, max_age_seconds: int = 3600):
        """Remove old rate limit entries."""
        now = time.time()
        to_remove = [
            key for key, entry in self._buckets.items()
            if now - entry.last_update > max_age_seconds
        ]
        for key in to_remove:
            del self._buckets[key]


# ============================================================================
# API Key Authentication
# ============================================================================

class APIKeyManager:
    """API key management for service-to-service auth."""
    
    def __init__(self):
        self._keys: Dict[str, Dict[str, Any]] = {}
        self._load_keys_from_env()
    
    def _load_keys_from_env(self):
        """Load API keys from environment."""
        # Format: ISKRA_API_KEY_<NAME>=<key>
        for key, value in os.environ.items():
            if key.startswith('ISKRA_API_KEY_'):
                name = key[14:].lower()  # Remove prefix
                self._keys[self._hash_key(value)] = {
                    'name': name,
                    'scopes': ['read', 'write'],
                    'created_at': datetime.utcnow().isoformat()
                }
    
    def _hash_key(self, key: str) -> str:
        """Hash API key for secure storage."""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def add_key(self, name: str, scopes: Optional[list] = None) -> str:
        """Generate and add a new API key."""
        key = f"isk_{secrets.token_hex(32)}"
        key_hash = self._hash_key(key)
        
        self._keys[key_hash] = {
            'name': name,
            'scopes': scopes or ['read', 'write'],
            'created_at': datetime.utcnow().isoformat()
        }
        
        return key
    
    def validate_key(self, key: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Validate an API key."""
        key_hash = self._hash_key(key)
        if key_hash in self._keys:
            return True, self._keys[key_hash]
        return False, None
    
    def revoke_key(self, key: str) -> bool:
        """Revoke an API key."""
        key_hash = self._hash_key(key)
        if key_hash in self._keys:
            del self._keys[key_hash]
            return True
        return False


# ============================================================================
# FastAPI Integration
# ============================================================================

class AuthMiddleware:
    """
    Combined authentication and rate limiting middleware.
    
    Usage with FastAPI:
    
    ```python
    from services.auth import AuthMiddleware, AuthConfig
    
    auth = AuthMiddleware(AuthConfig(enable_auth=True))
    
    @app.middleware("http")
    async def auth_middleware(request, call_next):
        return await auth.process_request(request, call_next)
    ```
    """
    
    def __init__(self, config: Optional[AuthConfig] = None):
        self.config = config or AuthConfig()
        self.jwt_manager = JWTManager(config) if HAS_JWT else None
        self.rate_limiter = RateLimiter(config)
        self.api_key_manager = APIKeyManager()
    
    def get_client_identifier(self, request) -> str:
        """Extract client identifier from request."""
        # Try to get from headers first
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        
        # Fall back to client host
        return request.client.host if request.client else 'unknown'
    
    async def authenticate(self, request) -> Tuple[bool, Optional[TokenPayload], Optional[str]]:
        """Authenticate request."""
        if not self.config.enable_auth:
            return True, None, None
        
        # Try API key first
        api_key = request.headers.get(self.config.api_key_header)
        if api_key:
            is_valid, key_info = self.api_key_manager.validate_key(api_key)
            if is_valid:
                return True, None, None
            return False, None, 'Invalid API key'
        
        # Try JWT token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]
            if self.jwt_manager:
                return self.jwt_manager.validate_token(token)
            return False, None, 'JWT authentication not available'
        
        return False, None, 'No authentication provided'
    
    async def check_rate_limit(self, request) -> Tuple[bool, Dict[str, Any]]:
        """Check rate limit for request."""
        identifier = self.get_client_identifier(request)
        return await self.rate_limiter.check_rate_limit(identifier)


# ============================================================================
# Decorators
# ============================================================================

def require_auth(scopes: Optional[list] = None):
    """
    Decorator to require authentication on an endpoint.
    
    Usage:
    
    ```python
    @app.get("/protected")
    @require_auth(scopes=['admin'])
    async def protected_endpoint(request: Request):
        return {"message": "You are authenticated!"}
    ```
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This is a placeholder - actual implementation depends on
            # how the middleware injects the auth info into the request
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def rate_limit(requests_per_minute: int = 60):
    """
    Decorator to apply custom rate limit to an endpoint.
    
    Usage:
    
    ```python
    @app.post("/expensive-operation")
    @rate_limit(requests_per_minute=10)
    async def expensive_endpoint():
        return {"result": "done"}
    ```
    """
    def decorator(func):
        limiter = RateLimiter(AuthConfig(rate_limit_per_minute=requests_per_minute))
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This is a placeholder - needs request context
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# ============================================================================
# Singleton Instance
# ============================================================================

_auth_middleware: Optional[AuthMiddleware] = None


def get_auth_middleware(config: Optional[AuthConfig] = None) -> AuthMiddleware:
    """Get or create the singleton auth middleware."""
    global _auth_middleware
    if _auth_middleware is None:
        _auth_middleware = AuthMiddleware(config)
    return _auth_middleware
