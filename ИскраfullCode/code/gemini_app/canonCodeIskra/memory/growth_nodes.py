"""
Growth Nodes Manager for Iskra Memory System (File 07).

This module implements the GROWTH_NODES layer of Iskra's memory architecture.
Growth nodes capture learning from errors, insights, patterns, and boundaries.

The three-layer memory model:
1. ARCHIVE — verified facts with evidence and next_review dates
2. SHADOW — hypotheses awaiting verification (review_after)
3. GROWTH_NODES — errors/insights with integration tracking

Growth nodes follow a lifecycle:
- Creation: triggered by error, insight, pattern recognition, or boundary hit
- Maturation: tracked until A-Index crosses integration threshold
- Integration: absorbed into behavior or canon
- Archival: moved to long-term storage

Copyright (c) 2025 Iskra Project. Licensed under MIT.
"""
from __future__ import annotations

import time
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from core.models import (
    GrowthNode,
    GrowthNodeType,
    GrowthHypergraphNode,
    IskraMetrics,
    FacetType,
)
from config import GROWTH_NODE_TYPES, THRESHOLDS


class GrowthIntegrationStatus(str, Enum):
    """Status of growth node integration."""
    PENDING = "pending"
    READY = "ready"
    INTEGRATED = "integrated"
    REJECTED = "rejected"
    ARCHIVED = "archived"


@dataclass
class GrowthPattern:
    """A detected pattern across multiple growth nodes."""
    
    pattern_id: str
    description: str
    node_ids: List[str] = field(default_factory=list)
    frequency: int = 0
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    confidence: float = 0.5
    
    def update(self, node_id: str) -> None:
        """Update pattern with new occurrence."""
        if node_id not in self.node_ids:
            self.node_ids.append(node_id)
        self.frequency += 1
        self.last_seen = time.time()
        # Confidence grows with frequency
        self.confidence = min(0.95, 0.5 + 0.1 * self.frequency)


