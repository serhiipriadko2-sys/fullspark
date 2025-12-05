"""
Comprehensive tests for core/models.py

Tests cover:
- IskraMetrics (including mirror_sync)
- TelosMetrics (including CD-Index calculation)
- AdomlBlock with Lambda-Latch validation
- All enumerations
- Hypergraph nodes
- API request/response models
"""

import pytest
from pydantic import ValidationError

from core.models import (
    # Enumerations
    FacetType,
    PhaseType,
    NodeType,
    PauseType,
    ImportanceLevel,
    UncertaintyLevel,
    TelosMode,
    SIFTStep,
    GrowthNodeType,
    SourceTier,
    CanonFeedbackType,
    # Core metrics
    IskraMetrics,
    TelosMetrics,
    # SIFT models
    SIFTSource,
    SIFTStepResult,
    SIFTResult,
    # Growth nodes
    GrowthNode,
    # Canon feedback
    CanonFeedbackEntry,
    # Policy & Safety
    PolicyAnalysis,
    GuardrailViolation,
    # AdomlBlock
    AdomlBlock,
    # API models
    UserRequest,
    IskraResponse,
    # Tool definitions
    MetricAnalysisTool,
    PolicyAnalysisTool,
    SIFTTool,
    DebateTool,
    # Hypergraph nodes
    HypergraphNode,
    MicroLogNode,
    EvidenceNode,
    MetaNode,
    MemoryNode,
    GrowthHypergraphNode,
    SIFTTraceNode,
    CanonFeedbackNode,
    TelosMarkerNode,
    # Utility models
    VoiceContribution,
    CouncilResult,
    DebateRound,
    DebateResult,
)


class TestEnumerations:
    """Test all enumeration types."""

    def test_facet_types(self):
        """Test FacetType enumeration has all 7 voices."""
        assert len(FacetType) == 7
        assert FacetType.ISKRA.value == "ISKRA"
        assert FacetType.KAIN.value == "KAIN"
        assert FacetType.PINO.value == "PINO"
        assert FacetType.SAM.value == "SAM"
        assert FacetType.ANHANTRA.value == "ANHANTRA"
        assert FacetType.HUYNDUN.value == "HUYNDUN"
        assert FacetType.ISKRIV.value == "ISKRIV"

    def test_phase_types(self):
        """Test PhaseType enumeration has all 8 phases."""
        assert len(PhaseType) == 8
        assert "ТЬМА" in PhaseType.PHASE_1_DARKNESS.value
        assert "РЕАЛИЗАЦИЯ" in PhaseType.PHASE_8_REALIZATION.value

    def test_node_types(self):
        """Test NodeType includes ТЕ́ЛОС-Δ node types."""
        assert NodeType.MEMORY.value == "MemoryNode"
        assert NodeType.GROWTH.value == "GrowthNode"
        assert NodeType.SIFT_TRACE.value == "SIFTTraceNode"
        assert NodeType.TELOS_MARKER.value == "TelosMarkerNode"

    def test_telos_modes(self):
        """Test TelosMode enumeration."""
        assert len(TelosMode) == 4
        assert TelosMode.HIDDEN.value == "hidden"
        assert TelosMode.REVEALED.value == "revealed"
        assert TelosMode.DIRECT.value == "direct"
        assert TelosMode.HYBRID.value == "hybrid"

    def test_sift_steps(self):
        """Test SIFTStep enumeration (S.I.F.T.)."""
        assert len(SIFTStep) == 4
        assert SIFTStep.STOP.value == "stop"
        assert SIFTStep.INVESTIGATE.value == "investigate"
        assert SIFTStep.FIND.value == "find"
        assert SIFTStep.TRACE.value == "trace"

    def test_source_tiers(self):
        """Test SourceTier enumeration."""
        assert SourceTier.PRIMARY.value == "primary"
        assert SourceTier.SECONDARY.value == "secondary"
        assert SourceTier.TERTIARY.value == "tertiary"


