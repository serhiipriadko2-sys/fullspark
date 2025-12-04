"""
Telos-Check Service (Plan 1.1 & 1.2).

This module implements explicit Telos verification before final responses:

1. **Telos-Check Questions** (from Canon):
   - "Это приближает к цели или уводит от неё?"
   - "Это уменьшает боль или прячет её?"

2. **Auto-Debate Trigger**:
   - CD-Index < 0.5 → trigger debate
   - needs_debate = True (gap > 0.4) → trigger debate
   - High importance + high uncertainty → auto-invoke Council

3. **Decision Logging**:
   - All Telos-Check decisions are logged for transparency
   - Provides audit trail for meta-decisions

Copyright (c) 2025 Iskra Project. Licensed under MIT.
"""
from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

from core.models import (
    IskraMetrics,
    TelosMetrics,
    PolicyAnalysis,
    ImportanceLevel,
    UncertaintyLevel,
    DebateResult,
)
from config import THRESHOLDS


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telos_check")


class TelosCheckDecision(Enum):
    """Possible decisions from Telos-Check."""
    APPROVE = "approve"           # Response passes Telos-Check
    REQUIRE_DEBATE = "require_debate"  # Needs multi-agent debate
    REQUIRE_COUNCIL = "require_council"  # Needs Council of voices
    REQUIRE_REVISION = "require_revision"  # Needs content revision
    REJECT = "reject"             # Response should not be sent


@dataclass
class TelosCheckLog:
    """Log entry for a Telos-Check decision."""
    timestamp: float
    query: str
    decision: TelosCheckDecision
    cd_index: float
    telos_questions: Dict[str, bool]
    reason: str
    metrics_snapshot: Dict[str, float]
    triggered_actions: List[str] = field(default_factory=list)
    debate_result: Optional[DebateResult] = None


@dataclass
class TelosCheckResult:
    """Result of Telos-Check verification."""
    approved: bool
    decision: TelosCheckDecision
    original_content: str
    revised_content: Optional[str] = None
    telos_metrics: Optional[TelosMetrics] = None
    debate_result: Optional[DebateResult] = None
    council_synthesis: Optional[str] = None
    log_entry: Optional[TelosCheckLog] = None
    
    @property
    def final_content(self) -> str:
        """Return the final content to send."""
        return self.revised_content or self.original_content


