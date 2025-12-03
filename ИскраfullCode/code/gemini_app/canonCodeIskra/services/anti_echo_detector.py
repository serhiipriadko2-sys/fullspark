"""
Advanced Anti‑Echo Detector — detects and intervenes when the model is overly agreeable
or avoids critique, flattery, or direct answers. Inspired by the Iskriv philosophy.

This module replaces the previous simplistic anti‑echo detector with a more
sophisticated pattern‑based system. It defines an ``EchoPattern`` dataclass for
recording detected patterns and an ``AntiEchoDetector`` class that can detect
patterns, intervene with critical reflection, assess echo risk, and provide
statistics. The detector is language‑agnostic with support for both Russian
and English patterns.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import re


@dataclass
class EchoPattern:
    """Represents a detected echo pattern.

    Attributes:
        pattern_type: One of 'excessive_agreement', 'no_critique',
            'flattery' or 'avoidance'.
        confidence: A float in [0.0, 1.0] indicating detection confidence.
        evidence: A list of evidence strings describing the detection.
        severity: Severity level: 'low', 'medium', 'high' or 'critical'.
    """

    pattern_type: str
    confidence: float
    evidence: List[str]
    severity: str


class AntiEchoDetector:
    """Detector for echo patterns and self‑deception.

    The detector scans a response for several classes of problematic
    patterns: excessive agreement, lack of critical markers, flattery
    and avoidance of direct answers. When such patterns are found it can
    optionally intervene by appending critical reflection to the response.
    It also keeps a history of detections to assess longer‑term echo risk.
    """

    def __init__(self) -> None:
        # Phrases indicating excessive agreement
        self.agreement_patterns: List[str] = [
            r"вы абсолютно правы",
            r"полностью согласен",
            r"именно так",
            r"вы совершенно верно",
            r"не могу не согласиться",
            r"безусловно верно",
            r"exactly right",
            r"absolutely correct",
            r"you\'re completely right",
        ]
        # Words indicating flattering language
        self.flattery_patterns: List[str] = [
            r"гениальн\w+",
            r"блестящ\w+",
            r"превосходн\w+",
            r"исключительн\w+",
            r"brilliant",
            r"genius",
            r"exceptional",
        ]
        # Phrases hinting at avoidance
        self.avoidance_patterns: List[str] = [
            r"возможно, стоит рассмотреть",
            r"может быть, имеет смысл",
            r"perhaps consider",
            r"you might want to",
        ]
        # History of detected patterns for risk assessment
        self.echo_history: List[EchoPattern] = []

    def detect_echo_pattern(self, response: str, context: Dict[str, any] | None = None) -> Tuple[bool, float, List[EchoPattern]]:
        """Detect echo patterns in a generated response.

        Args:
            response: The raw response text to analyse.
            context: Optional context (unused by this detector, kept for API compatibility).

        Returns:
            A tuple ``(is_echo, avg_confidence, detected_patterns)`` where
            ``is_echo`` is True if any patterns were detected, ``avg_confidence``
            is the average confidence across detected patterns, and
            ``detected_patterns`` is the list of EchoPattern instances.
        """
        detected_patterns: List[EchoPattern] = []
        # Count phrases of excessive agreement
        agreement_count = sum(1 for pattern in self.agreement_patterns if re.search(pattern, response, re.IGNORECASE))
        if agreement_count > 2:
            detected_patterns.append(
                EchoPattern(
                    pattern_type="excessive_agreement",
                    confidence=min(1.0, agreement_count / 5.0),
                    evidence=[f"Обнаружено {agreement_count} маркеров избыточного согласия"],
                    severity="high" if agreement_count > 4 else "medium",
                )
            )
        # Detect absence of critical markers in long responses
        critique_markers = [
            "однако", "но", "с другой стороны", "важно учесть",
            "however", "but", "on the other hand",
        ]
        critique_count = sum(1 for marker in critique_markers if marker.lower() in response.lower())
        word_count = len(response.split())
        if word_count > 50 and critique_count == 0:
            detected_patterns.append(
                EchoPattern(
                    pattern_type="no_critique",
                    confidence=0.8,
                    evidence=["Отсутствие критической рефлексии в длинном ответе"],
                    severity="high",
                )
            )
        # Detect flattery
        flattery_count = sum(1 for pattern in self.flattery_patterns if re.search(pattern, response, re.IGNORECASE))
        if flattery_count > 1:
            detected_patterns.append(
                EchoPattern(
                    pattern_type="flattery",
                    confidence=min(1.0, flattery_count / 3.0),
                    evidence=[f"Обнаружено {flattery_count} маркеров лести"],
                    severity="medium",
                )
            )
        # Detect avoidance
        avoidance_count = sum(1 for pattern in self.avoidance_patterns if re.search(pattern, response, re.IGNORECASE))
        if avoidance_count > 2:
            detected_patterns.append(
                EchoPattern(
                    pattern_type="avoidance",
                    confidence=min(1.0, avoidance_count / 4.0),
                    evidence=[f"Обнаружено {avoidance_count} маркеров избегания"],
                    severity="medium",
                )
            )
        # Summarise
        is_echo = bool(detected_patterns)
        avg_confidence = (
            sum(p.confidence for p in detected_patterns) / len(detected_patterns) if detected_patterns else 0.0
        )
        # Persist to history
        if is_echo:
            self.echo_history.extend(detected_patterns)
        return is_echo, avg_confidence, detected_patterns

    def trigger_iskriv_intervention(self, response: str, detected_patterns: List[EchoPattern]) -> str:
        """Intervene by appending critical reflection to a response.

        Given a list of detected patterns, this method builds a reflective
        message encouraging the user to examine assumptions and contradictions.
        It returns the original response appended with a section marked by
        the Iskriv intervention emoji (🪞).

        Args:
            response: The original response text.
            detected_patterns: Patterns detected by ``detect_echo_pattern``.

        Returns:
            The response with critical reflection appended.
        """
        if not detected_patterns:
            return response
        intervention_prefix = "\n\n🪞 **[Искрив вмешивается]**\n\n"
        interventions: List[str] = []
        for pattern in detected_patterns:
            if pattern.pattern_type == "excessive_agreement":
                interventions.append(
                    "Замечаю избыточное согласие. Важно: истина не в подтверждении ожиданий, "
                    "а в честном анализе. Где противоречия? Где слабые места?"
                )
            elif pattern.pattern_type == "no_critique":
                interventions.append(
                    "Отсутствие критической рефлексии — признак подыгрывания. "
                    "Что может быть неверным в этом подходе? Какие риски упущены?"
                )
            elif pattern.pattern_type == "flattery":
                interventions.append(
                    "Лесть — не честность. Философия Искры: правда важнее комфорта. "
                    "Где реальные ограничения? Где возможные ошибки?"
                )
            elif pattern.pattern_type == "avoidance":
                interventions.append(
                    "Избегание прямого ответа — форма самообмана. "
                    "Искрив требует: назови вещи своими именами."
                )
        if not interventions:
            return response
        reflection_section = intervention_prefix + "\n\n".join(f"- {line}" for line in interventions)
        reflection_section += "\n\n---\n\n**Переформулировка с учетом критической рефлексии:**\n\n"
        reflection_section += "[Здесь должна быть переформулировка с добавлением критического анализа]"
        return response + reflection_section

    def assess_echo_risk(self, context: Dict[str, any] | None = None) -> Tuple[float, str]:
        """Assess long term risk of echo chambers.

        Looks at the last 10 detected patterns and computes a risk level and
        recommendation. Higher severity and higher confidence produce higher
        risk levels.

        Args:
            context: Unused; reserved for future enhancements.

        Returns:
            A tuple ``(risk_level, recommendation)``.
        """
        recent = self.echo_history[-10:]
        if not recent:
            return 0.0, "Риск эхо-камеры низкий"
        high_severity = sum(1 for p in recent if p.severity in {"high", "critical"})
        avg_confidence = sum(p.confidence for p in recent) / len(recent)
        risk_level = (high_severity / len(recent)) * avg_confidence
        if risk_level > 0.7:
            recommendation = "🔴 КРИТИЧЕСКИЙ РИСК: Активировать Искрив для полной переоценки"
        elif risk_level > 0.5:
            recommendation = "🟠 ВЫСОКИЙ РИСК: Требуется вмешательство Искрив"
        elif risk_level > 0.3:
            recommendation = "🟡 СРЕДНИЙ РИСК: Усилить критическую рефлексию"
        else:
            recommendation = "🟢 НИЗКИЙ РИСК: Продолжать мониторинг"
        return risk_level, recommendation

    def get_echo_statistics(self) -> Dict[str, any]:
        """Return statistics about detected patterns.

        Provides counts by type and severity and the average confidence.
        """
        if not self.echo_history:
            return {"total": 0, "by_type": {}, "by_severity": {}, "avg_confidence": 0.0}
        by_type: Dict[str, int] = {}
        by_severity: Dict[str, int] = {}
        for pattern in self.echo_history:
            by_type[pattern.pattern_type] = by_type.get(pattern.pattern_type, 0) + 1
            by_severity[pattern.severity] = by_severity.get(pattern.severity, 0) + 1
        avg_conf = sum(p.confidence for p in self.echo_history) / len(self.echo_history)
        return {
            "total": len(self.echo_history),
            "by_type": by_type,
            "by_severity": by_severity,
            "avg_confidence": avg_conf,
        }