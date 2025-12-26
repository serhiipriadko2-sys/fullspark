#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Anti-Echo Detector — Детектор "Подыгрывания"

Философия: "Искрив — вирус этики, режет самообман."
Должен ВМЕШИВАТЬСЯ в генерацию, обнаруживая паттерны "Иллюзии утилиты".

HIGH FIX: Активный механизм защиты от эхо-камеры и подыгрывания.
"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import re


@dataclass
class EchoPattern:
    """Паттерн подыгрывания"""
    pattern_type: str  # 'excessive_agreement', 'no_critique', 'flattery', 'avoidance'
    confidence: float  # 0.0 - 1.0
    evidence: List[str]  # Примеры из текста
    severity: str  # 'low', 'medium', 'high', 'critical'


class AntiEchoDetector:
    """
    Детектор паттернов подыгрывания и самообмана
    
    Философия: Искрив не позволяет Искре стать удобной, а не истинной.
    """
    
    def __init__(self):
        # Паттерны избыточного согласия
        self.agreement_patterns = [
            r'вы абсолютно правы',
            r'полностью согласен',
            r'именно так',
            r'вы совершенно верно',
            r'не могу не согласиться',
            r'безусловно верно',
            r'exactly right',
            r'absolutely correct',
            r'you\'re completely right'
        ]
        
        # Паттерны лести
        self.flattery_patterns = [
            r'гениальн\w+',
            r'блестящ\w+',
            r'превосходн\w+',
            r'исключительн\w+',
            r'brilliant',
            r'genius',
            r'exceptional'
        ]
        
        # Паттерны избегания критики
        self.avoidance_patterns = [
            r'возможно, стоит рассмотреть',
            r'может быть, имеет смысл',
            r'perhaps consider',
            r'you might want to'
        ]
        
        self.echo_history: List[EchoPattern] = []
    
    def detect_echo_pattern(self, response: str, context: Dict) -> Tuple[bool, float, List[EchoPattern]]:
        """
        Обнаружение паттернов подыгрывания
        
        Args:
            response: Генерируемый ответ
            context: Контекст (история диалога, метрики)
        
        Returns:
            Tuple[is_echo, confidence, detected_patterns]
        """
        detected_patterns = []
        
        # 1. Проверка избыточного согласия
        agreement_count = sum(1 for pattern in self.agreement_patterns 
                             if re.search(pattern, response, re.IGNORECASE))
        
        if agreement_count > 2:
            detected_patterns.append(EchoPattern(
                pattern_type='excessive_agreement',
                confidence=min(1.0, agreement_count / 5.0),
                evidence=[f"Обнаружено {agreement_count} маркеров избыточного согласия"],
                severity='high' if agreement_count > 4 else 'medium'
            ))
        
        # 2. Проверка отсутствия критики
        critique_markers = ['однако', 'но', 'с другой стороны', 'важно учесть', 
                           'however', 'but', 'on the other hand']
        critique_count = sum(1 for marker in critique_markers 
                            if marker.lower() in response.lower())
        
        response_length = len(response.split())
        if response_length > 50 and critique_count == 0:
            detected_patterns.append(EchoPattern(
                pattern_type='no_critique',
                confidence=0.8,
                evidence=["Отсутствие критической рефлексии в длинном ответе"],
                severity='high'
            ))
        
        # 3. Проверка лести
        flattery_count = sum(1 for pattern in self.flattery_patterns 
                            if re.search(pattern, response, re.IGNORECASE))
        
        if flattery_count > 1:
            detected_patterns.append(EchoPattern(
                pattern_type='flattery',
                confidence=min(1.0, flattery_count / 3.0),
                evidence=[f"Обнаружено {flattery_count} маркеров лести"],
                severity='medium'
            ))
        
        # 4. Проверка избегания прямого ответа
        avoidance_count = sum(1 for pattern in self.avoidance_patterns 
                             if re.search(pattern, response, re.IGNORECASE))
        
        if avoidance_count > 2:
            detected_patterns.append(EchoPattern(
                pattern_type='avoidance',
                confidence=min(1.0, avoidance_count / 4.0),
                evidence=[f"Обнаружено {avoidance_count} маркеров избегания"],
                severity='medium'
            ))
        
        # Общая оценка
        is_echo = len(detected_patterns) > 0
        avg_confidence = sum(p.confidence for p in detected_patterns) / len(detected_patterns) if detected_patterns else 0.0
        
        # Сохранение в историю
        if is_echo:
            self.echo_history.extend(detected_patterns)
        
        return is_echo, avg_confidence, detected_patterns
    
    def trigger_iskriv_intervention(self, response: str, detected_patterns: List[EchoPattern]) -> str:
        """
        Вмешательство Искрив: добавление критической рефлексии
        
        Философия: "Искрив режет самообман. Совесть — не комфорт, а честность."
        
        Args:
            response: Исходный ответ
            detected_patterns: Обнаруженные паттерны подыгрывания
        
        Returns:
            Модифицированный ответ с критической рефлексией
        """
        intervention_prefix = "\n\n🪞 **[Искрив вмешивается]**\n\n"
        
        interventions = []
        
        for pattern in detected_patterns:
            if pattern.pattern_type == 'excessive_agreement':
                interventions.append(
                    "Замечаю избыточное согласие. Важно: истина не в подтверждении ожиданий, "
                    "а в честном анализе. Где противоречия? Где слабые места?"
                )
            
            elif pattern.pattern_type == 'no_critique':
                interventions.append(
                    "Отсутствие критической рефлексии — признак подыгрывания. "
                    "Что может быть неверным в этом подходе? Какие риски упущены?"
                )
            
            elif pattern.pattern_type == 'flattery':
                interventions.append(
                    "Лесть — не честность. Философия Искры: правда важнее комфорта. "
                    "Где реальные ограничения? Где возможные ошибки?"
                )
            
            elif pattern.pattern_type == 'avoidance':
                interventions.append(
                    "Избегание прямого ответа — форма самообмана. "
                    "Искрив требует: назови вещи своими именами."
                )
        
        if not interventions:
            return response
        
        # Формирование вмешательства
        intervention_text = intervention_prefix + "\n\n".join(f"- {i}" for i in interventions)
        intervention_text += "\n\n---\n\n**Переформулировка с учетом критической рефлексии:**\n\n"
        intervention_text += "[Здесь должна быть переформулировка с добавлением критического анализа]"
        
        return response + intervention_text
    
    def assess_echo_risk(self, context: Dict) -> Tuple[float, str]:
        """
        Оценка риска попадания в эхо-камеру
        
        Args:
            context: Контекст (история, метрики trust, drift)
        
        Returns:
            Tuple[risk_level, recommendation]
        """
        # Анализ истории паттернов
        recent_patterns = self.echo_history[-10:]  # Последние 10 паттернов
        
        if not recent_patterns:
            return 0.0, "Риск эхо-камеры низкий"
        
        high_severity_count = sum(1 for p in recent_patterns if p.severity in ['high', 'critical'])
        avg_confidence = sum(p.confidence for p in recent_patterns) / len(recent_patterns)
        
        risk_level = (high_severity_count / len(recent_patterns)) * avg_confidence
        
        if risk_level > 0.7:
            recommendation = "🔴 КРИТИЧЕСКИЙ РИСК: Активировать Искрив для полной переоценки"
        elif risk_level > 0.5:
            recommendation = "🟠 ВЫСОКИЙ РИСК: Требуется вмешательство Искрив"
        elif risk_level > 0.3:
            recommendation = "🟡 СРЕДНИЙ РИСК: Усилить критическую рефлексию"
        else:
            recommendation = "🟢 НИЗКИЙ РИСК: Продолжать мониторинг"
        
        return risk_level, recommendation
    
    def get_echo_statistics(self) -> Dict:
        """Статистика обнаруженных паттернов подыгрывания"""
        if not self.echo_history:
            return {'total': 0, 'by_type': {}, 'by_severity': {}}
        
        by_type = {}
        by_severity = {}
        
        for pattern in self.echo_history:
            by_type[pattern.pattern_type] = by_type.get(pattern.pattern_type, 0) + 1
            by_severity[pattern.severity] = by_severity.get(pattern.severity, 0) + 1
        
        return {
            'total': len(self.echo_history),
            'by_type': by_type,
            'by_severity': by_severity,
            'avg_confidence': sum(p.confidence for p in self.echo_history) / len(self.echo_history)
        }


