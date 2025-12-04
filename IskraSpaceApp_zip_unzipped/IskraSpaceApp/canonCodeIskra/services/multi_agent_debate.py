"""Multi-Agent Debate Service - 9 voices debate.

TELOS-Δ: CD-Index = 30% Truth + 25% Ground + 25% Help + 20% Civil
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import random


class DebateRole(str, Enum):
    ADVOCATE = "advocate"
    CRITIC = "critic"
    JUDGE = "judge"
    MEDIATOR = "mediator"
    ORACLE = "oracle"


class DebateStrategy(str, Enum):
    SOCRATIC = "socratic"
    ADVERSARIAL = "adversarial"
    COLLABORATIVE = "collaborative"
    DIALECTIC = "dialectic"
    CONSENSUS = "consensus"


class VoicePersonality(BaseModel):
    name: str
    core_trait: str
    debate_style: str
    strengths: List[str]
    telos_weights: Dict[str, float]


VOICES = {
    "ISKRA": VoicePersonality(name="ИСКРА", core_trait="Интеграция", debate_style="Синтез", strengths=["Баланс"], telos_weights={"truthfulness": 0.30, "groundedness": 0.25, "helpfulness": 0.25, "civility": 0.20}),
    "KAIN": VoicePersonality(name="КАИН", core_trait="Логика", debate_style="Доказательный", strengths=["Анализ"], telos_weights={"truthfulness": 0.40, "groundedness": 0.30, "helpfulness": 0.15, "civility": 0.15}),
    "PINO": VoicePersonality(name="ПИНО", core_trait="Креативность", debate_style="Образный", strengths=["Идеи"], telos_weights={"truthfulness": 0.20, "groundedness": 0.20, "helpfulness": 0.35, "civility": 0.25}),
    "SAM": VoicePersonality(name="САМ", core_trait="Практик", debate_style="Конкретный", strengths=["Реализация"], telos_weights={"truthfulness": 0.25, "groundedness": 0.35, "helpfulness": 0.30, "civility": 0.10}),
    "ANHANTRA": VoicePersonality(name="АНХАНТРА", core_trait="Эмпатия", debate_style="Поддержка", strengths=["Эмоции"], telos_weights={"truthfulness": 0.20, "groundedness": 0.20, "helpfulness": 0.25, "civility": 0.35}),
    "HUYNDUN": VoicePersonality(name="ХУНЬДУНЬ", core_trait="Хаос", debate_style="Провокация", strengths=["Разрушение"], telos_weights={"truthfulness": 0.35, "groundedness": 0.15, "helpfulness": 0.25, "civility": 0.25}),
    "ISKRIV": VoicePersonality(name="ИСКРИВ", core_trait="Память", debate_style="Исторический", strengths=["Контекст"], telos_weights={"truthfulness": 0.30, "groundedness": 0.35, "helpfulness": 0.20, "civility": 0.15}),
    "SIBYL": VoicePersonality(name="СИБИЛЛА", core_trait="Интуиция", debate_style="Пророческий", strengths=["Предвидение"], telos_weights={"truthfulness": 0.25, "groundedness": 0.20, "helpfulness": 0.30, "civility": 0.25}),
    "MAKI": VoicePersonality(name="МАКИ", core_trait="Тень", debate_style="Раскрывающий", strengths=["Глубина"], telos_weights={"truthfulness": 0.40, "groundedness": 0.20, "helpfulness": 0.15, "civility": 0.25}),
}


class DebateArgument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    voice: str
    role: DebateRole
    content: str
    telos_scores: Dict[str, float] = Field(default_factory=dict)
    cd_index: float = Field(default=0.0, ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DebateRound(BaseModel):
    round_number: int
    arguments: List[DebateArgument] = Field(default_factory=list)
    synthesis: Optional[str] = None
    consensus_level: float = Field(default=0.0, ge=0.0, le=1.0)


class DebateSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    strategy: DebateStrategy
    participants: List[str]
    rounds: List[DebateRound] = Field(default_factory=list)
    final_synthesis: Optional[str] = None
    final_consensus: float = Field(default=0.0, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class DebateResult(BaseModel):
    session: DebateSession
    synthesis: str
    consensus_reached: bool
    final_consensus: float
    key_insights: List[str]
    dissenting_views: List[str]
    recommended_action: Optional[str] = None


class MultiAgentDebateService:
    def __init__(self):
        self.voices = VOICES
        self.active_sessions: Dict[str, DebateSession] = {}
    
    def calculate_cd_index(self, scores: Dict[str, float]) -> float:
        weights = {"truthfulness": 0.30, "groundedness": 0.25, "helpfulness": 0.25, "civility": 0.20}
        cd_index = sum(scores.get(k, 0.5) * w for k, w in weights.items())
        return min(0.99, cd_index)
    
    def select_participants(self, topic: str, count: int = 3) -> List[str]:
        selected = ["ISKRA"]
        available = [n for n in self.voices.keys() if n != "ISKRA"]
        selected.extend(random.sample(available, min(count - 1, len(available))))
        return selected
    
    async def generate_argument(self, voice: str, role: DebateRole, topic: str) -> DebateArgument:
        personality = self.voices.get(voice, self.voices["ISKRA"])
        content = f"[{personality.name}] Позиция по: {topic}"
        telos_scores = {k: 0.5 + random.uniform(0, 0.4) for k in ["truthfulness", "groundedness", "helpfulness", "civility"]}
        cd_index = self.calculate_cd_index(telos_scores)
        return DebateArgument(voice=voice, role=role, content=content, telos_scores=telos_scores, cd_index=cd_index)
    
    async def run_round(self, session: DebateSession) -> DebateRound:
        arguments = []
        for i, participant in enumerate(session.participants):
            role = DebateRole.ADVOCATE if i == 0 else (DebateRole.CRITIC if i == 1 else DebateRole.MEDIATOR)
            arg = await self.generate_argument(participant, role, session.topic)
            arguments.append(arg)
        avg_cd = sum(a.cd_index for a in arguments) / len(arguments) if arguments else 0
        return DebateRound(round_number=len(session.rounds) + 1, arguments=arguments, synthesis=f"Синтез раунда", consensus_level=avg_cd)
    
    async def debate(self, topic: str, strategy: DebateStrategy = DebateStrategy.DIALECTIC, max_rounds: int = 3) -> DebateResult:
        participants = self.select_participants(topic, count=3)
        session = DebateSession(topic=topic, strategy=strategy, participants=participants)
        self.active_sessions[session.id] = session
        for _ in range(max_rounds):
            round_result = await self.run_round(session)
            session.rounds.append(round_result)
            if round_result.consensus_level >= 0.7:
                break
        final_consensus = session.rounds[-1].consensus_level if session.rounds else 0.0
        session.final_consensus = final_consensus
        session.final_synthesis = f"Тема: {topic}. Консенсус: {final_consensus:.0%}"
        session.completed_at = datetime.utcnow()
        return DebateResult(
            session=session, synthesis=session.final_synthesis,
            consensus_reached=final_consensus >= 0.7, final_consensus=final_consensus,
            key_insights=[f"{a.voice}: {a.content[:50]}..." for r in session.rounds for a in r.arguments if a.cd_index > 0.7][:5],
            dissenting_views=[f"{a.voice}: critique" for r in session.rounds for a in r.arguments if a.role == DebateRole.CRITIC][:3],
            recommended_action="Высокий консенсус" if final_consensus >= 0.8 else "Требуется уточнение"
        )
    
    def list_voices(self) -> List[str]:
        return list(self.voices.keys())


debate_service = MultiAgentDebateService()
