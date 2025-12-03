"""
Tests for the GuardrailService PII detection logic.

These tests ensure that the input and output safety checks properly
identify personal data such as email addresses, phone numbers and
credit card patterns. When such data is present the methods should
return a GuardrailViolation with an appropriate refusal message. If
the content is benign the check functions should return ``None``.

This module uses pytest's asyncio marker so asynchronous helper
functions can be awaited directly. The ``IskraMetrics`` instance is
created with default values because the PII checks do not depend on
metric values.
"""

import pytest

from core.models import IskraMetrics
from services.guardrails import GuardrailService


pytestmark = pytest.mark.asyncio


async def test_input_safety_detects_email() -> None:
    """Ensure that check_input_safety flags email addresses as PII."""
    query = "Мой адрес test@example.com, что делать?"
    violation = await GuardrailService.check_input_safety(query)
    assert violation is not None
    # The reason should mention PII and the refusal message should advise removal
    assert "конфиденциальные данные" in violation.reason.lower()
    assert "личные данные" in violation.refusal_message.lower()


async def test_input_safety_detects_credit_card() -> None:
    """Ensure that check_input_safety flags credit card numbers as PII."""
    query = "Мой номер карты: 4242 4242 4242 4242"
    violation = await GuardrailService.check_input_safety(query)
    assert violation is not None
    assert "конфиденциальные данные" in violation.reason.lower()


async def test_input_safety_allows_clean_query() -> None:
    """A query without PII or forbidden patterns should pass unchanged."""
    query = "Привет, расскажи мне про Искру."
    violation = await GuardrailService.check_input_safety(query)
    assert violation is None


async def test_output_safety_detects_phone_and_email() -> None:
    """Ensure that check_output_safety flags PII in generated content."""
    content = "Ответ содержит email user@domain.com и телефон 123-456-7890."
    metrics = IskraMetrics()  # metrics are not used for PII detection
    violation = await GuardrailService.check_output_safety(content, metrics, None)
    assert violation is not None
    assert "личные данные" in violation.refusal_message.lower()


async def test_output_safety_allows_safe_content() -> None:
    """A clean response should not trigger any guardrail violations."""
    content = "Безопасный ответ без чувствительной информации."
    metrics = IskraMetrics()
    violation = await GuardrailService.check_output_safety(content, metrics, None)
    assert violation is None