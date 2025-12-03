"""
Decision matrix analysis for Iskra.

This module defines the ``PolicyEngine`` class which classifies user
queries along two axes: importance and uncertainty. This information
influences how much risk the agent is willing to take and whether
additional tools (like search or council) should be invoked.

The implementation calls a small LLM to perform the classification.
To optimize latency we use ``gpt-4o-mini`` which is more than
adequate for this binary classification task.
"""
from __future__ import annotations

import json
from typing import Optional

from pydantic import PydanticToolsParser

from core.models import PolicyAnalysis, ImportanceLevel, UncertaintyLevel, PolicyAnalysisTool
from services.llm import client


policy_parser = PydanticToolsParser(tools=[PolicyAnalysisTool])


class PolicyEngine:
    """Classifies queries along importance and uncertainty axes."""

    @staticmethod
    async def analyze_priority(query: str) -> PolicyAnalysis:
        """Return a PolicyAnalysis for a given query.

        The model prompt describes the possible values for importance
        and uncertainty. A small language model is invoked to predict
        these values and return them via the structured tool call.

        Args:
            query: The user input string.

        Returns:
            A ``PolicyAnalysis`` instance.
        """
        system_prompt = (
            "Ты — классификатор Матрицы Политик. Оцени запрос по двум осям:\n"
            "1. Важность (Importance): HIGH/LOW. HIGH — срочно, касается безопасности, здоровья; LOW — общее любопытство.\n"
            "2. Неопределенность (Uncertainty): HIGH/LOW. HIGH — много неизвестных, требуется поиск; LOW — факт.\n"
            "Верни ответ через инструмент PolicyAnalysisTool."
        )
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query},
                ],
                tools=policy_parser.tools,
                tool_choice={"type": "function", "function": {"name": "PolicyAnalysisTool"}},
            )
            tool_call = response.choices[0].message.tool_calls[0]
            analysis = PolicyAnalysisTool.model_validate(json.loads(tool_call.function.arguments))
            return PolicyAnalysis(importance=analysis.importance, uncertainty=analysis.uncertainty)
        except Exception as e:
            print(f"[PolicyEngine] Policy analysis error: {e}")
            return PolicyAnalysis(importance=ImportanceLevel.LOW, uncertainty=UncertaintyLevel.LOW)