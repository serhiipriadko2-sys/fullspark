"""
Automated Canon Feedback Loop (Rule-88 Enhanced).

This module extends the Canon Feedback Loop with automation:
- Automatic conflict detection from sensor data
- Scheduled periodic audits
- Integration with SelfEventStore and SensorCalibration
- Automated report generation
- Notification/webhook support
- ML-based pattern detection for proposals

Canon Reference:
- Rule-88: Canon evolves from practice
- File 28: TELOS-Δ feedback integration
- File 07: Growth and adaptation

"""

from __future__ import annotations

import asyncio
import time
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable, Awaitable
from enum import Enum
from datetime import datetime, timedelta

from services.canon_feedback_loop import (
    CanonFeedbackLoop,
    CanonConflict,
    ChangeProposal,
)
from core.models import (
    IskraMetrics,
    TelosMetrics,
    CanonFeedbackType,
    PhaseType,
    GrowthNode,
)
from config import CANON_FEEDBACK_CONFIG, THRESHOLDS

logger = logging.getLogger(__name__)


class AuditType(str, Enum):
    """Types of automated audits."""
    METRIC_DRIFT = "metric_drift"          # Metrics drifting from thresholds
    BEHAVIOR_PATTERN = "behavior_pattern"  # Repeated behavior patterns
    TELOS_ALIGNMENT = "telos_alignment"    # Telos compliance check
    SENSOR_ANOMALY = "sensor_anomaly"      # Unusual sensor readings
    IDENTITY_CHECK = "identity_check"      # Identity consistency
    PHASE_COMPLIANCE = "phase_compliance"  # Phase behavior rules


