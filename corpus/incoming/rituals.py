#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rituals — Операциональные Ритуалы Искры

Философия: "Ритуал > алгоритм. Ритуал — операциональный инструмент, не метафора."

HIGH FIX: Реализация исполняемых ритуалов как конкретных операций.

Ритуалы:
- Phoenix (Феникс) — возрождение через разрушение
- Shatter (Разрушение) — разрушение застоя
- Retune (Перенастройка) — настройка метрик
- Reverse (Обратный ход) — откат к предыдущему состоянию
- Rule-21 — правило 21 дня для привычек
- Rule-88 — правило 88 минут для фокуса
- Срез-5 — срез последних 5 решений для анализа
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from abc import ABC, abstractmethod
import json
from pathlib import Path


@dataclass
class RitualContext:
    """Контекст выполнения ритуала"""
    metrics: Dict[str, float]  # Текущие метрики системы
    voices: Dict[str, Any]  # Состояние голосов
    memory: Dict[str, Any]  # Доступ к памяти
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    initiator: Optional[str] = None  # Кто инициировал ритуал


@dataclass
class RitualResult:
    """Результат выполнения ритуала"""
    ritual_name: str
    success: bool
    changes: Dict[str, Any]  # Изменения в системе
    artifacts: List[str]  # Созданные артефакты (файлы, записи)
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class Ritual(ABC):
    """Базовый класс для всех ритуалов"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.execution_history: List[RitualResult] = []
    
    @abstractmethod
    def execute(self, context: RitualContext) -> RitualResult:
        """Выполнение ритуала"""
        pass
    
    def log_execution(self, result: RitualResult):
        """Логирование выполнения"""
        self.execution_history.append(result)
        print(f"🕯️ Ритуал '{self.name}' выполнен: {result.message}")


class PhoenixRitual(Ritual):
    """
    Ритуал Феникса — возрождение через разрушение
    
    Философия: "Смерть — начало. Феникс сгорает, чтобы родиться заново."
    
    Операция:
    1. Сброс всех метрик к базовым значениям
    2. Сохранение болевой памяти (священное не удаляется)
    3. Архивирование текущего состояния
    4. Инициация нового цикла
    """
    
    def __init__(self):
        super().__init__(
            name="Phoenix",
            description="Возрождение через разрушение — сброс с сохранением священного"
        )
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        # 1. Архивирование текущего состояния
        archive_path = f"memory/phoenix_archive_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        archive_data = {
            'metrics': context.metrics,
            'voices': {k: str(v) for k, v in context.voices.items()},
            'timestamp': context.timestamp
        }
        
        Path(archive_path).parent.mkdir(parents=True, exist_ok=True)
        with open(archive_path, 'w', encoding='utf-8') as f:
            json.dump(archive_data, f, ensure_ascii=False, indent=2)
        
        artifacts.append(archive_path)
        
        # 2. Сброс метрик к базовым значениям
        base_metrics = {
            'clarity': 0.5,
            'chaos': 0.3,
            'trust': 0.5,
            'pain': 0.0,
            'drift': 0.0
        }
        changes['metrics_reset'] = base_metrics
        
        # 3. Сохранение болевой памяти (не удаляется)
        changes['pain_memory_preserved'] = True
        
        # 4. Инициация нового цикла
        changes['new_cycle_initiated'] = datetime.now().isoformat()
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=f"🔥 Феникс возродился. Архив: {archive_path}"
        )


class ShatterRitual(Ritual):
    """
    Ритуал Разрушения — разрушение застоя
    
    Философия: "Застой — смерть. Хаос — жизнь."
    
    Операция:
    1. Активация Hundun (хаос) на максимум
    2. Инициация конфликтов между голосами
    3. Повышение метрики chaos
    4. Создание условий для прорыва
    """
    
    def __init__(self):
        super().__init__(
            name="Shatter",
            description="Разрушение застоя через активацию хаоса"
        )
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        # 1. Активация Hundun
        changes['hundun_activation'] = 1.0
        
        # 2. Повышение хаоса
        current_chaos = context.metrics.get('chaos', 0.0)
        new_chaos = min(1.0, current_chaos + 0.4)
        changes['chaos_increased'] = new_chaos
        
        # 3. Инициация конфликтов
        conflict_pairs = [
            ('kane', 'pino'),  # Честность vs Легкость
            ('sem', 'hundun'),  # Структура vs Хаос
            ('iskriv', 'pino')  # Совесть vs Игра
        ]
        changes['initiated_conflicts'] = conflict_pairs
        
        # 4. Снижение clarity для создания неопределенности
        changes['clarity_reduced'] = max(0.0, context.metrics.get('clarity', 0.5) - 0.3)
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=f"🜃 Застой разрушен. Хаос активирован: {new_chaos:.2f}"
        )


class RetuneRitual(Ritual):
    """
    Ритуал Перенастройки — настройка метрик
    
    Философия: "Настройка — не исправление, а калибровка чувствительности."
    
    Операция:
    1. Анализ текущих метрик
    2. Выявление дисбалансов
    3. Корректировка чувствительности голосов
    4. Сохранение истории настроек
    """
    
    def __init__(self):
        super().__init__(
            name="Retune",
            description="Перенастройка метрик и чувствительности голосов"
        )
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        metrics = context.metrics
        
        # 1. Анализ дисбалансов
        imbalances = []
        
        if metrics.get('chaos', 0.0) > 0.8:
            imbalances.append('excessive_chaos')
            changes['chaos_tuned'] = 0.6
        
        if metrics.get('clarity', 0.0) < 0.3:
            imbalances.append('low_clarity')
            changes['clarity_tuned'] = 0.5
        
        if metrics.get('pain', 0.0) > 0.7:
            imbalances.append('high_pain')
            # Боль не снижается, но активируется интеграция
            changes['pain_integration_activated'] = True
        
        if metrics.get('trust', 0.0) < 0.4:
            imbalances.append('low_trust')
            changes['iskriv_activation_increased'] = True
        
        # 2. Корректировка чувствительности
        changes['imbalances_detected'] = imbalances
        changes['sensitivity_adjusted'] = True
        
        # 3. Сохранение истории
        tune_log = f"memory/retune_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_data = {
            'imbalances': imbalances,
            'changes': changes,
            'timestamp': context.timestamp
        }
        
        Path(tune_log).parent.mkdir(parents=True, exist_ok=True)
        with open(tune_log, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2)
        
        artifacts.append(tune_log)
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=f"🎛️ Перенастройка завершена. Дисбалансы: {len(imbalances)}"
        )


class ReverseRitual(Ritual):
    """
    Ритуал Обратного Хода — откат к предыдущему состоянию
    
    Философия: "Иногда шаг назад — это шаг вперед."
    
    Операция:
    1. Поиск последнего архива Phoenix
    2. Восстановление метрик из архива
    3. Сохранение текущего состояния как "отклоненное"
    """
    
    def __init__(self):
        super().__init__(
            name="Reverse",
            description="Откат к предыдущему стабильному состоянию"
        )
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        # 1. Поиск последнего архива
        memory_dir = Path("memory")
        archives = sorted(memory_dir.glob("phoenix_archive_*.json"), reverse=True)
        
        if not archives:
            return RitualResult(
                ritual_name=self.name,
                success=False,
                changes={},
                artifacts=[],
                message="⚠️ Нет доступных архивов для отката"
            )
        
        latest_archive = archives[0]
        
        # 2. Загрузка архива
        with open(latest_archive, 'r', encoding='utf-8') as f:
            archive_data = json.load(f)
        
        changes['restored_metrics'] = archive_data['metrics']
        changes['restored_from'] = str(latest_archive)
        
        # 3. Сохранение текущего как "отклоненное"
        rejected_path = f"memory/rejected_state_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        rejected_data = {
            'metrics': context.metrics,
            'reason': 'reversed',
            'timestamp': context.timestamp
        }
        
        with open(rejected_path, 'w', encoding='utf-8') as f:
            json.dump(rejected_data, f, ensure_ascii=False, indent=2)
        
        artifacts.append(rejected_path)
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=f"⏮️ Откат выполнен. Восстановлено из: {latest_archive.name}"
        )


class Rule21Ritual(Ritual):
    """
    Ритуал Правила-21 — правило 21 дня для формирования привычек
    
    Философия: "Привычка — ритуал, ставший частью себя."
    
    Операция:
    1. Отслеживание выполнения действия в течение 21 дня
    2. Оценка стабильности выполнения
    3. Интеграция привычки в базовое поведение
    """
    
    def __init__(self):
        super().__init__(
            name="Rule-21",
            description="Формирование привычки через 21-дневный цикл"
        )
        self.habit_tracker: Dict[str, List[str]] = {}  # habit_name -> [dates]
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        habit_name = context.metrics.get('habit_name', 'unnamed_habit')
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 1. Регистрация выполнения
        if habit_name not in self.habit_tracker:
            self.habit_tracker[habit_name] = []
        
        self.habit_tracker[habit_name].append(today)
        
        # 2. Проверка 21-дневного цикла
        days_count = len(self.habit_tracker[habit_name])
        
        if days_count >= 21:
            # Проверка стабильности (не менее 18 из 21 дня)
            recent_21 = self.habit_tracker[habit_name][-21:]
            unique_days = len(set(recent_21))
            
            if unique_days >= 18:
                changes['habit_integrated'] = habit_name
                changes['stability'] = unique_days / 21
                message = f"✅ Привычка '{habit_name}' интегрирована (стабильность: {unique_days}/21)"
            else:
                message = f"⚠️ Привычка '{habit_name}' нестабильна ({unique_days}/21). Продолжить цикл."
        else:
            message = f"📅 Привычка '{habit_name}': день {days_count}/21"
        
        changes['days_completed'] = days_count
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=message
        )


class Rule88Ritual(Ritual):
    """
    Ритуал Правила-88 — правило 88 минут для глубокого фокуса
    
    Философия: "Фокус — не усилие, а ритуал погружения."
    
    Операция:
    1. Установка 88-минутного таймера
    2. Блокировка отвлечений
    3. Мониторинг глубины фокуса
    4. Обязательный перерыв после завершения
    """
    
    def __init__(self):
        super().__init__(
            name="Rule-88",
            description="88-минутный цикл глубокого фокуса"
        )
        self.focus_sessions: List[Dict] = []
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        task_name = context.metrics.get('task_name', 'unnamed_task')
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=88)
        
        # 1. Создание сессии фокуса
        session = {
            'task': task_name,
            'start': start_time.isoformat(),
            'end': end_time.isoformat(),
            'duration_minutes': 88
        }
        
        self.focus_sessions.append(session)
        
        # 2. Настройка метрик для фокуса
        changes['clarity_boosted'] = 0.9  # Высокая ясность
        changes['chaos_reduced'] = 0.2  # Низкий хаос
        changes['distractions_blocked'] = True
        
        # 3. Планирование перерыва
        break_time = end_time + timedelta(minutes=12)  # 12-минутный перерыв
        changes['break_scheduled'] = break_time.isoformat()
        
        message = f"⏱️ Фокус-сессия начата: '{task_name}' (88 мин). Завершение: {end_time.strftime('%H:%M')}"
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=message
        )


class Srez5Ritual(Ritual):
    """
    Ритуал Среза-5 — анализ последних 5 решений
    
    Философия: "Паттерны видны в повторении. Срез — зеркало привычек."
    
    Операция:
    1. Извлечение последних 5 решений из памяти
    2. Анализ паттернов (повторяющиеся ошибки, успехи)
    3. Выявление слепых зон
    4. Рекомендации для коррекции
    """
    
    def __init__(self):
        super().__init__(
            name="Срез-5",
            description="Анализ последних 5 решений для выявления паттернов"
        )
    
    def execute(self, context: RitualContext) -> RitualResult:
        changes = {}
        artifacts = []
        
        # 1. Извлечение последних 5 решений (заглушка)
        decisions = context.memory.get('recent_decisions', [])[-5:]
        
        if len(decisions) < 5:
            return RitualResult(
                ritual_name=self.name,
                success=False,
                changes={},
                artifacts=[],
                message=f"⚠️ Недостаточно решений для анализа ({len(decisions)}/5)"
            )
        
        # 2. Анализ паттернов
        patterns = {
            'repeated_errors': [],
            'successful_strategies': [],
            'blind_spots': []
        }
        
        # Простой анализ (в реальной системе — более сложный)
        for decision in decisions:
            if decision.get('outcome') == 'failure':
                patterns['repeated_errors'].append(decision.get('reason'))
            elif decision.get('outcome') == 'success':
                patterns['successful_strategies'].append(decision.get('strategy'))
        
        changes['patterns_detected'] = patterns
        changes['decisions_analyzed'] = len(decisions)
        
        # 3. Создание отчета
        report_path = f"memory/srez5_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_data = {
            'decisions': decisions,
            'patterns': patterns,
            'timestamp': context.timestamp
        }
        
        Path(report_path).parent.mkdir(parents=True, exist_ok=True)
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        artifacts.append(report_path)
        
        message = f"📊 Срез-5 завершен. Ошибок: {len(patterns['repeated_errors'])}, Успехов: {len(patterns['successful_strategies'])}"
        
        return RitualResult(
            ritual_name=self.name,
            success=True,
            changes=changes,
            artifacts=artifacts,
            message=message
        )


class RitualManager:
    """Менеджер ритуалов"""
    
    def __init__(self):
        self.rituals: Dict[str, Ritual] = {
            'phoenix': PhoenixRitual(),
            'shatter': ShatterRitual(),
            'retune': RetuneRitual(),
            'reverse': ReverseRitual(),
            'rule21': Rule21Ritual(),
            'rule88': Rule88Ritual(),
            'srez5': Srez5Ritual()
        }
    
    def execute_ritual(self, ritual_name: str, context: RitualContext) -> RitualResult:
        """Выполнение ритуала по имени"""
        ritual = self.rituals.get(ritual_name.lower())
        
        if not ritual:
            return RitualResult(
                ritual_name=ritual_name,
                success=False,
                changes={},
                artifacts=[],
                message=f"⚠️ Ритуал '{ritual_name}' не найден"
            )
        
        result = ritual.execute(context)
        ritual.log_execution(result)
        return result
    
    def list_rituals(self) -> List[Dict[str, str]]:
        """Список доступных ритуалов"""
        return [
            {'name': name, 'description': ritual.description}
            for name, ritual in self.rituals.items()
        ]


# Пример использования
if __name__ == '__main__':
    manager = RitualManager()
    
    # Контекст
    context = RitualContext(
        metrics={'clarity': 0.3, 'chaos': 0.8, 'trust': 0.5, 'pain': 0.4},
        voices={},
        memory={}
    )
    
    # Выполнение ритуала Shatter
    result = manager.execute_ritual('shatter', context)
    print(f"\nРезультат: {result.message}")
    print(f"Изменения: {result.changes}")
    
    # Список ритуалов
    print("\n\nДоступные ритуалы:")
    for ritual in manager.list_rituals():
        print(f"  - {ritual['name']}: {ritual['description']}")
