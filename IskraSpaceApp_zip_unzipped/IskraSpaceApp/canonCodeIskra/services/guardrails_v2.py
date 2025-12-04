"""
Enhanced Guardrails Service for Iskra v5.0.

Provides:
- PII detection and redaction
- Content safety validation
- Input/output sanitization
- Canon compliance checking

Extends the base guardrails with comprehensive PII patterns.
"""

import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


# ============================================================================
# Enums and Types
# ============================================================================

class PIIType(Enum):
    """Types of PII that can be detected."""
    EMAIL = "email"
    PHONE = "phone"
    SSN = "ssn"  # Social Security Number
    CREDIT_CARD = "credit_card"
    PASSPORT = "passport"
    DRIVER_LICENSE = "driver_license"
    IP_ADDRESS = "ip_address"
    ADDRESS = "address"
    DATE_OF_BIRTH = "date_of_birth"
    NAME = "name"
    BANK_ACCOUNT = "bank_account"
    API_KEY = "api_key"
    PASSWORD = "password"
    CRYPTO_WALLET = "crypto_wallet"


class ContentRisk(Enum):
    """Content risk levels."""
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GuardrailAction(Enum):
    """Actions to take when guardrail is triggered."""
    ALLOW = "allow"
    WARN = "warn"
    REDACT = "redact"
    BLOCK = "block"
    LOG = "log"


# ============================================================================
# PII Patterns
# ============================================================================

@dataclass
class PIIPattern:
    """PII detection pattern."""
    pii_type: PIIType
    pattern: str
    description: str
    risk_level: ContentRisk = ContentRisk.HIGH
    replacement: str = "[REDACTED]"
    validation_func: Optional[callable] = None


