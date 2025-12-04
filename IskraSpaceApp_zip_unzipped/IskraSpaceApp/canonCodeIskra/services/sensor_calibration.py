"""
Advanced Sensor Calibration for Iskra Pain/Echo Detection.

This module provides sophisticated calibration mechanisms for the pain
and echo sensors, implementing the Canon's guidance on adaptive sensitivity.

Key features:
- Multi-window analysis (short/medium/long term)
- Spike detection with severity classification
- Trend analysis with direction and momentum
- Automatic baseline recalibration
- Cross-sensor correlation detection
- Calibration profiles for different contexts

Canon Reference:
- File 05: Pain as signal, not punishment
- File 07: Dynamic threshold adaptation
- File 08: Echo detection and Iskrуv intervention
"""

from __future__ import annotations

import math
import time
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Deque
from enum import Enum
from collections import deque

logger = logging.getLogger(__name__)


class TrendDirection(Enum):
    """Direction of metric trend."""
    RISING = "rising"
    FALLING = "falling"
    STABLE = "stable"
    VOLATILE = "volatile"


class SpikeSeverity(Enum):
    """Severity classification for detected spikes."""
    MINOR = "minor"        # Small deviation, informational
    MODERATE = "moderate"  # Notable spike, requires attention
    SEVERE = "severe"      # Significant spike, intervention recommended
    CRITICAL = "critical"  # Extreme spike, immediate action required


@dataclass
class SensorReading:
    """Individual sensor reading with metadata."""
    value: float
    timestamp: float
    source: str = "unknown"
    context: Optional[Dict] = None
    
    def age(self) -> float:
        """Return age of reading in seconds."""
        return time.time() - self.timestamp


@dataclass
class TrendAnalysis:
    """Result of trend analysis."""
    direction: TrendDirection
    slope: float
    momentum: float  # Rate of change of slope
    r_squared: float  # Fit quality
    confidence: float
    window_size: int


@dataclass
class SpikeEvent:
    """Detected spike event."""
    timestamp: float
    value: float
    baseline: float
    deviation: float
    severity: SpikeSeverity
    sensor: str
    
    @property
    def magnitude(self) -> float:
        """Absolute magnitude of spike."""
        return abs(self.value - self.baseline)


@dataclass
class CalibrationProfile:
    """Calibration settings for a specific context."""
    name: str
    
    # Spike detection thresholds
    spike_minor_threshold: float = 0.15
    spike_moderate_threshold: float = 0.25
    spike_severe_threshold: float = 0.40
    spike_critical_threshold: float = 0.60
    
    # EMA parameters
    ema_fast_alpha: float = 0.3
    ema_slow_alpha: float = 0.05
    
    # Baseline adaptation
    baseline_adaptation_rate: float = 0.02
    baseline_min_samples: int = 10
    
    # Decay settings
    value_half_life_seconds: float = 3600.0  # 1 hour
    
    # Sensitivity multipliers
    pain_sensitivity: float = 1.0
    echo_sensitivity: float = 1.0


# Predefined calibration profiles
CALIBRATION_PROFILES = {
    "default": CalibrationProfile(name="default"),
    "sensitive": CalibrationProfile(
        name="sensitive",
        spike_minor_threshold=0.10,
        spike_moderate_threshold=0.20,
        spike_severe_threshold=0.35,
        spike_critical_threshold=0.50,
        pain_sensitivity=1.2,
        echo_sensitivity=1.2,
    ),
    "relaxed": CalibrationProfile(
        name="relaxed",
        spike_minor_threshold=0.20,
        spike_moderate_threshold=0.35,
        spike_severe_threshold=0.50,
        spike_critical_threshold=0.70,
        pain_sensitivity=0.8,
        echo_sensitivity=0.8,
    ),
    "crisis": CalibrationProfile(
        name="crisis",
        spike_minor_threshold=0.05,
        spike_moderate_threshold=0.10,
        spike_severe_threshold=0.20,
        spike_critical_threshold=0.35,
        ema_fast_alpha=0.5,
        baseline_adaptation_rate=0.01,
        pain_sensitivity=1.5,
        echo_sensitivity=1.3,
    ),
}


