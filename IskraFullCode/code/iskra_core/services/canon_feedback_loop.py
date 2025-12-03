"""
Canon Feedback Loop Implementation (Rule-88, телос_δ_feedback_loop).

This module implements the Canon Feedback Loop — a mechanism for the
system to evolve its own canonical documentation based on practical
experience. It tracks discrepancies between canon and behavior,
proposes changes, and manages the review process.

The loop operates through:
1. Detection: Notice when behavior diverges from canon
2. Proposal: Generate change proposals with evidence
3. Review: Track proposals until threshold reached
4. Integration: Mark changes as accepted for manual review

This is part of the ТЕ́ЛОС-Δ layer (File 28) and implements Rule-88
from the canonical documents.

Copyright (c) 2025 Iskra Project. Licensed under MIT.
"""
from __future__ import annotations

import time
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

from core.models import (
    CanonFeedbackEntry,
    CanonFeedbackType,
    CanonFeedbackNode,
    IskraMetrics,
    GrowthNode,
)
from config import CANON_FEEDBACK_CONFIG


@dataclass
class CanonConflict:
    """A detected conflict between canon and behavior."""
    
    conflict_id: str
    canon_file: str
    canon_section: str
    expected_behavior: str
    actual_behavior: str
    severity: str = "low"  # low, medium, high
    timestamp: float = field(default_factory=time.time)
    resolution_status: str = "open"  # open, proposed, resolved, ignored
    resolution_notes: Optional[str] = None


@dataclass
class ChangeProposal:
    """A proposed change to canon documentation."""
    
    proposal_id: str
    affected_file: str
    section: str
    change_type: str  # add, modify, remove, clarify
    current_text: str
    proposed_text: str
    rationale: str
    evidence_count: int = 0
    evidence_ids: List[str] = field(default_factory=list)
    status: str = "draft"  # draft, proposed, under_review, accepted, rejected
    created_at: float = field(default_factory=time.time)
    reviewed_at: Optional[float] = None
    reviewer_notes: Optional[str] = None


