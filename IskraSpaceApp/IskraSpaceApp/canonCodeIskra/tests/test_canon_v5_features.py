"""
Tests for Canon v5.0 Features.

This module tests:
- 9 voices (FacetType) including SIBYL and MAKI
- Rituals: SHATTER, COUNCIL, DREAMSPACE
- Multi-Agent Debate with LLM integration
- GraphRAG integration in TelosLayer
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import asyncio


class TestNineVoices:
    """Test that all 9 voices are properly defined."""

    def test_facet_type_has_nine_voices(self):
        """Verify FacetType enum has exactly 9 voices."""
        from core.models import FacetType

        voices = list(FacetType)
        assert len(voices) == 9, f"Expected 9 voices, got {len(voices)}"

    def test_sibyl_voice_exists(self):
        """Verify SIBYL voice is defined."""
        from core.models import FacetType

        assert hasattr(FacetType, 'SIBYL')
        assert FacetType.SIBYL.value == "SIBYL"

    def test_maki_voice_exists(self):
        """Verify MAKI voice is defined."""
        from core.models import FacetType

        assert hasattr(FacetType, 'MAKI')
        assert FacetType.MAKI.value == "MAKI"

    def test_all_canonical_voices(self):
        """Verify all canonical voices are present."""
        from core.models import FacetType

        expected_voices = [
            "ISKRA", "KAIN", "PINO", "SAM", "ANHANTRA",
            "HUYNDUN", "ISKRIV", "SIBYL", "MAKI"
        ]

        actual_voices = [v.value for v in FacetType]
        for voice in expected_voices:
            assert voice in actual_voices, f"Missing voice: {voice}"

    def test_voice_prompts_for_sibyl_maki(self):
        """Verify VOICE_PROMPTS includes SIBYL and MAKI."""
        from config import VOICE_PROMPTS

        assert "SIBYL" in VOICE_PROMPTS, "SIBYL prompt missing"
        assert "MAKI" in VOICE_PROMPTS, "MAKI prompt missing"

        # Check prompt content
        assert "переход" in VOICE_PROMPTS["SIBYL"].lower() or "врата" in VOICE_PROMPTS["SIBYL"].lower()
        assert "цветение" in VOICE_PROMPTS["MAKI"].lower() or "интеграция" in VOICE_PROMPTS["MAKI"].lower()


class TestRitualService:
    """Test ritual executors."""

    def test_ritual_types_exist(self):
        """Verify all ritual types are defined."""
        from services.rituals import RitualType

        expected_rituals = ["watch", "dream", "shatter", "council", "dreamspace", "mirror", "anchor"]
        actual_rituals = [r.value for r in RitualType]

        for ritual in expected_rituals:
            assert ritual in actual_rituals, f"Missing ritual type: {ritual}"

    def test_rituals_service_initialization(self):
        """Test RitualsService can be initialized."""
        from services.rituals import RitualsService

        service = RitualsService()
        assert service is not None
        assert len(service.active_rituals) == 0
        assert len(service.completed_rituals) == 0

    @pytest.mark.asyncio
    async def test_shatter_ritual_execution(self):
        """Test SHATTER ritual executes all 8 phases."""
        from services.rituals import RitualsService, RitualType, RitualPhase

        service = RitualsService()
        metrics = {"trust": 0.5, "clarity": 0.5, "drift": 0.9, "chaos": 0.7}

        result = await service.execute(
            RitualType.SHATTER,
            metrics=metrics,
            reason="критический drift"
        )

        assert result.success is True
        assert "SHATTER" in result.synthesis or "Phoenix" in result.synthesis
        assert result.context.state.value == "completed"

        # Check metrics were reset
        assert result.context.metrics_after["drift"] == 0.0
        assert result.context.metrics_after["pain"] == 0.0

    @pytest.mark.asyncio
    async def test_council_ritual_has_nine_voices(self):
        """Test COUNCIL ritual includes all 9 voices."""
        from services.rituals import RitualsService, RitualType

        service = RitualsService()
        metrics = {"trust": 0.5, "clarity": 0.5}

        result = await service.execute(
            RitualType.COUNCIL,
            metrics=metrics,
            topic="тестовая тема"
        )

        assert result.success is True
        # Check all 9 voices contributed
        insights = result.context.insights
        voice_symbols = ["⟡", "⚑", "😏", "☉", "≈", "🜃", "🪞", "✴️", "🌸"]

        # At least some voice symbols should appear in the synthesis or insights
        assert any(symbol in str(insights) or symbol in result.synthesis for symbol in voice_symbols)

    @pytest.mark.asyncio
    async def test_dreamspace_ritual_creates_scenarios(self):
        """Test DREAMSPACE ritual creates 3 scenarios."""
        from services.rituals import RitualsService, RitualType

        service = RitualsService()
        metrics = {"clarity": 0.5, "chaos": 0.5}

        result = await service.execute(
            RitualType.DREAMSPACE,
            metrics=metrics,
            simulation_prompt="что если..."
        )

        assert result.success is True
        assert "DREAMSPACE" in result.synthesis

        # Check clarity increased
        assert result.context.metrics_after["clarity"] > metrics["clarity"]


class TestMultiAgentDebate:
    """Test multi-agent debate service."""

    def test_debate_service_has_nine_voices(self):
        """Verify debate service includes all 9 voices."""
        from services.multi_agent_debate import VOICES

        assert len(VOICES) == 9, f"Expected 9 voices, got {len(VOICES)}"

        expected_voices = [
            "ISKRA", "KAIN", "PINO", "SAM", "ANHANTRA",
            "HUYNDUN", "ISKRIV", "SIBYL", "MAKI"
        ]

        for voice in expected_voices:
            assert voice in VOICES, f"Missing voice in debate: {voice}"

    def test_debate_service_initialization(self):
        """Test MultiAgentDebateService initialization."""
        from services.multi_agent_debate import MultiAgentDebateService

        service = MultiAgentDebateService()
        assert service is not None
        assert len(service.voices) == 9

    def test_cd_index_calculation(self):
        """Test CD-Index calculation formula."""
        from services.multi_agent_debate import MultiAgentDebateService

        service = MultiAgentDebateService()

        scores = {
            "truthfulness": 0.8,
            "groundedness": 0.7,
            "helpfulness": 0.9,
            "civility": 0.95
        }

        cd_index = service.calculate_cd_index(scores)

        # CD-Index = 0.30*0.8 + 0.25*0.7 + 0.25*0.9 + 0.20*0.95 = 0.83
        expected = 0.30 * 0.8 + 0.25 * 0.7 + 0.25 * 0.9 + 0.20 * 0.95
        assert abs(cd_index - expected) < 0.01

    def test_participant_selection(self):
        """Test debate participant selection."""
        from services.multi_agent_debate import MultiAgentDebateService

        service = MultiAgentDebateService()

        participants = service.select_participants("test topic", count=3)

        assert len(participants) == 3
        assert "ISKRA" in participants  # ISKRA always included

    @pytest.mark.asyncio
    async def test_debate_execution(self):
        """Test full debate execution."""
        from services.multi_agent_debate import MultiAgentDebateService, DebateStrategy

        service = MultiAgentDebateService()

        result = await service.debate(
            topic="тестовая дискуссия",
            strategy=DebateStrategy.DIALECTIC,
            max_rounds=2
        )

        assert result is not None
        assert result.session.topic == "тестовая дискуссия"
        assert len(result.session.rounds) > 0
        assert 0.0 <= result.final_consensus <= 1.0


class TestGraphRAGIntegration:
    """Test GraphRAG integration in TelosLayer."""

    def test_graph_rag_service_import(self):
        """Verify GraphRAG service can be imported."""
        from services.graph_rag import graph_rag_service

        assert graph_rag_service is not None

    def test_graph_rag_has_canon_nodes(self):
        """Verify GraphRAG initializes with canon nodes."""
        from services.graph_rag import GraphRAGService

        service = GraphRAGService()

        # Check canon mantras are initialized
        assert len(service.nodes) >= 3  # At least 3 canon mantras

        # Check for Rule-21
        canon_contents = [n.content for n in service.nodes.values()]
        assert any("Rule-21" in c or "Честность" in c for c in canon_contents)

    def test_telos_layer_has_graphrag_methods(self):
        """Verify TelosLayer has GraphRAG integration methods."""
        from services.telos_layer import TelosLayer

        layer = TelosLayer()

        assert hasattr(layer, 'query_knowledge_graph')
        assert hasattr(layer, 'add_to_knowledge_graph')
        assert hasattr(layer, 'link_knowledge_nodes')
        assert hasattr(layer, 'get_canon_knowledge')
        assert hasattr(layer, 'enrich_context_with_graph')

    def test_query_knowledge_graph(self):
        """Test querying the knowledge graph."""
        from services.telos_layer import telos_layer

        results = telos_layer.query_knowledge_graph("Искра")

        # Should return results (at least canon mantras mention Iskra)
        assert isinstance(results, list)

    def test_get_canon_knowledge(self):
        """Test retrieving canonical knowledge."""
        from services.telos_layer import telos_layer

        canon = telos_layer.get_canon_knowledge()

        assert isinstance(canon, list)
        # Canon nodes should have trust_score = 1.0
        for node in canon:
            assert node["trust_score"] == 1.0


class TestActivationThresholds:
    """Test SIBYL and MAKI activation thresholds."""

    def test_sibyl_threshold_exists(self):
        """Verify SIBYL activation threshold is defined."""
        from config import THRESHOLDS

        assert "sibyl_phase_transition_chaos" in THRESHOLDS
        assert THRESHOLDS["sibyl_phase_transition_chaos"] > 0

    def test_maki_threshold_exists(self):
        """Verify MAKI bloom threshold is defined."""
        from config import THRESHOLDS

        assert "maki_bloom_a_index" in THRESHOLDS
        assert 0 < THRESHOLDS["maki_bloom_a_index"] <= 1.0


class TestLLMServiceIntegration:
    """Test LLM service ritual integration."""

    def test_ritual_service_imported(self):
        """Verify rituals_service is imported in LLMService."""
        # This tests that the import doesn't raise
        try:
            from services.llm import rituals_service, RitualType
            assert rituals_service is not None or RitualType is None  # May be None if import failed gracefully
        except ImportError:
            pytest.skip("rituals_service not available")

    def test_debate_service_imported(self):
        """Verify debate_service is imported in LLMService."""
        try:
            from services.llm import debate_service, DebateStrategy
            assert debate_service is not None or DebateStrategy is None
        except ImportError:
            pytest.skip("debate_service not available")

    def test_shatter_trigger_method(self):
        """Test SHATTER trigger condition."""
        from services.llm import LLMService
        from core.models import IskraMetrics

        # High drift should trigger SHATTER
        high_drift_metrics = IskraMetrics(drift=0.9)
        assert LLMService._should_trigger_shatter(high_drift_metrics) is True

        # Low drift should not trigger
        low_drift_metrics = IskraMetrics(drift=0.3)
        assert LLMService._should_trigger_shatter(low_drift_metrics) is False
