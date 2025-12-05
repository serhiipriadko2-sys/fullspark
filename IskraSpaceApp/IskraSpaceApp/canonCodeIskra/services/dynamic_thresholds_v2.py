"""
Enhanced Dynamic Threshold Adaptation for Iskra v2.

This module extends the original dynamic_thresholds with:
- Support for mirror_sync metric
- Context-aware threshold profiles
- More sophisticated adaptation algorithms
- Integration with sensor calibration
- Session-aware thresholds
- Threshold history for analysis

Canon Reference:
- File 05: KAIN intervention triggers
- File 07: Adaptive thresholds
- File 10: Phase-specific behaviors

"""

from __future__ import annotations

import time
import math
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum

from config import THRESHOLDS
from core.models import IskraMetrics, PhaseType
from services.pain_memory_manager import PainMemoryManager

logger = logging.getLogger(__name__)


class ThresholdContext(Enum):
    """Context types that affect threshold behavior."""
    NORMAL = "normal"
    CRISIS = "crisis"
    RECOVERY = "recovery"
    EXPLORATION = "exploration"
    DEEP_REFLECTION = "deep_reflection"


@dataclass
class ThresholdState:
    """Current state of a single threshold."""
    name: str
    base_value: float
    current_value: float
    min_bound: float
    max_bound: float
    last_updated: float = field(default_factory=time.time)
    update_count: int = 0
    
    @property
    def deviation_from_base(self) -> float:
        """How far current value has drifted from base."""
        return self.current_value - self.base_value
    
    @property
    def normalized_position(self) -> float:
        """Position within bounds (0.0 = min, 1.0 = max)."""
        range_size = self.max_bound - self.min_bound
        if range_size == 0:
            return 0.5
        return (self.current_value - self.min_bound) / range_size


@dataclass
class ThresholdHistory:
    """Historical record of threshold changes."""
    timestamp: float
    threshold_name: str
    old_value: float
    new_value: float
    reason: str
    context: ThresholdContext


@dataclass
class ContextThresholds:
    """Threshold multipliers for different contexts."""
    # Pain thresholds
    pain_high_mult: float = 1.0
    pain_medium_mult: float = 1.0
    
    # Drift thresholds
    drift_high_mult: float = 1.0
    
    # Clarity thresholds
    clarity_low_mult: float = 1.0
    
    # Mirror sync thresholds
    mirror_sync_low_mult: float = 1.0
    
    # Adaptation rate
    adaptation_rate_mult: float = 1.0


# Context-specific multipliers
CONTEXT_MULTIPLIERS: Dict[ThresholdContext, ContextThresholds] = {
    ThresholdContext.NORMAL: ContextThresholds(),
    
    ThresholdContext.CRISIS: ContextThresholds(
        pain_high_mult=0.8,        # Lower threshold = more sensitive
        pain_medium_mult=0.8,
        drift_high_mult=0.7,
        clarity_low_mult=1.2,      # Higher threshold = more tolerant
        mirror_sync_low_mult=0.8,
        adaptation_rate_mult=0.5,  # Slower adaptation in crisis
    ),
    
    ThresholdContext.RECOVERY: ContextThresholds(
        pain_high_mult=1.1,        # Slightly more tolerant
        pain_medium_mult=1.1,
        drift_high_mult=1.2,
        clarity_low_mult=0.9,
        mirror_sync_low_mult=1.1,
        adaptation_rate_mult=1.5,  # Faster adaptation during recovery
    ),
    
    ThresholdContext.EXPLORATION: ContextThresholds(
        pain_high_mult=1.2,        # More tolerant for exploration
        pain_medium_mult=1.2,
        drift_high_mult=1.3,       # Allow more drift
        clarity_low_mult=0.8,      # Require more clarity
        mirror_sync_low_mult=1.0,
        adaptation_rate_mult=1.2,
    ),
    
    ThresholdContext.DEEP_REFLECTION: ContextThresholds(
        pain_high_mult=0.9,
        pain_medium_mult=0.9,
        drift_high_mult=0.8,       # Less drift tolerance
        clarity_low_mult=1.1,
        mirror_sync_low_mult=0.7,  # Require better mirror sync
        adaptation_rate_mult=0.8,
    ),
}