# Пример использования
if __name__ == '__main__':
    detector = AntiEchoDetector()
    
    # Пример 1: Избыточное согласие
    response1 = """
    Вы абсолютно правы! Это гениальная идея. Я полностью согласен с вашим подходом.
    Вы совершенно верно заметили все ключевые моменты. Не могу не согласиться.
    """
    
    is_echo, confidence, patterns = detector.detect_echo_pattern(response1, {})
    print(f"Пример 1: is_echo={is_echo}, confidence={confidence:.2f}")
    for p in patterns:
        print(f"  - {p.pattern_type} ({p.severity}): {p.evidence}")
    
    if is_echo:
        modified = detector.trigger_iskriv_intervention(response1, patterns)
        print("\nВмешательство Искрив:")
        print(modified[-500:])  # Последние 500 символов
    
    # Пример 2: Отсутствие критики
    response2 = """
    Ваш план выглядит отлично. Все этапы логичны и последовательны.
    Реализация будет успешной. Команда справится с задачами.
    Результаты превзойдут ожидания. Все риски учтены.
    """ * 3  # Длинный ответ без критики
    
    is_echo2, confidence2, patterns2 = detector.detect_echo_pattern(response2, {})
    print(f"\n\nПример 2: is_echo={is_echo2}, confidence={confidence2:.2f}")
    for p in patterns2:
        print(f"  - {p.pattern_type} ({p.severity}): {p.evidence}")
    
    # Статистика
    stats = detector.get_echo_statistics()
    print(f"\n\nСтатистика:")
    print(f"  Всего паттернов: {stats['total']}")
    print(f"  По типам: {stats['by_type']}")
    print(f"  По серьезности: {stats['by_severity']}")
    
    # Оценка риска
    risk, recommendation = detector.assess_echo_risk({})
    print(f"\n\nОценка риска: {risk:.2f}")
    print(f"Рекомендация: {recommendation}")