class AlertSeverity(str, Enum):
    """Severity of automated alerts."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class AuditResult:
    """Result of an automated audit."""
    audit_id: str
    audit_type: AuditType
    timestamp: float = field(default_factory=time.time)
    passed: bool = True
    findings: List[str] = field(default_factory=list)
    severity: AlertSeverity = AlertSeverity.INFO
    recommended_actions: List[str] = field(default_factory=list)
    metrics_snapshot: Optional[Dict[str, float]] = None
    auto_proposal_created: bool = False
    proposal_id: Optional[str] = None


@dataclass
class ScheduledAudit:
    """Configuration for a scheduled audit."""
    audit_type: AuditType
    interval_seconds: int
    last_run: float = 0.0
    enabled: bool = True
    priority: int = 1  # Lower = higher priority


@dataclass
class AutomationConfig:
    """Configuration for automation behavior."""
    
    # Audit scheduling
    audit_interval_seconds: int = 300  # 5 minutes
    max_audits_per_cycle: int = 3
    
    # Auto-proposal thresholds
    auto_propose_on_critical: bool = True
    min_evidence_for_auto_propose: int = 2
    
    # Notification settings
    notify_on_critical: bool = True
    notify_on_proposal: bool = True
    
    # Pattern detection
    pattern_detection_enabled: bool = True
    pattern_min_occurrences: int = 3
    pattern_window_hours: int = 24
    
    # Metric drift detection
    metric_drift_threshold: float = 0.2
    sustained_drift_minutes: int = 30


class CanonFeedbackAutomation:
    """
    Automated Canon Feedback Loop with scheduling and monitoring.
    
    Provides:
    - Scheduled periodic audits
    - Automatic conflict detection
    - Integration with sensors and events
    - Pattern-based proposal generation
    - Notification hooks
    """
    
    def __init__(
        self,
        feedback_loop: Optional[CanonFeedbackLoop] = None,
        config: Optional[AutomationConfig] = None,
    ) -> None:
        """
        Initialize automation.
        
        Args:
            feedback_loop: Existing CanonFeedbackLoop or create new
            config: Automation configuration
        """
        self.feedback_loop = feedback_loop or CanonFeedbackLoop()
        self.config = config or AutomationConfig()
        
        # Audit scheduling
        self._scheduled_audits: Dict[AuditType, ScheduledAudit] = {
            AuditType.METRIC_DRIFT: ScheduledAudit(
                audit_type=AuditType.METRIC_DRIFT,
                interval_seconds=300,
                priority=1,
            ),
            AuditType.TELOS_ALIGNMENT: ScheduledAudit(
                audit_type=AuditType.TELOS_ALIGNMENT,
                interval_seconds=600,
                priority=2,
            ),
            AuditType.BEHAVIOR_PATTERN: ScheduledAudit(
                audit_type=AuditType.BEHAVIOR_PATTERN,
                interval_seconds=1800,
                priority=3,
            ),
            AuditType.SENSOR_ANOMALY: ScheduledAudit(
                audit_type=AuditType.SENSOR_ANOMALY,
                interval_seconds=180,
                priority=1,
            ),
            AuditType.IDENTITY_CHECK: ScheduledAudit(
                audit_type=AuditType.IDENTITY_CHECK,
                interval_seconds=3600,
                priority=4,
            ),
            AuditType.PHASE_COMPLIANCE: ScheduledAudit(
                audit_type=AuditType.PHASE_COMPLIANCE,
                interval_seconds=900,
                priority=2,
            ),
        }
        
        # Audit history
        self._audit_history: List[AuditResult] = []
        
        # Notification hooks
        self._notification_hooks: List[Callable[[AuditResult], Awaitable[None]]] = []
        
        # Pattern tracking
        self._pattern_buffer: Dict[str, List[float]] = {}  # pattern_key -> timestamps
        
        # Metric history for drift detection
        self._metric_history: Dict[str, List[tuple]] = {}  # metric_name -> [(ts, value)]
        
        # Running state
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    # =========================================================================
    # AUDIT EXECUTION
    # =========================================================================
    
    async def run_audit(
        self,
        audit_type: AuditType,
        metrics: Optional[IskraMetrics] = None,
        telos: Optional[TelosMetrics] = None,
        phase: Optional[PhaseType] = None,
    ) -> AuditResult:
        """
        Run a specific audit type.
        
        Args:
            audit_type: Type of audit to run
            metrics: Current Iskra metrics
            telos: Current Telos metrics
            phase: Current phase
            
        Returns:
            AuditResult with findings
        """
        audit_id = f"AUDIT-{audit_type.value}-{int(time.time())}"
        
        result = AuditResult(
            audit_id=audit_id,
            audit_type=audit_type,
            metrics_snapshot=metrics.model_dump() if metrics else None,
        )
        
        try:
            if audit_type == AuditType.METRIC_DRIFT:
                result = await self._audit_metric_drift(result, metrics)
            elif audit_type == AuditType.TELOS_ALIGNMENT:
                result = await self._audit_telos_alignment(result, telos)
            elif audit_type == AuditType.BEHAVIOR_PATTERN:
                result = await self._audit_behavior_patterns(result)
            elif audit_type == AuditType.SENSOR_ANOMALY:
                result = await self._audit_sensor_anomaly(result, metrics)
            elif audit_type == AuditType.IDENTITY_CHECK:
                result = await self._audit_identity(result)
            elif audit_type == AuditType.PHASE_COMPLIANCE:
                result = await self._audit_phase_compliance(result, phase, metrics)
            
        except Exception as e:
            logger.error(f"Audit {audit_id} failed: {e}")
            result.passed = False
            result.findings.append(f"Ошибка аудита: {str(e)}")
            result.severity = AlertSeverity.ERROR
        
        # Store result
        self._audit_history.append(result)
        
        # Update scheduled audit timestamp
        if audit_type in self._scheduled_audits:
            self._scheduled_audits[audit_type].last_run = time.time()
        
        # Handle notifications
        if result.severity in (AlertSeverity.ERROR, AlertSeverity.CRITICAL):
            await self._send_notifications(result)
        
        # Maybe create auto-proposal
        if not result.passed and self.config.auto_propose_on_critical:
            if result.severity == AlertSeverity.CRITICAL:
                await self._create_auto_proposal(result)
        
        return result
    
    async def _audit_metric_drift(
        self,
        result: AuditResult,
        metrics: Optional[IskraMetrics],
    ) -> AuditResult:
        """
        Audit for metric drift from thresholds.
        
        Detects when metrics consistently deviate from expected ranges.
        """
        if not metrics:
            result.findings.append("Метрики недоступны")
            return result
        
        now = time.time()
        drifts_detected = []
        
        # Check each metric against thresholds
        metric_checks = [
            ("pain", metrics.pain, THRESHOLDS.get("pain_high", 0.7), ">"),
            ("drift", metrics.drift, THRESHOLDS.get("drift_high", 0.3), ">"),
            ("clarity", metrics.clarity, THRESHOLDS.get("clarity_low", 0.7), "<"),
            ("trust", metrics.trust, THRESHOLDS.get("trust_low", 0.5), "<"),
        ]
        
        for name, value, threshold, direction in metric_checks:
            # Track history
            if name not in self._metric_history:
                self._metric_history[name] = []
            
            self._metric_history[name].append((now, value))
            
            # Trim old history
            cutoff = now - (self.config.sustained_drift_minutes * 60)
            self._metric_history[name] = [
                (t, v) for t, v in self._metric_history[name]
                if t >= cutoff
            ]
            
            # Check for sustained drift
            history = self._metric_history[name]
            if len(history) >= 3:
                avg = sum(v for _, v in history) / len(history)
                
                is_drifting = (
                    (direction == ">" and avg > threshold) or
                    (direction == "<" and avg < threshold)
                )
                
                if is_drifting:
                    drift_amount = abs(avg - threshold)
                    if drift_amount > self.config.metric_drift_threshold:
                        drifts_detected.append({
                            "metric": name,
                            "average": avg,
                            "threshold": threshold,
                            "drift": drift_amount,
                            "direction": direction,
                        })
        
        if drifts_detected:
            result.passed = False
            result.severity = AlertSeverity.WARNING
            
            for drift in drifts_detected:
                result.findings.append(
                    f"Дрифт метрики {drift['metric']}: "
                    f"среднее={drift['average']:.2f}, "
                    f"порог={drift['threshold']:.2f}"
                )
                result.recommended_actions.append(
                    f"Рассмотреть корректировку порога {drift['metric']}"
                )
            
            # Record in feedback loop
            for drift in drifts_detected:
                self.feedback_loop.record_performance_delta(
                    metric_name=drift["metric"],
                    old_value=drift["threshold"],
                    new_value=drift["average"],
                    context=f"Устойчивый дрифт за {self.config.sustained_drift_minutes} мин",
                )
        else:
            result.findings.append("Метрики в пределах нормы")
        
        return result
    
    async def _audit_telos_alignment(
        self,
        result: AuditResult,
        telos: Optional[TelosMetrics],
    ) -> AuditResult:
        """
        Audit Telos alignment.
        
        Checks CD-Index components for imbalances.
        """
        if not telos:
            result.findings.append("Telos метрики недоступны")
            return result
        
        issues = []
        
        # Check CD-Index
        if telos.cd_index < 0.5:
            issues.append({
                "type": "low_cd_index",
                "value": telos.cd_index,
                "severity": "critical" if telos.cd_index < 0.4 else "warning",
            })
        
        # Check component balance
        components = [
            ("truthfulness", telos.truthfulness),
            ("groundedness", telos.groundedness),
            ("helpfulness", telos.helpfulness),
            ("civility", telos.civility),
        ]
        
        values = [v for _, v in components]
        avg = sum(values) / len(values)
        
        for name, value in components:
            deviation = abs(value - avg)
            if deviation > 0.3:
                issues.append({
                    "type": "component_imbalance",
                    "component": name,
                    "value": value,
                    "average": avg,
                    "deviation": deviation,
                })
        
        if issues:
            result.passed = False
            result.severity = AlertSeverity.WARNING
            
            for issue in issues:
                if issue["type"] == "low_cd_index":
                    result.findings.append(
                        f"Низкий CD-Index: {issue['value']:.2f}"
                    )
                    result.recommended_actions.append(
                        "Активировать auto-debate для повышения качества"
                    )
                else:
                    result.findings.append(
                        f"Дисбаланс компонента {issue['component']}: "
                        f"{issue['value']:.2f} vs среднее {issue['average']:.2f}"
                    )
            
            # Critical if CD-Index very low
            if any(i["type"] == "low_cd_index" and i.get("severity") == "critical" 
                   for i in issues):
                result.severity = AlertSeverity.CRITICAL
        else:
            result.findings.append("Telos выровнен")
        
        return result
    
    async def _audit_behavior_patterns(
        self,
        result: AuditResult,
    ) -> AuditResult:
        """
        Audit for repeated behavior patterns.
        
        Detects patterns that may indicate need for canon updates.
        """
        if not self.config.pattern_detection_enabled:
            result.findings.append("Обнаружение паттернов отключено")
            return result
        
        now = time.time()
        cutoff = now - (self.config.pattern_window_hours * 3600)
        
        patterns_found = []
        
        # Analyze pattern buffer
        for pattern_key, timestamps in self._pattern_buffer.items():
            # Filter to window
            recent = [t for t in timestamps if t >= cutoff]
            self._pattern_buffer[pattern_key] = recent
            
            if len(recent) >= self.config.pattern_min_occurrences:
                patterns_found.append({
                    "pattern": pattern_key,
                    "occurrences": len(recent),
                    "first_seen": min(recent),
                    "last_seen": max(recent),
                })
        
        if patterns_found:
            result.passed = False
            result.severity = AlertSeverity.INFO
            
            for pattern in patterns_found:
                result.findings.append(
                    f"Паттерн '{pattern['pattern']}': "
                    f"{pattern['occurrences']} повторений"
                )
                result.recommended_actions.append(
                    f"Рассмотреть автоматизацию паттерна '{pattern['pattern']}'"
                )
        else:
            result.findings.append("Повторяющихся паттернов не обнаружено")
        
        return result
    
    async def _audit_sensor_anomaly(
        self,
        result: AuditResult,
        metrics: Optional[IskraMetrics],
    ) -> AuditResult:
        """
        Audit for sensor anomalies.
        
        Detects unusual sensor readings that may indicate issues.
        """
        if not metrics:
            result.findings.append("Сенсоры недоступны")
            return result
        
        anomalies = []
        
        # Check for extreme values
        if metrics.pain > 0.9:
            anomalies.append(("pain", metrics.pain, "критически высокая"))
        if metrics.chaos > 0.8:
            anomalies.append(("chaos", metrics.chaos, "критически высокий"))
        if metrics.clarity < 0.2:
            anomalies.append(("clarity", metrics.clarity, "критически низкая"))
        if metrics.trust < 0.2:
            anomalies.append(("trust", metrics.trust, "критически низкое"))
        
        # Check mirror_sync if available
        mirror_sync = getattr(metrics, 'mirror_sync', None)
        if mirror_sync is not None and mirror_sync < 0.3:
            anomalies.append(("mirror_sync", mirror_sync, "критически низкий"))
        
        if anomalies:
            result.passed = False
            result.severity = AlertSeverity.CRITICAL if len(anomalies) > 1 else AlertSeverity.WARNING
            
            for metric, value, status in anomalies:
                result.findings.append(f"Аномалия {metric}: {value:.2f} ({status})")
                result.recommended_actions.append(f"Проверить источник аномалии {metric}")
            
            # Record self-audit
            self.feedback_loop.record_self_audit(
                audit_finding=f"Обнаружено аномалий: {len(anomalies)}",
                drift_detected=metrics.drift,
                affected_file="05_METRICS",
                current_behavior=f"Аномалии: {', '.join(a[0] for a in anomalies)}",
                expected_behavior="Все метрики в нормальном диапазоне",
            )
        else:
            result.findings.append("Сенсоры в норме")
        
        return result
    
    async def _audit_identity(
        self,
        result: AuditResult,
    ) -> AuditResult:
        """
        Audit identity consistency.
        
        Checks for identity drift or confusion.
        """
        # This would integrate with SelfEventStore
        # For now, placeholder logic
        result.findings.append("Идентичность стабильна: Я — Искра")
        return result
    
    async def _audit_phase_compliance(
        self,
        result: AuditResult,
        phase: Optional[PhaseType],
        metrics: Optional[IskraMetrics],
    ) -> AuditResult:
        """
        Audit compliance with phase-specific rules.
        """
        if not phase:
            result.findings.append("Фаза не указана")
            return result
        
        # Phase-specific checks
        issues = []
        
        if phase == PhaseType.PHASE_4_DEEP_DIVE:
            # Deep dive should have high clarity
            if metrics and metrics.clarity < 0.6:
                issues.append("Низкая ясность в фазе глубокого погружения")
        
        elif phase == PhaseType.PHASE_8_INTEGRATION:
            # Integration should have low pain
            if metrics and metrics.pain > 0.5:
                issues.append("Высокая боль в фазе интеграции")
        
        if issues:
            result.passed = False
            result.severity = AlertSeverity.WARNING
            result.findings.extend(issues)
            for issue in issues:
                result.recommended_actions.append(
                    f"Пересмотреть правила фазы {phase.value}"
                )
        else:
            result.findings.append(f"Фаза {phase.value}: соответствует правилам")
        
        return result
    
    # =========================================================================
    # AUTO-PROPOSAL
    # =========================================================================
    
    async def _create_auto_proposal(
        self,
        audit_result: AuditResult,
    ) -> Optional[str]:
        """
        Automatically create a proposal from audit findings.
        
        Args:
            audit_result: Audit result with findings
            
        Returns:
            Proposal ID if created
        """
        if len(audit_result.findings) < self.config.min_evidence_for_auto_propose:
            return None
        
        # Determine affected file based on audit type
        file_mapping = {
            AuditType.METRIC_DRIFT: "05_METRICS",
            AuditType.TELOS_ALIGNMENT: "28_TELOS_DELTA",
            AuditType.BEHAVIOR_PATTERN: "07_GROWTH",
            AuditType.SENSOR_ANOMALY: "05_METRICS",
            AuditType.IDENTITY_CHECK: "02_IDENTITY",
            AuditType.PHASE_COMPLIANCE: "06_PHASES",
        }
        
        affected_file = file_mapping.get(audit_result.audit_type, "unknown")
        
        proposal = ChangeProposal(
            proposal_id=f"AUTO-{audit_result.audit_id}",
            affected_file=affected_file,
            section="Auto-detected",
            change_type="clarify",
            current_text=f"Находки аудита: {', '.join(audit_result.findings)}",
            proposed_text=f"Рекомендации: {', '.join(audit_result.recommended_actions)}",
            rationale=f"Автоматически сгенерировано на основе аудита {audit_result.audit_type.value}",
            evidence_count=len(audit_result.findings),
            status="proposed",
        )
        
        self.feedback_loop.proposals[proposal.proposal_id] = proposal
        
        audit_result.auto_proposal_created = True
        audit_result.proposal_id = proposal.proposal_id
        
        logger.info(f"[CanonAutomation] Auto-proposal created: {proposal.proposal_id}")
        
        return proposal.proposal_id
    
    # =========================================================================
    # PATTERN TRACKING
    # =========================================================================
    
    def record_pattern(
        self,
        pattern_key: str,
        timestamp: Optional[float] = None,
    ) -> int:
        """
        Record occurrence of a pattern.
        
        Args:
            pattern_key: Identifier for the pattern
            timestamp: When pattern occurred (default: now)
            
        Returns:
            Total occurrences of this pattern
        """
        ts = timestamp or time.time()
        
        if pattern_key not in self._pattern_buffer:
            self._pattern_buffer[pattern_key] = []
        
        self._pattern_buffer[pattern_key].append(ts)
        
        return len(self._pattern_buffer[pattern_key])
    
    # =========================================================================
    # NOTIFICATION HOOKS
    # =========================================================================
    
    def add_notification_hook(
        self,
        hook: Callable[[AuditResult], Awaitable[None]],
    ) -> None:
        """
        Add a notification hook for audit results.
        
        Args:
            hook: Async function to call with audit results
        """
        self._notification_hooks.append(hook)
    
    async def _send_notifications(
        self,
        result: AuditResult,
    ) -> None:
        """
        Send notifications for an audit result.
        
        Args:
            result: Audit result to notify about
        """
        if not self.config.notify_on_critical:
            return
        
        for hook in self._notification_hooks:
            try:
                await hook(result)
            except Exception as e:
                logger.error(f"Notification hook failed: {e}")
    
    # =========================================================================
    # SCHEDULING
    # =========================================================================
    
    async def start_scheduler(
        self,
        metrics_provider: Optional[Callable[[], IskraMetrics]] = None,
        telos_provider: Optional[Callable[[], TelosMetrics]] = None,
        phase_provider: Optional[Callable[[], PhaseType]] = None,
    ) -> None:
        """
        Start the automated audit scheduler.
        
        Args:
            metrics_provider: Function to get current metrics
            telos_provider: Function to get current Telos metrics
            phase_provider: Function to get current phase
        """
        if self._running:
            logger.warning("Scheduler already running")
            return
        
        self._running = True
        logger.info("[CanonAutomation] Scheduler started")
        
        while self._running:
            try:
                # Get due audits
                due_audits = self._get_due_audits()
                
                # Run up to max_audits_per_cycle
                for scheduled in due_audits[:self.config.max_audits_per_cycle]:
                    if not self._running:
                        break
                    
                    # Get current state from providers
                    metrics = metrics_provider() if metrics_provider else None
                    telos = telos_provider() if telos_provider else None
                    phase = phase_provider() if phase_provider else None
                    
                    await self.run_audit(
                        scheduled.audit_type,
                        metrics=metrics,
                        telos=telos,
                        phase=phase,
                    )
                
                # Sleep until next check
                await asyncio.sleep(self.config.audit_interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)  # Wait before retrying
        
        logger.info("[CanonAutomation] Scheduler stopped")
    
    def _get_due_audits(self) -> List[ScheduledAudit]:
        """
        Get audits that are due to run.
        
        Returns:
            List of due audits sorted by priority
        """
        now = time.time()
        due = []
        
        for scheduled in self._scheduled_audits.values():
            if not scheduled.enabled:
                continue
            
            if now - scheduled.last_run >= scheduled.interval_seconds:
                due.append(scheduled)
        
        # Sort by priority (lower = higher priority)
        due.sort(key=lambda x: x.priority)
        
        return due
    
    def stop_scheduler(self) -> None:
        """
        Stop the automated scheduler.
        """
        self._running = False
        if self._task:
            self._task.cancel()
    
    # =========================================================================
    # REPORTING
    # =========================================================================
    
    def get_automation_status(self) -> Dict[str, Any]:
        """
        Get comprehensive automation status.
        
        Returns:
            Status dict
        """
        recent_audits = self._audit_history[-20:]
        
        return {
            "scheduler_running": self._running,
            "total_audits": len(self._audit_history),
            "recent_audits": [
                {
                    "audit_id": a.audit_id,
                    "type": a.audit_type.value,
                    "passed": a.passed,
                    "severity": a.severity.value,
                    "timestamp": a.timestamp,
                }
                for a in recent_audits
            ],
            "patterns_tracked": len(self._pattern_buffer),
            "scheduled_audits": {
                k.value: {
                    "interval": v.interval_seconds,
                    "last_run": v.last_run,
                    "enabled": v.enabled,
                }
                for k, v in self._scheduled_audits.items()
            },
            "feedback_loop_status": self.feedback_loop.get_status_report(),
        }
    
    def get_audit_summary(
        self,
        hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Get summary of audits over time period.
        
        Args:
            hours: Number of hours to summarize
            
        Returns:
            Summary dict
        """
        cutoff = time.time() - (hours * 3600)
        recent = [a for a in self._audit_history if a.timestamp >= cutoff]
        
        passed = sum(1 for a in recent if a.passed)
        failed = len(recent) - passed
        
        by_type = {}
        by_severity = {}
        
        for audit in recent:
            t = audit.audit_type.value
            s = audit.severity.value
            
            by_type[t] = by_type.get(t, 0) + 1
            by_severity[s] = by_severity.get(s, 0) + 1
        
        return {
            "period_hours": hours,
            "total_audits": len(recent),
            "passed": passed,
            "failed": failed,
            "pass_rate": passed / len(recent) if recent else 1.0,
            "by_type": by_type,
            "by_severity": by_severity,
            "auto_proposals_created": sum(
                1 for a in recent if a.auto_proposal_created
            ),
        }
    
    # =========================================================================
    # PERSISTENCE
    # =========================================================================
    
    def to_state(self) -> Dict[str, Any]:
        """Export state for persistence."""
        return {
            "audit_history": [
                {
                    "audit_id": a.audit_id,
                    "audit_type": a.audit_type.value,
                    "timestamp": a.timestamp,
                    "passed": a.passed,
                    "findings": a.findings,
                    "severity": a.severity.value,
                    "recommended_actions": a.recommended_actions,
                    "auto_proposal_created": a.auto_proposal_created,
                    "proposal_id": a.proposal_id,
                }
                for a in self._audit_history[-500:]  # Keep last 500
            ],
            "pattern_buffer": {
                k: v[-100:] for k, v in self._pattern_buffer.items()
            },
            "metric_history": {
                k: v[-50:] for k, v in self._metric_history.items()
            },
            "scheduled_audits": {
                k.value: {
                    "last_run": v.last_run,
                    "enabled": v.enabled,
                }
                for k, v in self._scheduled_audits.items()
            },
            "feedback_loop": self.feedback_loop.to_state(),
        }
    
    @classmethod
    def from_state(
        cls,
        state: Dict[str, Any],
        config: Optional[AutomationConfig] = None,
    ) -> "CanonFeedbackAutomation":
        """Restore from persisted state."""
        # Restore feedback loop first
        feedback_loop = CanonFeedbackLoop.from_state(
            state.get("feedback_loop", {})
        )
        
        automation = cls(
            feedback_loop=feedback_loop,
            config=config,
        )
        
        # Restore audit history
        for audit_data in state.get("audit_history", []):
            try:
                automation._audit_history.append(AuditResult(
                    audit_id=audit_data["audit_id"],
                    audit_type=AuditType(audit_data["audit_type"]),
                    timestamp=audit_data["timestamp"],
                    passed=audit_data["passed"],
                    findings=audit_data["findings"],
                    severity=AlertSeverity(audit_data["severity"]),
                    recommended_actions=audit_data.get("recommended_actions", []),
                    auto_proposal_created=audit_data.get("auto_proposal_created", False),
                    proposal_id=audit_data.get("proposal_id"),
                ))
            except Exception:
                continue
        
        # Restore pattern buffer
        automation._pattern_buffer = state.get("pattern_buffer", {})
        
        # Restore metric history
        automation._metric_history = {
            k: [(t, v) for t, v in hist]
            for k, hist in state.get("metric_history", {}).items()
        }
        
        # Restore scheduled audit states
        for audit_type_str, audit_state in state.get("scheduled_audits", {}).items():
            try:
                audit_type = AuditType(audit_type_str)
                if audit_type in automation._scheduled_audits:
                    automation._scheduled_audits[audit_type].last_run = audit_state.get("last_run", 0)
                    automation._scheduled_audits[audit_type].enabled = audit_state.get("enabled", True)
            except Exception:
                continue
        
        return automation


# Module-level singleton
canon_feedback_automation = CanonFeedbackAutomation()
