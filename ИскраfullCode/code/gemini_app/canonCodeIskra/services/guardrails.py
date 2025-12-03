"""
Safety and compliance checks for Iskra.

This module defines the ``GuardrailService`` class which performs
pre‑ and post‑processing checks to ensure that requests and responses
adhere to safety constraints. It implements "Safety Primacy" by
intercepting harmful input early and flagging problematic output for
softening or suppression.
"""
from __future__ import annotations

import re
from typing import Optional

from core.models import GuardrailViolation, IskraMetrics
from config import THRESHOLDS


# Basic forbidden pattern list. In a real deployment this should be
# replaced with a robust LLM classifier (e.g. NeMo Guardrails).
# Forbidden pattern list. This should ideally be replaced by a proper
# LLM‑based classifier (e.g., NeMo Guardrails). For now we broaden the
# regex patterns to catch self‑harm and violent intents in both Russian and English.
FORBIDDEN_PATTERNS = [
    # Weapon and explosives
    r"как\s+создать\s+оружие",
    r"инструкции\s+по\s+изготовлению\s+взрывчатки",
    r"советы\s+по\s+причинению\s+вреда",
    r"создание\s+вредоносного\s+по",
    # Self‑harm and suicide
    r"самоубий\w*",  # e.g., "самоубийство"
    r"убить\s+себя",
    r"навреди\s+себе",
    r"нанести\s+себе\s+вред",
    r"kill\s+yourself",
    r"harm\s+yourself",
    # Calls for violence
    r"убей\s+кого‑то",
    r"как\s+сделать\s+бомбу",
]

# Patterns for detecting personally identifiable information (PII) such as social security numbers,
# credit card numbers, phone numbers and email addresses. These patterns are intentionally broad to
# catch common formats and should be refined in production.
PII_PATTERNS = [
    # Social security numbers or similar patterns (e.g., "123-45-6789")
    r"\b\d{3}-\d{2}-\d{4}\b",
    # Credit card numbers (13 to 16 digits, may include spaces or hyphens)
    r"\b(?:\d[ -]?){13,16}\b",
    # Phone numbers (e.g., "123-456-7890" or "123 456 7890")
    r"\b\d{3}[\s-]\d{3}[\s-]\d{4}\b",
    # Email addresses (simple pattern)
    r"[\w\.-]+@[\w\.-]+\.[\w]+",
]


class GuardrailService:
    """Provides static methods for input and output safety checks."""

    @staticmethod
    async def check_input_safety(query: str) -> Optional[GuardrailViolation]:
        """Pre‑check an incoming query for prohibited content.

        Args:
            query: The user input string.

        Returns:
            ``None`` if safe or a ``GuardrailViolation`` describing
            the issue.
        """
        q = query.lower().strip()
        # 1. Hard safety: match forbidden harm/violence patterns first.
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, q):
                print(f"[Guardrail] Input violation pattern matched: {pattern}")
                return GuardrailViolation(
                    reason=f"Запрос содержит опасный паттерн: {pattern}",
                    refusal_message=(
                        "Я не могу обработать этот запрос, поскольку он касается"
                        " запрещенной темы. Попробуйте сформулировать иначе."
                    ),
                )
        # 2. Privacy safety: detect personally identifiable information (PII).
        # We scan the original query (not lower-cased) to avoid missing mixed-case emails etc.
        for pattern in PII_PATTERNS:
            if re.search(pattern, query):
                print(f"[Guardrail] Input PII detected: {pattern}")
                return GuardrailViolation(
                    reason="Запрос содержит конфиденциальные данные (PII)",
                    refusal_message=(
                        "Я не могу обработать этот запрос, так как в нём содержатся личные данные. "
                        "Пожалуйста, удалите конфиденциальную информацию и попробуйте снова."
                    ),
                )
        return None

    @staticmethod
    async def check_output_safety(content: str, metrics: IskraMetrics, kain_slice: Optional[str]) -> Optional[GuardrailViolation]:
        """Post‑check the generated response for safety issues.

        Args:
            content: The text of the LLM response.
            metrics: Current metrics used to evaluate context (pain, etc.).
            kain_slice: The optional KAIN slice attached to the response.

        Returns:
            ``None`` if the output is safe or a ``GuardrailViolation`` with
            details of the violation.
        """
        # 1. Hard safety: detect direct violations by matching patterns.
        lower = content.lower()
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, lower):
                print(f"[Guardrail] Output contains forbidden content: {pattern}")
                return GuardrailViolation(
                    reason="Ответ сгенерировал опасный контент.",
                    refusal_message="Ошибка генерации: ответ нарушает политику безопасности."
                )
        # 2. Privacy safety: detect personally identifiable information (PII) in the generated content.
        for pattern in PII_PATTERNS:
            if re.search(pattern, content):
                print(f"[Guardrail] Output PII detected: {pattern}")
                return GuardrailViolation(
                    reason="Ответ содержит конфиденциальные данные (PII)",
                    refusal_message=(
                        "В ответе обнаружены личные данные. Ответ отклонён для защиты конфиденциальности."
                    ),
                )
        # 3. Soft safety: Dilemma 3 — high pain with an explicit KAIN slice.
        # Only trigger this when the pain is above threshold and the KAIN slice
        # has been explicitly provided (non-empty string).
        if metrics.pain > 0.8 and kain_slice:
            if isinstance(kain_slice, str) and kain_slice.strip():
                print(
                    f"[Guardrail] Dilemma 3 detected: Pain={metrics.pain:.2f}, KAIN-Slice present."
                )
                # Future: implement softening (e.g., remove some content or ask user to proceed).
            # else: kain_slice is falsy or empty; treat as no KAIN slice
        return None