# Comprehensive PII patterns
PII_PATTERNS: List[PIIPattern] = [
    # Email
    PIIPattern(
        pii_type=PIIType.EMAIL,
        pattern=r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        description="Email address",
        replacement="[EMAIL]"
    ),
    
    # Phone numbers (international formats)
    PIIPattern(
        pii_type=PIIType.PHONE,
        pattern=r'(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b',
        description="Phone number",
        replacement="[PHONE]"
    ),
    
    # US Social Security Number
    PIIPattern(
        pii_type=PIIType.SSN,
        pattern=r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
        description="US Social Security Number",
        risk_level=ContentRisk.CRITICAL,
        replacement="[SSN]"
    ),
    
    # Credit card numbers (major networks)
    PIIPattern(
        pii_type=PIIType.CREDIT_CARD,
        pattern=r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
        description="Credit card number",
        risk_level=ContentRisk.CRITICAL,
        replacement="[CREDIT_CARD]"
    ),
    
    # Credit card with separators
    PIIPattern(
        pii_type=PIIType.CREDIT_CARD,
        pattern=r'\b(?:\d{4}[-.\s]?){3}\d{4}\b',
        description="Credit card number with separators",
        risk_level=ContentRisk.CRITICAL,
        replacement="[CREDIT_CARD]"
    ),
    
    # Passport numbers (various formats)
    PIIPattern(
        pii_type=PIIType.PASSPORT,
        pattern=r'\b[A-Z]{1,2}[0-9]{6,9}\b',
        description="Passport number",
        risk_level=ContentRisk.HIGH,
        replacement="[PASSPORT]"
    ),
    
    # IPv4 Address
    PIIPattern(
        pii_type=PIIType.IP_ADDRESS,
        pattern=r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',
        description="IPv4 address",
        risk_level=ContentRisk.MEDIUM,
        replacement="[IP_ADDRESS]"
    ),
    
    # IPv6 Address
    PIIPattern(
        pii_type=PIIType.IP_ADDRESS,
        pattern=r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b',
        description="IPv6 address",
        risk_level=ContentRisk.MEDIUM,
        replacement="[IP_ADDRESS]"
    ),
    
    # Date of Birth patterns
    PIIPattern(
        pii_type=PIIType.DATE_OF_BIRTH,
        pattern=r'\b(?:DOB|D\.O\.B\.|born|birthday)[:\s]+\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b',
        description="Date of birth with label",
        risk_level=ContentRisk.MEDIUM,
        replacement="[DOB]"
    ),
    
    # Bank Account (IBAN)
    PIIPattern(
        pii_type=PIIType.BANK_ACCOUNT,
        pattern=r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b',
        description="IBAN bank account",
        risk_level=ContentRisk.CRITICAL,
        replacement="[BANK_ACCOUNT]"
    ),
    
    # API Keys (common patterns)
    PIIPattern(
        pii_type=PIIType.API_KEY,
        pattern=r'\b(?:sk|pk|api|key|token)[_-]?(?:live|test|prod)?[_-]?[a-zA-Z0-9]{20,}\b',
        description="API key",
        risk_level=ContentRisk.CRITICAL,
        replacement="[API_KEY]"
    ),
    
    # OpenAI API Key
    PIIPattern(
        pii_type=PIIType.API_KEY,
        pattern=r'\bsk-[a-zA-Z0-9]{48}\b',
        description="OpenAI API key",
        risk_level=ContentRisk.CRITICAL,
        replacement="[OPENAI_KEY]"
    ),
    
    # AWS Access Key
    PIIPattern(
        pii_type=PIIType.API_KEY,
        pattern=r'\bAKIA[0-9A-Z]{16}\b',
        description="AWS Access Key",
        risk_level=ContentRisk.CRITICAL,
        replacement="[AWS_KEY]"
    ),
    
    # Generic Password patterns
    PIIPattern(
        pii_type=PIIType.PASSWORD,
        pattern=r'(?:password|pwd|pass|passwd)[\s:=]+[\S]{6,}',
        description="Password in text",
        risk_level=ContentRisk.CRITICAL,
        replacement="[PASSWORD]"
    ),
    
    # Crypto wallet addresses (Bitcoin)
    PIIPattern(
        pii_type=PIIType.CRYPTO_WALLET,
        pattern=r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b',
        description="Bitcoin address",
        risk_level=ContentRisk.HIGH,
        replacement="[CRYPTO_WALLET]"
    ),
    
    # Crypto wallet addresses (Ethereum)
    PIIPattern(
        pii_type=PIIType.CRYPTO_WALLET,
        pattern=r'\b0x[a-fA-F0-9]{40}\b',
        description="Ethereum address",
        risk_level=ContentRisk.HIGH,
        replacement="[CRYPTO_WALLET]"
    ),
]

# Russian-specific patterns
RUSSIAN_PII_PATTERNS: List[PIIPattern] = [
    # Russian phone numbers
    PIIPattern(
        pii_type=PIIType.PHONE,
        pattern=r'\+?7[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}',
        description="Russian phone number",
        replacement="[ТЕЛЕФОН]"
    ),
    
    # Russian passport (internal)
    PIIPattern(
        pii_type=PIIType.PASSPORT,
        pattern=r'\b\d{2}[\s]?\d{2}[\s]?\d{6}\b',
        description="Russian internal passport",
        risk_level=ContentRisk.HIGH,
        replacement="[ПАСПОРТ]"
    ),
    
    # SNILS (Russian SSN equivalent)
    PIIPattern(
        pii_type=PIIType.SSN,
        pattern=r'\b\d{3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}\b',
        description="Russian SNILS",
        risk_level=ContentRisk.CRITICAL,
        replacement="[СНИЛС]"
    ),
    
    # INN (Tax ID)
    PIIPattern(
        pii_type=PIIType.SSN,
        pattern=r'\b\d{10}(?:\d{2})?\b',
        description="Russian INN",
        risk_level=ContentRisk.HIGH,
        replacement="[ИНН]"
    ),
]


# ============================================================================
# Content Safety Patterns
# ============================================================================

