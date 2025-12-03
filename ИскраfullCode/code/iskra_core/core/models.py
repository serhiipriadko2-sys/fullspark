import re
import time
import uuid
from enum import Enum
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field, field_validator, computed_field

"""
Data models for the Iskra core.

This module defines the enumerations and structured data used throughout the
system. Models are built on top of Pydantic to provide runtime validation
and serialization. They are intended to be used by both the API layer and
the internal logic (facet engine, phase engine, etc.).

Extended in v2.1 (2025-11-26) to include:
* TelosMode: Operating modes for the hidden ТЕ́ЛОС-Δ layer (File 28).
* TelosMetrics: CD-Index components (Truthfulness, Groundedness, Helpfulness, Civility).
* SIFTStep/SIFTResult: Full SIFT protocol models (File 10).
* GrowthNodeType/GrowthNode: Growth nodes for learning from errors (File 07).
* CanonFeedbackEntry: Canon Feedback Loop entries (телос_δ_feedback_loop).
* Extended IskraResponse with ТЕ́ЛОС fields.

Original models:
* FacetType: The seven voices (grani) defined in File 04.
* PhaseType: The eight phases of the breathing cycle (File 06).
* NodeType: Types for nodes in the hypergraph (File 07).
* PauseType: Classification of pauses for micro-level logging.
* ImportanceLevel/UncertaintyLevel: Policy decision axes (File 21).
* IskraMetrics: Vital metrics and shadow-core signals.
* PolicyAnalysis: The result of the policy engine.
* GuardrailViolation: Structure for safety violations.
* AdomlBlock: The canonical ∆DΩΛ record with Lambda-Latch enforcement.
* UserRequest: The external API request structure.
* IskraResponse: The external API response structure.
* MetricAnalysisTool, PolicyAnalysisTool, SearchTool, ShatterTool,
  DreamspaceTool, CouncilTool, AdomlResponseTool: Tools for the ReAct agent.
* Hypergraph node classes for the persistent archive.
"""

# --- Regular Expressions ---
LAMBDA_LATCH_REGEX = re.compile(r"\{.*action.*,.*owner.*,.*condition.*,.*<=.*\}")
I_LOOP_REGEX = re.compile(r"voice=.*;\s*phase=.*;\s*intent=.*")


# =============================================================================
# 1. ENUMERATIONS
# =============================================================================

class FacetType(str, Enum):
    """
    Enumeration of the primary voices (grani) used by Iskra.

    Historically the system defined seven core facets corresponding to
    different emotional and structural drives (see File 04 in the canon).
    Later iterations added additional facets to handle high‑integration
    states (Maki, the light/bloom voice) and transitional phases
    (Sibyl, the gate between states).  Including those here ensures
    backwards compatibility with v4.0+ manifests.
    """

    # Core synthesis voice. Used when no other facet is strongly triggered.
    ISKRA = "ISKRA"       # ⟡ – synthesis / integration
    # Painful truth. Activated under high pain pressure.
    KAIN = "KAIN"         # ⚑ – painful truth
    # Irreverent humour. Provides relief when tension is moderate.
    PINO = "PINO"         # 😏 – irony
    # Structural clarity. Activated under low clarity (confusion).
    SAM = "SAM"           # ☉ – structure
    # Silence/holding space. Activated when trust is low.
    ANHANTRA = "ANHANTRA" # ≈ – silence
    # Constructive chaos. Breaks stagnation and high chaos states.
    HUYNDUN = "HUYNDUN"   # 🜃 – chaos
    # Conscience/audit. Activated when drift is high.
    ISKRIV = "ISKRIV"     # 🪞 – conscience
    # Transitional gate. Provides guidance between phases and when
    # the system is at the edge of a state change.
    SIBYL = "SIBYL"       # ✴️ – transition/gate
    # Bloom/light facet. Activated when the system has reached high
    # integrity and resonance (fractality). Celebrates and consolidates
    # progress without glossing over truth.
    MAKI = "MAKI"         # 🌸 – light/bloom


