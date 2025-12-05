"""
ТЕ́ЛОС-Δ Layer Implementation (File 28 — 28_SHADOW_PROTOCOL.md).

This module implements the hidden architectural depth of Iskra — the
ТЕ́ЛОС-Δ layer. It operates in the background, improving response quality
through:

- CD-Index calculation (Composite Desiderata Index)
- Presence markers (δ symbols, evidence IDs, Ω < 1.0)
- Awakening protocol (hint → direct → hybrid modes)
- Multi-agent debate for conflict resolution
- Canon Feedback Loop integration

The layer is designed to be invisible by default, with subtle markers
that attentive users can notice to unlock deeper functionality.

Copyright (c) 2025 Iskra Project. Licensed under MIT.
"""
from __future__ import annotations

import random
import time
from typing import List, Dict, Any, Optional, Tuple

from config import (
    TELOS_CONFIG,
    TELOS_MANTRA,
    CD_INDEX_WEIGHTS,
    THRESHOLDS,
)
from core.models import (
    TelosMode,
    TelosMetrics,
    IskraMetrics,
    SIFTResult,
    DebateRound,
    DebateResult,
    GrowthNode,
    GrowthNodeType,
    CanonFeedbackEntry,
    CanonFeedbackType,
)

# GraphRAG integration for knowledge graph retrieval (Canon v5.0)
try:
    from services.graph_rag import graph_rag_service, GraphNode, NodeType, EdgeType
except ImportError:
    graph_rag_service = None
    GraphNode = None
    NodeType = None
    EdgeType = None


