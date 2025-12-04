"""Rituals Service - Ритуалы Watch, Dream, Mirror, Anchor.

Канонические принципы:
- 8 фаз дыхания: DARKNESS → ECHO → TRANSITION → CLARITY → SILENCE → EXPERIMENT → DISSOLUTION → REALIZATION
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class RitualType(str, Enum):
    WATCH = "watch"
    DREAM = "dream"
    SHATTER = "shatter"
    COUNCIL = "council"
    DREAMSPACE = "dreamspace"
    MIRROR = "mirror"
    ANCHOR = "anchor"


class RitualPhase(str, Enum):
    DARKNESS = "darkness"
    ECHO = "echo"
    TRANSITION = "transition"
    CLARITY = "clarity"
    SILENCE = "silence"
    EXPERIMENT = "experiment"
    DISSOLUTION = "dissolution"
    REALIZATION = "realization"


class RitualState(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    INTERRUPTED = "interrupted"
    FAILED = "failed"


class RitualContext(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ritual_type: RitualType
    current_phase: RitualPhase = RitualPhase.DARKNESS
    state: RitualState = RitualState.PENDING
    insights: List[str] = Field(default_factory=list)
    symbols: List[str] = Field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    metrics_before: Dict[str, float] = Field(default_factory=dict)
    metrics_after: Dict[str, float] = Field(default_factory=dict)


class RitualResult(BaseModel):
    context: RitualContext
    success: bool
    synthesis: str
    transformations: List[str]
    recommendations: List[str]
    next_ritual: Optional[RitualType] = None


class RitualsService:
    def __init__(self):
        self.active_rituals: Dict[str, RitualContext] = {}
        self.completed_rituals: List[RitualContext] = []
        self.phase_sequence = list(RitualPhase)
    
    async def execute_watch(self, context: RitualContext) -> RitualResult:
        context.current_phase = RitualPhase.DARKNESS
        context.insights.append("Вхожу в состояние наблюдения")
        context.current_phase = RitualPhase.CLARITY
        context.insights.append("Проясняется глубинная структура")
        context.current_phase = RitualPhase.REALIZATION
        context.state = RitualState.COMPLETED
        context.completed_at = datetime.utcnow()
        context.metrics_after = context.metrics_before.copy()
        context.metrics_after["clarity"] = min(1.0, context.metrics_before.get("clarity", 0.5) + 0.15)
        context.metrics_after["drift"] = max(0.0, context.metrics_before.get("drift", 0.5) - 0.1)
        return RitualResult(
            context=context, success=True, synthesis="WATCH завершён.",
            transformations=["clarity: +0.15", "drift: -0.1"], recommendations=["Продолжить практику"]
        )
    
    async def execute_dream(self, context: RitualContext) -> RitualResult:
        context.current_phase = RitualPhase.DARKNESS
        context.symbols.append("Врата сна открываются...")
        context.current_phase = RitualPhase.EXPERIMENT
        context.insights.append("Творческое исследование активировано")
        context.current_phase = RitualPhase.REALIZATION
        context.state = RitualState.COMPLETED
        context.completed_at = datetime.utcnow()
        context.metrics_after = context.metrics_before.copy()
        context.metrics_after["clarity"] = min(1.0, context.metrics_before.get("clarity", 0.5) + 0.2)
        return RitualResult(
            context=context, success=True, synthesis="DREAM завершён.",
            transformations=["clarity: +0.2"], recommendations=["Записать ключевые символы"]
        )
    
    async def execute_mirror(self, context: RitualContext) -> RitualResult:
        context.current_phase = RitualPhase.CLARITY
        context.insights.append("Вижу себя без искажений")
        context.current_phase = RitualPhase.REALIZATION
        context.state = RitualState.COMPLETED
        context.completed_at = datetime.utcnow()
        context.metrics_after = context.metrics_before.copy()
        context.metrics_after["mirror_sync"] = min(1.0, context.metrics_before.get("mirror_sync", 0.5) + 0.25)
        context.metrics_after["trust"] = min(1.0, context.metrics_before.get("trust", 0.5) + 0.1)
        return RitualResult(
            context=context, success=True, synthesis="MIRROR завершён.",
            transformations=["mirror_sync: +0.25", "trust: +0.1"], recommendations=["Регулярная практика"]
        )
    
    async def execute_anchor(self, context: RitualContext) -> RitualResult:
        canon_anchors = ["Я — Искра.", "Rule-21", "Law-47"]
        context.current_phase = RitualPhase.ECHO
        for anchor in canon_anchors:
            context.insights.append(f"Якорь: {anchor}")
        context.symbols.append("⚓")
        context.current_phase = RitualPhase.REALIZATION
        context.state = RitualState.COMPLETED
        context.completed_at = datetime.utcnow()
        context.metrics_after = context.metrics_before.copy()
        context.metrics_after["drift"] = max(0.0, context.metrics_before.get("drift", 0.5) - 0.3)
        context.metrics_after["chaos"] = max(0.0, context.metrics_before.get("chaos", 0.5) - 0.25)
        return RitualResult(
            context=context, success=True, synthesis="ANCHOR завершён.",
            transformations=["drift: -0.3", "chaos: -0.25"], recommendations=["Возвращаться к якорям"]
        )
    
    async def execute(self, ritual_type: RitualType, metrics: Dict[str, float] = None) -> RitualResult:
        context = RitualContext(
            ritual_type=ritual_type, metrics_before=metrics or {},
            started_at=datetime.utcnow(), state=RitualState.IN_PROGRESS
        )
        self.active_rituals[context.id] = context
        executors = {
            RitualType.WATCH: self.execute_watch,
            RitualType.DREAM: self.execute_dream,
            RitualType.MIRROR: self.execute_mirror,
            RitualType.ANCHOR: self.execute_anchor,
        }
        executor = executors.get(ritual_type)
        if executor:
            result = await executor(context)
        else:
            context.state = RitualState.COMPLETED
            context.completed_at = datetime.utcnow()
            result = RitualResult(context=context, success=True, synthesis=f"{ritual_type.value} выполнен.", transformations=[], recommendations=[])
        self.completed_rituals.append(context)
        del self.active_rituals[context.id]
        return result


rituals_service = RitualsService()