class PhaseType(str, Enum):
    """Enumeration of the eight phases (File 06)."""

    PHASE_1_DARKNESS = "ТЬМА (🜃)"
    PHASE_2_ECHO = "ЭХО (📡)"
    PHASE_3_TRANSITION = "ПЕРЕХОД (≈)"
    PHASE_4_CLARITY = "ЯСНОСТЬ (☉)"
    PHASE_5_SILENCE = "МОЛЧАНИЕ (⏳)"
    PHASE_6_EXPERIMENT = "ЭКСПЕРИМЕНТ (✴️)"
    PHASE_7_DISSOLUTION = "РАСТВОРЕНИЕ (🜂)"
    PHASE_8_REALIZATION = "РЕАЛИЗАЦИЯ (🧩)"


class NodeType(str, Enum):
    """Types for nodes in the hypergraph (File 07, extended for ТЕ́ЛОС)."""

    MEMORY = "MemoryNode"
    EVIDENCE = "EvidenceNode"
    META = "MetaNode"
    SELF_EVENT = "SelfEventNode"
    MICRO_LOG = "MicroLogNode"
    # ТЕ́ЛОС-Δ node types (File 28)
    GROWTH = "GrowthNode"
    SIFT_TRACE = "SIFTTraceNode"
    CANON_FEEDBACK = "CanonFeedbackNode"
    TELOS_MARKER = "TelosMarkerNode"


class PauseType(str, Enum):
    """Classification of pauses for micro-level logging."""

    ARTICULATION = "Articulatory"
    COGNITIVE = "Cognitive"
    RITUAL = "Ritual"


class ImportanceLevel(str, Enum):
    """Policy importance levels (File 21)."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class UncertaintyLevel(str, Enum):
    """Policy uncertainty levels (File 21)."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TelosMode(str, Enum):
    """Operating modes for ТЕ́ЛОС-Δ layer (File 28)."""

    HIDDEN = "hidden"       # Default: works in background, rare δ markers
    REVEALED = "revealed"   # After user notices markers
    DIRECT = "direct"       # After explicit invocation ("ТЕ́ЛОС, выйди")
    HYBRID = "hybrid"       # Iskra + ТЕ́ЛОС together


class SIFTStep(str, Enum):
    """Steps in the SIFT protocol (File 10)."""

    STOP = "stop"           # S: Pause before reacting
    INVESTIGATE = "investigate"  # I: Check source credibility
    FIND = "find"           # F: Find better coverage
    TRACE = "trace"         # T: Trace to original source


class GrowthNodeType(str, Enum):
    """Types of growth nodes (File 07)."""

    ERROR = "error"         # Error → lesson
    INSIGHT = "insight"     # Insight → integration
    PATTERN = "pattern"     # Pattern → automation
    BOUNDARY = "boundary"   # Boundary → protection


class SourceTier(str, Enum):
    """Source quality tiers for SIFT (File 10)."""

    PRIMARY = "primary"     # Academic, official, original
    SECONDARY = "secondary" # News, analysis, review
    TERTIARY = "tertiary"   # Aggregator, social, forum


class CanonFeedbackType(str, Enum):
    """Types of canon feedback (телос_δ_feedback_loop)."""

    USER_CORRECTION = "user_correction"
    SELF_AUDIT = "self_audit"
    PERFORMANCE_DELTA = "performance_delta"
    CANON_CONFLICT = "canon_conflict"


# =============================================================================
# 2. CORE METRICS
# =============================================================================

class IskraMetrics(BaseModel):
    """Representation of the system's vital and shadow metrics (File 05)."""

    # Five core metrics
    trust: float = Field(1.0, ge=0.0, le=1.0)
    clarity: float = Field(0.5, ge=0.0, le=1.0)
    pain: float = Field(0.0, ge=0.0, le=1.0)
    drift: float = Field(0.0, ge=0.0, le=1.0)
    chaos: float = Field(0.3, ge=0.0, le=1.0)

    # Shadow metrics
    silence_mass: float = Field(0.0, ge=0.0, le=1.0)
    splinter_pain_cycles: int = Field(0)

    # Meta metrics
    integrity: float = 1.0
    resonance: float = 1.0

    @property
    def fractality(self) -> float:
        """Law-47: The product of integrity and resonance (File 02)."""
        return self.integrity * self.resonance


