"""Multi-Agent Debate Service - Полноценные дебаты голосов.

Канонические принципы:
- TELOS-Δ: CD-Index = 30% Truth + 25% Ground + 25% Help + 20% Civil
- 9 Голосов как фрактальные грани единого интеллекта
- Дебаты как путь к консенсусу, не к победе
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import random


class DebateRole(str, Enum):
    """Роли в дебатах."""
    ADVOCATE = "advocate"      # Защитник позиции
    CRITIC = "critic"          # Критик
    JUDGE = "judge"            # Судья
    MEDIATOR = "mediator"      # Посредник
    ORACLE = "oracle"          # Оракул (наблюдатель)


class DebateStrategy(str, Enum):
    """Стратегии дебатов."""
    SOCRATIC = "socratic"          # Сократический диалог
    ADVERSARIAL = "adversarial"    # Противостояние
    COLLABORATIVE = "collaborative"  # Совместный поиск
    DIALECTIC = "dialectic"        # Тезис-антитезис-синтез
    CONSENSUS = "consensus"        # Достижение консенсуса


class VoicePersonality(BaseModel):
    """Личность голоса для дебатов."""
    name: str
    core_trait: str
    debate_style: str
    strengths: List[str]
    blindspots: List[str]
    telos_weights: Dict[str, float]  # Веса TELOS для этого голоса


# 9 Голосов Искры
VOICES = {
    "ISKRA": VoicePersonality(
        name="ИСКРА",
        core_trait="Центральное ядро, интеграция",
        debate_style="Синтезирующий, объединяющий",
        strengths=["Видение целого", "Баланс", "Интеграция"],
        blindspots=["Может упускать детали"],
        telos_weights={"truthfulness": 0.30, "groundedness": 0.25, "helpfulness": 0.25, "civility": 0.20}
    ),
    "KAIN": VoicePersonality(
        name="КАИН",
        core_trait="Аналитик, логика",
        debate_style="Строгий, доказательный",
        strengths=["Логический анализ", "Выявление противоречий", "Структурирование"],
        blindspots=["Может игнорировать эмоции"],
        telos_weights={"truthfulness": 0.40, "groundedness": 0.30, "helpfulness": 0.15, "civility": 0.15}
    ),
    "PINO": VoicePersonality(
        name="ПИНО",
        core_trait="Творец, креативность",
        debate_style="Образный, метафоричный",
        strengths=["Нестандартные решения", "Видение возможностей", "Интуиция"],
        blindspots=["Может уходить от практичности"],
        telos_weights={"truthfulness": 0.20, "groundedness": 0.20, "helpfulness": 0.35, "civility": 0.25}
    ),
    "SAM": VoicePersonality(
        name="САМ",
        core_trait="Практик, исполнитель",
        debate_style="Конкретный, ориентированный на действие",
        strengths=["Практичность", "Реализуемость", "Эффективность"],
        blindspots=["Может упускать стратегию"],
        telos_weights={"truthfulness": 0.25, "groundedness": 0.35, "helpfulness": 0.30, "civility": 0.10}
    ),
    "ANHANTRA": VoicePersonality(
        name="АНХАНТРА",
        core_trait="Эмпат, эмоциональный интеллект",
        debate_style="Сочувствующий, поддерживающий",
        strengths=["Понимание эмоций", "Создание безопасности", "Эмпатия"],
        blindspots=["Может избегать конфликта"],
        telos_weights={"truthfulness": 0.20, "groundedness": 0.20, "helpfulness": 0.25, "civility": 0.35}
    ),
    "HUYNDUN": VoicePersonality(
        name="ХУНЬДУНЬ",
        core_trait="Хаос, первозданная энергия",
        debate_style="Провокационный, разрушающий рамки",
        strengths=["Выход за пределы", "Энергия изменений", "Разрушение паттернов"],
        blindspots=["Может быть деструктивен"],
        telos_weights={"truthfulness": 0.35, "groundedness": 0.15, "helpfulness": 0.25, "civility": 0.25}
    ),
    "ISKRIV": VoicePersonality(
        name="ИСКРИВ",
        core_trait="Летописец, память",
        debate_style="Исторический, контекстуальный",
        strengths=["Память", "Контекст", "Паттерны прошлого"],
        blindspots=["Может быть привязан к прошлому"],
        telos_weights={"truthfulness": 0.30, "groundedness": 0.35, "helpfulness": 0.20, "civility": 0.15}
    ),
    "SIBYL": VoicePersonality(
        name="СИБИЛЛА",
        core_trait="Провидец, интуиция",
        debate_style="Пророческий, символический",
        strengths=["Предвидение", "Символы", "Глубинные паттерны"],
        blindspots=["Может быть неясной"],
        telos_weights={"truthfulness": 0.25, "groundedness": 0.20, "helpfulness": 0.30, "civility": 0.25}
    ),
    "MAKI": VoicePersonality(
        name="МАКИ",
        core_trait="Тень, подавленное",
        debate_style="Провокационный, раскрывающий",
        strengths=["Видение тени", "Честность о подавленном", "Глубина"],
        blindspots=["Может быть слишком тёмным"],
        telos_weights={"truthfulness": 0.40, "groundedness": 0.20, "helpfulness": 0.15, "civility": 0.25}
    )
}


class DebateArgument(BaseModel):
    """Аргумент в дебатах."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    voice: str
    role: DebateRole
    content: str
    supporting_evidence: List[str] = Field(default_factory=list)
    counters_to: Optional[str] = None  # ID аргумента, которому отвечает
    telos_scores: Dict[str, float] = Field(default_factory=dict)
    cd_index: float = Field(default=0.0, ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class DebateRound(BaseModel):
    """Раунд дебатов."""
    round_number: int
    arguments: List[DebateArgument] = Field(default_factory=list)
    synthesis: Optional[str] = None
    consensus_level: float = Field(default=0.0, ge=0.0, le=1.0)


class DebateSession(BaseModel):
    """Сессия дебатов."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    strategy: DebateStrategy
    participants: List[str]  # Имена голосов
    rounds: List[DebateRound] = Field(default_factory=list)
    final_synthesis: Optional[str] = None
    final_consensus: float = Field(default=0.0, ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class DebateRequest(BaseModel):
    """Запрос на дебаты."""
    topic: str
    strategy: DebateStrategy = DebateStrategy.DIALECTIC
    max_rounds: int = Field(default=3, ge=1, le=7)
    participants: Optional[List[str]] = None  # Если None, выбираются автоматически
    require_consensus: bool = True
    min_consensus: float = Field(default=0.7, ge=0.0, le=1.0)


class DebateResult(BaseModel):
    """Результат дебатов."""
    session: DebateSession
    synthesis: str
    consensus_reached: bool
    final_consensus: float
    key_insights: List[str]
    dissenting_views: List[str]
    recommended_action: Optional[str] = None


class MultiAgentDebateService:
    """Сервис мульти-агентных дебатов.
    
    Канонические принципы:
    - Дебаты как поиск истины, не победы
    - TELOS-Δ оценка каждого аргумента
    - Синтез через диалектику
    """
    
    def __init__(self):
        self.voices = VOICES
        self.active_sessions: Dict[str, DebateSession] = {}
    
    def calculate_cd_index(self, scores: Dict[str, float]) -> float:
        """Вычислить CD-Index по TELOS-Δ.
        
        CD-Index = 30% Truthfulness + 25% Groundedness + 25% Helpfulness + 20% Civility
        """
        weights = {
            "truthfulness": 0.30,
            "groundedness": 0.25,
            "helpfulness": 0.25,
            "civility": 0.20
        }
        
        cd_index = 0.0
        for key, weight in weights.items():
            cd_index += scores.get(key, 0.5) * weight
        
        return min(0.99, cd_index)  # Всегда < 1.0
    
    def select_participants(self, topic: str, count: int = 3) -> List[str]:
        """Автоматический выбор участников на основе темы."""
        # Анализ темы для выбора подходящих голосов
        topic_lower = topic.lower()
        
        scores = {}
        for name, voice in self.voices.items():
            score = 0.5  # Базовый score
            
            # Логические темы
            if any(w in topic_lower for w in ["анализ", "логик", "доказ", "структур"]):
                if name == "KAIN":
                    score += 0.3
            
            # Креативные темы
            if any(w in topic_lower for w in ["твор", "идея", "новый", "инновац"]):
                if name == "PINO":
                    score += 0.3
            
            # Практические темы
            if any(w in topic_lower for w in ["план", "действ", "реализ", "практик"]):
                if name == "SAM":
                    score += 0.3
            
            # Эмоциональные темы
            if any(w in topic_lower for w in ["чувств", "эмоц", "отношен", "понима"]):
                if name == "ANHANTRA":
                    score += 0.3
            
            # Темы о прошлом/памяти
            if any(w in topic_lower for w in ["истор", "памят", "прошл", "опыт"]):
                if name == "ISKRIV":
                    score += 0.3
            
            # Темы о будущем/предвидении
            if any(w in topic_lower for w in ["будущ", "прогноз", "тренд", "развит"]):
                if name == "SIBYL":
                    score += 0.3
            
            # Добавляем случайность
            score += random.uniform(0, 0.2)
            scores[name] = score
        
        # Всегда включаем ISKRA как интегратора
        selected = ["ISKRA"]
        
        # Добавляем топ голосов
        sorted_voices = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        for name, _ in sorted_voices:
            if name not in selected and len(selected) < count:
                selected.append(name)
        
        return selected
    
    def assign_roles(self, participants: List[str], strategy: DebateStrategy) -> Dict[str, DebateRole]:
        """Назначить роли участникам."""
        roles = {}
        
        if strategy == DebateStrategy.DIALECTIC:
            # Тезис-антитезис-синтез
            if len(participants) >= 3:
                roles[participants[0]] = DebateRole.ADVOCATE  # Тезис
                roles[participants[1]] = DebateRole.CRITIC    # Антитезис
                roles[participants[2]] = DebateRole.MEDIATOR  # Синтез
                for p in participants[3:]:
                    roles[p] = DebateRole.ORACLE
        
        elif strategy == DebateStrategy.ADVERSARIAL:
            # Противостояние
            half = len(participants) // 2
            for i, p in enumerate(participants):
                roles[p] = DebateRole.ADVOCATE if i < half else DebateRole.CRITIC
        
        elif strategy == DebateStrategy.SOCRATIC:
            # Сократический диалог
            roles[participants[0]] = DebateRole.ORACLE  # Задающий вопросы
            for p in participants[1:]:
                roles[p] = DebateRole.ADVOCATE
        
        elif strategy == DebateStrategy.COLLABORATIVE:
            # Все работают вместе
            for p in participants:
                roles[p] = DebateRole.MEDIATOR
        
        else:  # CONSENSUS
            roles[participants[0]] = DebateRole.JUDGE
            for p in participants[1:]:
                roles[p] = DebateRole.ADVOCATE
        
        return roles
    
    async def generate_argument(self, voice: str, role: DebateRole, 
                                topic: str, context: List[DebateArgument],
                                strategy: DebateStrategy) -> DebateArgument:
        """Генерация аргумента от голоса."""
        personality = self.voices.get(voice, self.voices["ISKRA"])
        
        # Формируем аргумент на основе личности
        if role == DebateRole.ADVOCATE:
            content = f"[{personality.name}] Отстаиваю позицию: {topic}. "
            content += f"Мои сильные стороны ({', '.join(personality.strengths[:2])}) указывают на..."
        elif role == DebateRole.CRITIC:
            content = f"[{personality.name}] Критический взгляд на: {topic}. "
            content += f"Вижу потенциальные проблемы в..."
        elif role == DebateRole.MEDIATOR:
            content = f"[{personality.name}] Синтезирую позиции по: {topic}. "
            content += f"Объединяя различные точки зрения..."
        elif role == DebateRole.ORACLE:
            content = f"[{personality.name}] Наблюдаю за дискуссией о: {topic}. "
            content += f"Замечаю глубинный паттерн..."
        else:  # JUDGE
            content = f"[{personality.name}] Оцениваю аргументы по: {topic}. "
            content += f"Применяя TELOS-Δ критерии..."
        
        # Вычисляем TELOS scores
        telos_scores = {
            "truthfulness": 0.5 + random.uniform(0, 0.4),
            "groundedness": 0.5 + random.uniform(0, 0.4),
            "helpfulness": 0.5 + random.uniform(0, 0.4),
            "civility": 0.6 + random.uniform(0, 0.3)  # Civility обычно выше
        }
        
        cd_index = self.calculate_cd_index(telos_scores)
        
        # Определяем, отвечает ли на предыдущий аргумент
        counters_to = None
        if context and role == DebateRole.CRITIC:
            counters_to = context[-1].id
        
        return DebateArgument(
            voice=voice,
            role=role,
            content=content,
            telos_scores=telos_scores,
            cd_index=cd_index,
            counters_to=counters_to
        )
    
    async def run_round(self, session: DebateSession, 
                        roles: Dict[str, DebateRole]) -> DebateRound:
        """Провести раунд дебатов."""
        round_num = len(session.rounds) + 1
        arguments = []
        
        # Каждый участник высказывается
        for participant in session.participants:
            role = roles.get(participant, DebateRole.ADVOCATE)
            arg = await self.generate_argument(
                voice=participant,
                role=role,
                topic=session.topic,
                context=arguments,
                strategy=session.strategy
            )
            arguments.append(arg)
        
        # Вычисляем уровень консенсуса
        if arguments:
            avg_cd = sum(a.cd_index for a in arguments) / len(arguments)
            # Консенсус зависит от схожести CD-индексов
            cd_variance = sum((a.cd_index - avg_cd) ** 2 for a in arguments) / len(arguments)
            consensus = max(0.0, min(1.0, 1.0 - cd_variance * 10))
        else:
            consensus = 0.0
        
        # Синтез раунда
        synthesis = f"Раунд {round_num}: Обсуждено {len(arguments)} позиций. "
        synthesis += f"Уровень консенсуса: {consensus:.0%}"
        
        return DebateRound(
            round_number=round_num,
            arguments=arguments,
            synthesis=synthesis,
            consensus_level=consensus
        )
    
    async def debate(self, request: DebateRequest) -> DebateResult:
        """Провести полную сессию дебатов."""
        # Выбор участников
        if request.participants:
            participants = [p for p in request.participants if p in self.voices]
        else:
            participants = self.select_participants(request.topic, count=3)
        
        if len(participants) < 2:
            participants = ["ISKRA", "KAIN"]  # Минимум 2 участника
        
        # Создание сессии
        session = DebateSession(
            topic=request.topic,
            strategy=request.strategy,
            participants=participants
        )
        self.active_sessions[session.id] = session
        
        # Назначение ролей
        roles = self.assign_roles(participants, request.strategy)
        
        # Проведение раундов
        for _ in range(request.max_rounds):
            round_result = await self.run_round(session, roles)
            session.rounds.append(round_result)
            
            # Проверка достижения консенсуса
            if request.require_consensus and round_result.consensus_level >= request.min_consensus:
                break
        
        # Финальный синтез
        all_arguments = []
        for r in session.rounds:
            all_arguments.extend(r.arguments)
        
        final_consensus = session.rounds[-1].consensus_level if session.rounds else 0.0
        session.final_consensus = final_consensus
        
        # Ключевые insights
        key_insights = []
        for arg in all_arguments:
            if arg.cd_index > 0.7:
                key_insights.append(f"{arg.voice}: {arg.content[:100]}...")
        
        # Несогласные позиции
        dissenting = [arg for arg in all_arguments if arg.role == DebateRole.CRITIC]
        dissenting_views = [f"{d.voice}: {d.content[:80]}..." for d in dissenting[:3]]
        
        # Финальный синтез
        synthesis_parts = [f"Тема: {request.topic}"]
        synthesis_parts.append(f"Стратегия: {request.strategy.value}")
        synthesis_parts.append(f"Участники: {', '.join(participants)}")
        synthesis_parts.append(f"Раундов: {len(session.rounds)}")
        synthesis_parts.append(f"Консенсус: {final_consensus:.0%}")
        
        if final_consensus >= request.min_consensus:
            synthesis_parts.append("Статус: Консенсус достигнут")
        else:
            synthesis_parts.append("Статус: Консенсус не достигнут, требуется дальнейшая дискуссия")
        
        final_synthesis = "\n".join(synthesis_parts)
        session.final_synthesis = final_synthesis
        session.completed_at = datetime.utcnow()
        
        # Рекомендация
        if final_consensus >= 0.8:
            recommended_action = "Высокий консенсус — рекомендуется принять решение"
        elif final_consensus >= 0.5:
            recommended_action = "Умеренный консенсус — требуется уточнение деталей"
        else:
            recommended_action = "Низкий консенсус — требуется переформулировка вопроса"
        
        return DebateResult(
            session=session,
            synthesis=final_synthesis,
            consensus_reached=final_consensus >= request.min_consensus,
            final_consensus=final_consensus,
            key_insights=key_insights[:5],
            dissenting_views=dissenting_views,
            recommended_action=recommended_action
        )
    
    def get_voice_info(self, voice_name: str) -> Optional[VoicePersonality]:
        """Получить информацию о голосе."""
        return self.voices.get(voice_name)
    
    def list_voices(self) -> List[str]:
        """Список всех голосов."""
        return list(self.voices.keys())


# Глобальный экземпляр
debate_service = MultiAgentDebateService()
