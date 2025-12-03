"""
The ``services.fractal`` module houses the algorithms used to
calculate the A‑Index and interpret micro‑level signals. These
functions operate at two scales:

* **Micro level** – analysing typing pauses and lexical variability to
  infer cognitive load or hesitation. The results feed into the
  metric engine.
* **Macro level** – computing the A‑Index, a single scalar that
  summarizes the integrative health of the system. This index
  influences phase transitions and rituals.

While simple heuristics are used here (e.g., log‑scaled word counts
for Hurst exponent), the architecture is designed to support more
sophisticated analytics should you wish to plug in real signal
processing libraries in future.
"""
from __future__ import annotations

import math
from typing import Optional, Tuple

from config import THRESHOLDS
from core.models import PauseType, IskraMetrics


class FractalService:
    """Provides micro‑ and macro‑level analytics for Iskra.

    The algorithms here are heuristics. They make the system
    responsive without introducing heavy dependencies. For a production
    environment you could replace the LZ‑complexity and Hurst exponent
    calculations with proper natural language complexity or EEG
    analysis.
    """

    @staticmethod
    def calculate_a_index(metrics: IskraMetrics) -> float:
        """Compute the A‑Index (Alive index).

        The A‑Index is a weighted sum of positive factors (clarity,
        trust) and negative factors (drift, chaos) modulated by a pain
        coefficient. The pain factor is high when pain sits in a
        productive range and low when pain is either absent or
        overwhelming. The constants are derived from the Canon.

        Args:
            metrics: Current vitals.

        Returns:
            A float between 0.0 and 1.0.
        """
        pain = metrics.pain
        # Determine pain coefficient g(pain)
        if THRESHOLDS["pain_medium"] <= pain <= THRESHOLDS["pain_high"]:
            g_pain = 1.0
        elif pain < 0.2:
            g_pain = pain / 0.2
        elif pain < THRESHOLDS["pain_medium"]:
            g_pain = 1.0
        else:
            g_pain = 1.0 - ((pain - THRESHOLDS["pain_high"]) / (1.0 - THRESHOLDS["pain_high"]))
        g_pain = max(0.0, min(1.0, g_pain))

        # Weighted combination of metrics
        a_index = (
            0.4 * metrics.clarity
            + 0.3 * metrics.trust
            + 0.2 * (1 - metrics.drift)
            + 0.1 * (1 - metrics.chaos)
        ) * g_pain
        return max(0.0, min(1.0, a_index))

    @staticmethod
    def classify_pause(duration_ms: Optional[int], text_length: int) -> Optional[PauseType]:
        """Classify a pause type based on the typing duration.

        Args:
            duration_ms: How long the user took to type (milliseconds).
            text_length: Number of characters typed.

        Returns:
            A PauseType or None if no significant pause was detected.
        """
        if duration_ms is None or text_length == 0 or duration_ms < 500:
            return None
        ms_per_char = duration_ms / text_length
        if ms_per_char > 1000:
            return PauseType.COGNITIVE
        if ms_per_char > 200:
            return PauseType.ARTICULATION
        return None

    @staticmethod
    def calculate_micro_metrics(text: str, duration_ms: Optional[int]) -> Tuple[float, float, Optional[PauseType]]:
        """Compute micro‑level complexity and Hurst metrics.

        - LZ complexity is approximated as the ratio of unique words to total words plus a small constant.
        - Hurst exponent is approximated using the length of the text.
        - Pause type classification uses the typing duration.

        Args:
            text: The user input text.
            duration_ms: The time taken by the user to type the text.

        Returns:
            A tuple of (lz_complexity, hurst_exponent, pause_type).
        """
        text_length = len(text)
        words = text.split()
        if not words:
            lz_complexity = 0.0
        else:
            unique_words = set(words)
            lz_complexity = min(1.0, len(unique_words) / len(words) + 0.1)
        hurst_exponent = min(1.0, 0.4 + math.log10(max(1, text_length)) * 0.2)
        pause_type = FractalService.classify_pause(duration_ms, text_length)
        return lz_complexity, hurst_exponent, pause_type