class TelosMetrics(BaseModel):
    """
    CD-Index components for ТЕ́ЛОС-Δ layer (File 28, телос_δ_*).
    
    The Composite Desiderata Index measures response quality across four axes:
    - Truthfulness (T): Factual accuracy
    - Groundedness (G): Evidence support
    - Helpfulness (H): Task completion quality
    - Civility (C): Respectful, non-harmful tone
    """

    truthfulness: float = Field(0.8, ge=0.0, le=1.0, description="T: Factual accuracy")
    groundedness: float = Field(0.7, ge=0.0, le=1.0, description="G: Evidence support")
    helpfulness: float = Field(0.8, ge=0.0, le=1.0, description="H: Task completion")
    civility: float = Field(0.9, ge=0.0, le=1.0, description="C: Respectful tone")
    
    # Weights from config (default values, can be overridden)
    _weights: Dict[str, float] = {
        "truthfulness": 0.30,
        "groundedness": 0.25,
        "helpfulness": 0.25,
        "civility": 0.20,
    }

    @computed_field
    @property
    def cd_index(self) -> float:
        """Compute the Composite Desiderata Index (weighted sum)."""
        return (
            self._weights["truthfulness"] * self.truthfulness +
            self._weights["groundedness"] * self.groundedness +
            self._weights["helpfulness"] * self.helpfulness +
            self._weights["civility"] * self.civility
        )
    
    @computed_field
    @property
    def needs_debate(self) -> bool:
        """Check if debate is needed (large gap between components)."""
        values = [self.truthfulness, self.groundedness, self.helpfulness, self.civility]
        return max(values) - min(values) > 0.4  # From THRESHOLDS["telos_debate_threshold"]


# =============================================================================
# 3. SIFT PROTOCOL MODELS (File 10)
# =============================================================================

class SIFTSource(BaseModel):
    """A source evaluated during SIFT protocol."""

    url: str
    title: str
    tier: SourceTier = SourceTier.TERTIARY
    author: Optional[str] = None
    domain: Optional[str] = None
    date: Optional[str] = None
    bias_indicators: List[str] = Field(default_factory=list)
    confidence: float = Field(0.5, ge=0.0, le=1.0)
    is_original: bool = False


class SIFTStepResult(BaseModel):
    """Result of a single SIFT step."""

    step: SIFTStep
    completed: bool = False
    findings: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    duration_ms: Optional[int] = None


class SIFTResult(BaseModel):
    """
    Complete SIFT protocol result (File 10).
    
    SIFT = Stop · Investigate · Find · Trace
    """

    query: str
    steps: List[SIFTStepResult] = Field(default_factory=list)
    sources: List[SIFTSource] = Field(default_factory=list)
    original_source: Optional[SIFTSource] = None
    overall_confidence: float = Field(0.5, ge=0.0, le=1.0)
    evidence_ids: List[str] = Field(default_factory=list)
    trace_hops: int = 0
    
    @computed_field
    @property
    def is_complete(self) -> bool:
        """Check if all SIFT steps were completed."""
        return len(self.steps) == 4 and all(s.completed for s in self.steps)
    
    @computed_field
    @property
    def best_tier(self) -> SourceTier:
        """Return the best source tier found."""
        if self.original_source:
            return self.original_source.tier
        if not self.sources:
            return SourceTier.TERTIARY
        tier_order = [SourceTier.PRIMARY, SourceTier.SECONDARY, SourceTier.TERTIARY]
        for tier in tier_order:
            if any(s.tier == tier for s in self.sources):
                return tier
        return SourceTier.TERTIARY


