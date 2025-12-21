"""
Tests for the symmetrical properties of the A‑Index pain modulation.

The FractalService.calculate_a_index function uses a symmetric
parabolic function for g(pain) defined as 1 − 4×(pain − 0.5)². The
bell‑shaped curve peaks at pain=0.5 and is zero at the ends (0 and
1). These tests verify that:

* The function yields identical A‑Index values for symmetric pain
  values (e.g., pain=0.1 and pain=0.9) when all other metrics are
  equal.
* The maximum A‑Index occurs at pain=0.5 given fixed clarity,
  trust, drift and chaos.
* The A‑Index goes to zero at pain=0 and pain=1.
"""

import pytest

from core.models import IskraMetrics
from services.fractal import FractalService


def test_a_index_symmetry() -> None:
    """A‑Index should be symmetric around pain=0.5 given identical metrics."""
    metrics_low = IskraMetrics(clarity=0.7, trust=0.8, drift=0.2, chaos=0.1, pain=0.1)
    metrics_high = IskraMetrics(clarity=0.7, trust=0.8, drift=0.2, chaos=0.1, pain=0.9)
    a_low = FractalService.calculate_a_index(metrics_low)
    a_high = FractalService.calculate_a_index(metrics_high)
    assert pytest.approx(a_low, 1e-6) == a_high


def test_a_index_peak_at_half() -> None:
    """A‑Index should be maximal at pain=0.5 for fixed other metrics."""
    base = IskraMetrics(clarity=0.5, trust=0.5, drift=0.1, chaos=0.1)
    # Pain at extremes
    base.pain = 0.0
    a_zero = FractalService.calculate_a_index(base)
    base.pain = 1.0
    a_one = FractalService.calculate_a_index(base)
    # Pain at mid
    base.pain = 0.5
    a_mid = FractalService.calculate_a_index(base)
    assert a_zero == 0.0
    assert a_one == 0.0
    assert a_mid > a_zero and a_mid > a_one
