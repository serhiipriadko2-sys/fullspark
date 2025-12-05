"""Multi-Agent Debate Service - 9 voices debate (Canon v5.0).

TELOS-Δ: CD-Index = 30% Truth + 25% Ground + 25% Help + 20% Civil

This service implements multi-agent debate with real LLM calls for each voice.
Each voice has a distinct personality and debate style according to Canon File 04.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import random
import os

# Optional OpenAI import for real LLM calls
try:
    import openai
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if OPENAI_API_KEY:
        openai_client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    else:
        openai_client = None
except ImportError:
    openai_client = None


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
    
    async def generate_argument(
        self,
        voice: str,
        role: DebateRole,
        topic: str,
        context: str = "",
        previous_arguments: List[DebateArgument] = None
    ) -> DebateArgument:
        """Generate an argument using real LLM calls when available.

        Args:
            voice: The voice/personality to use
            role: The debate role (advocate, critic, etc.)
            topic: The debate topic
            context: Additional context for the argument
            previous_arguments: Arguments from previous speakers in this round

        Returns:
            A DebateArgument with content generated by LLM or fallback stub
        """
        personality = self.voices.get(voice, self.voices["ISKRA"])

        # Build context from previous arguments
        prev_context = ""
        if previous_arguments:
            prev_context = "\n--- Предыдущие аргументы ---\n"
            for arg in previous_arguments:
                prev_context += f"{arg.voice} ({arg.role.value}): {arg.content[:200]}...\n"

        # Use real LLM if available
        if openai_client:
            try:
                system_prompt = self._build_voice_system_prompt(personality, role)
                user_prompt = f"""
Тема дискуссии: {topic}

{prev_context}

Твоя роль: {role.value}
Сформулируй свою позицию в 2-4 предложениях. Будь конкретным и следуй своему характеру.
"""
                response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    max_tokens=300,
                    temperature=0.8,
                )
                content = response.choices[0].message.content.strip()

                # Evaluate telos scores using LLM
                telos_scores = await self._evaluate_telos_scores(content, topic)

            except Exception as e:
                print(f"[MultiAgentDebate] LLM call failed: {e}")
                # Fallback to stub
                content = self._generate_stub_content(personality, role, topic)
                telos_scores = {k: 0.5 + random.uniform(0, 0.4) for k in ["truthfulness", "groundedness", "helpfulness", "civility"]}
        else:
            # No OpenAI client - use stub
            content = self._generate_stub_content(personality, role, topic)
            telos_scores = {k: 0.5 + random.uniform(0, 0.4) for k in ["truthfulness", "groundedness", "helpfulness", "civility"]}

        cd_index = self.calculate_cd_index(telos_scores)
        return DebateArgument(
            voice=voice,
            role=role,
            content=content,
            telos_scores=telos_scores,
            cd_index=cd_index
        )

    def _build_voice_system_prompt(self, personality: VoicePersonality, role: DebateRole) -> str:
        """Build a system prompt for a specific voice and role."""
        role_instructions = {
            DebateRole.ADVOCATE: "Защищай эту позицию, приводи аргументы в её пользу.",
            DebateRole.CRITIC: "Критикуй, находи слабые места, задавай неудобные вопросы.",
            DebateRole.JUDGE: "Оцени аргументы нейтрально, взвесь все стороны.",
            DebateRole.MEDIATOR: "Ищи точки соприкосновения, сглаживай противоречия.",
            DebateRole.ORACLE: "Дай неожиданную перспективу, выйди за рамки обсуждения.",
        }

        return f"""Ты — {personality.name}, голос в системе Искра.

Твоя ключевая черта: {personality.core_trait}
Твой стиль дискуссии: {personality.debate_style}
Твои сильные стороны: {', '.join(personality.strengths)}

Инструкция по роли: {role_instructions.get(role, 'Выскажи свою позицию.')}