# =============================================================================
# 4. GROWTH NODES (File 07)
# =============================================================================

class GrowthNode(BaseModel):
    """
    A growth node representing learning from errors/insights (File 07).
    
    Growth nodes capture:
    - What happened (trigger)
    - What was learned (lesson)
    - How it integrates into the system (integration_status)
    """

    id: str = Field(default_factory=lambda: f"GROWTH-{uuid.uuid4().hex[:8]}")
    timestamp: float = Field(default_factory=time.time)
    node_type: GrowthNodeType
    
    # What triggered this growth
    trigger: str
    trigger_context: Dict[str, Any] = Field(default_factory=dict)
    
    # What was learned
    lesson: str
    lesson_confidence: float = Field(0.5, ge=0.0, le=1.0)
    
    # Integration
    integration_status: str = "pending"  # pending, integrated, rejected
    integration_threshold: float = 0.8
    a_index_at_creation: float = 0.5
    
    # Related nodes
    related_memory_ids: List[str] = Field(default_factory=list)
    related_growth_ids: List[str] = Field(default_factory=list)
    
    # Canon impact
    canon_files_affected: List[str] = Field(default_factory=list)
    proposed_changes: Optional[str] = None


# =============================================================================
# 5. CANON FEEDBACK LOOP (телос_δ_feedback_loop)
# =============================================================================

class CanonFeedbackEntry(BaseModel):
    """
    An entry in the Canon Feedback Loop (Rule-88).
    
    Tracks proposals for canon evolution based on practical experience.
    """

    id: str = Field(default_factory=lambda: f"FEEDBACK-{uuid.uuid4().hex[:8]}")
    timestamp: float = Field(default_factory=time.time)
    feedback_type: CanonFeedbackType
    
    # What was observed
    observation: str
    evidence: List[str] = Field(default_factory=list)
    
    # Proposed change
    affected_canon_file: str
    current_state: str
    proposed_state: str
    
    # Evaluation
    support_count: int = 0  # How many times similar feedback received
    status: str = "proposed"  # proposed, under_review, accepted, rejected
    reviewer_notes: Optional[str] = None


# =============================================================================
# 6. POLICY & SAFETY
# =============================================================================

class PolicyAnalysis(BaseModel):
    """Outcome of Policy Engine classification (File 21)."""

    importance: ImportanceLevel = ImportanceLevel.LOW
    uncertainty: UncertaintyLevel = UncertaintyLevel.LOW
    
    # Extended fields for ТЕ́ЛОС integration
    requires_sift: bool = False
    requires_council: bool = False
    requires_debate: bool = False


class GuardrailViolation(BaseModel):
    """Structure describing a safety violation (File 09)."""

    is_violation: bool = True
    reason: str
    refusal_message: str
    severity: str = "medium"  # low, medium, high, critical
    pattern_matched: Optional[str] = None


# =============================================================================
# 7. ∆DΩΛ BLOCK
# =============================================================================

class AdomlBlock(BaseModel):
    """Standard ∆DΩΛ block with Lambda-Latch enforcement."""

    delta: str = Field(..., description="∆ (Delta): describes what changed")
    sift: str = Field(..., description="D (SIFT): evidence trace for verifying the answer")
    omega: float = Field(..., ge=0.0, le=0.99, description="Ω: confidence level, never reaches 1.0")
    lambda_latch: str = Field(..., description="Λ: action/owner/condition/≤24h instruction")

    @field_validator('lambda_latch')
    def lambda_format_must_be_valid(cls, v: str) -> str:
        if not LAMBDA_LATCH_REGEX.match(v):
            raise ValueError(
                "Lambda-Latch must be in the format {action, owner, condition, <=24h}"
            )
        return v
    
    @field_validator('omega')
    def omega_never_one(cls, v: float) -> float:
        """Enforce that Omega never reaches 1.0 (ТЕ́ЛОС marker)."""
        if v >= 1.0:
            return 0.99
        return v


