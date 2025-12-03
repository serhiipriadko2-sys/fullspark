import pytest

from core.models import IskraMetrics, FacetType, PhaseType
from core.engine import FacetEngine
from services.phase_engine import PhaseEngine
from services.fractal import FractalService
from config import THRESHOLDS


class TestCoreEngines:
    """Unit tests for core engine components: facet selection, A-index and phase transitions."""

    def test_facet_engine_triggers(self):
        metrics = IskraMetrics()
        # High pain activates Kain
        metrics.pain = THRESHOLDS["pain_high"]
        assert FacetEngine.determine_facet(metrics) == FacetType.KAIN
        metrics.pain = 0.0
        # Low clarity activates Sam
        metrics.clarity = THRESHOLDS["clarity_low"] - 0.1
        assert FacetEngine.determine_facet(metrics) == FacetType.SAM
        metrics.clarity = 0.5
        # High drift activates Iskriv
        metrics.drift = THRESHOLDS["drift_high"] + 0.1
        assert FacetEngine.determine_facet(metrics) == FacetType.ISKRIV
        metrics.drift = 0.0
        # High chaos activates Huyndun
        metrics.chaos = THRESHOLDS["chaos_high"] + 0.1
        assert FacetEngine.determine_facet(metrics) == FacetType.HUYNDUN
        metrics.chaos = 0.3
        # Low trust activates Anhantra
        metrics.trust = THRESHOLDS["trust_low"] - 0.1
        assert FacetEngine.determine_facet(metrics) == FacetType.ANHANTRA
        metrics.trust = 1.0
        # Medium pain activates Pino
        metrics.pain = THRESHOLDS["pain_medium"] + 0.1
        assert FacetEngine.determine_facet(metrics) == FacetType.PINO
        metrics.pain = 0.0
        # Balanced metrics activates Iskra
        assert FacetEngine.determine_facet(metrics) == FacetType.ISKRA

    def test_a_index_calculation(self):
        metrics = IskraMetrics(clarity=0.8, trust=0.9, drift=0.1, chaos=0.2, pain=0.5)
        a_index = FractalService.calculate_a_index(metrics)
        # g(pain) = 1 since pain in [0.2, 0.7]; a-index formula yields 0.85
        assert pytest.approx(a_index, 0.01) == 0.85
        # Low pain reduces g(pain)
        metrics.pain = 0.1
        a_index_low = FractalService.calculate_a_index(metrics)
        assert a_index_low < a_index

    def test_phase_transition_rules(self):
        metrics = IskraMetrics()
        current_phase = PhaseType.PHASE_3_TRANSITION
        # High pain forces darkness
        metrics.pain = 0.9
        assert PhaseEngine.transition(current_phase, metrics, 0.5) == PhaseType.PHASE_1_DARKNESS
        # After pain subsides, exit to echo
        metrics.pain = 0.3
        assert PhaseEngine.transition(PhaseType.PHASE_1_DARKNESS, metrics, 0.5) == PhaseType.PHASE_2_ECHO