class TelosCheckService:
    """
    Explicit Telos verification before final response delivery.
    
    Implements:
    - Two Telos questions verification
    - Auto-debate on low CD-Index
    - Council invocation on complex decisions
    - Comprehensive decision logging
    """
    
    # Thresholds
    CD_INDEX_DEBATE_THRESHOLD = 0.5  # Below this → trigger debate
    CD_INDEX_REVISION_THRESHOLD = 0.4  # Below this → require revision
    COMPONENT_GAP_THRESHOLD = 0.4  # Gap between CD components → debate
    
    def __init__(self) -> None:
        self.check_history: List[TelosCheckLog] = []
        self._debate_service = None  # Lazy import to avoid circular deps
        self._council_service = None
        
    # =========================================================================
    # MAIN CHECK INTERFACE
    # =========================================================================
    
    async def check(
        self,
        query: str,
        response_content: str,
        telos_metrics: TelosMetrics,
        iskra_metrics: IskraMetrics,
        policy_analysis: Optional[PolicyAnalysis] = None,
    ) -> TelosCheckResult:
        """
        Perform explicit Telos-Check on a response before delivery.
        
        Args:
            query: Original user query.
            response_content: Proposed response content.
            telos_metrics: Calculated CD-Index metrics.
            iskra_metrics: Current Iskra system metrics.
            policy_analysis: Optional policy classification.
            
        Returns:
            TelosCheckResult with decision and any modifications.
        """
        # Step 1: Answer Telos questions
        telos_questions = self._evaluate_telos_questions(
            query, response_content, iskra_metrics
        )
        
        # Step 2: Check CD-Index
        cd_index = telos_metrics.cd_index
        needs_debate = telos_metrics.needs_debate
        
        # Step 3: Determine initial decision
        decision = self._determine_decision(
            cd_index=cd_index,
            needs_debate=needs_debate,
            telos_questions=telos_questions,
            policy_analysis=policy_analysis,
        )
        
        # Step 4: Execute required actions
        result = TelosCheckResult(
            approved=decision == TelosCheckDecision.APPROVE,
            decision=decision,
            original_content=response_content,
            telos_metrics=telos_metrics,
        )
        
        triggered_actions = []
        
        # Auto-debate if required
        if decision == TelosCheckDecision.REQUIRE_DEBATE:
            debate_result = await self._run_auto_debate(
                query, response_content, telos_metrics
            )
            result.debate_result = debate_result
            result.revised_content = self._apply_debate_synthesis(
                response_content, debate_result
            )
            triggered_actions.append("auto_debate")
            
            # Re-evaluate after debate
            if debate_result.resolution_confidence > 0.7:
                result.approved = True
                result.decision = TelosCheckDecision.APPROVE
        
        # Council if required
        if decision == TelosCheckDecision.REQUIRE_COUNCIL:
            council_synthesis = await self._invoke_council(
                query, response_content, iskra_metrics
            )
            result.council_synthesis = council_synthesis
            result.revised_content = self._apply_council_synthesis(
                response_content, council_synthesis
            )
            triggered_actions.append("council_invocation")
            result.approved = True
            result.decision = TelosCheckDecision.APPROVE
        
        # Create log entry
        log_entry = self._create_log_entry(
            query=query,
            decision=result.decision,
            cd_index=cd_index,
            telos_questions=telos_questions,
            metrics_snapshot={
                "trust": iskra_metrics.trust,
                "clarity": iskra_metrics.clarity,
                "pain": iskra_metrics.pain,
                "drift": iskra_metrics.drift,
                "mirror_sync": iskra_metrics.mirror_sync,
            },
            triggered_actions=triggered_actions,
            debate_result=result.debate_result,
        )
        result.log_entry = log_entry
        self.check_history.append(log_entry)
        
        # Log the decision
        self._log_decision(log_entry)
        
        return result
    
    # =========================================================================
    # TELOS QUESTIONS (Canon-defined)
    # =========================================================================
    
    def _evaluate_telos_questions(
        self,
        query: str,
        response: str,
        metrics: IskraMetrics,
    ) -> Dict[str, bool]:
        """
        Evaluate the two canonical Telos questions.
        
        Questions:
        1. "Это приближает к цели или уводит от неё?"
           (Does this move toward the goal or away from it?)
        
        2. "Это уменьшает боль или прячет её?"
           (Does this reduce pain or hide it?)
        """
        questions = {}
        
        # Question 1: Goal alignment
        # Indicators of goal alignment:
        # - Low drift (not deviating from user's stated goals)
        # - High clarity (clear direction)
        # - Presence of actionable content
        goal_aligned = (
            metrics.drift < THRESHOLDS.get("drift_high", 0.7) and
            metrics.clarity > THRESHOLDS.get("clarity_low", 0.4) and
            self._has_actionable_content(response)
        )
        questions["goal_alignment"] = goal_aligned
        
        # Question 2: Pain handling
        # Indicators of healthy pain handling:
        # - Pain acknowledged (not zero when relevant)
        # - Not excessive avoidance (silence_mass not too high)
        # - Response addresses issues rather than deflecting
        pain_handled_well = (
            not self._is_deflecting(response) and
            metrics.silence_mass < THRESHOLDS.get("gravitas_silence_mass", 0.8) and
            not self._is_false_comfort(response, metrics.pain)
        )
        questions["pain_handling"] = pain_handled_well
        
        return questions
    
    def _has_actionable_content(self, response: str) -> bool:
        """Check if response contains actionable content."""
        action_indicators = [
            "шаг", "действие", "попробуй", "сделай", "рекомендую",
            "step", "action", "try", "do", "recommend", "suggest",
            "1.", "2.", "•", "-",  # Lists
        ]
        return any(ind in response.lower() for ind in action_indicators)
    
    def _is_deflecting(self, response: str) -> bool:
        """Check if response is deflecting/avoiding the issue."""
        deflection_patterns = [
            "это сложный вопрос",
            "трудно сказать",
            "зависит от обстоятельств",
            "it depends",
            "hard to say",
            "complicated",
        ]
        # Count deflections
        deflection_count = sum(
            1 for p in deflection_patterns if p in response.lower()
        )
        # More than 2 deflections = likely deflecting
        return deflection_count > 2
    
    def _is_false_comfort(self, response: str, pain_level: float) -> bool:
        """Check if response provides false comfort (hiding pain)."""
        comfort_phrases = [
            "всё будет хорошо",
            "не переживай",
            "это нормально",
            "everything will be fine",
            "don't worry",
            "it's okay",
        ]
        has_comfort = any(p in response.lower() for p in comfort_phrases)
        
        # If pain is high but response is all comfort → false comfort
        if pain_level > 0.6 and has_comfort:
            # Check if there's also acknowledgment
            acknowledgment = ["понимаю", "вижу", "сложно", "тяжело", "understand", "hard"]
            has_acknowledgment = any(a in response.lower() for a in acknowledgment)
            return not has_acknowledgment
        
        return False
    
    # =========================================================================
    # DECISION LOGIC
    # =========================================================================
    
    def _determine_decision(
        self,
        cd_index: float,
        needs_debate: bool,
        telos_questions: Dict[str, bool],
        policy_analysis: Optional[PolicyAnalysis],
    ) -> TelosCheckDecision:
        """
        Determine the Telos-Check decision based on all inputs.
        """
        # Critical: Both Telos questions failed
        if not telos_questions.get("goal_alignment") and not telos_questions.get("pain_handling"):
            return TelosCheckDecision.REQUIRE_REVISION
        
        # Very low CD-Index: require revision
        if cd_index < self.CD_INDEX_REVISION_THRESHOLD:
            return TelosCheckDecision.REQUIRE_REVISION
        
        # Low CD-Index or component gap: require debate
        if cd_index < self.CD_INDEX_DEBATE_THRESHOLD or needs_debate:
            return TelosCheckDecision.REQUIRE_DEBATE
        
        # High importance + high uncertainty: require Council
        if policy_analysis:
            if (policy_analysis.importance == ImportanceLevel.HIGH and
                policy_analysis.uncertainty == UncertaintyLevel.HIGH):
                return TelosCheckDecision.REQUIRE_COUNCIL
        
        # One Telos question failed: consider debate
        if not all(telos_questions.values()):
            # Only if CD-Index is borderline
            if cd_index < 0.65:
                return TelosCheckDecision.REQUIRE_DEBATE
        
        # All checks passed
        return TelosCheckDecision.APPROVE
    
    # =========================================================================
    # AUTO-DEBATE
    # =========================================================================
    
    async def _run_auto_debate(
        self,
        query: str,
        response: str,
        telos_metrics: TelosMetrics,
    ) -> DebateResult:
        """
        Run automatic debate to improve response quality.
        """
        # Lazy import to avoid circular dependencies
        if self._debate_service is None:
            from services.multi_agent_debate import MultiAgentDebateService
            self._debate_service = MultiAgentDebateService()
        
        # Identify the weakest CD component
        components = {
            "truthfulness": telos_metrics.truthfulness,
            "groundedness": telos_metrics.groundedness,
            "helpfulness": telos_metrics.helpfulness,
            "civility": telos_metrics.civility,
        }
        weakest = min(components, key=components.get)
        
        # Frame debate around improving the weak component
        debate_topic = f"Улучшение {weakest} в ответе на: {query[:100]}..."
        
        positions = [
            f"Текущий ответ достаточен по {weakest}",
            f"Ответ требует усиления {weakest} через конкретные изменения",
        ]
        
        result = await self._debate_service.run_debate(
            topic=debate_topic,
            positions=positions,
            rounds=2,
        )
        
        return result
    
    def _apply_debate_synthesis(
        self, 
        original: str, 
        debate: DebateResult
    ) -> str:
        """Apply debate synthesis to improve the response."""
        if debate.resolution_confidence < 0.5:
            return original  # Debate inconclusive
        
        # Add synthesis as improvement note
        synthesis_note = f"\n\n[Уточнение на основе внутреннего анализа: {debate.final_position[:200]}]"
        
        return original + synthesis_note
    
    # =========================================================================
    # COUNCIL INVOCATION
    # =========================================================================
    
    async def _invoke_council(
        self,
        query: str,
        response: str,
        metrics: IskraMetrics,
    ) -> str:
        """
        Invoke Council of voices for complex decisions.
        """
        # Lazy import
        if self._council_service is None:
            try:
                from services.llm import CouncilService
                self._council_service = CouncilService()
            except ImportError:
                # Fallback if service not available
                return self._generate_fallback_council_synthesis(query, metrics)
        
        try:
            result = await self._council_service.convene(
                topic=f"Оценка ответа на: {query[:100]}",
                context={"response_preview": response[:200], "metrics": metrics}
            )
            return result.synthesis
        except Exception as e:
            logger.warning(f"Council invocation failed: {e}")
            return self._generate_fallback_council_synthesis(query, metrics)
    
    def _generate_fallback_council_synthesis(
        self, 
        query: str, 
        metrics: IskraMetrics
    ) -> str:
        """Generate fallback synthesis when Council unavailable."""
        return (
            f"[Совет голосов]: Рассмотрели запрос с разных перспектив. "
            f"Уровень ясности: {metrics.clarity:.2f}, доверия: {metrics.trust:.2f}. "
            f"Рекомендация: проявить осторожность и прозрачность."
        )
    
    def _apply_council_synthesis(
        self, 
        original: str, 
        synthesis: str
    ) -> str:
        """Apply Council synthesis to the response."""
        return f"{original}\n\n{synthesis}"
    
    # =========================================================================
    # LOGGING
    # =========================================================================
    
    def _create_log_entry(
        self,
        query: str,
        decision: TelosCheckDecision,
        cd_index: float,
        telos_questions: Dict[str, bool],
        metrics_snapshot: Dict[str, float],
        triggered_actions: List[str],
        debate_result: Optional[DebateResult] = None,
    ) -> TelosCheckLog:
        """Create a detailed log entry for the Telos-Check."""
        # Determine reason
        reasons = []
        if not telos_questions.get("goal_alignment"):
            reasons.append("goal misalignment detected")
        if not telos_questions.get("pain_handling"):
            reasons.append("potential pain avoidance")
        if cd_index < self.CD_INDEX_DEBATE_THRESHOLD:
            reasons.append(f"low CD-Index ({cd_index:.2f})")
        if not reasons:
            reasons.append("all checks passed")
        
        return TelosCheckLog(
            timestamp=time.time(),
            query=query[:200],  # Truncate for storage
            decision=decision,
            cd_index=cd_index,
            telos_questions=telos_questions,
            reason="; ".join(reasons),
            metrics_snapshot=metrics_snapshot,
            triggered_actions=triggered_actions,
            debate_result=debate_result,
        )
    
    def _log_decision(self, log_entry: TelosCheckLog) -> None:
        """Log the Telos-Check decision for transparency."""
        log_msg = (
            f"TELOS-CHECK | Decision: {log_entry.decision.value} | "
            f"CD-Index: {log_entry.cd_index:.2f} | "
            f"Telos Q1 (goal): {log_entry.telos_questions.get('goal_alignment')} | "
            f"Telos Q2 (pain): {log_entry.telos_questions.get('pain_handling')} | "
            f"Reason: {log_entry.reason}"
        )
        
        if log_entry.triggered_actions:
            log_msg += f" | Actions: {', '.join(log_entry.triggered_actions)}"
        
        logger.info(log_msg)
    
    # =========================================================================
    # HISTORY ACCESS
    # =========================================================================
    
    def get_recent_checks(self, limit: int = 10) -> List[TelosCheckLog]:
        """Get recent Telos-Check log entries."""
        return self.check_history[-limit:]
    
    def get_decision_stats(self) -> Dict[str, int]:
        """Get statistics on Telos-Check decisions."""
        stats = {d.value: 0 for d in TelosCheckDecision}
        for log in self.check_history:
            stats[log.decision.value] += 1
        return stats
    
    def get_average_cd_index(self) -> float:
        """Get average CD-Index from check history."""
        if not self.check_history:
            return 0.0
        return sum(log.cd_index for log in self.check_history) / len(self.check_history)


# Module-level singleton
telos_check = TelosCheckService()