class CalibratedSensor:
    """
    Advanced calibrated sensor with multi-window analysis.
    
    Implements sophisticated signal processing for pain/echo metrics:
    - Multi-timescale EMA tracking
    - Adaptive baseline with drift compensation
    - Spike detection with severity classification
    - Trend analysis with direction and momentum
    """
    
    def __init__(
        self,
        name: str,
        profile: Optional[CalibrationProfile] = None,
        maxlen: int = 500,
    ) -> None:
        """
        Initialize calibrated sensor.
        
        Args:
            name: Sensor identifier (e.g., "pain", "echo")
            profile: Calibration profile to use
            maxlen: Maximum history length
        """
        self.name = name
        self.profile = profile or CALIBRATION_PROFILES["default"]
        
        # History storage
        self.history: Deque[SensorReading] = deque(maxlen=maxlen)
        self.spike_history: Deque[SpikeEvent] = deque(maxlen=100)
        
        # Multi-window EMAs
        self._ema_fast: float = 0.5
        self._ema_slow: float = 0.5
        self._ema_baseline: float = 0.5
        
        # Baseline tracking
        self._baseline: float = 0.5
        self._baseline_samples: int = 0
        
        # Trend tracking
        self._last_slope: float = 0.0
        
        # Statistics
        self._total_readings: int = 0
        self._total_spikes: int = 0
    
    def add_reading(
        self,
        value: float,
        timestamp: Optional[float] = None,
        source: str = "unknown",
        context: Optional[Dict] = None,
    ) -> Optional[SpikeEvent]:
        """
        Add a new sensor reading and detect any spikes.
        
        Args:
            value: Sensor value (0.0-1.0)
            timestamp: Reading timestamp (defaults to now)
            source: Source identifier
            context: Optional context data
            
        Returns:
            SpikeEvent if a spike was detected, None otherwise
        """
        ts = timestamp if timestamp is not None else time.time()
        value = max(0.0, min(1.0, float(value)))
        
        reading = SensorReading(
            value=value,
            timestamp=ts,
            source=source,
            context=context,
        )
        self.history.append(reading)
        self._total_readings += 1
        
        # Update EMAs
        self._ema_fast = (
            self.profile.ema_fast_alpha * value +
            (1 - self.profile.ema_fast_alpha) * self._ema_fast
        )
        self._ema_slow = (
            self.profile.ema_slow_alpha * value +
            (1 - self.profile.ema_slow_alpha) * self._ema_slow
        )
        
        # Update baseline (slowly)
        self._baseline_samples += 1
        if self._baseline_samples >= self.profile.baseline_min_samples:
            self._baseline = (
                self.profile.baseline_adaptation_rate * value +
                (1 - self.profile.baseline_adaptation_rate) * self._baseline
            )
        
        # Detect spike
        spike = self._detect_spike(value, ts)
        if spike:
            self.spike_history.append(spike)
            self._total_spikes += 1
            logger.info(
                f"[{self.name}] Spike detected: {spike.severity.value} "
                f"(value={value:.3f}, baseline={self._baseline:.3f})"
            )
        
        return spike
    
    def _detect_spike(self, value: float, timestamp: float) -> Optional[SpikeEvent]:
        """
        Detect if current value represents a spike.
        
        Uses deviation from baseline and calibrated thresholds.
        """
        deviation = value - self._baseline
        abs_deviation = abs(deviation)
        
        # Apply sensitivity multiplier
        if self.name == "pain":
            abs_deviation *= self.profile.pain_sensitivity
        elif self.name == "echo":
            abs_deviation *= self.profile.echo_sensitivity
        
        # Classify severity
        if abs_deviation >= self.profile.spike_critical_threshold:
            severity = SpikeSeverity.CRITICAL
        elif abs_deviation >= self.profile.spike_severe_threshold:
            severity = SpikeSeverity.SEVERE
        elif abs_deviation >= self.profile.spike_moderate_threshold:
            severity = SpikeSeverity.MODERATE
        elif abs_deviation >= self.profile.spike_minor_threshold:
            severity = SpikeSeverity.MINOR
        else:
            return None
        
        return SpikeEvent(
            timestamp=timestamp,
            value=value,
            baseline=self._baseline,
            deviation=deviation,
            severity=severity,
            sensor=self.name,
        )
    
    def analyze_trend(self, window_size: int = 20) -> TrendAnalysis:
        """
        Analyze recent trend using linear regression.
        
        Args:
            window_size: Number of recent readings to analyze
            
        Returns:
            TrendAnalysis with direction, slope, and confidence
        """
        recent = list(self.history)[-window_size:]
        if len(recent) < 3:
            return TrendAnalysis(
                direction=TrendDirection.STABLE,
                slope=0.0,
                momentum=0.0,
                r_squared=0.0,
                confidence=0.0,
                window_size=len(recent),
            )
        
        # Linear regression
        n = len(recent)
        x_vals = list(range(n))
        y_vals = [r.value for r in recent]
        
        x_mean = sum(x_vals) / n
        y_mean = sum(y_vals) / n
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals))
        denominator = sum((x - x_mean) ** 2 for x in x_vals)
        
        if denominator == 0:
            slope = 0.0
        else:
            slope = numerator / denominator
        
        # Calculate R-squared
        y_pred = [y_mean + slope * (x - x_mean) for x in x_vals]
        ss_res = sum((y - yp) ** 2 for y, yp in zip(y_vals, y_pred))
        ss_tot = sum((y - y_mean) ** 2 for y in y_vals)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        
        # Calculate momentum (change in slope)
        momentum = slope - self._last_slope
        self._last_slope = slope
        
        # Determine direction
        if abs(slope) < 0.001:
            direction = TrendDirection.STABLE
        elif r_squared < 0.3:
            direction = TrendDirection.VOLATILE
        elif slope > 0:
            direction = TrendDirection.RISING
        else:
            direction = TrendDirection.FALLING
        
        confidence = min(1.0, r_squared * (n / window_size))
        
        return TrendAnalysis(
            direction=direction,
            slope=slope,
            momentum=momentum,
            r_squared=r_squared,
            confidence=confidence,
            window_size=n,
        )
    
    def get_current_state(self) -> Dict:
        """
        Get comprehensive current state of the sensor.
        
        Returns:
            Dict with current values, EMAs, baseline, and trend
        """
        trend = self.analyze_trend()
        recent_spikes = [
            s for s in self.spike_history
            if time.time() - s.timestamp < 3600  # Last hour
        ]
        
        return {
            "sensor": self.name,
            "current_value": self.history[-1].value if self.history else 0.5,
            "ema_fast": self._ema_fast,
            "ema_slow": self._ema_slow,
            "baseline": self._baseline,
            "trend": {
                "direction": trend.direction.value,
                "slope": trend.slope,
                "momentum": trend.momentum,
                "confidence": trend.confidence,
            },
            "recent_spikes": len(recent_spikes),
            "spike_breakdown": {
                severity.value: sum(
                    1 for s in recent_spikes if s.severity == severity
                )
                for severity in SpikeSeverity
            },
            "total_readings": self._total_readings,
            "total_spikes": self._total_spikes,
        }
    
    def apply_decay(self) -> None:
        """
        Apply time-based decay to readings.
        
        Old readings are weighted less in EMA calculations.
        """
        if not self.history:
            return
        
        now = time.time()
        half_life = self.profile.value_half_life_seconds
        
        # Decay factor for oldest reading
        oldest_age = now - self.history[0].timestamp
        decay_factor = 0.5 ** (oldest_age / half_life)
        
        # Apply decay to baseline (move toward neutral)
        neutral = 0.5
        decay_rate = 1 - decay_factor
        self._baseline = self._baseline * (1 - decay_rate) + neutral * decay_rate
    
    def set_profile(self, profile_name: str) -> None:
        """
        Switch to a different calibration profile.
        
        Args:
            profile_name: Name of profile to use
        """
        if profile_name in CALIBRATION_PROFILES:
            self.profile = CALIBRATION_PROFILES[profile_name]
            logger.info(f"[{self.name}] Switched to profile: {profile_name}")
        else:
            logger.warning(f"Unknown profile: {profile_name}")
    
    def to_state(self) -> Dict:
        """Export state for persistence."""
        return {
            "name": self.name,
            "profile_name": self.profile.name,
            "history": [
                (r.timestamp, r.value, r.source)
                for r in list(self.history)[-100:]  # Keep last 100
            ],
            "ema_fast": self._ema_fast,
            "ema_slow": self._ema_slow,
            "baseline": self._baseline,
            "baseline_samples": self._baseline_samples,
            "total_readings": self._total_readings,
            "total_spikes": self._total_spikes,
        }
    
    @classmethod
    def from_state(cls, state: Dict) -> "CalibratedSensor":
        """Restore from persisted state."""
        profile_name = state.get("profile_name", "default")
        profile = CALIBRATION_PROFILES.get(profile_name, CALIBRATION_PROFILES["default"])
        
        sensor = cls(
            name=state.get("name", "unknown"),
            profile=profile,
        )
        
        # Restore history
        for item in state.get("history", []):
            if len(item) >= 2:
                ts, val = item[0], item[1]
                source = item[2] if len(item) > 2 else "restored"
                sensor.history.append(SensorReading(
                    value=float(val),
                    timestamp=float(ts),
                    source=source,
                ))
        
        # Restore state
        sensor._ema_fast = state.get("ema_fast", 0.5)
        sensor._ema_slow = state.get("ema_slow", 0.5)
        sensor._baseline = state.get("baseline", 0.5)
        sensor._baseline_samples = state.get("baseline_samples", 0)
        sensor._total_readings = state.get("total_readings", 0)
        sensor._total_spikes = state.get("total_spikes", 0)
        
        return sensor