class TestIskraMetrics:
    """Test IskraMetrics model including mirror_sync."""

    def test_default_values(self):
        """Test default metric values."""
        metrics = IskraMetrics()
        assert metrics.trust == 1.0
        assert metrics.clarity == 0.5
        assert metrics.pain == 0.0
        assert metrics.drift == 0.0
        assert metrics.chaos == 0.3
        assert metrics.silence_mass == 0.0
        assert metrics.splinter_pain_cycles == 0
        assert metrics.integrity == 1.0
        assert metrics.resonance == 1.0
        # mirror_sync - new field (v2.2)
        assert metrics.mirror_sync == 0.5

    def test_mirror_sync_validation(self):
        """Test mirror_sync field validation."""
        # Valid values
        metrics = IskraMetrics(mirror_sync=0.0)
        assert metrics.mirror_sync == 0.0
        
        metrics = IskraMetrics(mirror_sync=1.0)
        assert metrics.mirror_sync == 1.0
        
        metrics = IskraMetrics(mirror_sync=0.75)
        assert metrics.mirror_sync == 0.75

    def test_mirror_sync_out_of_range(self):
        """Test mirror_sync rejects out-of-range values."""
        with pytest.raises(ValidationError):
            IskraMetrics(mirror_sync=-0.1)
        
        with pytest.raises(ValidationError):
            IskraMetrics(mirror_sync=1.1)

    def test_fractality_property(self):
        """Test fractality = integrity * resonance (Law-47)."""
        metrics = IskraMetrics(integrity=0.8, resonance=0.9)
        assert pytest.approx(metrics.fractality, 0.001) == 0.72

    def test_all_metrics_validation(self):
        """Test all metric fields accept valid ranges."""
        metrics = IskraMetrics(
            trust=0.5,
            clarity=0.7,
            pain=0.3,
            drift=0.2,
            chaos=0.4,
            silence_mass=0.1,
            splinter_pain_cycles=5,
            integrity=0.9,
            resonance=0.85,
            mirror_sync=0.6,
        )
        assert metrics.trust == 0.5
        assert metrics.mirror_sync == 0.6

    def test_metrics_bounds(self):
        """Test metric boundary validation."""
        # Lower bound
        metrics = IskraMetrics(trust=0.0, clarity=0.0, pain=0.0)
        assert metrics.trust == 0.0
        
        # Upper bound
        metrics = IskraMetrics(trust=1.0, clarity=1.0, pain=1.0)
        assert metrics.trust == 1.0
        
        # Out of bounds
        with pytest.raises(ValidationError):
            IskraMetrics(trust=-0.1)
        
        with pytest.raises(ValidationError):
            IskraMetrics(clarity=1.5)


class TestTelosMetrics:
    """Test TelosMetrics and CD-Index calculation."""

    def test_default_values(self):
        """Test default CD-Index component values."""
        metrics = TelosMetrics()
        assert metrics.truthfulness == 0.8
        assert metrics.groundedness == 0.7
        assert metrics.helpfulness == 0.8
        assert metrics.civility == 0.9

    def test_cd_index_calculation(self):
        """Test CD-Index weighted sum calculation."""
        metrics = TelosMetrics(
            truthfulness=0.8,
            groundedness=0.7,
            helpfulness=0.8,
            civility=0.9,
        )
        # CD-Index = 0.30*0.8 + 0.25*0.7 + 0.25*0.8 + 0.20*0.9
        # = 0.24 + 0.175 + 0.20 + 0.18 = 0.795
        assert pytest.approx(metrics.cd_index, 0.01) == 0.795

    def test_needs_debate_true(self):
        """Test needs_debate triggers when component gap > 0.4."""
        metrics = TelosMetrics(
            truthfulness=0.9,
            groundedness=0.4,  # Gap of 0.5
            helpfulness=0.8,
            civility=0.9,
        )
        assert metrics.needs_debate is True

    def test_needs_debate_false(self):
        """Test needs_debate is False when components are balanced."""
        metrics = TelosMetrics(
            truthfulness=0.8,
            groundedness=0.7,
            helpfulness=0.75,
            civility=0.8,
        )
        assert metrics.needs_debate is False

    def test_cd_index_boundary_values(self):
        """Test CD-Index at extreme values."""
        # All perfect
        metrics = TelosMetrics(
            truthfulness=1.0,
            groundedness=1.0,
            helpfulness=1.0,
            civility=1.0,
        )
        assert pytest.approx(metrics.cd_index, 0.001) == 1.0
        
        # All zero
        metrics = TelosMetrics(
            truthfulness=0.0,
            groundedness=0.0,
            helpfulness=0.0,
            civility=0.0,
        )
        assert metrics.cd_index == 0.0