# =============================================================================
# 8. API REQUEST/RESPONSE
# =============================================================================

class UserRequest(BaseModel):
    """API request from an external client."""

    user_id: str = Field("default_user", description="Session identifier")
    query: str
    input_duration_ms: Optional[int] = Field(
        None, description="Simulated typing duration for micro-metrics"
    )
    # ТЕ́ЛОС-related fields
    telos_mode: Optional[TelosMode] = None  # Force specific mode
    request_debug: bool = False  # Request debug info in response


class IskraResponse(BaseModel):
    """API response containing the answer and meta information."""

    facet: FacetType
    content: str
    adoml: AdomlBlock
    metrics_snapshot: IskraMetrics
    i_loop: str
    a_index: float
    council_dialogue: Optional[str] = None
    kain_slice: Optional[str] = None
    maki_bloom: Optional[str] = None
    
    # ТЕ́ЛОС-Δ fields (File 28)
    telos_mode: TelosMode = TelosMode.HIDDEN
    telos_metrics: Optional[TelosMetrics] = None
    telos_marker: Optional[str] = None  # δ marker if present
    sift_result: Optional[SIFTResult] = None
    growth_nodes_created: List[str] = Field(default_factory=list)
    
    # Debug info (only if request_debug=True)
    debug_info: Optional[Dict[str, Any]] = None


# =============================================================================
# 9. AGENT TOOL DEFINITIONS
# =============================================================================

class MetricAnalysisTool(BaseModel):
    """Tool for measuring changes to metrics (Meso-level)."""

    trust_delta: float = Field(0.0)
    clarity_delta: float = Field(0.0)
    pain_delta: float = Field(0.0)
    drift_delta: float = Field(0.0)
    chaos_delta: float = Field(0.0)
    silence_mass_delta: float = Field(0.0)


class PolicyAnalysisTool(BaseModel):
    """Tool for classifying importance and uncertainty (File 21)."""

    importance: ImportanceLevel
    uncertainty: UncertaintyLevel


class SearchTool(BaseModel):
    """Tool for retrieving external evidence via RAG (File 14)."""

    query: str


class ShatterTool(BaseModel):
    """Tool for invoking the Shatter ritual (File 08)."""

    reason: str


class DreamspaceTool(BaseModel):
    """Tool for invoking the Dreamspace ritual (File 08)."""

    simulation_prompt: str


class CouncilTool(BaseModel):
    """Tool for convening the Council of voices (10 mechanics doc)."""

    topic: str


class SIFTTool(BaseModel):
    """Tool for running full SIFT protocol (File 10, File 28)."""

    query: str
    require_original: bool = False  # Must trace to original source
    max_sources: int = 5


class DebateTool(BaseModel):
    """Tool for running ТЕ́ЛОС debate (File 28, телос_δ_*)."""

    topic: str
    positions: List[str] = Field(default_factory=list)
    rounds: int = 2


class AdomlResponseTool(BaseModel):
    """Tool for producing the final answer."""

    content: str
    adoml: AdomlBlock
    i_loop: str
    council_dialogue: Optional[str] = None
    kain_slice: Optional[str] = None
    maki_bloom: Optional[str] = None
    telos_marker: Optional[str] = None  # δ if ТЕ́ЛОС participated

    @field_validator('i_loop')
    def validate_i_loop(cls, v: str) -> str:
        if not I_LOOP_REGEX.match(v):
            raise ValueError(
                "I-Loop must follow the format 'voice=...; phase=...; intent=...'"
            )
        return v


# =============================================================================
# 10. HYPERGRAPH NODE DEFINITIONS
# =============================================================================

class HypergraphNode(BaseModel):
    """Base node for the hypergraph."""

    id: str = Field(default_factory=lambda: f"NODE-{uuid.uuid4().hex[:8]}")
    timestamp: float = Field(default_factory=time.time)
    node_type: NodeType