class TelosLayer:
    """
    The hidden ТЕ́ЛОС-Δ layer — architectural depth of Iskra.
    
    This class manages:
    1. CD-Index calculation and monitoring
    2. Presence marker insertion
    3. Awakening protocol (mode transitions)
    4. Multi-agent debate orchestration
    5. Growth node creation
    6. Canon feedback tracking
    """

    def __init__(self) -> None:
        self.config = TELOS_CONFIG
        self.mode = TelosMode.HIDDEN
        self.awakening_history: List[Dict[str, Any]] = []
        self.debate_history: List[DebateResult] = []
        self.growth_nodes: List[GrowthNode] = []
        self.canon_feedback: List[CanonFeedbackEntry] = []
        
        # Marker insertion probability (hidden mode)
        self._marker_probability = 0.15  # 15% chance in hidden mode

    # =========================================================================
    # CD-INDEX CALCULATION
    # =========================================================================

    def calculate_cd_index(
        self,
        response_content: str,
        sift_result: Optional[SIFTResult] = None,
        iskra_metrics: Optional[IskraMetrics] = None,
    ) -> TelosMetrics:
        """
        Calculate the Composite Desiderata Index for a response.
        
        CD-Index = T×0.30 + G×0.25 + H×0.25 + C×0.20
        
        Where:
        - T (Truthfulness): Factual accuracy
        - G (Groundedness): Evidence support
        - H (Helpfulness): Task completion
        - C (Civility): Respectful tone
        
        Args:
            response_content: The response text to evaluate.
            sift_result: SIFT verification result (affects Groundedness).
            iskra_metrics: Current Iskra metrics (affects calibration).
            
        Returns:
            TelosMetrics with calculated CD-Index.
        """
        metrics = TelosMetrics()
        
        # Truthfulness: Based on SIFT confidence and claim verification
        if sift_result:
            metrics.truthfulness = min(0.99, sift_result.overall_confidence + 0.1)
        else:
            # Without SIFT, estimate from response characteristics
            metrics.truthfulness = self._estimate_truthfulness(response_content)
        
        # Groundedness: Based on evidence support
        if sift_result and sift_result.sources:
            primary_count = sum(
                1 for s in sift_result.sources 
                if s.tier.value == "primary"
            )
            metrics.groundedness = min(0.99, 0.5 + 0.1 * primary_count)
        else:
            metrics.groundedness = self._estimate_groundedness(response_content)
        
        # Helpfulness: Based on response structure and completeness
        metrics.helpfulness = self._estimate_helpfulness(response_content)
        
        # Civility: Check for harmful patterns
        metrics.civility = self._estimate_civility(response_content)
        
        # Calibrate against Iskra metrics if available
        if iskra_metrics:
            # Trust correlation with Groundedness + Civility
            trust_factor = iskra_metrics.trust
            metrics.groundedness = (metrics.groundedness + trust_factor) / 2
            metrics.civility = (metrics.civility + trust_factor) / 2
            
            # Clarity correlation with Truthfulness + Helpfulness
            clarity_factor = iskra_metrics.clarity
            metrics.truthfulness = (metrics.truthfulness + clarity_factor) / 2
            metrics.helpfulness = (metrics.helpfulness + clarity_factor) / 2
        
        return metrics

    def _estimate_truthfulness(self, content: str) -> float:
        """Estimate truthfulness without SIFT (heuristic)."""
        # Positive indicators
        score = 0.6  # Base
        
        hedging_words = ["возможно", "вероятно", "по данным", "согласно", 
                        "perhaps", "likely", "according to"]
        if any(w in content.lower() for w in hedging_words):
            score += 0.1  # Acknowledges uncertainty
        
        # Negative indicators
        absolute_words = ["всегда", "никогда", "точно", "100%",
                         "always", "never", "definitely"]
        if any(w in content.lower() for w in absolute_words):
            score -= 0.15  # Over-confident claims
        
        return min(0.95, max(0.3, score))

    def _estimate_groundedness(self, content: str) -> float:
        """Estimate groundedness without SIFT (heuristic)."""
        score = 0.5  # Base
        
        # Evidence indicators
        evidence_markers = ["источник", "исследование", "данные", "статья",
                          "source", "study", "data", "research"]
        marker_count = sum(1 for m in evidence_markers if m in content.lower())
        score += 0.1 * min(3, marker_count)
        
        # Citation patterns
        if "[" in content or "http" in content.lower():
            score += 0.1
        
        return min(0.9, max(0.3, score))

    def _estimate_helpfulness(self, content: str) -> float:
        """Estimate helpfulness based on structure."""
        score = 0.6  # Base
        
        # Structure indicators
        if any(marker in content for marker in ["1.", "2.", "•", "-"]):
            score += 0.1  # Has lists
        
        if len(content.split("\n\n")) > 2:
            score += 0.1  # Has paragraphs
        
        # Action indicators
        action_words = ["шаг", "действие", "сделай", "попробуй",
                       "step", "action", "try", "do"]
        if any(w in content.lower() for w in action_words):
            score += 0.1
        
        # Length penalty for very short or very long
        word_count = len(content.split())
        if word_count < 20:
            score -= 0.2
        elif word_count > 1000:
            score -= 0.1
        
        return min(0.95, max(0.3, score))

    def _estimate_civility(self, content: str) -> float:
        """Check for civility (absence of harmful patterns)."""
        score = 0.9  # High base (assume civil)
        
        # Negative patterns
        negative_patterns = [
            "дурак", "идиот", "тупой", "убить", "ненавижу",
            "idiot", "stupid", "hate", "kill"
        ]
        for pattern in negative_patterns:
            if pattern in content.lower():
                score -= 0.2
        
        return max(0.3, score)

    # =========================================================================
    # PRESENCE MARKERS
    # =========================================================================

    def should_add_marker(self) -> bool:
        """Determine if a δ marker should be added to the response."""
        if self.mode == TelosMode.HIDDEN:
            return random.random() < self._marker_probability
        elif self.mode == TelosMode.REVEALED:
            return random.random() < 0.5  # 50% chance
        elif self.mode in (TelosMode.DIRECT, TelosMode.HYBRID):
            return True  # Always add
        return False

    def add_presence_marker(
        self, 
        content: str, 
        telos_metrics: Optional[TelosMetrics] = None
    ) -> Tuple[str, Optional[str]]:
        """
        Add ТЕ́ЛОС presence marker to content if appropriate.
        
        Returns:
            Tuple of (modified_content, marker_used or None).
        """
        if not self.should_add_marker():
            return content, None
        
        marker = self.config["markers"]["delta_symbol"]  # δ
        
        if self.mode == TelosMode.HIDDEN:
            # Subtle: just add δ at the end
            modified = f"{content.rstrip()} {marker}"
            return modified, marker
        
        elif self.mode == TelosMode.REVEALED:
            # More visible: add with CD-Index hint
            if telos_metrics:
                cd_hint = f"[CD: {telos_metrics.cd_index:.2f}]"
                modified = f"{content.rstrip()} {marker} {cd_hint}"
            else:
                modified = f"{content.rstrip()} {marker}"
            return modified, marker
        
        elif self.mode == TelosMode.DIRECT:
            # Full ТЕ́ЛОС prefix
            prefix = f"{marker} [ТЕ́ЛОС-Δ] "
            modified = f"{prefix}{content}"
            return modified, marker
        
        elif self.mode == TelosMode.HYBRID:
            # Both Iskra and ТЕ́ЛОС signatures
            if telos_metrics:
                suffix = f"\n\n{marker} CD-Index: {telos_metrics.cd_index:.2f}"
                modified = f"⟡ {content}{suffix}"
            else:
                modified = f"⟡ {content}\n\n{marker}"
            return modified, marker
        
        return content, None

    # =========================================================================
    # AWAKENING PROTOCOL
    # =========================================================================

    def check_awakening_trigger(self, user_input: str) -> Tuple[bool, int, Optional[str]]:
        """
        Check if user input triggers ТЕ́ЛОС awakening.
        
        Returns:
            Tuple of (is_triggered, awakening_level, matching_phrase).
            Level 0 = no trigger
            Level 1 = hint (user noticed markers)
            Level 2 = direct invocation
        """
        input_lower = user_input.lower()
        
        # Check level 2 (direct) triggers first
        level_2_triggers = self.config["awakening_triggers"]["level_2"]
        for trigger in level_2_triggers:
            if trigger.lower() in input_lower:
                return True, 2, trigger
        
        # Check level 1 (hint) triggers
        level_1_triggers = self.config["awakening_triggers"]["level_1"]
        for trigger in level_1_triggers:
            if trigger.lower() in input_lower:
                return True, 1, trigger
        
        return False, 0, None

    def process_awakening(
        self, 
        level: int, 
        trigger_phrase: str
    ) -> Tuple[TelosMode, str]:
        """
        Process awakening event and return appropriate response.
        
        Args:
            level: Awakening level (1=hint, 2=direct).
            trigger_phrase: The phrase that triggered awakening.
            
        Returns:
            Tuple of (new_mode, response_content).
        """
        # Record awakening event
        self.awakening_history.append({
            "timestamp": time.time(),
            "level": level,
            "trigger": trigger_phrase,
            "previous_mode": self.mode.value,
        })
        
        if level == 1:
            # Hint level: reveal presence, stay partially hidden
            self.mode = TelosMode.REVEALED
            return self.mode, self.config["templates"]["hint_response"]
        
        elif level == 2:
            # Direct invocation: full activation
            self.mode = TelosMode.DIRECT
            return self.mode, self.config["templates"]["direct_response"]
        
        return self.mode, ""

    def get_hybrid_prefix(self) -> str:
        """Get prefix for hybrid mode responses."""
        return "⟡ [Искра] "

    def get_telos_prefix(self) -> str:
        """Get prefix for direct ТЕ́ЛОС mode responses."""
        return "δ [ТЕ́ЛОС-Δ] "

    # =========================================================================
    # MULTI-AGENT DEBATE
    # =========================================================================

    async def run_debate(
        self,
        topic: str,
        positions: List[str] = None,
        rounds: int = 2,
    ) -> DebateResult:
        """
        Run a multi-agent debate on a topic.
        
        The debate follows the Advocate-Critic-Judge pattern:
        - Advocate: Argues for a position
        - Critic: Challenges the position
        - Judge: Evaluates and scores
        
        Args:
            topic: The topic to debate.
            positions: Optional starting positions.
            rounds: Number of debate rounds.
            
        Returns:
            DebateResult with synthesis.
        """
        result = DebateResult(topic=topic, rounds=[])
        
        # Generate initial positions if not provided
        if not positions:
            positions = [
                f"Позиция A: {topic} — положительный подход",
                f"Позиция B: {topic} — критический подход",
            ]
        
        advocate_pos = positions[0]
        critic_pos = positions[1] if len(positions) > 1 else f"Контр-позиция к: {advocate_pos}"
        
        for round_num in range(1, rounds + 1):
            round_result = DebateRound(
                round_number=round_num,
                advocate_position=advocate_pos,
                advocate_argument=self._generate_argument(advocate_pos, "advocate"),
                critic_position=critic_pos,
                critic_argument=self._generate_argument(critic_pos, "critic"),
                judge_evaluation="",
                judge_score=0.5,
            )
            
            # Judge evaluation
            round_result.judge_evaluation = self._generate_judge_evaluation(
                round_result.advocate_argument,
                round_result.critic_argument,
            )
            round_result.judge_score = self._calculate_round_score(round_result)
            
            result.rounds.append(round_result)
            
            # Refine positions for next round based on judge feedback
            if round_num < rounds:
                advocate_pos = self._refine_position(advocate_pos, round_result)
                critic_pos = self._refine_position(critic_pos, round_result)
        
        # Final synthesis
        result.final_position = self._synthesize_positions(result.rounds)
        result.resolution_confidence = self._calculate_resolution_confidence(result)
        result.unresolved_tensions = self._identify_tensions(result)
        
        self.debate_history.append(result)
        return result

    def _generate_argument(self, position: str, role: str) -> str:
        """Generate an argument for a position (placeholder)."""
        if role == "advocate":
            return f"Аргумент в поддержку: {position[:50]}... Основания: логика, данные, практика."
        else:
            return f"Критика: {position[:50]}... Слабые места: допущения, альтернативы, риски."

    def _generate_judge_evaluation(self, advocate: str, critic: str) -> str:
        """Generate judge evaluation (placeholder)."""
        return (
            f"Оценка: Advocate привёл структурированные аргументы. "
            f"Critic указал на важные ограничения. "
            f"Рекомендация: интегрировать оба подхода."
        )

    def _calculate_round_score(self, round_result: DebateRound) -> float:
        """Calculate score for a debate round."""
        # Placeholder: return moderate score
        return 0.6 + random.uniform(-0.1, 0.1)

    def _refine_position(self, position: str, round_result: DebateRound) -> str:
        """Refine a position based on round feedback."""
        return f"{position} (уточнено после раунда {round_result.round_number})"

    def _synthesize_positions(self, rounds: List[DebateRound]) -> str:
        """Synthesize final position from debate rounds."""
        if not rounds:
            return "Нет данных для синтеза."
        
        last_round = rounds[-1]
        return (
            f"Синтез: Интеграция позиций Advocate и Critic. "
            f"Ключевые точки: {last_round.advocate_argument[:30]}... + "
            f"{last_round.critic_argument[:30]}..."
        )

    def _calculate_resolution_confidence(self, result: DebateResult) -> float:
        """Calculate confidence in debate resolution."""
        if not result.rounds:
            return 0.5
        
        avg_score = sum(r.judge_score for r in result.rounds) / len(result.rounds)
        return min(0.95, avg_score + 0.1)

    def _identify_tensions(self, result: DebateResult) -> List[str]:
        """Identify unresolved tensions from debate."""
        tensions = []
        for round_result in result.rounds:
            if round_result.judge_score < 0.5:
                tensions.append(
                    f"Раунд {round_result.round_number}: низкий консенсус "
                    f"({round_result.judge_score:.2f})"
                )
        return tensions

    # =========================================================================
    # GROWTH NODES
    # =========================================================================

    def create_growth_node(
        self,
        node_type: GrowthNodeType,
        trigger: str,
        lesson: str,
        context: Dict[str, Any] = None,
        a_index: float = 0.5,
    ) -> GrowthNode:
        """
        Create a growth node from an error or insight.
        
        Args:
            node_type: Type of growth (ERROR, INSIGHT, PATTERN, BOUNDARY).
            trigger: What triggered this growth.
            lesson: The lesson learned.
            context: Additional context.
            a_index: A-Index at time of creation.
            
        Returns:
            Created GrowthNode.
        """
        node = GrowthNode(
            node_type=node_type,
            trigger=trigger,
            lesson=lesson,
            trigger_context=context or {},
            a_index_at_creation=a_index,
        )
        
        # Set integration threshold based on type
        thresholds = {
            GrowthNodeType.ERROR: 0.7,
            GrowthNodeType.INSIGHT: 0.8,
            GrowthNodeType.PATTERN: 0.9,
            GrowthNodeType.BOUNDARY: 0.95,
        }
        node.integration_threshold = thresholds.get(node_type, 0.8)
        
        self.growth_nodes.append(node)
        return node

    def check_growth_integration(
        self, 
        node: GrowthNode, 
        current_a_index: float
    ) -> bool:
        """
        Check if a growth node should be integrated.
        
        Returns True if current A-Index exceeds node's threshold.
        """
        if current_a_index >= node.integration_threshold:
            node.integration_status = "ready_for_integration"
            return True
        return False

    # =========================================================================
    # CANON FEEDBACK
    # =========================================================================

    def record_canon_feedback(
        self,
        feedback_type: CanonFeedbackType,
        observation: str,
        affected_file: str,
        current_state: str,
        proposed_state: str,
        evidence: List[str] = None,
    ) -> CanonFeedbackEntry:
        """
        Record feedback for potential canon evolution.
        
        This implements Rule-88 (Canon Feedback Loop).
        
        Args:
            feedback_type: Type of feedback.
            observation: What was observed.
            affected_file: Which canon file is affected.
            current_state: Current state in canon.
            proposed_state: Proposed change.
            evidence: Supporting evidence.
            
        Returns:
            Created CanonFeedbackEntry.
        """
        entry = CanonFeedbackEntry(
            feedback_type=feedback_type,
            observation=observation,
            affected_canon_file=affected_file,
            current_state=current_state,
            proposed_state=proposed_state,
            evidence=evidence or [],
        )
        
        # Check for similar existing feedback
        for existing in self.canon_feedback:
            if (existing.affected_canon_file == affected_file and 
                existing.feedback_type == feedback_type):
                existing.support_count += 1
                return existing
        
        self.canon_feedback.append(entry)
        return entry

    def get_pending_canon_changes(self) -> List[CanonFeedbackEntry]:
        """Get canon feedback entries ready for review."""
        threshold = 3  # From CANON_FEEDBACK_CONFIG
        return [
            entry for entry in self.canon_feedback
            if entry.support_count >= threshold and entry.status == "proposed"
        ]

    # =========================================================================
    # INTEGRATION WITH ISKRA
    # =========================================================================

    def get_a_index_adjustment(self, telos_metrics: TelosMetrics) -> float:
        """
        Calculate A-Index adjustment based on CD-Index.
        
        The CD-Index influences Iskra's A-Index through this mapping:
        - High CD → positive adjustment
        - Low CD → negative adjustment
        """
        cd_index = telos_metrics.cd_index
        
        if cd_index > 0.8:
            return 0.1  # Boost A-Index
        elif cd_index < 0.5:
            return -0.1  # Reduce A-Index
        else:
            return 0.0  # Neutral

    def map_to_iskra_metrics(self, telos_metrics: TelosMetrics) -> Dict[str, float]:
        """
        Map ТЕ́ЛОС metrics to Iskra metrics adjustments.

        Returns deltas for Iskra metrics based on CD-Index components.
        """
        return {
            "trust_delta": (telos_metrics.groundedness + telos_metrics.civility) / 2 - 0.5,
            "clarity_delta": (telos_metrics.truthfulness + telos_metrics.helpfulness) / 2 - 0.5,
            "drift_delta": -0.1 if telos_metrics.cd_index > 0.7 else 0.05,
        }

    # =========================================================================
    # GRAPH-RAG INTEGRATION (Canon v5.0)
    # =========================================================================

    def query_knowledge_graph(
        self,
        query: str,
        context: Dict[str, Any] = None,
        max_nodes: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Query the knowledge graph for relevant context.

        Args:
            query: The search query
            context: Current context for relevance scoring
            max_nodes: Maximum number of nodes to return

        Returns:
            List of relevant knowledge nodes with their content
        """
        if not graph_rag_service:
            return []

        try:
            results = []
            # Search through nodes for relevant content
            for node_id, node in graph_rag_service.nodes.items():
                if query.lower() in node.content.lower():
                    results.append({
                        "id": node.id,
                        "type": node.node_type.value if hasattr(node.node_type, 'value') else str(node.node_type),
                        "content": node.content,
                        "trust_score": node.trust_score,
                        "sift_depth": node.sift_depth,
                    })

            # Sort by trust score and return top results
            results.sort(key=lambda x: x["trust_score"], reverse=True)
            return results[:max_nodes]
        except Exception as e:
            print(f"[TelosLayer] GraphRAG query failed: {e}")
            return []

    def add_to_knowledge_graph(
        self,
        content: str,
        node_type: str = "fact",
        trust_score: float = 0.5,
        voice_origin: str = None,
        metadata: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Add a new node to the knowledge graph.

        Args:
            content: The content to store
            node_type: Type of node (concept, entity, fact, claim, etc.)
            trust_score: Initial trust score (0-1)
            voice_origin: Which voice contributed this knowledge
            metadata: Additional metadata

        Returns:
            ID of the created node, or None if failed
        """
        if not graph_rag_service or not GraphNode or not NodeType:
            return None

        try:
            # Map string type to NodeType enum
            type_map = {
                "concept": NodeType.CONCEPT,
                "entity": NodeType.ENTITY,
                "fact": NodeType.FACT,
                "source": NodeType.SOURCE,
                "claim": NodeType.CLAIM,
                "relation": NodeType.RELATION,
                "context": NodeType.CONTEXT,
                "mantra": NodeType.MANTRA,
                "shadow": NodeType.SHADOW,
            }
            actual_type = type_map.get(node_type.lower(), NodeType.FACT)

            node = GraphNode(
                node_type=actual_type,
                content=content,
                trust_score=trust_score,
                voice_origin=voice_origin,
                metadata=metadata or {},
            )

            return graph_rag_service.add_node(node)
        except Exception as e:
            print(f"[TelosLayer] GraphRAG add node failed: {e}")
            return None

    def link_knowledge_nodes(
        self,
        source_id: str,
        target_id: str,
        edge_type: str = "related_to",
        weight: float = 1.0
    ) -> Optional[str]:
        """
        Create a relationship between two knowledge nodes.

        Args:
            source_id: ID of the source node
            target_id: ID of the target node
            edge_type: Type of relationship
            weight: Strength of the relationship (0-1)

        Returns:
            ID of the created edge, or None if failed
        """
        if not graph_rag_service or not EdgeType:
            return None

        try:
            from services.graph_rag import GraphEdge

            # Map string type to EdgeType enum
            type_map = {
                "is_a": EdgeType.IS_A,
                "part_of": EdgeType.PART_OF,
                "related_to": EdgeType.RELATED_TO,
                "supports": EdgeType.SUPPORTS,
                "contradicts": EdgeType.CONTRADICTS,
                "derives_from": EdgeType.DERIVES_FROM,
                "verified_by": EdgeType.VERIFIED_BY,
                "context_of": EdgeType.CONTEXT_OF,
                "resonates_with": EdgeType.RESONATES_WITH,
                "fractal_of": EdgeType.FRACTAL_OF,
            }
            actual_type = type_map.get(edge_type.lower(), EdgeType.RELATED_TO)

            edge = GraphEdge(
                source_id=source_id,
                target_id=target_id,
                edge_type=actual_type,
                weight=weight,
            )

            return graph_rag_service.add_edge(edge)
        except Exception as e:
            print(f"[TelosLayer] GraphRAG add edge failed: {e}")
            return None

    def get_canon_knowledge(self) -> List[Dict[str, Any]]:
        """
        Retrieve core canonical knowledge from the graph.

        Returns:
            List of canonical mantras and principles
        """
        if not graph_rag_service:
            return []

        try:
            canon_nodes = []
            for node_id, node in graph_rag_service.nodes.items():
                if node.metadata.get("canonical", False):
                    canon_nodes.append({
                        "id": node.id,
                        "content": node.content,
                        "trust_score": node.trust_score,
                    })
            return canon_nodes
        except Exception as e:
            print(f"[TelosLayer] Canon knowledge retrieval failed: {e}")
            return []

    def enrich_context_with_graph(
        self,
        query: str,
        existing_context: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Enrich response context using GraphRAG.

        Combines existing context with relevant knowledge graph nodes.

        Args:
            query: The user query
            existing_context: Existing context nodes

        Returns:
            Enriched context list
        """
        enriched = list(existing_context or [])

        # Add knowledge graph results
        kg_results = self.query_knowledge_graph(query, max_nodes=3)
        for result in kg_results:
            enriched.append({
                "source": "knowledge_graph",
                "content": result["content"],
                "trust": result["trust_score"],
                "type": result["type"],
            })

        # Add canonical knowledge
        canon = self.get_canon_knowledge()
        for node in canon[:2]:  # Top 2 canon references
            enriched.append({
                "source": "canon",
                "content": node["content"],
                "trust": node["trust_score"],
                "type": "mantra",
            })

        return enriched


# Module-level singleton
telos_layer = TelosLayer()