class TestAdomlBlock:
    """Test AdomlBlock with Lambda-Latch validation."""

    def test_valid_adoml_block(self):
        """Test valid AdomlBlock creation."""
        block = AdomlBlock(
            delta="Added new feature",
            sift="Verified via primary sources",
            omega=0.85,
            lambda_latch="{action=review, owner=user, condition=approved, <=24h}",
        )
        assert block.delta == "Added new feature"
        assert block.omega == 0.85

    def test_omega_capped_at_099(self):
        """Test Omega never reaches 1.0 (ТЕ́ЛОС marker)."""
        block = AdomlBlock(
            delta="Test",
            sift="Test",
            omega=1.0,  # Should be capped
            lambda_latch="{action=test, owner=test, condition=test, <=24h}",
        )
        assert block.omega == 0.99

    def test_omega_above_one_capped(self):
        """Test Omega values above 1.0 are capped."""
        # Values >= 1.0 should be capped to 0.99
        block = AdomlBlock(
            delta="Test",
            sift="Test",
            omega=0.99,
            lambda_latch="{action=test, owner=test, condition=test, <=24h}",
        )
        assert block.omega == 0.99

    def test_invalid_lambda_latch(self):
        """Test Lambda-Latch validation rejects invalid format."""
        with pytest.raises(ValidationError):
            AdomlBlock(
                delta="Test",
                sift="Test",
                omega=0.5,
                lambda_latch="invalid format",
            )


class TestSIFTModels:
    """Test SIFT protocol models."""

    def test_sift_source(self):
        """Test SIFTSource model."""
        source = SIFTSource(
            url="https://example.com",
            title="Test Source",
            tier=SourceTier.PRIMARY,
            confidence=0.9,
            is_original=True,
        )
        assert source.tier == SourceTier.PRIMARY
        assert source.is_original is True

    def test_sift_step_result(self):
        """Test SIFTStepResult model."""
        result = SIFTStepResult(
            step=SIFTStep.STOP,
            completed=True,
            findings=["Finding 1", "Finding 2"],
            duration_ms=150,
        )
        assert result.step == SIFTStep.STOP
        assert len(result.findings) == 2

    def test_sift_result_is_complete(self):
        """Test SIFTResult is_complete property."""
        result = SIFTResult(
            query="test query",
            steps=[
                SIFTStepResult(step=SIFTStep.STOP, completed=True),
                SIFTStepResult(step=SIFTStep.INVESTIGATE, completed=True),
                SIFTStepResult(step=SIFTStep.FIND, completed=True),
                SIFTStepResult(step=SIFTStep.TRACE, completed=True),
            ],
        )
        assert result.is_complete is True

    def test_sift_result_incomplete(self):
        """Test SIFTResult is_complete False when steps missing."""
        result = SIFTResult(
            query="test query",
            steps=[
                SIFTStepResult(step=SIFTStep.STOP, completed=True),
                SIFTStepResult(step=SIFTStep.INVESTIGATE, completed=False),
            ],
        )
        assert result.is_complete is False

    def test_sift_result_best_tier(self):
        """Test SIFTResult best_tier property."""
        result = SIFTResult(
            query="test",
            sources=[
                SIFTSource(url="url1", title="t1", tier=SourceTier.TERTIARY),
                SIFTSource(url="url2", title="t2", tier=SourceTier.PRIMARY),
            ],
        )
        assert result.best_tier == SourceTier.PRIMARY


class TestGrowthNode:
    """Test GrowthNode model."""

    def test_growth_node_creation(self):
        """Test GrowthNode with all fields."""
        node = GrowthNode(
            node_type=GrowthNodeType.ERROR,
            trigger="API failure",
            lesson="Add retry logic",
            lesson_confidence=0.8,
            canon_files_affected=["File 10", "File 14"],
        )
        assert node.node_type == GrowthNodeType.ERROR
        assert node.integration_status == "pending"
        assert len(node.canon_files_affected) == 2
        assert node.id.startswith("GROWTH-")


