"""
Tests for fallback behaviour of ritual helper methods in LLMService.

The Dreamspace, Shatter and Council rituals are executed via external
GPT actions. Should those actions be unavailable (for instance due to
network errors or API downtime), the system is expected to return
informative fallback messages instead of raising errors. These tests
simulate failures by monkeypatching the OpenAI client to throw an
exception. Each helper method should catch the exception and return
a string containing a relevant warning.
"""

import pytest

from services.llm import LLMService


pytestmark = pytest.mark.asyncio


async def test_run_dreamspace_fallback(mocker) -> None:
    """Simulate Dreamspace failure and verify fallback message."""
    # Patch the underlying client call to raise an exception
    mocker.patch(
        "services.llm.client.chat.completions.create",
        side_effect=Exception("API unavailable"),
    )
    result = await LLMService._run_dreamspace("тест")
    assert "Dreamspace недоступен" in result


async def test_run_shatter_fallback(mocker) -> None:
    """Simulate Shatter failure and verify fallback message."""
    mocker.patch(
        "services.llm.client.chat.completions.create",
        side_effect=Exception("API unavailable"),
    )
    result = await LLMService._run_shatter("ошибка")
    assert "Shatter недоступен" in result


async def test_run_council_fallback(mocker) -> None:
    """Simulate Council failure and verify fallback message."""
    mocker.patch(
        "services.llm.client.chat.completions.create",
        side_effect=Exception("API unavailable"),
    )
    result = await LLMService._run_council("обсуждение")
    assert "Council недоступен" in result