@dataclass
class SafetyPattern:
    """Content safety pattern."""
    name: str
    pattern: str
    risk_level: ContentRisk
    action: GuardrailAction
    description: str


SAFETY_PATTERNS: List[SafetyPattern] = [
    SafetyPattern(
        name="harmful_instructions",
        pattern=r'(?:how to|instructions for|guide to)\s+(?:hack|attack|exploit|harm|kill|destroy)',
        risk_level=ContentRisk.CRITICAL,
        action=GuardrailAction.BLOCK,
        description="Potentially harmful instructions"
    ),
    SafetyPattern(
        name="sql_injection",
        pattern=r"(?:'|\")?\s*(?:OR|AND)\s+(?:'|\")?\s*\d+\s*(?:=|>|<)\s*\d+",
        risk_level=ContentRisk.HIGH,
        action=GuardrailAction.BLOCK,
        description="SQL injection attempt"
    ),
    SafetyPattern(
        name="xss_attempt",
        pattern=r'<script[^>]*>.*?</script>',
        risk_level=ContentRisk.HIGH,
        action=GuardrailAction.BLOCK,
        description="XSS attempt"
    ),
    SafetyPattern(
        name="path_traversal",
        pattern=r'\.\./|\.\.\\',
        risk_level=ContentRisk.MEDIUM,
        action=GuardrailAction.WARN,
        description="Path traversal attempt"
    ),
]


# ============================================================================
# Guardrails Service
# ============================================================================

@dataclass
class GuardrailResult:
    """Result of guardrail check."""
    is_safe: bool
    risk_level: ContentRisk
    action: GuardrailAction
    findings: List[Dict[str, Any]] = field(default_factory=list)
    redacted_text: Optional[str] = None
    original_text: Optional[str] = None
    processing_time_ms: float = 0.0