class SensorCalibrationManager:
    """
    Central manager for all calibrated sensors.
    
    Provides:
    - Unified interface for multiple sensors
    - Cross-sensor correlation analysis
    - Automatic profile switching based on context
    - Aggregate statistics and alerts
    """
    
    def __init__(self) -> None:
        self.sensors: Dict[str, CalibratedSensor] = {
            "pain": CalibratedSensor("pain"),
            "echo": CalibratedSensor("echo"),
            "drift": CalibratedSensor("drift"),
            "clarity": CalibratedSensor("clarity"),
            "mirror_sync": CalibratedSensor("mirror_sync"),
        }
        self._current_profile = "default"
        self._crisis_mode = False
    
    def update_reading(
        self,
        sensor_name: str,
        value: float,
        **kwargs
    ) -> Optional[SpikeEvent]:
        """
        Update a single sensor reading.
        
        Args:
            sensor_name: Name of the sensor
            value: New reading value
            **kwargs: Additional args passed to add_reading
            
        Returns:
            SpikeEvent if detected
        """
        if sensor_name not in self.sensors:
            logger.warning(f"Unknown sensor: {sensor_name}")
            return None
        
        return self.sensors[sensor_name].add_reading(value, **kwargs)
    
    def update_from_metrics(self, metrics) -> List[SpikeEvent]:
        """
        Update all sensors from IskraMetrics.
        
        Args:
            metrics: IskraMetrics instance
            
        Returns:
            List of detected spikes
        """
        spikes = []
        
        sensor_values = {
            "pain": metrics.pain,
            "drift": metrics.drift,
            "clarity": metrics.clarity,
            "mirror_sync": getattr(metrics, 'mirror_sync', 0.5),
        }
        
        for name, value in sensor_values.items():
            spike = self.sensors[name].add_reading(value, source="metrics")
            if spike:
                spikes.append(spike)
        
        # Check for crisis conditions
        self._check_crisis_conditions(spikes)
        
        return spikes
    
    def _check_crisis_conditions(self, spikes: List[SpikeEvent]) -> None:
        """
        Check if crisis mode should be activated.
        
        Activates crisis profile when:
        - Multiple critical spikes detected
        - Pain + drift both elevated
        - Sustained high readings across sensors
        """
        critical_spikes = [
            s for s in spikes
            if s.severity in (SpikeSeverity.CRITICAL, SpikeSeverity.SEVERE)
        ]
        
        if len(critical_spikes) >= 2 and not self._crisis_mode:
            self._activate_crisis_mode()
        elif self._crisis_mode:
            # Check if we can deactivate
            pain_state = self.sensors["pain"].get_current_state()
            if (
                pain_state["current_value"] < 0.5 and
                pain_state["trend"]["direction"] != "rising"
            ):
                self._deactivate_crisis_mode()
    
    def _activate_crisis_mode(self) -> None:
        """Switch all sensors to crisis profile."""
        self._crisis_mode = True
        for sensor in self.sensors.values():
            sensor.set_profile("crisis")
        logger.warning("[SensorCalibration] CRISIS MODE ACTIVATED")
    
    def _deactivate_crisis_mode(self) -> None:
        """Return sensors to default profile."""
        self._crisis_mode = False
        for sensor in self.sensors.values():
            sensor.set_profile(self._current_profile)
        logger.info("[SensorCalibration] Crisis mode deactivated")
    
    def set_global_profile(self, profile_name: str) -> None:
        """
        Set calibration profile for all sensors.
        
        Args:
            profile_name: Name of profile to apply
        """
        self._current_profile = profile_name
        if not self._crisis_mode:
            for sensor in self.sensors.values():
                sensor.set_profile(profile_name)
    
    def get_correlation(
        self,
        sensor_a: str,
        sensor_b: str,
        window: int = 50
    ) -> float:
        """
        Calculate correlation between two sensors.
        
        Args:
            sensor_a: First sensor name
            sensor_b: Second sensor name
            window: Number of readings to consider
            
        Returns:
            Correlation coefficient (-1.0 to 1.0)
        """
        if sensor_a not in self.sensors or sensor_b not in self.sensors:
            return 0.0
        
        history_a = list(self.sensors[sensor_a].history)[-window:]
        history_b = list(self.sensors[sensor_b].history)[-window:]
        
        if len(history_a) < 3 or len(history_b) < 3:
            return 0.0
        
        # Align by timestamp (simplified: use positional)
        n = min(len(history_a), len(history_b))
        values_a = [r.value for r in history_a[-n:]]
        values_b = [r.value for r in history_b[-n:]]
        
        # Pearson correlation
        mean_a = sum(values_a) / n
        mean_b = sum(values_b) / n
        
        numerator = sum(
            (a - mean_a) * (b - mean_b)
            for a, b in zip(values_a, values_b)
        )
        
        denom_a = math.sqrt(sum((a - mean_a) ** 2 for a in values_a))
        denom_b = math.sqrt(sum((b - mean_b) ** 2 for b in values_b))
        
        if denom_a == 0 or denom_b == 0:
            return 0.0
        
        return numerator / (denom_a * denom_b)
    
    def get_aggregate_state(self) -> Dict:
        """
        Get comprehensive state of all sensors.
        
        Returns:
            Dict with all sensor states and correlations
        """
        sensor_states = {
            name: sensor.get_current_state()
            for name, sensor in self.sensors.items()
        }
        
        # Key correlations
        correlations = {
            "pain_drift": self.get_correlation("pain", "drift"),
            "pain_clarity": self.get_correlation("pain", "clarity"),
            "drift_mirror_sync": self.get_correlation("drift", "mirror_sync"),
        }
        
        return {
            "sensors": sensor_states,
            "correlations": correlations,
            "crisis_mode": self._crisis_mode,
            "current_profile": self._current_profile,
        }
    
    def to_state(self) -> Dict:
        """Export manager state for persistence."""
        return {
            "sensors": {
                name: sensor.to_state()
                for name, sensor in self.sensors.items()
            },
            "current_profile": self._current_profile,
            "crisis_mode": self._crisis_mode,
        }
    
    @classmethod
    def from_state(cls, state: Dict) -> "SensorCalibrationManager":
        """Restore manager from persisted state."""
        manager = cls()
        manager._current_profile = state.get("current_profile", "default")
        manager._crisis_mode = state.get("crisis_mode", False)
        
        for name, sensor_state in state.get("sensors", {}).items():
            if name in manager.sensors:
                manager.sensors[name] = CalibratedSensor.from_state(sensor_state)
        
        return manager


# Global instance for convenience
sensor_calibration = SensorCalibrationManager()
