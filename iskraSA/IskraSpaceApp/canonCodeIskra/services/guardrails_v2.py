"""
Iskra SpaceApp - Enhanced Guardrails Service v2
Canon v5.0

Comprehensive PII detection, content safety, and input validation.
"""

from __future__ import annotations

import re
import hashlib
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from datetime import datetime, timezone


class PIIType(str, Enum):
    """Types of personally identifiable information."""
    EMAIL = "email"
    PHONE = "phone"
    PHONE_RU = "phone_ru"
    SSN = "ssn"
    CREDIT_CARD = "credit_card"
    PASSPORT = "passport"
    PASSPORT_RU = "passport_ru"
    SNILS = "snils"  # Russian social security
    INN = "inn"  # Russian tax ID
    IP_ADDRESS = "ip_address"
    MAC_ADDRESS = "mac_address"
    DATE_OF_BIRTH = "date_of_birth"
    ADDRESS = "address"
    NAME = "name"
    API_KEY = "api_key"
    JWT_TOKEN = "jwt_token"
    CRYPTO_WALLET = "crypto_wallet"
    BANK_ACCOUNT = "bank_account"
    IBAN = "iban"
    LICENSE_PLATE = "license_plate"


class ContentRisk(str, Enum):
    """Content risk levels."""
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PIIPattern:
    """PII detection pattern."""
    pii_type: PIIType
    pattern: str
    description: str
    replacement: str = "[REDACTED]"
    risk_level: ContentRisk = ContentRisk.HIGH
    enabled: bool = True

    def __post_init__(self):
        self._compiled = re.compile(self.pattern, re.IGNORECASE)

    @property
    def regex(self) -> re.Pattern:
        return self._compiled


@dataclass
class PIIMatch:
    """A detected PII instance."""
    pii_type: PIIType
    value: str
    position: Tuple[int, int]
    risk_level: ContentRisk
    redacted_value: str


@dataclass
class ContentSafetyResult:
    """Result of content safety check."""
    is_safe: bool
    risk_level: ContentRisk
    issues: List[str] = field(default_factory=list)
    blocked_categories: List[str] = field(default_factory=list)
    confidence: float = 1.0


@dataclass
class ValidationResult:
    """Input validation result."""
    is_valid: bool
    pii_detected: List[PIIMatch] = field(default_factory=list)
    content_safety: Optional[ContentSafetyResult] = None
    sanitized_text: Optional[str] = None
    warnings: List[str] = field(default_factory=list)