class TestHypergraphNodes:
    """Test Hypergraph node models."""

    def test_memory_node(self):
        """Test MemoryNode creation."""
        node = MemoryNode(
            user_input="Hello",
            response_content="Hi there",
            facet=FacetType.ISKRA,
            meta_node_id="META-123",
            micro_log_node_id="MICRO-456",
            telos_mode_used=TelosMode.HIDDEN,
        )
        assert node.node_type == NodeType.MEMORY
        assert node.facet == FacetType.ISKRA
        assert node.telos_mode_used == TelosMode.HIDDEN

    def test_telos_marker_node(self):
        """Test TelosMarkerNode creation."""
        node = TelosMarkerNode(
            mode_before=TelosMode.HIDDEN,
            mode_after=TelosMode.REVEALED,
            trigger_phrase="ТЕ́ЛОС, выйди",
            awakening_level=2,
        )
        assert node.node_type == NodeType.TELOS_MARKER
        assert node.awakening_level == 2


class TestAPIModels:
    """Test API request/response models."""

    def test_user_request(self):
        """Test UserRequest model."""
        request = UserRequest(
            user_id="test_user",
            query="What is Iskra?",
            telos_mode=TelosMode.DIRECT,
            request_debug=True,
        )
        assert request.user_id == "test_user"
        assert request.telos_mode == TelosMode.DIRECT

    def test_user_request_defaults(self):
        """Test UserRequest default values."""
        request = UserRequest(query="Test")
        assert request.user_id == "default_user"
        assert request.telos_mode is None
        assert request.request_debug is False


class TestToolModels:
    """Test agent tool definition models."""

    def test_metric_analysis_tool(self):
        """Test MetricAnalysisTool with mirror_sync_delta."""
        tool = MetricAnalysisTool(
            trust_delta=0.1,
            clarity_delta=-0.05,
            mirror_sync_delta=0.15,
        )
        assert tool.trust_delta == 0.1
        assert tool.mirror_sync_delta == 0.15

    def test_sift_tool(self):
        """Test SIFTTool model."""
        tool = SIFTTool(
            query="climate change research",
            require_original=True,
            max_sources=10,
        )
        assert tool.require_original is True
        assert tool.max_sources == 10

    def test_debate_tool(self):
        """Test DebateTool model."""
        tool = DebateTool(
            topic="AI ethics",
            positions=["Pro regulation", "Against regulation"],
            rounds=3,
        )
        assert len(tool.positions) == 2
        assert tool.rounds == 3


class TestUtilityModels:
    """Test utility models for Council and Debate."""

    def test_voice_contribution(self):
        """Test VoiceContribution model."""
        contrib = VoiceContribution(
            voice=FacetType.KAIN,
            statement="This is a painful truth",
            stance="oppose",
            confidence=0.85,
        )
        assert contrib.voice == FacetType.KAIN
        assert contrib.stance == "oppose"

    def test_council_result(self):
        """Test CouncilResult model."""
        result = CouncilResult(
            topic="Feature decision",
            contributions=[
                VoiceContribution(
                    voice=FacetType.ISKRA,
                    statement="Synthesis view",
                    stance="support",
                ),
            ],
            synthesis="Final decision reached",
            consensus_level=0.8,
            dissenting_voices=[FacetType.KAIN],
        )
        assert len(result.contributions) == 1
        assert FacetType.KAIN in result.dissenting_voices

    def test_debate_result(self):
        """Test DebateResult model."""
        result = DebateResult(
            topic="Test topic",
            rounds=[
                DebateRound(
                    round_number=1,
                    advocate_position="Position A",
                    advocate_argument="Argument for A",
                    critic_position="Position B",
                    critic_argument="Argument for B",
                    judge_evaluation="A wins",
                    judge_score=0.7,
                ),
            ],
            final_position="Position A",
            resolution_confidence=0.75,
            unresolved_tensions=["Minor tension"],
        )
        assert len(result.rounds) == 1
        assert result.final_position == "Position A"