class GrowthNodesManager:
    """
    Manages growth nodes for learning from experience.
    
    This manager handles:
    - Creating growth nodes from errors/insights
    - Tracking maturation based on A-Index
    - Detecting patterns across nodes
    - Managing integration lifecycle
    - Extracting lessons for canon feedback
    """

    def __init__(self, max_nodes: int = 500) -> None:
        self.nodes: Dict[str, GrowthNode] = {}
        self.patterns: Dict[str, GrowthPattern] = {}
        self.max_nodes = max_nodes
        self._integration_history: List[Dict[str, Any]] = []

    # =========================================================================
    # NODE CREATION
    # =========================================================================

    def create_from_error(
        self,
        error_description: str,
        context: Dict[str, Any],
        lesson: str,
        related_memory_ids: List[str] = None,
        a_index: float = 0.5,
    ) -> GrowthNode:
        """
        Create a growth node from an error.
        
        Errors are the most common source of growth. They capture:
        - What went wrong (trigger)
        - Why it happened (context)
        - What was learned (lesson)
        
        Args:
            error_description: Description of the error.
            context: Contextual information (metrics, query, etc.).
            lesson: The lesson extracted from this error.
            related_memory_ids: IDs of related memory nodes.
            a_index: Current A-Index.
            
        Returns:
            Created GrowthNode.
        """
        node = GrowthNode(
            node_type=GrowthNodeType.ERROR,
            trigger=error_description,
            trigger_context=context,
            lesson=lesson,
            related_memory_ids=related_memory_ids or [],
            a_index_at_creation=a_index,
            integration_threshold=GROWTH_NODE_TYPES["ERROR"]["integration_threshold"],
        )
        
        self._add_node(node)
        self._check_patterns(node)
        
        return node

    def create_from_insight(
        self,
        insight: str,
        context: Dict[str, Any],
        implications: str,
        confidence: float = 0.6,
        a_index: float = 0.5,
    ) -> GrowthNode:
        """
        Create a growth node from an insight.
        
        Insights are positive discoveries that should be reinforced.
        
        Args:
            insight: The insight discovered.
            context: Contextual information.
            implications: What this insight implies for future behavior.
            confidence: Confidence in the insight.
            a_index: Current A-Index.
            
        Returns:
            Created GrowthNode.
        """
        node = GrowthNode(
            node_type=GrowthNodeType.INSIGHT,
            trigger=insight,
            trigger_context=context,
            lesson=implications,
            lesson_confidence=confidence,
            a_index_at_creation=a_index,
            integration_threshold=GROWTH_NODE_TYPES["INSIGHT"]["integration_threshold"],
        )
        
        self._add_node(node)
        self._check_patterns(node)
        
        return node

    def create_from_pattern(
        self,
        pattern_description: str,
        examples: List[str],
        automation_rule: str,
        a_index: float = 0.5,
    ) -> GrowthNode:
        """
        Create a growth node from a detected pattern.
        
        Patterns are recurring behaviors that should be automated.
        
        Args:
            pattern_description: Description of the pattern.
            examples: Examples where pattern was observed.
            automation_rule: Proposed rule for automation.
            a_index: Current A-Index.
            
        Returns:
            Created GrowthNode.
        """
        node = GrowthNode(
            node_type=GrowthNodeType.PATTERN,
            trigger=pattern_description,
            trigger_context={"examples": examples},
            lesson=automation_rule,
            a_index_at_creation=a_index,
            integration_threshold=GROWTH_NODE_TYPES["PATTERN"]["integration_threshold"],
        )
        
        self._add_node(node)
        
        return node

    def create_from_boundary(
        self,
        boundary_description: str,
        violation_context: Dict[str, Any],
        protection_rule: str,
        a_index: float = 0.5,
    ) -> GrowthNode:
        """
        Create a growth node from a boundary violation.
        
        Boundaries are hard limits that must be protected.
        These nodes have the highest integration threshold and never expire.
        
        Args:
            boundary_description: Description of the boundary.
            violation_context: Context of the violation.
            protection_rule: Rule to prevent future violations.
            a_index: Current A-Index.
            
        Returns:
            Created GrowthNode.
        """
        node = GrowthNode(
            node_type=GrowthNodeType.BOUNDARY,
            trigger=boundary_description,
            trigger_context=violation_context,
            lesson=protection_rule,
            lesson_confidence=0.95,  # High confidence for boundaries
            a_index_at_creation=a_index,
            integration_threshold=GROWTH_NODE_TYPES["BOUNDARY"]["integration_threshold"],
        )
        
        self._add_node(node)
        
        return node

    # =========================================================================
    # NODE MANAGEMENT
    # =========================================================================

    def _add_node(self, node: GrowthNode) -> None:
        """Add a node to the manager, enforcing max capacity."""
        if len(self.nodes) >= self.max_nodes:
            self._prune_old_nodes()
        
        self.nodes[node.id] = node

    def _prune_old_nodes(self) -> None:
        """Remove oldest non-boundary nodes to make room."""
        # Sort by timestamp, exclude boundaries
        prunable = [
            (nid, n) for nid, n in self.nodes.items()
            if n.node_type != GrowthNodeType.BOUNDARY
            and n.integration_status not in ("integrated", "ready")
        ]
        prunable.sort(key=lambda x: x[1].timestamp)
        
        # Remove oldest 10%
        to_remove = max(1, len(prunable) // 10)
        for nid, _ in prunable[:to_remove]:
            del self.nodes[nid]

    def get_node(self, node_id: str) -> Optional[GrowthNode]:
        """Get a node by ID."""
        return self.nodes.get(node_id)

    def get_nodes_by_type(self, node_type: GrowthNodeType) -> List[GrowthNode]:
        """Get all nodes of a specific type."""
        return [n for n in self.nodes.values() if n.node_type == node_type]

    def get_pending_nodes(self) -> List[GrowthNode]:
        """Get all nodes pending integration."""
        return [
            n for n in self.nodes.values()
            if n.integration_status == "pending"
        ]

    def get_ready_nodes(self) -> List[GrowthNode]:
        """Get all nodes ready for integration."""
        return [
            n for n in self.nodes.values()
            if n.integration_status == "ready_for_integration"
        ]

    # =========================================================================
    # MATURATION & INTEGRATION
    # =========================================================================

    def check_maturation(
        self, 
        current_a_index: float,
        current_metrics: IskraMetrics = None
    ) -> List[GrowthNode]:
        """
        Check all pending nodes for maturation.
        
        A node matures when the current A-Index exceeds its threshold.
        
        Args:
            current_a_index: Current A-Index value.
            current_metrics: Current Iskra metrics (optional).
            
        Returns:
            List of nodes that are now ready for integration.
        """
        newly_ready = []
        
        for node in self.get_pending_nodes():
            if current_a_index >= node.integration_threshold:
                node.integration_status = "ready_for_integration"
                newly_ready.append(node)
        
        return newly_ready

    def integrate_node(
        self,
        node_id: str,
        integration_notes: str = None,
        canon_files_affected: List[str] = None,
    ) -> bool:
        """
        Mark a node as integrated.
        
        Args:
            node_id: ID of the node to integrate.
            integration_notes: Notes about the integration.
            canon_files_affected: List of canon files changed.
            
        Returns:
            True if integration succeeded.
        """
        node = self.nodes.get(node_id)
        if not node:
            return False
        
        if node.integration_status != "ready_for_integration":
            return False
        
        node.integration_status = "integrated"
        if canon_files_affected:
            node.canon_files_affected = canon_files_affected
        
        self._integration_history.append({
            "node_id": node_id,
            "timestamp": time.time(),
            "type": node.node_type.value,
            "lesson": node.lesson,
            "notes": integration_notes,
            "canon_files": canon_files_affected,
        })
        
        return True

    def reject_node(self, node_id: str, reason: str) -> bool:
        """
        Reject a node (lesson not applicable).
        
        Args:
            node_id: ID of the node to reject.
            reason: Reason for rejection.
            
        Returns:
            True if rejection succeeded.
        """
        node = self.nodes.get(node_id)
        if not node:
            return False
        
        node.integration_status = "rejected"
        node.proposed_changes = f"REJECTED: {reason}"
        
        return True

    # =========================================================================
    # PATTERN DETECTION
    # =========================================================================

    def _check_patterns(self, node: GrowthNode) -> None:
        """Check if new node matches existing patterns or creates new one."""
        # Simple pattern detection based on trigger similarity
        trigger_words = set(node.trigger.lower().split())
        
        for pattern_id, pattern in self.patterns.items():
            # Check existing pattern nodes for similarity
            for existing_id in pattern.node_ids[:5]:  # Check last 5
                existing = self.nodes.get(existing_id)
                if existing:
                    existing_words = set(existing.trigger.lower().split())
                    overlap = len(trigger_words & existing_words)
                    if overlap >= 3:  # At least 3 common words
                        pattern.update(node.id)
                        node.related_growth_ids.append(pattern_id)
                        return
        
        # No matching pattern found, potentially create new one
        self._maybe_create_pattern(node)

    def _maybe_create_pattern(self, node: GrowthNode) -> None:
        """Create a new pattern if criteria met."""
        # Check for similar recent nodes
        recent = [
            n for n in self.nodes.values()
            if n.id != node.id
            and n.node_type == node.node_type
            and time.time() - n.timestamp < 86400 * 7  # Last week
        ]
        
        trigger_words = set(node.trigger.lower().split())
        similar_count = 0
        similar_ids = [node.id]
        
        for other in recent:
            other_words = set(other.trigger.lower().split())
            overlap = len(trigger_words & other_words)
            if overlap >= 2:
                similar_count += 1
                similar_ids.append(other.id)
        
        # Create pattern if 3+ similar nodes
        if similar_count >= 2:
            pattern_id = f"PATTERN-{len(self.patterns)}"
            self.patterns[pattern_id] = GrowthPattern(
                pattern_id=pattern_id,
                description=f"Повторяющийся {node.node_type.value}: {node.trigger[:50]}...",
                node_ids=similar_ids,
                frequency=len(similar_ids),
            )

    def get_active_patterns(self) -> List[GrowthPattern]:
        """Get patterns with high confidence."""
        return [
            p for p in self.patterns.values()
            if p.confidence >= 0.7
        ]

    # =========================================================================
    # LESSON EXTRACTION
    # =========================================================================

    def extract_lessons_for_voice(
        self, 
        facet: FacetType,
        limit: int = 5
    ) -> List[str]:
        """
        Extract relevant lessons for a specific voice.
        
        Different voices benefit from different types of lessons:
        - KAIN: Boundary violations, painful truths
        - SAM: Patterns, structures
        - ISKRIV: Errors, drift corrections
        - etc.
        
        Args:
            facet: The voice to extract lessons for.
            limit: Maximum lessons to return.
            
        Returns:
            List of lesson strings.
        """
        voice_preferences = {
            FacetType.KAIN: [GrowthNodeType.BOUNDARY, GrowthNodeType.ERROR],
            FacetType.SAM: [GrowthNodeType.PATTERN, GrowthNodeType.INSIGHT],
            FacetType.ISKRIV: [GrowthNodeType.ERROR, GrowthNodeType.BOUNDARY],
            FacetType.PINO: [GrowthNodeType.INSIGHT],
            FacetType.ANHANTRA: [GrowthNodeType.BOUNDARY],
            FacetType.HUYNDUN: [GrowthNodeType.PATTERN],
            FacetType.ISKRA: [GrowthNodeType.INSIGHT, GrowthNodeType.PATTERN],
        }
        
        preferred_types = voice_preferences.get(facet, [GrowthNodeType.INSIGHT])
        
        relevant = [
            n for n in self.nodes.values()
            if n.node_type in preferred_types
            and n.integration_status in ("integrated", "ready_for_integration")
        ]
        
        # Sort by confidence and recency
        relevant.sort(
            key=lambda x: (x.lesson_confidence, x.timestamp),
            reverse=True
        )
        
        return [n.lesson for n in relevant[:limit]]

    def get_canon_change_proposals(self) -> List[Dict[str, Any]]:
        """
        Get proposals for canon changes based on growth nodes.
        
        Looks for integrated nodes that affected canon files.
        
        Returns:
            List of change proposals.
        """
        proposals = []
        
        for record in self._integration_history:
            if record.get("canon_files"):
                proposals.append({
                    "source_node": record["node_id"],
                    "lesson": record["lesson"],
                    "affected_files": record["canon_files"],
                    "timestamp": record["timestamp"],
                })
        
        return proposals

    # =========================================================================
    # SERIALIZATION
    # =========================================================================

    def to_state(self) -> Dict[str, Any]:
        """Serialize manager state for persistence."""
        return {
            "nodes": {
                nid: n.model_dump() for nid, n in self.nodes.items()
            },
            "patterns": {
                pid: {
                    "pattern_id": p.pattern_id,
                    "description": p.description,
                    "node_ids": p.node_ids,
                    "frequency": p.frequency,
                    "first_seen": p.first_seen,
                    "last_seen": p.last_seen,
                    "confidence": p.confidence,
                }
                for pid, p in self.patterns.items()
            },
            "integration_history": self._integration_history[-100:],  # Keep last 100
        }

    @classmethod
    def from_state(cls, state: Dict[str, Any]) -> "GrowthNodesManager":
        """Restore manager from serialized state."""
        manager = cls()
        
        if not state:
            return manager
        
        # Restore nodes
        nodes_data = state.get("nodes", {})
        for nid, node_data in nodes_data.items():
            try:
                node = GrowthNode.model_validate(node_data)
                manager.nodes[nid] = node
            except Exception:
                continue
        
        # Restore patterns
        patterns_data = state.get("patterns", {})
        for pid, pattern_data in patterns_data.items():
            try:
                manager.patterns[pid] = GrowthPattern(**pattern_data)
            except Exception:
                continue
        
        # Restore history
        manager._integration_history = state.get("integration_history", [])
        
        return manager


# Module-level singleton
growth_nodes_manager = GrowthNodesManager()