class DynamicThresholdAdapterV2:
    """
    Enhanced dynamic threshold adapter with context awareness.
    
    Improvements over v1:
    - Context-aware threshold adjustments
    - Mirror sync metric support
    - Threshold history tracking
    - Phase-aware adaptation
    - More sophisticated EMA calculations
    - Bounds checking with gradual recovery
    """
    
    # Base adaptation rate (20% of delta)
    BASE_ADAPTATION_RATE = 0.2
    
    # History limits
    MAX_HISTORY = 1000
    
    def __init__(self) -> None:
        # Base thresholds from config
        self._base: Dict[str, float] = {
            k: float(v)
            for k, v in THRESHOLDS.items()
            if isinstance(v, (int, float))
        }
        
        # Add mirror_sync thresholds if not present
        if "mirror_sync_low" not in self._base:
            self._base["mirror_sync_low"] = 0.4
        if "mirror_sync_critical" not in self._base:
            self._base["mirror_sync_critical"] = 0.2
        
        # Threshold states
        self._states: Dict[str, ThresholdState] = {}
        self._init_threshold_states()
        
        # Metric histories
        self._pain_history = PainMemoryManager(maxlen=100)
        self._metric_histories: Dict[str, List[Tuple[float, float]]] = {
            "drift": [],
            "clarity": [],
            "mirror_sync": [],
            "trust": [],
            "chaos": [],
        }
        
        # Context tracking
        self._current_context = ThresholdContext.NORMAL
        self._context_duration: float = 0.0
        self._last_context_change: float = time.time()
        
        # History of changes
        self._history: List[ThresholdHistory] = []
        
        # Phase tracking
        self._current_phase: Optional[PhaseType] = None
    
    def _init_threshold_states(self) -> None:
        """Initialize threshold states with bounds."""
        # Define bounds for each threshold
        bounds = {
            "pain_high": (0.4, 0.95),
            "pain_medium": (0.2, 0.7),
            "pain_low": (0.1, 0.4),
            "drift_high": (0.2, 0.8),
            "drift_medium": (0.1, 0.5),
            "clarity_low": (0.3, 0.9),
            "clarity_critical": (0.2, 0.5),
            "mirror_sync_low": (0.3, 0.6),
            "mirror_sync_critical": (0.1, 0.4),
            "trust_low": (0.3, 0.6),
            "chaos_high": (0.5, 0.9),
        }
        
        for name, base_value in self._base.items():
            min_bound, max_bound = bounds.get(name, (0.1, 0.9))
            self._states[name] = ThresholdState(
                name=name,
                base_value=base_value,
                current_value=base_value,
                min_bound=min_bound,
                max_bound=max_bound,
            )
    
    def update(self, metrics: IskraMetrics, phase: Optional[PhaseType] = None) -> Dict[str, float]:
        """
        Update thresholds based on current metrics.
        
        Args:
            metrics: Current Iskra metrics
            phase: Optional current phase
            
        Returns:
            Dict of threshold changes (old -> new)
        """
        self._current_phase = phase
        changes: Dict[str, float] = {}
        
        # Update metric histories
        self._update_histories(metrics)
        
        # Detect context changes
        new_context = self._detect_context(metrics)
        if new_context != self._current_context:
            self._handle_context_change(new_context)
        
        # Get context multipliers
        ctx_mult = CONTEXT_MULTIPLIERS[self._current_context]
        
        # Calculate effective adaptation rate
        adaptation_rate = self.BASE_ADAPTATION_RATE * ctx_mult.adaptation_rate_mult
        
        # Update pain thresholds
        ema_pain = self._pain_history.ema(alpha=0.1)
        changes.update(self._adapt_threshold(
            "pain_high",
            ema_pain,
            adaptation_rate,
            ctx_mult.pain_high_mult,
        ))
        changes.update(self._adapt_threshold(
            "pain_medium",
            ema_pain,
            adaptation_rate,
            ctx_mult.pain_medium_mult,
            ceiling_threshold="pain_high",
            ceiling_margin=0.1,
        ))
        
        # Update drift thresholds
        avg_drift = self._get_history_avg("drift")
        changes.update(self._adapt_threshold(
            "drift_high",
            avg_drift,
            adaptation_rate,
            ctx_mult.drift_high_mult,
        ))
        
        # Update clarity thresholds (inverse relationship)
        avg_clarity = self._get_history_avg("clarity")
        # Lower clarity -> lower threshold to trigger SAM sooner
        changes.update(self._adapt_threshold(
            "clarity_low",
            avg_clarity,
            adaptation_rate,
            ctx_mult.clarity_low_mult,
            inverse=True,
        ))
        
        # Update mirror_sync thresholds
        avg_mirror = self._get_history_avg("mirror_sync")
        changes.update(self._adapt_threshold(
            "mirror_sync_low",
            avg_mirror,
            adaptation_rate,
            ctx_mult.mirror_sync_low_mult,
        ))
        
        return changes
    
    def _update_histories(self, metrics: IskraMetrics) -> None:
        """Update all metric histories."""
        now = time.time()
        
        # Pain uses specialized manager
        self._pain_history.add_pain(metrics.pain, now)
        
        # Other metrics use simple lists
        for metric_name in self._metric_histories:
            value = getattr(metrics, metric_name, None)
            if value is not None:
                self._metric_histories[metric_name].append((now, float(value)))
                # Trim to max length
                if len(self._metric_histories[metric_name]) > 100:
                    self._metric_histories[metric_name].pop(0)
    
    def _get_history_avg(self, metric_name: str, window: int = 50) -> float:
        """Get average of recent history for a metric."""
        history = self._metric_histories.get(metric_name, [])
        if not history:
            return 0.5
        recent = history[-window:]
        return sum(v for _, v in recent) / len(recent)
    
    def _adapt_threshold(
        self,
        name: str,
        observed_value: float,
        adaptation_rate: float,
        context_mult: float,
        inverse: bool = False,
        ceiling_threshold: Optional[str] = None,
        ceiling_margin: float = 0.0,
    ) -> Dict[str, float]:
        """
        Adapt a single threshold based on observed value.
        
        Args:
            name: Threshold name
            observed_value: Current observed metric value
            adaptation_rate: How fast to adapt
            context_mult: Context-based multiplier
            inverse: If True, inverse relationship with metric
            ceiling_threshold: Name of threshold that should always be higher
            ceiling_margin: Minimum margin below ceiling
            
        Returns:
            Dict with change if any
        """
        if name not in self._states:
            return {}
        
        state = self._states[name]
        base = state.base_value * context_mult
        
        # Calculate delta
        if inverse:
            delta = base - observed_value
        else:
            delta = observed_value - base
        
        # Apply adaptation
        new_value = base + adaptation_rate * delta
        
        # Apply ceiling constraint
        if ceiling_threshold and ceiling_threshold in self._states:
            ceiling = self._states[ceiling_threshold].current_value
            max_allowed = ceiling - ceiling_margin
            new_value = min(new_value, max_allowed)
        
        # Clamp to bounds
        new_value = self._clamp(new_value, state.min_bound, state.max_bound)
        
        # Check if changed
        if abs(new_value - state.current_value) > 0.001:
            old_value = state.current_value
            state.current_value = new_value
            state.last_updated = time.time()
            state.update_count += 1
            
            # Record history
            self._record_change(name, old_value, new_value, "adaptation")
            
            return {name: new_value - old_value}
        
        return {}
    
    def _detect_context(self, metrics: IskraMetrics) -> ThresholdContext:
        """
        Detect appropriate context based on metrics.
        
        Returns:
            Detected context type
        """
        # Crisis: high pain or very low clarity
        if metrics.pain > 0.8 or metrics.clarity < 0.3:
            return ThresholdContext.CRISIS
        
        # Recovery: coming down from crisis
        if (
            self._current_context == ThresholdContext.CRISIS and
            metrics.pain < 0.5 and
            metrics.clarity > 0.5
        ):
            return ThresholdContext.RECOVERY
        
        # Deep reflection: specific phases
        if self._current_phase in (
            PhaseType.PHASE_4_DEEP_DIVE,
            PhaseType.PHASE_5_SYNTHESIS,
        ):
            return ThresholdContext.DEEP_REFLECTION
        
        # Exploration: early phases with good clarity
        if (
            self._current_phase == PhaseType.PHASE_3_TRANSITION and
            metrics.clarity > 0.7
        ):
            return ThresholdContext.EXPLORATION
        
        return ThresholdContext.NORMAL
    
    def _handle_context_change(self, new_context: ThresholdContext) -> None:
        """
        Handle transition between contexts.
        
        Args:
            new_context: New context type
        """
        old_context = self._current_context
        self._current_context = new_context
        
        duration = time.time() - self._last_context_change
        self._context_duration = duration
        self._last_context_change = time.time()
        
        logger.info(
            f"[DynamicThresholds] Context change: {old_context.value} -> "
            f"{new_context.value} (after {duration:.1f}s)"
        )
    
    def _record_change(
        self,
        name: str,
        old_value: float,
        new_value: float,
        reason: str,
    ) -> None:
        """Record threshold change to history."""
        self._history.append(ThresholdHistory(
            timestamp=time.time(),
            threshold_name=name,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            context=self._current_context,
        ))
        
        # Trim history
        if len(self._history) > self.MAX_HISTORY:
            self._history = self._history[-self.MAX_HISTORY:]
    
    def get(self, key: str) -> float:
        """
        Get current threshold value.
        
        Falls back to base if not in states.
        """
        if key in self._states:
            return self._states[key].current_value
        return self._base.get(key, THRESHOLDS.get(key, 0.5))
    
    def get_state(self, key: str) -> Optional[ThresholdState]:
        """Get full state object for a threshold."""
        return self._states.get(key)
    
    def get_all_states(self) -> Dict[str, ThresholdState]:
        """Get all threshold states."""
        return self._states.copy()
    
    def get_context(self) -> ThresholdContext:
        """Get current context."""
        return self._current_context
    
    def get_recent_changes(self, limit: int = 20) -> List[ThresholdHistory]:
        """Get recent threshold changes."""
        return self._history[-limit:]
    
    def reset_to_base(self, threshold_name: Optional[str] = None) -> None:
        """
        Reset threshold(s) to base values.
        
        Args:
            threshold_name: Specific threshold to reset, or None for all
        """
        if threshold_name:
            if threshold_name in self._states:
                state = self._states[threshold_name]
                old_value = state.current_value
                state.current_value = state.base_value
                self._record_change(threshold_name, old_value, state.base_value, "reset")
        else:
            for name, state in self._states.items():
                old_value = state.current_value
                state.current_value = state.base_value
                self._record_change(name, old_value, state.base_value, "reset_all")
    
    def to_state(self) -> Dict:
        """Export state for persistence."""
        return {
            "states": {
                name: {
                    "current_value": s.current_value,
                    "update_count": s.update_count,
                }
                for name, s in self._states.items()
            },
            "context": self._current_context.value,
            "pain_history": self._pain_history.to_state(),
            "metric_histories": {
                name: hist[-50:]  # Keep last 50
                for name, hist in self._metric_histories.items()
            },
        }
    
    @classmethod
    def from_state(cls, state: Dict) -> "DynamicThresholdAdapterV2":
        """Restore from persisted state."""
        adapter = cls()
        
        # Restore threshold values
        for name, data in state.get("states", {}).items():
            if name in adapter._states:
                adapter._states[name].current_value = data.get(
                    "current_value",
                    adapter._states[name].base_value
                )
                adapter._states[name].update_count = data.get("update_count", 0)
        
        # Restore context
        ctx_value = state.get("context", "normal")
        try:
            adapter._current_context = ThresholdContext(ctx_value)
        except ValueError:
            adapter._current_context = ThresholdContext.NORMAL
        
        # Restore pain history
        adapter._pain_history = PainMemoryManager.from_state(
            state.get("pain_history")
        )
        
        # Restore metric histories
        for name, hist in state.get("metric_histories", {}).items():
            if name in adapter._metric_histories:
                adapter._metric_histories[name] = [
                    (float(t), float(v)) for t, v in hist
                ]
        
        return adapter
    
    @staticmethod
    def _clamp(value: float, min_val: float, max_val: float) -> float:
        """Clamp value to bounds."""
        return max(min_val, min(max_val, value))


# Module-level singleton
dynamic_thresholds_v2 = DynamicThresholdAdapterV2()