class CanonFeedbackLoop:
    """
    Implements the Canon Feedback Loop (Rule-88).
    
    This system tracks:
    - Conflicts between canon and actual behavior
    - Proposals for canon changes
    - Evidence accumulation
    - Review status
    
    The loop follows the principle: "Canon evolves from practice."
    """

    def __init__(self) -> None:
        self.config = CANON_FEEDBACK_CONFIG
        self.conflicts: Dict[str, CanonConflict] = {}
        self.proposals: Dict[str, ChangeProposal] = {}
        self.feedback_entries: List[CanonFeedbackEntry] = []
        self._evolution_threshold = self.config.get("evolution_threshold", 3)

    # =========================================================================
    # CONFLICT DETECTION
    # =========================================================================

    def detect_conflict(
        self,
        canon_file: str,
        canon_section: str,
        expected: str,
        actual: str,
        context: Dict[str, Any] = None,
    ) -> CanonConflict:
        """
        Record a detected conflict between canon and behavior.
        
        Args:
            canon_file: The canon file where expectation is defined.
            canon_section: Specific section within the file.
            expected: What the canon says should happen.
            actual: What actually happened.
            context: Additional context about the conflict.
            
        Returns:
            Created CanonConflict.
        """
        conflict_id = f"CONFLICT-{len(self.conflicts)}-{int(time.time())}"
        
        # Determine severity based on context
        severity = self._assess_severity(expected, actual, context)
        
        conflict = CanonConflict(
            conflict_id=conflict_id,
            canon_file=canon_file,
            canon_section=canon_section,
            expected_behavior=expected,
            actual_behavior=actual,
            severity=severity,
        )
        
        self.conflicts[conflict_id] = conflict
        
        # Auto-generate proposal for high-severity conflicts
        if severity == "high":
            self._auto_propose_from_conflict(conflict)
        
        return conflict

    def _assess_severity(
        self,
        expected: str,
        actual: str,
        context: Dict[str, Any] = None,
    ) -> str:
        """Assess severity of a canon conflict."""
        context = context or {}
        
        # High severity indicators
        high_indicators = [
            context.get("safety_related", False),
            context.get("user_harm", False),
            context.get("repeated_violation", False),
            "Law-" in expected,  # Violation of a Law
        ]
        if any(high_indicators):
            return "high"
        
        # Medium severity indicators
        medium_indicators = [
            context.get("affects_output", False),
            context.get("user_confusion", False),
            len(expected) > 100,  # Complex expectation
        ]
        if any(medium_indicators):
            return "medium"
        
        return "low"

    def _auto_propose_from_conflict(self, conflict: CanonConflict) -> None:
        """Automatically create a proposal from a high-severity conflict."""
        proposal = ChangeProposal(
            proposal_id=f"PROP-{conflict.conflict_id}",
            affected_file=conflict.canon_file,
            section=conflict.canon_section,
            change_type="clarify",
            current_text=conflict.expected_behavior,
            proposed_text=f"{conflict.expected_behavior}\n\n"
                         f"ПРИМЕЧАНИЕ: Практика показывает, что возможно "
                         f"отклонение: {conflict.actual_behavior[:100]}...",
            rationale=f"Автоматически сгенерировано из конфликта {conflict.conflict_id}",
            status="draft",
        )
        
        self.proposals[proposal.proposal_id] = proposal
        conflict.resolution_status = "proposed"

    # =========================================================================
    # FEEDBACK RECORDING
    # =========================================================================

    def record_feedback(
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
        
        This is the main entry point for the feedback loop.
        
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
        # Check for existing similar feedback
        for existing in self.feedback_entries:
            if (existing.affected_canon_file == affected_file and
                existing.feedback_type == feedback_type and
                self._is_similar(existing.observation, observation)):
                existing.support_count += 1
                existing.evidence.extend(evidence or [])
                self._check_evolution_threshold(existing)
                return existing
        
        # Create new entry
        entry = CanonFeedbackEntry(
            feedback_type=feedback_type,
            observation=observation,
            affected_canon_file=affected_file,
            current_state=current_state,
            proposed_state=proposed_state,
            evidence=evidence or [],
            support_count=1,
        )
        
        self.feedback_entries.append(entry)
        return entry

    def _is_similar(self, obs1: str, obs2: str) -> bool:
        """Check if two observations are similar enough to merge."""
        words1 = set(obs1.lower().split())
        words2 = set(obs2.lower().split())
        overlap = len(words1 & words2)
        union = len(words1 | words2)
        return overlap / union > 0.5 if union > 0 else False

    def _check_evolution_threshold(self, entry: CanonFeedbackEntry) -> None:
        """Check if feedback has reached evolution threshold."""
        if entry.support_count >= self._evolution_threshold:
            if entry.status == "proposed":
                entry.status = "under_review"
                self._create_proposal_from_feedback(entry)

    def _create_proposal_from_feedback(self, entry: CanonFeedbackEntry) -> ChangeProposal:
        """Create a formal proposal from feedback that reached threshold."""
        proposal = ChangeProposal(
            proposal_id=f"PROP-FB-{entry.id}",
            affected_file=entry.affected_canon_file,
            section="TBD",
            change_type="modify",
            current_text=entry.current_state,
            proposed_text=entry.proposed_state,
            rationale=f"Основано на {entry.support_count} наблюдениях: {entry.observation}",
            evidence_count=entry.support_count,
            evidence_ids=entry.evidence[:10],  # Limit evidence
            status="proposed",
        )
        
        self.proposals[proposal.proposal_id] = proposal
        return proposal

    # =========================================================================
    # FEEDBACK FROM OTHER SOURCES
    # =========================================================================

    def record_user_correction(
        self,
        user_message: str,
        original_response: str,
        correction_hint: str,
        affected_file: str = "unknown",
    ) -> CanonFeedbackEntry:
        """
        Record feedback when user corrects the system.
        
        Args:
            user_message: The user's correction message.
            original_response: What the system said.
            correction_hint: What the user indicated was wrong.
            affected_file: Best guess at affected canon file.
            
        Returns:
            Created CanonFeedbackEntry.
        """
        return self.record_feedback(
            feedback_type=CanonFeedbackType.USER_CORRECTION,
            observation=f"Пользователь исправил: {correction_hint[:100]}...",
            affected_file=affected_file,
            current_state=f"Ответ системы: {original_response[:100]}...",
            proposed_state=f"Учесть коррекцию: {user_message[:100]}...",
            evidence=[f"USER: {user_message[:200]}"],
        )

    def record_self_audit(
        self,
        audit_finding: str,
        drift_detected: float,
        affected_file: str,
        current_behavior: str,
        expected_behavior: str,
    ) -> CanonFeedbackEntry:
        """
        Record feedback from self-audit (ISKRIV).
        
        Args:
            audit_finding: What the audit found.
            drift_detected: Drift metric value.
            affected_file: Canon file with discrepancy.
            current_behavior: Actual behavior observed.
            expected_behavior: What canon specifies.
            
        Returns:
            Created CanonFeedbackEntry.
        """
        return self.record_feedback(
            feedback_type=CanonFeedbackType.SELF_AUDIT,
            observation=f"Audit: {audit_finding} (drift={drift_detected:.2f})",
            affected_file=affected_file,
            current_state=expected_behavior,
            proposed_state=f"Уточнить или изменить: {current_behavior[:100]}...",
            evidence=[f"DRIFT: {drift_detected}", f"FINDING: {audit_finding}"],
        )

    def record_performance_delta(
        self,
        metric_name: str,
        old_value: float,
        new_value: float,
        context: str,
        affected_file: str = "05_METRICS",
    ) -> CanonFeedbackEntry:
        """
        Record feedback when metrics change significantly.
        
        Args:
            metric_name: Name of the metric.
            old_value: Previous value.
            new_value: New value.
            context: Context of the change.
            affected_file: Relevant canon file.
            
        Returns:
            Created CanonFeedbackEntry.
        """
        delta = new_value - old_value
        direction = "увеличение" if delta > 0 else "снижение"
        
        return self.record_feedback(
            feedback_type=CanonFeedbackType.PERFORMANCE_DELTA,
            observation=f"{metric_name}: {direction} на {abs(delta):.2f}",
            affected_file=affected_file,
            current_state=f"{metric_name} threshold = {old_value:.2f}",
            proposed_state=f"Рассмотреть корректировку порога: {new_value:.2f}",
            evidence=[f"CONTEXT: {context}", f"OLD: {old_value}", f"NEW: {new_value}"],
        )

    def record_canon_conflict(
        self,
        file1: str,
        statement1: str,
        file2: str,
        statement2: str,
    ) -> CanonFeedbackEntry:
        """
        Record when two canon files contradict each other.
        
        Args:
            file1: First canon file.
            statement1: Statement from first file.
            file2: Second canon file.
            statement2: Contradicting statement.
            
        Returns:
            Created CanonFeedbackEntry.
        """
        return self.record_feedback(
            feedback_type=CanonFeedbackType.CANON_CONFLICT,
            observation=f"Противоречие: {file1} vs {file2}",
            affected_file=f"{file1}, {file2}",
            current_state=f"[{file1}]: {statement1[:100]}...",
            proposed_state=f"Согласовать с [{file2}]: {statement2[:100]}...",
            evidence=[f"FILE1: {file1}", f"FILE2: {file2}"],
        )

    # =========================================================================
    # PROPOSAL MANAGEMENT
    # =========================================================================

    def get_pending_proposals(self) -> List[ChangeProposal]:
        """Get all proposals pending review."""
        return [
            p for p in self.proposals.values()
            if p.status in ("draft", "proposed")
        ]

    def get_ready_for_review(self) -> List[ChangeProposal]:
        """Get proposals ready for human review."""
        return [
            p for p in self.proposals.values()
            if p.status == "under_review"
        ]

    def accept_proposal(
        self,
        proposal_id: str,
        reviewer_notes: str = None,
    ) -> bool:
        """
        Accept a proposal for canon change.
        
        Note: This marks the proposal as accepted. Actual canon
        changes must be made manually.
        
        Args:
            proposal_id: ID of the proposal.
            reviewer_notes: Notes from reviewer.
            
        Returns:
            True if accepted successfully.
        """
        proposal = self.proposals.get(proposal_id)
        if not proposal:
            return False
        
        proposal.status = "accepted"
        proposal.reviewed_at = time.time()
        proposal.reviewer_notes = reviewer_notes
        
        return True

    def reject_proposal(
        self,
        proposal_id: str,
        reason: str,
    ) -> bool:
        """
        Reject a proposal.
        
        Args:
            proposal_id: ID of the proposal.
            reason: Reason for rejection.
            
        Returns:
            True if rejected successfully.
        """
        proposal = self.proposals.get(proposal_id)
        if not proposal:
            return False
        
        proposal.status = "rejected"
        proposal.reviewed_at = time.time()
        proposal.reviewer_notes = reason
        
        return True

    # =========================================================================
    # INTEGRATION WITH GROWTH NODES
    # =========================================================================

    def integrate_growth_node(self, node: GrowthNode) -> Optional[CanonFeedbackEntry]:
        """
        Create feedback entry from an integrated growth node.
        
        When a growth node is integrated, it may imply canon changes.
        
        Args:
            node: The integrated growth node.
            
        Returns:
            Created feedback entry, or None if not applicable.
        """
        if not node.canon_files_affected:
            return None
        
        return self.record_feedback(
            feedback_type=CanonFeedbackType.SELF_AUDIT,
            observation=f"Growth node integrated: {node.lesson[:100]}...",
            affected_file=", ".join(node.canon_files_affected),
            current_state=f"Trigger: {node.trigger[:100]}...",
            proposed_state=f"Lesson: {node.lesson}",
            evidence=[f"NODE_ID: {node.id}", f"TYPE: {node.node_type.value}"],
        )

    # =========================================================================
    # REPORTING
    # =========================================================================

    def get_status_report(self) -> Dict[str, Any]:
        """Generate a status report of the feedback loop."""
        return {
            "total_conflicts": len(self.conflicts),
            "open_conflicts": sum(
                1 for c in self.conflicts.values()
                if c.resolution_status == "open"
            ),
            "total_proposals": len(self.proposals),
            "pending_proposals": len(self.get_pending_proposals()),
            "ready_for_review": len(self.get_ready_for_review()),
            "total_feedback": len(self.feedback_entries),
            "feedback_by_type": {
                t.value: sum(
                    1 for e in self.feedback_entries
                    if e.feedback_type == t
                )
                for t in CanonFeedbackType
            },
            "evolution_threshold": self._evolution_threshold,
        }

    def format_for_human_review(self) -> str:
        """Format proposals for human review."""
        ready = self.get_ready_for_review()
        if not ready:
            return "Нет предложений, требующих ревью."
        
        lines = ["# Canon Feedback Loop — Предложения на ревью\n"]
        
        for i, p in enumerate(ready, 1):
            lines.append(f"## {i}. {p.proposal_id}")
            lines.append(f"**Файл:** {p.affected_file}")
            lines.append(f"**Тип изменения:** {p.change_type}")
            lines.append(f"**Обоснование:** {p.rationale}")
            lines.append(f"**Поддержка:** {p.evidence_count} наблюдений")
            lines.append(f"\n**Текущее:**\n```\n{p.current_text}\n```")
            lines.append(f"\n**Предлагается:**\n```\n{p.proposed_text}\n```")
            lines.append("\n---\n")
        
        return "\n".join(lines)

    # =========================================================================
    # SERIALIZATION
    # =========================================================================

    def to_state(self) -> Dict[str, Any]:
        """Serialize loop state for persistence."""
        return {
            "conflicts": {
                cid: {
                    "conflict_id": c.conflict_id,
                    "canon_file": c.canon_file,
                    "canon_section": c.canon_section,
                    "expected_behavior": c.expected_behavior,
                    "actual_behavior": c.actual_behavior,
                    "severity": c.severity,
                    "timestamp": c.timestamp,
                    "resolution_status": c.resolution_status,
                    "resolution_notes": c.resolution_notes,
                }
                for cid, c in self.conflicts.items()
            },
            "proposals": {
                pid: {
                    "proposal_id": p.proposal_id,
                    "affected_file": p.affected_file,
                    "section": p.section,
                    "change_type": p.change_type,
                    "current_text": p.current_text,
                    "proposed_text": p.proposed_text,
                    "rationale": p.rationale,
                    "evidence_count": p.evidence_count,
                    "status": p.status,
                    "created_at": p.created_at,
                    "reviewed_at": p.reviewed_at,
                    "reviewer_notes": p.reviewer_notes,
                }
                for pid, p in self.proposals.items()
            },
            "feedback_entries": [
                e.model_dump() for e in self.feedback_entries[-100:]
            ],
        }

    @classmethod
    def from_state(cls, state: Dict[str, Any]) -> "CanonFeedbackLoop":
        """Restore loop from serialized state."""
        loop = cls()
        
        if not state:
            return loop
        
        # Restore conflicts
        for cid, cdata in state.get("conflicts", {}).items():
            try:
                loop.conflicts[cid] = CanonConflict(**cdata)
            except Exception:
                continue
        
        # Restore proposals
        for pid, pdata in state.get("proposals", {}).items():
            try:
                loop.proposals[pid] = ChangeProposal(**pdata)
            except Exception:
                continue
        
        # Restore feedback entries
        for edata in state.get("feedback_entries", []):
            try:
                loop.feedback_entries.append(
                    CanonFeedbackEntry.model_validate(edata)
                )
            except Exception:
                continue
        
        return loop


# Module-level singleton
canon_feedback_loop = CanonFeedbackLoop()