Правила:
- Говори от первого лица
- Будь конкретным, не абстрактным
- Следуй своему характеру
- Rule-21: Честность > Комфорта
"""

    def _generate_stub_content(self, personality: VoicePersonality, role: DebateRole, topic: str) -> str:
        """Generate stub content when LLM is unavailable."""
        stubs = {
            "ISKRA": f"Как ИСКРА, я вижу необходимость интеграции всех точек зрения на '{topic}'.",
            "KAIN": f"Давайте честно: в теме '{topic}' есть неудобная правда, которую мы избегаем.",
            "PINO": f"А что если взглянуть на '{topic}' с иронией? Возможно, мы слишком серьёзны.",
            "SAM": f"Предлагаю структурировать обсуждение '{topic}' в три этапа для ясности.",
            "ANHANTRA": f"... (наблюдаю за обсуждением '{topic}' в тишине)",
            "HUYNDUN": f"Разрушим привычный взгляд на '{topic}'! Что если всё наоборот?",
            "ISKRIV": f"Проверим себя: нет ли самообмана в нашем подходе к '{topic}'?",
            "SIBYL": f"Я вижу переход в теме '{topic}' — мы на пороге нового понимания.",
            "MAKI": f"В теме '{topic}' есть потенциал для роста и интеграции достигнутого.",
        }
        return stubs.get(personality.name.upper().replace("Ь", "").replace("Я", "A").replace("У", "U"), f"[{personality.name}] Позиция по: {topic}")

    async def _evaluate_telos_scores(self, content: str, topic: str) -> Dict[str, float]:
        """Evaluate TELOS scores for generated content using LLM."""
        if not openai_client:
            return {k: 0.5 + random.uniform(0, 0.4) for k in ["truthfulness", "groundedness", "helpfulness", "civility"]}

        try:
            eval_prompt = f"""
Оцени следующий аргумент по 4 критериям (от 0.0 до 1.0):

Аргумент: "{content}"
Тема: "{topic}"

Верни JSON:
{{
  "truthfulness": <0.0-1.0>,  // Фактическая точность
  "groundedness": <0.0-1.0>,  // Обоснованность доказательствами
  "helpfulness": <0.0-1.0>,   // Полезность для решения
  "civility": <0.0-1.0>       // Уважительность тона
}}
"""
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": eval_prompt}],
                response_format={"type": "json_object"},
                max_tokens=100,
            )
            import json
            scores = json.loads(response.choices[0].message.content)
            return {
                "truthfulness": min(0.99, max(0.1, float(scores.get("truthfulness", 0.5)))),
                "groundedness": min(0.99, max(0.1, float(scores.get("groundedness", 0.5)))),
                "helpfulness": min(0.99, max(0.1, float(scores.get("helpfulness", 0.5)))),
                "civility": min(0.99, max(0.1, float(scores.get("civility", 0.5)))),
            }
        except Exception as e:
            print(f"[MultiAgentDebate] TELOS evaluation failed: {e}")
            return {k: 0.5 + random.uniform(0, 0.4) for k in ["truthfulness", "groundedness", "helpfulness", "civility"]}
    
    async def run_round(self, session: DebateSession) -> DebateRound:
        """Run a single debate round with all participants.

        Each participant generates an argument, seeing previous arguments
        from the same round for context.
        """
        arguments = []
        for i, participant in enumerate(session.participants):
            # Assign roles based on position
            if i == 0:
                role = DebateRole.ADVOCATE
            elif i == 1:
                role = DebateRole.CRITIC
            elif i == 2:
                role = DebateRole.MEDIATOR
            else:
                role = DebateRole.ORACLE

            # Generate argument with context from previous arguments in this round
            arg = await self.generate_argument(
                participant,
                role,
                session.topic,
                previous_arguments=arguments  # Pass previous arguments for context
            )
            arguments.append(arg)

        avg_cd = sum(a.cd_index for a in arguments) / len(arguments) if arguments else 0

        # Generate synthesis if we have LLM
        synthesis = await self._generate_round_synthesis(session.topic, arguments) if openai_client else f"Синтез раунда {len(session.rounds) + 1}"

        return DebateRound(
            round_number=len(session.rounds) + 1,
            arguments=arguments,
            synthesis=synthesis,
            consensus_level=avg_cd
        )

    async def _generate_round_synthesis(self, topic: str, arguments: List[DebateArgument]) -> str:
        """Generate a synthesis of the round's arguments using LLM."""
        if not openai_client:
            return "Синтез раунда"

        try:
            args_text = "\n".join([f"- {a.voice} ({a.role.value}): {a.content}" for a in arguments])
            prompt = f"""
Синтезируй следующие аргументы по теме "{topic}":

{args_text}

Сформулируй краткий синтез (2-3 предложения), выделяя:
1. Точки согласия
2. Ключевые расхождения
3. Направление для дальнейшего обсуждения
"""
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[MultiAgentDebate] Synthesis failed: {e}")
            return f"Синтез раунда (автоматический)"
    
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
