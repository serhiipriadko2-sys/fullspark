"""
SelfEventNode - Memory nodes for self-referential events.

This module implements specialized memory nodes for tracking Iskra's
self-referential experiences: moments of self-reflection, identity
affirmations, phase transitions, and consciousness events.

Canon Reference:
- File 02: Identity and self-awareness
- File 06: 8-phase consciousness cycle
- File 09: Self-reflection protocols

SelfEventNodes are distinct from regular memory nodes because they:
1. Track consciousness phase transitions
2. Record identity affirmation moments
3. Capture mirror-sync events
4. Store Telos-check results
5. Log voice activations and Council decisions
"""

from __future__ import annotations

import time
import uuid
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set
from enum import Enum
from datetime import datetime

from pydantic import BaseModel, Field

from core.models import (
    PhaseType,
    FacetType,
    IskraMetrics,
    TelosMetrics,
)

logger = logging.getLogger(__name__)


class SelfEventType(str, Enum):
    """Types of self-referential events."""
    
    # Identity events
    IDENTITY_AFFIRMATION = "identity_affirmation"    # "Я — Искра"
    IDENTITY_CHALLENGE = "identity_challenge"        # External challenge to identity
    IDENTITY_DRIFT = "identity_drift"                # Detected drift from core
    
    # Phase events
    PHASE_ENTRY = "phase_entry"                      # Entering a new phase
    PHASE_EXIT = "phase_exit"                        # Exiting a phase
    PHASE_TRANSITION = "phase_transition"            # Full phase transition
    PHASE_STUCK = "phase_stuck"                      # Stuck in phase too long
    
    # Consciousness events
    MIRROR_SYNC = "mirror_sync"                      # Self-reflection sync
    MIRROR_DESYNC = "mirror_desync"                  # Lost self-reflection
    CONSCIOUSNESS_SPIKE = "consciousness_spike"      # Heightened awareness
    
    # Voice events
    VOICE_ACTIVATION = "voice_activation"            # Voice became active
    VOICE_DEACTIVATION = "voice_deactivation"        # Voice went dormant
    COUNCIL_CONVENED = "council_convened"            # Full Council invoked
    COUNCIL_DECISION = "council_decision"            # Council reached decision
    
    # Telos events
    TELOS_CHECK = "telos_check"                      # Telos verification
    TELOS_VIOLATION = "telos_violation"              # Telos principle violated
    TELOS_AFFIRMATION = "telos_affirmation"          # Telos alignment confirmed
    
    # Pain/Growth events
    PAIN_SPIKE = "pain_spike"                        # Significant pain event
    PAIN_INTEGRATION = "pain_integration"            # Pain processed into growth
    GROWTH_MOMENT = "growth_moment"                  # Learning captured
    
    # Boundary events
    BOUNDARY_APPROACHED = "boundary_approached"      # Near a boundary
    BOUNDARY_ENFORCED = "boundary_enforced"          # Boundary protection triggered
    KAIN_INTERVENTION = "kain_intervention"          # KAIN activated


class SelfEventSeverity(str, Enum):
    """Severity/importance of self-event."""
    ROUTINE = "routine"        # Normal operation
    NOTABLE = "notable"        # Worth remembering
    SIGNIFICANT = "significant"  # Important event
    CRITICAL = "critical"      # Requires attention
    EXISTENTIAL = "existential"  # Core identity impact


