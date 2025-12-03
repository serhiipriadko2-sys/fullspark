"""
Dynamic threshold adaptation for Iskra.

This module implements a simple adaptive mechanism for the system
thresholds described in the Canon (Files 05 and 07). The static
constants defined in ``config.THRESHOLDS`` provide default trigger
values for pain, drift, clarity and other metrics. However, the
canon encourages agents to adjust these thresholds over time based on
recent context so that the agent remains sensitive to trends without
becoming stuck in rigid patterns. For example, if the conversation
has exhibited sustained high pain for multiple turns, the ``pain_high``
threshold should creep upward to avoid triggering KAIN on every
message. Likewise, if drift remains elevated, the ``drift_high``
threshold should relax slightly to allow room for self‑correction.

The ``DynamicThresholdAdapter`` encapsulates this behaviour. It
maintains short histories of key metrics and computes simple moving
averages and exponential moving averages (EMA) to adjust the trigger
points. The adaptation rate is intentionally slow (20 % of the
observed delta) to avoid erratic oscillations. Only thresholds
defined in ``config.THRESHOLDS`` are ever modified; unknown keys
fallback to the static values.

Usage:

    from services.dynamic_thresholds import dynamic_thresholds
    # Update the dynamic thresholds with the latest vitals
    dynamic_thresholds.update(current_metrics)
    # Retrieve a threshold (falls back to static if not adapted)
    pain_high = dynamic_thresholds.get("pain_high")

Note: Dynamic thresholds are best effort and do not persist across
sessions. They live within the Python process and are reset when the
application restarts. Persisting them in the archive would require
additional work.
"""

from __future__ import annotations

from typing import Dict, List

from config import THRESHOLDS
from core.models import IskraMetrics
from services.pain_memory_manager import PainMemoryManager


class DynamicThresholdAdapter:
    """Adapt select thresholds based on recent metric trends."""

    def __init__(self) -> None:
        # Copy of the canonical baseline thresholds for reference
        self._base: Dict[str, float] = {k: float(v) for k, v in THRESHOLDS.items() if isinstance(v, (int, float))}
        # Working copy that can drift over time
        self._dynamic: Dict[str, float] = self._base.copy()
        # Histories for metrics; keep limited window to bound memory
        self._pain_history: PainMemoryManager = PainMemoryManager(maxlen=50)
        self._drift_history: List[float] = []
        self._clarity_history: List[float] = []

    def update(self, metrics: IskraMetrics) -> None:
        """Incorporate the latest vitals and recompute dynamic thresholds.

        Args:
            metrics: The current vitals for the session.
        """
        # Record pain and compute EMA
        self._pain_history.add_pain(metrics.pain)
        ema_pain = self._pain_history.ema(alpha=0.1)

        # Record drift and clarity; truncate history
        self._drift_history.append(metrics.drift)
        if len(self._drift_history) > 50:
            self._drift_history.pop(0)
        avg_drift = sum(self._drift_history) / len(self._drift_history)

        self._clarity_history.append(metrics.clarity)
        if len(self._clarity_history) > 50:
            self._clarity_history.pop(0)
        avg_clarity = sum(self._clarity_history) / len(self._clarity_history)

        # Adapt pain_high: push upward if pain is persistently high, downward if low
        base_ph = self._base.get("pain_high", 0.7)
        delta_ph = ema_pain - base_ph
        self._dynamic["pain_high"] = self._clamp(base_ph + 0.2 * delta_ph, 0.4, 0.95)

        # Adapt pain_medium relative to pain_high; maintain at least 0.1 margin
        base_pm = self._base.get("pain_medium", 0.5)
        delta_pm = ema_pain - base_pm
        proposed_pm = base_pm + 0.2 * delta_pm
        # Ensure pain_medium stays below pain_high by a margin
        max_pm = self._dynamic["pain_high"] - 0.1
        self._dynamic["pain_medium"] = self._clamp(proposed_pm, 0.1, max_pm)

        # Adapt drift_high: push upward if drift is persistently high
        base_dh = self._base.get("drift_high", 0.3)
        delta_dh = avg_drift - base_dh
        self._dynamic["drift_high"] = self._clamp(base_dh + 0.2 * delta_dh, 0.1, 0.9)

        # Adapt clarity_low: if clarity remains low on average, relax the threshold
        base_cl = self._base.get("clarity_low", 0.7)
        delta_cl = avg_clarity - base_cl
        # Negative delta → clarity lower than baseline → threshold decreases to trigger SAM sooner
        self._dynamic["clarity_low"] = self._clamp(base_cl + 0.2 * (-delta_cl), 0.3, 0.95)

        # Leave other thresholds unchanged for now (they may be adapted in future)

    def get(self, key: str) -> float:
        """Return the current value for a threshold.

        Falls back to the canonical baseline if no dynamic value exists.

        Args:
            key: The threshold name.
        Returns:
            A float representing the current threshold.
        """
        if key in self._dynamic:
            return self._dynamic[key]
        # unknown or non-numeric thresholds return base (unchanged)
        return self._base.get(key, THRESHOLDS.get(key))

    @staticmethod
    def _clamp(value: float, min_value: float, max_value: float) -> float:
        """Clamp a numeric value to the given bounds."""
        return max(min_value, min(max_value, value))


# Create a module-level singleton so that all imports share the same adapter
dynamic_thresholds = DynamicThresholdAdapter()