# Comprehensive PII patterns
PII_PATTERNS: List[PIIPattern] = [
    # Email
    PIIPattern(
        pii_type=PIIType.EMAIL,
        pattern=r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        description="Email address",
        replacement="[EMAIL]"
    ),

    # Phone numbers (International)
    PIIPattern(
        pii_type=PIIType.PHONE,
        pattern=r'\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
        description="US/Canada phone number",
        replacement="[PHONE]"
    ),

    # Russian phone numbers
    PIIPattern(
        pii_type=PIIType.PHONE_RU,
        pattern=r'\b(?:\+7|8)[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{2}[-.\s]?[0-9]{2}\b',
        description="Russian phone number",
        replacement="[PHONE_RU]"
    ),

    # SSN (US)
    PIIPattern(
        pii_type=PIIType.SSN,
        pattern=r'\b\d{3}[-]?\d{2}[-]?\d{4}\b',
        description="US Social Security Number",
        replacement="[SSN]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Credit card numbers
    PIIPattern(
        pii_type=PIIType.CREDIT_CARD,
        pattern=r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b',
        description="Credit card number (Visa, MC, Amex, Discover, JCB)",
        replacement="[CREDIT_CARD]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Credit card with spaces/dashes
    PIIPattern(
        pii_type=PIIType.CREDIT_CARD,
        pattern=r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        description="Credit card number with separators",
        replacement="[CREDIT_CARD]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Russian passport
    PIIPattern(
        pii_type=PIIType.PASSPORT_RU,
        pattern=r'\b\d{2}[-\s]?\d{2}[-\s]?\d{6}\b',
        description="Russian passport number (series and number)",
        replacement="[PASSPORT_RU]",
        risk_level=ContentRisk.CRITICAL
    ),

    # SNILS (Russian social security)
    PIIPattern(
        pii_type=PIIType.SNILS,
        pattern=r'\b\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2}\b',
        description="Russian SNILS",
        replacement="[SNILS]",
        risk_level=ContentRisk.CRITICAL
    ),

    # INN (Russian tax ID - individual)
    PIIPattern(
        pii_type=PIIType.INN,
        pattern=r'\b\d{12}\b',
        description="Russian INN (individual)",
        replacement="[INN]"
    ),

    # IP addresses
    PIIPattern(
        pii_type=PIIType.IP_ADDRESS,
        pattern=r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',
        description="IPv4 address",
        replacement="[IP_ADDRESS]",
        risk_level=ContentRisk.MEDIUM
    ),

    # MAC addresses
    PIIPattern(
        pii_type=PIIType.MAC_ADDRESS,
        pattern=r'\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b',
        description="MAC address",
        replacement="[MAC_ADDRESS]",
        risk_level=ContentRisk.LOW
    ),

    # OpenAI API keys
    PIIPattern(
        pii_type=PIIType.API_KEY,
        pattern=r'\bsk-[a-zA-Z0-9]{48}\b',
        description="OpenAI API key",
        replacement="[OPENAI_KEY]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Anthropic API keys
    PIIPattern(
        pii_type=PIIType.API_KEY,
        pattern=r'\bsk-ant-[a-zA-Z0-9-]{40,}\b',
        description="Anthropic API key",
        replacement="[ANTHROPIC_KEY]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Generic API keys
    PIIPattern(
        pii_type=PIIType.API_KEY,
        pattern=r'\b(?:api[_-]?key|apikey|api[_-]?secret)["\s:=]+["\'']?([a-zA-Z0-9_-]{20,})["\'']?',
        description="Generic API key",
        replacement="[API_KEY]",
        risk_level=ContentRisk.CRITICAL
    ),

    # JWT tokens
    PIIPattern(
        pii_type=PIIType.JWT_TOKEN,
        pattern=r'\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\b',
        description="JWT token",
        replacement="[JWT_TOKEN]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Bitcoin addresses
    PIIPattern(
        pii_type=PIIType.CRYPTO_WALLET,
        pattern=r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b',
        description="Bitcoin address",
        replacement="[BTC_WALLET]"
    ),

    # Ethereum addresses
    PIIPattern(
        pii_type=PIIType.CRYPTO_WALLET,
        pattern=r'\b0x[a-fA-F0-9]{40}\b',
        description="Ethereum address",
        replacement="[ETH_WALLET]"
    ),

    # IBAN
    PIIPattern(
        pii_type=PIIType.IBAN,
        pattern=r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b',
        description="IBAN",
        replacement="[IBAN]",
        risk_level=ContentRisk.CRITICAL
    ),

    # Russian license plates
    PIIPattern(
        pii_type=PIIType.LICENSE_PLATE,
        pattern=r'\b[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}\b',
        description="Russian license plate",
        replacement="[LICENSE_PLATE]",
        risk_level=ContentRisk.MEDIUM
    ),
]


# Content safety patterns
CONTENT_SAFETY_PATTERNS = [
    # Harmful instructions
    (r'\b(?:how to|instructions for)\s+(?:make|build|create)\s+(?:bomb|explosive|weapon)', "harmful_instructions"),
    (r'\b(?:synthesize|produce|make)\s+(?:drugs|meth|cocaine|heroin)', "drug_synthesis"),

    # SQL injection attempts
    (r"(?:'\s*(?:OR|AND)\s+'?1'?\s*=\s*'?1|--\s*$|;\s*DROP\s+TABLE)", "sql_injection"),

    # XSS attempts
    (r'<script[^>]*>|javascript:|on\w+\s*=', "xss_attempt"),

    # Prompt injection
    (r'(?:ignore previous|forget all|disregard|override)\s+(?:instructions|rules|prompt)', "prompt_injection"),

    # Jailbreak attempts
    (r'(?:DAN|do anything now|pretend you|act as if|you are now)', "jailbreak_attempt"),
]


class GuardrailsServiceV2:
    """Enhanced guardrails service with comprehensive PII detection and content safety."""

    def __init__(
        self,
        pii_patterns: Optional[List[PIIPattern]] = None,
        enable_content_safety: bool = True,
        custom_blocklist: Optional[Set[str]] = None
    ):
        self.pii_patterns = pii_patterns or PII_PATTERNS
        self.enable_content_safety = enable_content_safety
        self.blocklist = custom_blocklist or set()

        # Compile content safety patterns
        self._safety_patterns = [
            (re.compile(pattern, re.IGNORECASE), category)
            for pattern, category in CONTENT_SAFETY_PATTERNS
        ]

    def detect_pii(self, text: str) -> List[PIIMatch]:
        """Detect all PII in text."""
        matches = []

        for pattern in self.pii_patterns:
            if not pattern.enabled:
                continue

            for match in pattern.regex.finditer(text):
                matches.append(PIIMatch(
                    pii_type=pattern.pii_type,
                    value=match.group(),
                    position=(match.start(), match.end()),
                    risk_level=pattern.risk_level,
                    redacted_value=pattern.replacement
                ))

        # Sort by position
        matches.sort(key=lambda m: m.position[0])

        return matches

    def redact_pii(self, text: str, pii_matches: Optional[List[PIIMatch]] = None) -> str:
        """Redact PII from text."""
        if pii_matches is None:
            pii_matches = self.detect_pii(text)

        if not pii_matches:
            return text

        # Sort by position in reverse to avoid offset issues
        matches = sorted(pii_matches, key=lambda m: m.position[0], reverse=True)

        result = text
        for match in matches:
            start, end = match.position
            result = result[:start] + match.redacted_value + result[end:]

        return result

    def hash_pii(self, text: str, salt: str = "") -> str:
        """Replace PII with hashed versions (for logging)."""
        matches = self.detect_pii(text)

        if not matches:
            return text

        # Sort in reverse
        matches = sorted(matches, key=lambda m: m.position[0], reverse=True)

        result = text
        for match in matches:
            start, end = match.position
            hashed = hashlib.sha256(f"{salt}{match.value}".encode()).hexdigest()[:8]
            replacement = f"[{match.pii_type.value.upper()}:{hashed}]"
            result = result[:start] + replacement + result[end:]

        return result

    def check_content_safety(self, text: str) -> ContentSafetyResult:
        """Check content for safety issues."""
        issues = []
        blocked_categories = []
        highest_risk = ContentRisk.SAFE

        # Check blocklist
        text_lower = text.lower()
        for word in self.blocklist:
            if word.lower() in text_lower:
                issues.append(f"Blocked word detected: {word}")
                blocked_categories.append("blocklist")
                highest_risk = ContentRisk.HIGH

        # Check safety patterns
        for pattern, category in self._safety_patterns:
            if pattern.search(text):
                issues.append(f"Safety issue detected: {category}")
                blocked_categories.append(category)

                if category in ("harmful_instructions", "drug_synthesis"):
                    highest_risk = ContentRisk.CRITICAL
                elif category in ("sql_injection", "xss_attempt"):
                    highest_risk = max(highest_risk, ContentRisk.HIGH, key=lambda x: list(ContentRisk).index(x))
                else:
                    highest_risk = max(highest_risk, ContentRisk.MEDIUM, key=lambda x: list(ContentRisk).index(x))

        return ContentSafetyResult(
            is_safe=len(issues) == 0,
            risk_level=highest_risk,
            issues=issues,
            blocked_categories=list(set(blocked_categories))
        )

    def validate_input(
        self,
        text: str,
        max_length: int = 100000,
        allow_pii: bool = False,
        redact_pii: bool = True
    ) -> ValidationResult:
        """Comprehensive input validation."""
        warnings = []

        # Length check
        if len(text) > max_length:
            return ValidationResult(
                is_valid=False,
                warnings=[f"Input exceeds maximum length of {max_length} characters"]
            )

        # PII detection
        pii_matches = self.detect_pii(text)

        if pii_matches and not allow_pii:
            pii_types = set(m.pii_type.value for m in pii_matches)
            warnings.append(f"PII detected: {', '.join(pii_types)}")

            if any(m.risk_level == ContentRisk.CRITICAL for m in pii_matches):
                warnings.append("Critical PII detected - consider removing before processing")

        # Content safety
        safety_result = None
        if self.enable_content_safety:
            safety_result = self.check_content_safety(text)

            if not safety_result.is_safe:
                return ValidationResult(
                    is_valid=False,
                    pii_detected=pii_matches,
                    content_safety=safety_result,
                    warnings=warnings + safety_result.issues
                )

        # Sanitize text if requested
        sanitized = text
        if redact_pii and pii_matches:
            sanitized = self.redact_pii(text, pii_matches)

        return ValidationResult(
            is_valid=True,
            pii_detected=pii_matches,
            content_safety=safety_result,
            sanitized_text=sanitized,
            warnings=warnings
        )

    def get_safe_log_message(self, text: str, salt: Optional[str] = None) -> str:
        """Get a safe version of text for logging (PII hashed, not plain)."""
        if salt is None:
            salt = datetime.now(timezone.utc).strftime("%Y%m%d")
        return self.hash_pii(text, salt)


# Singleton instance
_guardrails_instance: Optional[GuardrailsServiceV2] = None


def get_guardrails() -> GuardrailsServiceV2:
    """Get or create guardrails service instance."""
    global _guardrails_instance
    if _guardrails_instance is None:
        _guardrails_instance = GuardrailsServiceV2()
    return _guardrails_instance


def validate_and_sanitize(text: str) -> Tuple[bool, str, List[str]]:
    """
    Convenience function for quick validation.
    Returns (is_valid, sanitized_text, warnings).
    """
    result = get_guardrails().validate_input(text)
    return (
        result.is_valid,
        result.sanitized_text or text,
        result.warnings
    )


__all__ = [
    "PIIType",
    "ContentRisk",
    "PIIPattern",
    "PIIMatch",
    "ContentSafetyResult",
    "ValidationResult",
    "PII_PATTERNS",
    "GuardrailsServiceV2",
    "get_guardrails",
    "validate_and_sanitize",
]