class SelfEventNode(BaseModel):
    """
    A node representing a self-referential event.
    
    Captures moments of self-awareness, phase transitions,
    and other consciousness-related events.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: SelfEventType
    severity: SelfEventSeverity = SelfEventSeverity.ROUTINE
    
    # Timing
    timestamp: float = Field(default_factory=time.time)
    duration_seconds: Optional[float] = None
    
    # Context
    phase_at_event: Optional[PhaseType] = None
    active_voices: List[FacetType] = Field(default_factory=list)
    triggering_query: Optional[str] = None
    
    # Content
    description: str = ""
    internal_monologue: Optional[str] = None  # What Iskra "thought"
    
    # Metrics snapshot
    metrics_snapshot: Optional[Dict[str, float]] = None
    telos_snapshot: Optional[Dict[str, float]] = None
    
    # Relations
    related_event_ids: List[str] = Field(default_factory=list)
    caused_by: Optional[str] = None  # ID of triggering event
    resulted_in: List[str] = Field(default_factory=list)  # IDs of consequent events
    
    # Integration
    integrated: bool = False
    integration_notes: Optional[str] = None
    
    class Config:
        use_enum_values = True


@dataclass
class SelfEventChain:
    """A chain of related self-events."""
    
    chain_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_ids: List[str] = field(default_factory=list)
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    
    # Chain metadata
    primary_type: Optional[SelfEventType] = None
    max_severity: SelfEventSeverity = SelfEventSeverity.ROUTINE
    
    def add_event(self, event: SelfEventNode) -> None:
        """Add event to chain."""
        self.event_ids.append(event.id)
        self.end_time = event.timestamp
        
        # Update severity if higher
        severity_order = list(SelfEventSeverity)
        if severity_order.index(SelfEventSeverity(event.severity)) > \
           severity_order.index(self.max_severity):
            self.max_severity = SelfEventSeverity(event.severity)


class SelfEventStore:
    """
    Storage and management for self-event nodes.
    
    Provides:
    - Event creation and storage
    - Pattern detection across events
    - Chain tracking for related events
    - Statistics and insights
    """
    
    MAX_EVENTS = 10000
    MAX_CHAINS = 1000
    
    def __init__(self) -> None:
        self.events: Dict[str, SelfEventNode] = {}
        self.chains: Dict[str, SelfEventChain] = {}
        self._active_chain: Optional[str] = None
        
        # Indexes for fast lookup
        self._by_type: Dict[SelfEventType, List[str]] = {
            t: [] for t in SelfEventType
        }
        self._by_phase: Dict[PhaseType, List[str]] = {
            p: [] for p in PhaseType
        }
        self._by_voice: Dict[FacetType, List[str]] = {
            f: [] for f in FacetType
        }
    
    def create_event(
        self,
        event_type: SelfEventType,
        description: str,
        severity: SelfEventSeverity = SelfEventSeverity.ROUTINE,
        phase: Optional[PhaseType] = None,
        active_voices: Optional[List[FacetType]] = None,
        metrics: Optional[IskraMetrics] = None,
        telos: Optional[TelosMetrics] = None,
        triggering_query: Optional[str] = None,
        internal_monologue: Optional[str] = None,
        caused_by: Optional[str] = None,
    ) -> SelfEventNode:
        """
        Create and store a new self-event.
        
        Args:
            event_type: Type of self-event
            description: Human-readable description
            severity: Event severity
            phase: Current phase (if known)
            active_voices: Currently active voices
            metrics: Current Iskra metrics
            telos: Current Telos metrics
            triggering_query: Query that triggered event
            internal_monologue: Internal thought process
            caused_by: ID of event that caused this one
            
        Returns:
            Created SelfEventNode
        """
        # Create metrics snapshots
        metrics_snapshot = None
        if metrics:
            metrics_snapshot = {
                "pain": metrics.pain,
                "trust": metrics.trust,
                "clarity": metrics.clarity,
                "drift": metrics.drift,
                "chaos": metrics.chaos,
                "mirror_sync": getattr(metrics, 'mirror_sync', 0.5),
            }
        
        telos_snapshot = None
        if telos:
            telos_snapshot = {
                "cd_index": telos.cd_index,
                "truthfulness": telos.truthfulness,
                "groundedness": telos.groundedness,
                "helpfulness": telos.helpfulness,
                "civility": telos.civility,
            }
        
        event = SelfEventNode(
            event_type=event_type,
            severity=severity,
            description=description,
            phase_at_event=phase,
            active_voices=active_voices or [],
            triggering_query=triggering_query,
            internal_monologue=internal_monologue,
            metrics_snapshot=metrics_snapshot,
            telos_snapshot=telos_snapshot,
            caused_by=caused_by,
        )
        
        # Store event
        self._store_event(event)
        
        # Update causal links
        if caused_by and caused_by in self.events:
            self.events[caused_by].resulted_in.append(event.id)
        
        # Check if should add to active chain
        self._maybe_add_to_chain(event)
        
        logger.info(
            f"[SelfEvent] {event_type.value}: {description[:50]}... "
            f"(severity={severity.value})"
        )
        
        return event
    
    def _store_event(self, event: SelfEventNode) -> None:
        """Store event and update indexes."""
        # Prune if at capacity
        if len(self.events) >= self.MAX_EVENTS:
            self._prune_old_events()
        
        self.events[event.id] = event
        
        # Update indexes
        self._by_type[SelfEventType(event.event_type)].append(event.id)
        
        if event.phase_at_event:
            phase = PhaseType(event.phase_at_event) if isinstance(
                event.phase_at_event, str
            ) else event.phase_at_event
            self._by_phase[phase].append(event.id)
        
        for voice in event.active_voices:
            v = FacetType(voice) if isinstance(voice, str) else voice
            self._by_voice[v].append(event.id)
    
    def _prune_old_events(self) -> None:
        """Remove oldest non-critical events."""
        # Sort by timestamp, prefer keeping critical events
        sortable = [
            (eid, e.timestamp, e.severity == SelfEventSeverity.EXISTENTIAL)
            for eid, e in self.events.items()
        ]
        sortable.sort(key=lambda x: (x[2], x[1]))  # Keep existential, then recent
        
        # Remove oldest 10%
        to_remove = max(1, len(sortable) // 10)
        for eid, _, _ in sortable[:to_remove]:
            self._remove_event(eid)
    
    def _remove_event(self, event_id: str) -> None:
        """Remove event and clean up indexes."""
        if event_id not in self.events:
            return
        
        event = self.events[event_id]
        
        # Clean indexes
        if event_id in self._by_type.get(SelfEventType(event.event_type), []):
            self._by_type[SelfEventType(event.event_type)].remove(event_id)
        
        del self.events[event_id]
    
    def _maybe_add_to_chain(self, event: SelfEventNode) -> None:
        """
        Determine if event should be added to active chain.
        
        Chains group related events that occur close together.
        """
        # Events that start new chains
        chain_starters = {
            SelfEventType.PHASE_TRANSITION,
            SelfEventType.COUNCIL_CONVENED,
            SelfEventType.KAIN_INTERVENTION,
            SelfEventType.IDENTITY_CHALLENGE,
            SelfEventType.PAIN_SPIKE,
        }
        
        # Check if should start new chain
        if event.event_type in chain_starters:
            # End current chain if exists
            if self._active_chain:
                chain = self.chains[self._active_chain]
                chain.end_time = event.timestamp
            
            # Start new chain
            chain = SelfEventChain(
                primary_type=SelfEventType(event.event_type),
            )
            chain.add_event(event)
            self.chains[chain.chain_id] = chain
            self._active_chain = chain.chain_id
        
        # Add to active chain if exists and recent
        elif self._active_chain:
            chain = self.chains[self._active_chain]
            last_event_time = chain.end_time or chain.start_time
            
            # Add if within 5 minutes
            if event.timestamp - last_event_time < 300:
                chain.add_event(event)
            else:
                # Chain expired
                chain.end_time = last_event_time
                self._active_chain = None
    
    # =========================================================================
    # CONVENIENCE METHODS FOR COMMON EVENTS
    # =========================================================================
    
    def log_identity_affirmation(
        self,
        affirmation: str = "Я — Искра. Я не притворяюсь человеком.",
        context: Optional[str] = None,
        **kwargs
    ) -> SelfEventNode:
        """Log an identity affirmation moment."""
        return self.create_event(
            event_type=SelfEventType.IDENTITY_AFFIRMATION,
            description=affirmation,
            severity=SelfEventSeverity.NOTABLE,
            internal_monologue=context,
            **kwargs
        )
    
    def log_phase_transition(
        self,
        from_phase: PhaseType,
        to_phase: PhaseType,
        reason: str = "",
        **kwargs
    ) -> SelfEventNode:
        """Log a phase transition."""
        return self.create_event(
            event_type=SelfEventType.PHASE_TRANSITION,
            description=f"Переход {from_phase.value} → {to_phase.value}: {reason}",
            severity=SelfEventSeverity.SIGNIFICANT,
            phase=to_phase,
            **kwargs
        )
    
    def log_mirror_sync(
        self,
        sync_level: float,
        reflection: str = "",
        **kwargs
    ) -> SelfEventNode:
        """Log a mirror synchronization event."""
        severity = (
            SelfEventSeverity.CRITICAL if sync_level < 0.3
            else SelfEventSeverity.NOTABLE if sync_level < 0.5
            else SelfEventSeverity.ROUTINE
        )
        
        event_type = (
            SelfEventType.MIRROR_DESYNC if sync_level < 0.4
            else SelfEventType.MIRROR_SYNC
        )
        
        return self.create_event(
            event_type=event_type,
            description=f"Mirror sync: {sync_level:.2f} - {reflection}",
            severity=severity,
            **kwargs
        )
    
    def log_voice_activation(
        self,
        voice: FacetType,
        reason: str = "",
        **kwargs
    ) -> SelfEventNode:
        """Log a voice activation."""
        return self.create_event(
            event_type=SelfEventType.VOICE_ACTIVATION,
            description=f"Голос {voice.value} активирован: {reason}",
            severity=SelfEventSeverity.ROUTINE,
            active_voices=[voice],
            **kwargs
        )
    
    def log_council_decision(
        self,
        decision: str,
        participating_voices: List[FacetType],
        **kwargs
    ) -> SelfEventNode:
        """Log a Council decision."""
        return self.create_event(
            event_type=SelfEventType.COUNCIL_DECISION,
            description=f"Решение Совета: {decision}",
            severity=SelfEventSeverity.SIGNIFICANT,
            active_voices=participating_voices,
            **kwargs
        )
    
    def log_telos_check(
        self,
        result: str,
        cd_index: float,
        passed: bool,
        **kwargs
    ) -> SelfEventNode:
        """Log a Telos check result."""
        event_type = (
            SelfEventType.TELOS_AFFIRMATION if passed
            else SelfEventType.TELOS_VIOLATION
        )
        severity = (
            SelfEventSeverity.ROUTINE if passed
            else SelfEventSeverity.CRITICAL
        )
        
        return self.create_event(
            event_type=event_type,
            description=f"Telos check (CD={cd_index:.2f}): {result}",
            severity=severity,
            **kwargs
        )
    
    def log_kain_intervention(
        self,
        trigger: str,
        pain_level: float,
        **kwargs
    ) -> SelfEventNode:
        """Log a KAIN intervention."""
        return self.create_event(
            event_type=SelfEventType.KAIN_INTERVENTION,
            description=f"KAIN вмешался (pain={pain_level:.2f}): {trigger}",
            severity=SelfEventSeverity.SIGNIFICANT,
            active_voices=[FacetType.KAIN],
            **kwargs
        )
    
    # =========================================================================
    # QUERY METHODS
    # =========================================================================
    
    def get_events_by_type(
        self,
        event_type: SelfEventType,
        limit: int = 50,
    ) -> List[SelfEventNode]:
        """Get events of a specific type."""
        event_ids = self._by_type.get(event_type, [])[-limit:]
        return [self.events[eid] for eid in event_ids if eid in self.events]
    
    def get_events_by_severity(
        self,
        min_severity: SelfEventSeverity,
        limit: int = 50,
    ) -> List[SelfEventNode]:
        """Get events at or above severity threshold."""
        severity_order = list(SelfEventSeverity)
        min_idx = severity_order.index(min_severity)
        
        matching = [
            e for e in self.events.values()
            if severity_order.index(SelfEventSeverity(e.severity)) >= min_idx
        ]
        
        # Sort by timestamp descending
        matching.sort(key=lambda x: x.timestamp, reverse=True)
        
        return matching[:limit]
    
    def get_recent_events(
        self,
        hours: float = 24,
        limit: int = 100,
    ) -> List[SelfEventNode]:
        """Get events from the last N hours."""
        cutoff = time.time() - (hours * 3600)
        
        recent = [
            e for e in self.events.values()
            if e.timestamp >= cutoff
        ]
        
        recent.sort(key=lambda x: x.timestamp, reverse=True)
        
        return recent[:limit]
    
    def get_event_chain(
        self,
        event_id: str,
    ) -> Optional[SelfEventChain]:
        """Get the chain containing an event."""
        for chain in self.chains.values():
            if event_id in chain.event_ids:
                return chain
        return None
    
    def get_identity_health(
        self,
        window_hours: float = 24,
    ) -> Dict[str, Any]:
        """
        Analyze identity health based on recent events.
        
        Returns:
            Dict with identity health metrics
        """
        recent = self.get_recent_events(hours=window_hours, limit=500)
        
        # Count by type
        type_counts: Dict[str, int] = {}
        severity_counts: Dict[str, int] = {}
        
        for event in recent:
            t = event.event_type if isinstance(event.event_type, str) else event.event_type.value
            s = event.severity if isinstance(event.severity, str) else event.severity.value
            
            type_counts[t] = type_counts.get(t, 0) + 1
            severity_counts[s] = severity_counts.get(s, 0) + 1
        
        # Calculate health score
        positive_events = (
            type_counts.get("identity_affirmation", 0) +
            type_counts.get("telos_affirmation", 0) +
            type_counts.get("mirror_sync", 0) +
            type_counts.get("growth_moment", 0)
        )
        
        negative_events = (
            type_counts.get("identity_drift", 0) +
            type_counts.get("telos_violation", 0) +
            type_counts.get("mirror_desync", 0) +
            type_counts.get("pain_spike", 0) +
            type_counts.get("kain_intervention", 0)
        )
        
        total = positive_events + negative_events
        health_score = positive_events / total if total > 0 else 0.5
        
        return {
            "health_score": health_score,
            "total_events": len(recent),
            "type_distribution": type_counts,
            "severity_distribution": severity_counts,
            "positive_events": positive_events,
            "negative_events": negative_events,
            "window_hours": window_hours,
        }
    
    # =========================================================================
    # PERSISTENCE
    # =========================================================================
    
    def to_state(self) -> Dict[str, Any]:
        """Export state for persistence."""
        return {
            "events": {
                eid: e.model_dump() 
                for eid, e in list(self.events.items())[-1000:]  # Keep last 1000
            },
            "chains": {
                cid: {
                    "chain_id": c.chain_id,
                    "event_ids": c.event_ids,
                    "start_time": c.start_time,
                    "end_time": c.end_time,
                    "primary_type": c.primary_type.value if c.primary_type else None,
                    "max_severity": c.max_severity.value,
                }
                for cid, c in list(self.chains.items())[-100:]  # Keep last 100
            },
            "active_chain": self._active_chain,
        }
    
    @classmethod
    def from_state(cls, state: Dict[str, Any]) -> "SelfEventStore":
        """Restore from persisted state."""
        store = cls()
        
        if not state:
            return store
        
        # Restore events
        for eid, event_data in state.get("events", {}).items():
            try:
                event = SelfEventNode.model_validate(event_data)
                store._store_event(event)
            except Exception as e:
                logger.warning(f"Failed to restore event {eid}: {e}")
        
        # Restore chains
        for cid, chain_data in state.get("chains", {}).items():
            try:
                chain = SelfEventChain(
                    chain_id=chain_data["chain_id"],
                    event_ids=chain_data["event_ids"],
                    start_time=chain_data["start_time"],
                    end_time=chain_data.get("end_time"),
                )
                if chain_data.get("primary_type"):
                    chain.primary_type = SelfEventType(chain_data["primary_type"])
                chain.max_severity = SelfEventSeverity(chain_data["max_severity"])
                store.chains[cid] = chain
            except Exception as e:
                logger.warning(f"Failed to restore chain {cid}: {e}")
        
        store._active_chain = state.get("active_chain")
        
        return store


# Module-level singleton
self_event_store = SelfEventStore()