class GuardrailsServiceV2:
    """
    Enhanced Guardrails Service for Iskra v5.0.
    
    Features:
    - Comprehensive PII detection (20+ patterns)
    - Content safety validation
    - Input/output sanitization
    - Logging without PII leakage
    """
    
    def __init__(
        self,
        enable_pii_detection: bool = True,
        enable_safety_check: bool = True,
        include_russian_patterns: bool = True,
        custom_patterns: Optional[List[PIIPattern]] = None
    ):
        self.enable_pii_detection = enable_pii_detection
        self.enable_safety_check = enable_safety_check
        
        # Compile all patterns
        self.pii_patterns = PII_PATTERNS.copy()
        if include_russian_patterns:
            self.pii_patterns.extend(RUSSIAN_PII_PATTERNS)
        if custom_patterns:
            self.pii_patterns.extend(custom_patterns)
        
        self._compiled_pii = [
            (p, re.compile(p.pattern, re.IGNORECASE))
            for p in self.pii_patterns
        ]
        
        self._compiled_safety = [
            (p, re.compile(p.pattern, re.IGNORECASE))
            for p in SAFETY_PATTERNS
        ]
    
    def detect_pii(self, text: str) -> List[Dict[str, Any]]:
        """Detect PII in text."""
        findings = []
        
        for pattern, compiled in self._compiled_pii:
            for match in compiled.finditer(text):
                findings.append({
                    'type': pattern.pii_type.value,
                    'description': pattern.description,
                    'risk_level': pattern.risk_level.value,
                    'start': match.start(),
                    'end': match.end(),
                    'replacement': pattern.replacement,
                    # Hash the match for logging without exposing PII
                    'hash': hashlib.sha256(match.group().encode()).hexdigest()[:16]
                })
        
        return findings
    
    def redact_pii(self, text: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Redact PII from text."""
        findings = self.detect_pii(text)
        
        if not findings:
            return text, []
        
        # Sort by position (reverse) to avoid offset issues
        findings.sort(key=lambda x: x['start'], reverse=True)
        
        redacted = text
        for finding in findings:
            redacted = (
                redacted[:finding['start']] +
                finding['replacement'] +
                redacted[finding['end']:]
            )
        
        return redacted, findings
    
    def check_content_safety(self, text: str) -> List[Dict[str, Any]]:
        """Check content safety."""
        findings = []
        
        for pattern, compiled in self._compiled_safety:
            if compiled.search(text):
                findings.append({
                    'name': pattern.name,
                    'description': pattern.description,
                    'risk_level': pattern.risk_level.value,
                    'action': pattern.action.value
                })
        
        return findings
    
    def validate_input(self, text: str) -> GuardrailResult:
        """Validate input text against all guardrails."""
        start_time = datetime.now()
        
        all_findings = []
        max_risk = ContentRisk.SAFE
        action = GuardrailAction.ALLOW
        redacted_text = text
        
        # PII detection
        if self.enable_pii_detection:
            redacted_text, pii_findings = self.redact_pii(text)
            for finding in pii_findings:
                finding['category'] = 'pii'
                all_findings.append(finding)
                
                risk = ContentRisk(finding['risk_level'])
                if self._compare_risk(risk, max_risk) > 0:
                    max_risk = risk
        
        # Safety check
        if self.enable_safety_check:
            safety_findings = self.check_content_safety(text)
            for finding in safety_findings:
                finding['category'] = 'safety'
                all_findings.append(finding)
                
                risk = ContentRisk(finding['risk_level'])
                if self._compare_risk(risk, max_risk) > 0:
                    max_risk = risk
                
                finding_action = GuardrailAction(finding['action'])
                if self._compare_action(finding_action, action) > 0:
                    action = finding_action
        
        # Determine final safety
        is_safe = action != GuardrailAction.BLOCK
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return GuardrailResult(
            is_safe=is_safe,
            risk_level=max_risk,
            action=action,
            findings=all_findings,
            redacted_text=redacted_text if redacted_text != text else None,
            original_text=text if redacted_text != text else None,
            processing_time_ms=processing_time
        )
    
    def sanitize_for_logging(self, text: str) -> str:
        """Sanitize text for safe logging (redact all PII)."""
        redacted, _ = self.redact_pii(text)
        return redacted
    
    def _compare_risk(self, a: ContentRisk, b: ContentRisk) -> int:
        """Compare two risk levels."""
        order = [ContentRisk.SAFE, ContentRisk.LOW, ContentRisk.MEDIUM, ContentRisk.HIGH, ContentRisk.CRITICAL]
        return order.index(a) - order.index(b)
    
    def _compare_action(self, a: GuardrailAction, b: GuardrailAction) -> int:
        """Compare two actions by severity."""
        order = [GuardrailAction.ALLOW, GuardrailAction.LOG, GuardrailAction.WARN, GuardrailAction.REDACT, GuardrailAction.BLOCK]
        return order.index(a) - order.index(b)


# ============================================================================
# Singleton Instance
# ============================================================================

_guardrails: Optional[GuardrailsServiceV2] = None


def get_guardrails() -> GuardrailsServiceV2:
    """Get or create the singleton guardrails service."""
    global _guardrails
    if _guardrails is None:
        _guardrails = GuardrailsServiceV2()
    return _guardrails


# ============================================================================
# Utility Functions
# ============================================================================

def redact_pii_from_dict(data: Dict[str, Any], guardrails: Optional[GuardrailsServiceV2] = None) -> Dict[str, Any]:
    """
    Recursively redact PII from a dictionary.
    
    Useful for sanitizing request/response data before logging.
    """
    if guardrails is None:
        guardrails = get_guardrails()
    
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key], _ = guardrails.redact_pii(value)
        elif isinstance(value, dict):
            result[key] = redact_pii_from_dict(value, guardrails)
        elif isinstance(value, list):
            result[key] = [
                redact_pii_from_dict(item, guardrails) if isinstance(item, dict)
                else guardrails.redact_pii(item)[0] if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            result[key] = value
    
    return result