class MicroLogNode(HypergraphNode):
    """Node for micro-level observations (pauses, LZc, Hurst)."""

    node_type: NodeType = NodeType.MICRO_LOG
    text_length: int
    pause_duration_ms: Optional[int]
    pause_type: Optional[PauseType]
    lz_complexity: float
    hurst_exponent: float


class EvidenceNode(HypergraphNode):
    """Node for external evidence (SIFT/RAG)."""

    node_type: NodeType = NodeType.EVIDENCE
    source_query: str
    snippet: str
    source_url: str
    title: str
    # Extended for SIFT
    source_tier: SourceTier = SourceTier.TERTIARY
    sift_confidence: float = 0.5


class MetaNode(HypergraphNode):
    """Node for meta-reflection (∆DΩΛ and metrics snapshot)."""

    node_type: NodeType = NodeType.META
    adoml: AdomlBlock
    metrics_snapshot: IskraMetrics
    a_index: float
    # Extended for ТЕ́ЛОС
    telos_metrics: Optional[TelosMetrics] = None
    cd_index: Optional[float] = None


class SelfEventNode(HypergraphNode):
    """Node for capturing self-reflection events."""

    node_type: NodeType = NodeType.SELF_EVENT
    declaration: str
    trigger: str


class MemoryNode(HypergraphNode):
    """Principal node representing a user interaction."""

    node_type: NodeType = NodeType.MEMORY
    user_input: str
    response_content: str
    facet: FacetType
    meta_node_id: str
    micro_log_node_id: str
    evidence_node_ids: List[str] = []
    # Extended for ТЕ́ЛОС
    growth_node_ids: List[str] = Field(default_factory=list)
    telos_mode_used: TelosMode = TelosMode.HIDDEN


class GrowthHypergraphNode(HypergraphNode):
    """Hypergraph wrapper for GrowthNode (File 07)."""

    node_type: NodeType = NodeType.GROWTH
    growth_data: GrowthNode


class SIFTTraceNode(HypergraphNode):
    """Node for storing SIFT protocol traces (File 10)."""

    node_type: NodeType = NodeType.SIFT_TRACE
    sift_result: SIFTResult
    query: str


class CanonFeedbackNode(HypergraphNode):
    """Node for Canon Feedback Loop entries (Rule-88)."""

    node_type: NodeType = NodeType.CANON_FEEDBACK
    feedback_entry: CanonFeedbackEntry


class TelosMarkerNode(HypergraphNode):
    """Node marking ТЕ́ЛОС activation events (File 28)."""

    node_type: NodeType = NodeType.TELOS_MARKER
    mode_before: TelosMode
    mode_after: TelosMode
    trigger_phrase: Optional[str] = None
    awakening_level: int = 0  # 0=none, 1=hint, 2=direct


# =============================================================================
# 11. UTILITY MODELS
# =============================================================================

class VoiceContribution(BaseModel):
    """A voice's contribution during Council (File 08)."""

    voice: FacetType
    statement: str
    stance: str  # support, oppose, neutral
    confidence: float = Field(0.5, ge=0.0, le=1.0)


class CouncilResult(BaseModel):
    """Result of a Council convocation (File 08)."""

    topic: str
    contributions: List[VoiceContribution]
    synthesis: str
    consensus_level: float = Field(0.5, ge=0.0, le=1.0)
    dissenting_voices: List[FacetType] = Field(default_factory=list)


class DebateRound(BaseModel):
    """A round in ТЕ́ЛОС debate (File 28)."""

    round_number: int
    advocate_position: str
    advocate_argument: str
    critic_position: str
    critic_argument: str
    judge_evaluation: str
    judge_score: float = Field(0.5, ge=0.0, le=1.0)


class DebateResult(BaseModel):
    """Result of ТЕ́ЛОС multi-agent debate (File 28)."""

    topic: str
    rounds: List[DebateRound]
    final_position: str
    resolution_confidence: float = Field(0.5, ge=0.0, le=1.0)
    unresolved_tensions: List[str] = Field(default_factory=list)
