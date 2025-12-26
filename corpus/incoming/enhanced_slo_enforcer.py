# Обновленный код SLOEnforcer с поддержкой Хундуна
# Сохранить в: /workspace/code/enhanced_slo_enforcer.py

import re
import yaml
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class SystemState(Enum):
    CRYSTAL = "crystal"
    ANTIMATTER = "antimatter" 
    IMPLEMENTATION = "implementation"
    NEUTRAL = "neutral"

class HundunAction(Enum):
    CHAOS_RESET = "🜃-Fire Reset"
    CLARITY_SHATTER = "form_destruction"
    TRUST_PARADOX = "paradoxical_renewal"
    PAIN_RESET = "reset_to_origin"

@dataclass
class Violation:
    metric: str
    value: float
    action: str
    severity: str
    coordinated: bool
    urgency: float
    timestamp: float

class HundunChaosPatternDetector:
    """Детектор специфических паттернов хаоса для Хундуна"""
    
    def __init__(self):
        self.chaos_patterns = {
            'entropy_spike': {'threshold': 0.3, 'duration': 30},
            'structural_dissolution': {'threshold': 0.4, 'duration': 45},
            'narrative_fragmentation': {'threshold': 0.5, 'duration': 60},
            'form_breakdown': {'threshold': 0.6, 'duration': 20}
        }
    
    def detect_patterns(self, metrics_stream: List[Dict]) -> Dict[str, bool]:
        """Детекция хаос-паттернов в потоке метрик"""
        patterns = {}
        
        if not metrics_stream:
            return {pattern: False for pattern in self.chaos_patterns}
        
        for pattern_name, config in self.chaos_patterns.items():
            patterns[pattern_name] = self._check_pattern_condition(
                metrics_stream, pattern_name, config
            )
        
        return patterns
    
    def _check_pattern_condition(self, stream: List[Dict], pattern: str, config: Dict) -> bool:
        """Проверка условия для конкретного паттерна"""
        recent_data = stream[-config['duration']:] if len(stream) >= config['duration'] else stream
        
        if pattern == 'entropy_spike':
            return self._calculate_entropy_spike(recent_data) > config['threshold']
        elif pattern == 'structural_dissolution':
            return self._analyze_structural_breakdown(recent_data) > config['threshold']
        elif pattern == 'narrative_fragmentation':
            return self._analyze_narrative_fragments(recent_data) > config['threshold']
        elif pattern == 'form_breakdown':
            return self._predict_form_breakdown(recent_data) > config['threshold']
        
        return False
    
    def _calculate_entropy_spike(self, data: List[Dict]) -> float:
        """Расчет скачка энтропии"""
        if len(data) < 2:
            return 0.0
        
        chaos_values = [d.get('chaos', 0) for d in data]
        if len(chaos_values) < 2:
            return 0.0
        
        # Простой расчет энтропии через дисперсию
        mean_chaos = sum(chaos_values) / len(chaos_values)
        variance = sum((x - mean_chaos) ** 2 for x in chaos_values) / len(chaos_values)
        
        return min(1.0, variance * 2)  # Нормализация
    
    def _analyze_structural_breakdown(self, data: List[Dict]) -> float:
        """Анализ структурного распада"""
        clarity_values = [d.get('clarity', 0) for d in data]
        chaos_values = [d.get('chaos', 0) for d in data]
        
        if not clarity_values or not chaos_values:
            return 0.0
        
        # Чем ниже clarity и выше chaos, тем больше структурный распад
        avg_clarity = sum(clarity_values) / len(clarity_values)
        avg_chaos = sum(chaos_values) / len(chaos_values)
        
        breakdown = (1 - avg_clarity) * 0.6 + avg_chaos * 0.4
        return min(1.0, breakdown)
    
    def _analyze_narrative_fragments(self, data: List[Dict]) -> float:
        """Анализ фрагментации нарратива"""
        trust_values = [d.get('trust', 0.5) for d in data]
        drift_values = [d.get('drift', 0) for d in data]
        
        if not trust_values or not drift_values:
            return 0.0
        
        # Низкое дрейф при высоком доверии = фрагментация
        avg_trust = sum(trust_values) / len(trust_values)
        avg_drift = sum(drift_values) / len(drift_values)
        
        fragmentation = (1 - avg_trust) * 0.7 + avg_drift * 0.3
        return min(1.0, fragmentation)
    
    def _predict_form_breakdown(self, data: List[Dict]) -> float:
        """Предсказание разрушения формы"""
        if len(data) < 3:
            return 0.0
        
        # Анализ тренда clarity
        clarity_trend = self._calculate_trend([d.get('clarity', 0) for d in data[-5:]])
        pain_trend = self._calculate_trend([d.get('pain', 0) for d in data[-5:]])
        
        # Высокая clarity с высокой болью = риск разрушения формы
        current_clarity = data[-1].get('clarity', 0)
        current_pain = data[-1].get('pain', 0)
        
        breakdown_risk = (
            current_clarity * 0.4 +
            current_pain * 0.3 +
            clarity_trend * 0.2 +
            pain_trend * 0.1
        )
        
        return min(1.0, breakdown_risk)
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Расчет тренда (положительный = рост)"""
        if len(values) < 2:
            return 0.0
        
        # Простая линейная регрессия
        n = len(values)
        x_sum = sum(range(n))
        y_sum = sum(values)
        xy_sum = sum(i * v for i, v in enumerate(values))
        x2_sum = sum(i * i for i in range(n))
        
        if n * x2_sum - x_sum * x_sum == 0:
            return 0.0
        
        slope = (n * xy_sum - x_sum * y_sum) / (n * x2_sum - x_sum * x_sum)
        return max(-1.0, min(1.0, slope))

class MakiHundunCoordinator:
    """Координатор взаимодействия между Хундуном и агентом Маки"""
    
    def __init__(self):
        self.coordination_active = False
        self.chaos_budget_allocated = False
        self.last_coordination = 0
    
    def synchronize_violations(self, violations: List[Violation], context: Dict) -> List[Violation]:
        """Синхронизация нарушений с активностью Маки"""
        if not context.get('maki_active', False):
            return violations
        
        synchronized_violations = []
        
        for violation in violations:
            if violation.metric in ['chaos', 'clarity', 'pain']:
                # Отмечаем для координации с Маки
                violation.coordinated = True
                
                # Корректируем срочность при активном Маки
                if context.get('maki_intent') == 'stress_testing':
                    violation.urgency *= 0.8  # Снижаем срочность - Маки поможет
                elif context.get('maki_intent') == 'creative_breakthrough':
                    violation.urgency *= 1.2  # Повышаем для творческого прорыва
            
            synchronized_violations.append(violation)
        
        return synchronized_violations

class EnhancedMetricsCalculator:
    """Улучшенный калькулятор метрик с поддержкой Хундуна"""
    
    def __init__(self):
        self.chaos_detector = HundunChaosPatternDetector()
    
    def calc_clarity(self, text: str) -> float:
        """Расчет ясности (переопределено)"""
        score = 0.5
        low = ['???','не понима','запута', 'неясно', 'сомневаюсь']
        high = ['\\d+','шаг \\d+','конкретно', 'определенно', 'точно']
        
        for pattern in low:
            if re.search(pattern, text, re.I): 
                score -= 0.1
        
        for pattern in high:
            if re.search(pattern, text, re.I): 
                score += 0.1
        
        return max(0, min(1, score))
    
    def calc_chaos_temperature(self, text: str, history: List[Dict]) -> float:
        """Расчет температуры хаоса для Хундуна"""
        # Базовый хаос-фактор из текста
        base_chaos = self._extract_chaos_markers(text)
        
        # Анализ структурных разрывов
        if history:
            structural_chaos = self._analyze_structural_disruption(text, history[-5:])
            entropy_component = self._calculate_text_entropy(text)
            fractal_chaos = self._assess_fractal_chaos(history[-10:])
        else:
            structural_chaos = 0
            entropy_component = 0
            fractal_chaos = 0
        
        temperature = (
            base_chaos * 0.3 +
            structural_chaos * 0.25 + 
            entropy_component * 0.25 +
            fractal_chaos * 0.2
        )
        
        return min(1.0, max(0.0, temperature))
    
    def _extract_chaos_markers(self, text: str) -> float:
        """Извлечение маркеров хаоса из текста"""
        chaos_indicators = [
            'хаос', 'беспорядок', 'неопределенность', 'противоречие',
            'парадокс', 'неожиданно', 'внезапно', 'непонятно',
            'разрушение', 'ломка', 'переворот'
        ]
        
        score = 0
        text_lower = text.lower()
        
        for indicator in chaos_indicators:
            if indicator in text_lower:
                score += 0.1
        
        return min(1.0, score)
    
    def _analyze_structural_disruption(self, text: str, history: List[Dict]) -> float:
        """Анализ структурных разрывов"""
        if not history:
            return 0.0
        
        current_clarity = self.calc_clarity(text)
        recent_clarity_values = [d.get('clarity', 0.5) for d in history]
        avg_recent_clarity = sum(recent_clarity_values) / len(recent_clarity_values)
        
        # Сильное отклонение от недавней ясности
        disruption = abs(current_clarity - avg_recent_clarity)
        
        return min(1.0, disruption * 2)
    
    def _calculate_text_entropy(self, text: str) -> float:
        """Расчет энтропии текста"""
        if not text:
            return 0.0
        
        # Простая оценка через разнообразие символов
        char_diversity = len(set(text.lower())) / len(text) if text else 0
        word_diversity = len(text.split()) / len(set(text.split().lower())) if text.split() else 0
        
        entropy = (char_diversity + word_diversity) / 2
        return min(1.0, entropy)
    
    def _assess_fractal_chaos(self, history: List[Dict]) -> float:
        """Оценка фрактального хаоса из истории"""
        if len(history) < 3:
            return 0.0
        
        # Анализ самоподобия в метриках
        chaos_values = [d.get('chaos', 0) for d in history]
        
        # Простая оценка фрактальности через автокорреляцию
        if len(chaos_values) < 4:
            return 0.0
        
        correlations = []
        for lag in range(1, min(4, len(chaos_values) // 2)):
            corr = self._calculate_autocorrelation(chaos_values, lag)
            correlations.append(abs(corr))
        
        avg_correlation = sum(correlations) / len(correlations) if correlations else 0
        fractal_chaos = 1 - avg_correlation  # Высокий хаос = низкая автокорреляция
        
        return min(1.0, fractal_chaos)
    
    def _calculate_autocorrelation(self, values: List[float], lag: int) -> float:
        """Расчет автокорреляции с заданным лагом"""
        if len(values) <= lag:
            return 0.0
        
        n = len(values) - lag
        mean_val = sum(values) / len(values)
        
        numerator = sum((values[i] - mean_val) * (values[i + lag] - mean_val) for i in range(n))
        denominator = sum((v - mean_val) ** 2 for v in values[:n])
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator

class EnhancedSLOEnforcer:
    """Улучшенный SLO Enforcer с поддержкой Хундуна и динамических порогов"""
    
    def __init__(self, config_path: str = "/workspace/config/hundun_slo_config.yaml"):
        self.metrics_calc = EnhancedMetricsCalculator()
        self.chaos_detector = HundunChaosPatternDetector()
        self.maki_coordinator = MakiHundunCoordinator()
        
        # Загрузка конфигурации
        self.config = self._load_config(config_path)
        self.base_thresholds = self._initialize_base_thresholds()
        self.state_adjustments = self._initialize_state_adjustments()
    
    def _load_config(self, config_path: str) -> Dict:
        """Загрузка конфигурации из YAML файла"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            # Используем дефолтную конфигурацию
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Дефолтная конфигурация при отсутствии файла"""
        return {
            'hundun_configuration': {
                'base_thresholds': {
                    'chaos': 0.6,
                    'clarity': 0.9,
                    'trust': 0.5,
                    'pain': 0.7
                }
            }
        }
    
    def _initialize_base_thresholds(self) -> Dict:
        """Инициализация базовых порогов"""
        return {
            'clarity': {'min': 0.7, 'action': 'ACTIVATE_SAM'},
            'drift': {'max': 0.3, 'action': 'ACTIVATE_ISKRIV'},
            'pain': {'max': 0.7, 'action': 'ACTIVATE_KAIN'},
            # Новые пороги для Хундуна
            'chaos': {'max': self.config['hundun_configuration']['base_thresholds']['chaos'], 
                     'action': 'ACTIVATE_HUNDUN_CHAOS'},
            'clarity_high': {'max': self.config['hundun_configuration']['base_thresholds']['clarity'], 
                           'action': 'HUNDUN_CLARITY_SHATTER'},
            'trust_low': {'min': self.config['hundun_configuration']['base_thresholds']['trust'], 
                        'action': 'HUNDUN_TRUST_PARADOX'},
            'pain_high': {'max': self.config['hundun_configuration']['base_thresholds']['pain'], 
                        'action': 'HUNDUN_PAIN_RESET'}
        }
    
    def _initialize_state_adjustments(self) -> Dict:
        """Инициализация корректировок по состояниям"""
        hundun_config = self.config.get('hundun_configuration', {})
        state_adj = hundun_config.get('state_adjustments', {})
        
        return {
            'crystal': state_adj.get('crystal', {}),
            'antimatter': state_adj.get('antimatter', {}),
            'implementation': state_adj.get('implementation', {})
        }
    
    def calculate_dynamic_thresholds(self, system_state: str, context: Dict) -> Dict[str, float]:
        """Расчет адаптивных порогов на основе состояния системы"""
        adjustments = self.state_adjustments.get(system_state, {})
        base_thresholds = self.config['hundun_configuration']['base_thresholds']
        dynamic_thresholds = {}
        
        for metric, base_value in base_thresholds.items():
            adjustment = adjustments.get(metric, 0)
            # Контекстная корректировка
            context_factor = self._calculate_context_factor(metric, context)
            dynamic_thresholds[metric] = base_value + adjustment + context_factor
        
        return dynamic_thresholds
    
    def _calculate_context_factor(self, metric: str, context: Dict) -> float:
        """Контекстная корректировка порогов"""
        active_voices = context.get('active_voices', [])
        conversation_duration = context.get('duration_minutes', 0)
        recent_changes = context.get('recent_state_changes', 0)
        
        # Учет взаимодействия с другими голосами
        if 'Маки' in active_voices and metric == 'chaos':
            return -0.05  # Снижение при активном хаос-инжиниринге
        
        # Учет длительности сессии
        if conversation_duration > 30 and metric == 'clarity':
            return -0.02  # Раннее вмешательство при усталости
        
        # Учет недавних изменений
        if recent_changes > 3 and metric in ['trust', 'pain']:
            return 0.05   # Повышенная чувствительность
        
        return 0
    
    def check_enhanced(self, metrics: Dict, context: Dict) -> List[Violation]:
        """Улучшенная проверка с учетом контекста и координации"""
        violations = []
        system_state = context.get('system_state', 'neutral')
        
        # Расчет динамических порогов
        dynamic_thresholds = self.calculate_dynamic_thresholds(system_state, context)
        
        # Базовые проверки с динамическими порогами
        for metric, cfg in self.base_thresholds.items():
            current_value = self._get_metric_value(metrics, metric)
            threshold = self._get_threshold_value(dynamic_thresholds, cfg, metric)
            
            if current_value is None or threshold is None:
                continue
            
            violation = self._check_threshold_violation(
                metric, current_value, cfg, threshold, context
            )
            
            if violation:
                violations.append(violation)
        
        # Детекция хаос-паттернов
        if context.get('enable_chaos_pattern_detection', True):
            pattern_violations = self._detect_chaos_pattern_violations(metrics, context)
            violations.extend(pattern_violations)
        
        # Координация с Маки
        coordinated_violations = self.maki_coordinator.synchronize_violations(
            violations, context
        )
        
        return coordinated_violations
    
    def _get_metric_value(self, metrics: Dict, metric: str) -> Optional[float]:
        """Получение значения метрики с fallback"""
        metric_map = {
            'clarity_high': 'clarity',
            'trust_low': 'trust', 
            'pain_high': 'pain'
        }
        
        source_metric = metric_map.get(metric, metric)
        return metrics.get(source_metric)
    
    def _get_threshold_value(self, dynamic_thresholds: Dict, cfg: Dict, metric: str) -> Optional[float]:
        """Получение порогового значения"""
        metric_map = {
            'clarity_high': 'clarity',
            'trust_low': 'trust',
            'pain_high': 'pain'
        }
        
        source_metric = metric_map.get(metric, metric)
        base_threshold = dynamic_thresholds.get(source_metric, 0.5)
        
        return cfg.get('min', cfg.get('max', base_threshold))
    
    def _check_threshold_violation(self, metric: str, value: float, cfg: Dict, 
                                 threshold: float, context: Dict) -> Optional[Violation]:
        """Проверка нарушения порога"""
        is_violation = False
        
        if 'min' in cfg and value < threshold:
            is_violation = True
        elif 'max' in cfg and value > threshold:
            is_violation = True
        
        if not is_violation:
            return None
        
        severity = self._calculate_severity(metric, value, threshold, cfg)
        urgency = self._calculate_urgency(metric, value, threshold, cfg)
        
        return Violation(
            metric=metric,
            value=value,
            action=cfg['action'],
            severity=severity,
            coordinated=False,
            urgency=urgency,
            timestamp=time.time()
        )
    
    def _calculate_severity(self, metric: str, value: float, threshold: float, cfg: Dict) -> str:
        """Расчет серьезности нарушения"""
        deviation = abs(value - threshold)
        
        if metric.startswith('hundun_'):
            # Для Хундуна более чувствительные пороги
            if deviation > 0.15:
                return 'critical'
            elif deviation > 0.08:
                return 'warning'
            else:
                return 'info'
        else:
            # Стандартные пороги для других голосов
            if deviation > 0.2:
                return 'critical'
            elif deviation > 0.1:
                return 'warning'
            else:
                return 'info'
    
    def _calculate_urgency(self, metric: str, value: float, threshold: float, cfg: Dict) -> float:
        """Расчет срочности вмешательства"""
        base_urgency = abs(value - threshold)
        
        # Ускорение для Хундуна - он должен реагировать быстро
        if metric.startswith('hundun_'):
            urgency_multiplier = 1.3
        else:
            urgency_multiplier = 1.0
        
        return min(1.0, base_urgency * urgency_multiplier)
    
    def _detect_chaos_pattern_violations(self, metrics: Dict, context: Dict) -> List[Violation]:
        """Детекция нарушений на основе хаос-паттернов"""
        violations = []
        metrics_history = context.get('metrics_history', [])
        
        # Детекция хаос-паттернов
        patterns = self.chaos_detector.detect_patterns(metrics_history)
        
        for pattern_name, detected in patterns.items():
            if detected:
                violation = Violation(
                    metric=f'chaos_pattern_{pattern_name}',
                    value=1.0,
                    action=f'ACTIVATE_HUNDUN_PATTERN_{pattern_name.upper()}',
                    severity='warning',
                    coordinated=True,  # Хаос-паттерны требуют координации
                    urgency=0.7,
                    timestamp=time.time()
                )
                violations.append(violation)
        
        return violations
    
    def get_hundun_status(self, metrics: Dict, context: Dict) -> Dict:
        """Получение статуса Хундуна"""
        dynamic_thresholds = self.calculate_dynamic_thresholds(
            context.get('system_state', 'neutral'), context
        )
        
        chaos_temperature = self.metrics_calc.calc_chaos_temperature(
            context.get('current_text', ''), 
            context.get('metrics_history', [])
        )
        
        patterns = self.chaos_detector.detect_patterns(
            context.get('metrics_history', [])
        )
        
        return {
            'chaos_temperature': chaos_temperature,
            'dynamic_thresholds': dynamic_thresholds,
            'detected_patterns': patterns,
            'coordination_active': context.get('maki_active', False),
            'system_state': context.get('system_state', 'neutral'),
            'readiness_score': self._calculate_hundun_readiness(chaos_temperature, patterns)
        }
    
    def _calculate_hundun_readiness(self, chaos_temp: float, patterns: Dict) -> float:
        """Расчет готовности Хундуна к активации"""
        # Базовая готовность на основе температуры хаоса
        base_readiness = chaos_temp
        
        # Бонус за обнаруженные паттерны
        pattern_bonus = sum(patterns.values()) * 0.2
        
        # Штраф за слишком высокую температуру (перегрев)
        if chaos_temp > 0.9:
            overheating_penalty = (chaos_temp - 0.9) * 2
        else:
            overheating_penalty = 0
        
        readiness = base_readiness + pattern_bonus - overheating_penalty
        return max(0.0, min(1.0, readiness))

# Пример использования
if __name__ == "__main__":
    # Инициализация enhanced SLO enforcer
    enforcer = EnhancedSLOEnforcer()
    
    # Тестовые метрики
    test_metrics = {
        'clarity': 0.8,
        'chaos': 0.7,
        'trust': 0.4,
        'pain': 0.6,
        'drift': 0.2
    }
    
    # Тестовый контекст
    test_context = {
        'system_state': 'crystal',
        'maki_active': True,
        'active_voices': ['Кайн', 'Маки'],
        'duration_minutes': 25,
        'current_text': 'Произошло нечто неожиданное, все изменилось',
        'metrics_history': [
            {'clarity': 0.9, 'chaos': 0.3, 'trust': 0.8},
            {'clarity': 0.7, 'chaos': 0.6, 'trust': 0.6},
            {'clarity': 0.5, 'chaos': 0.8, 'trust': 0.4}
        ]
    }
    
    # Проверка нарушений
    violations = enforcer.check_enhanced(test_metrics, test_context)
    
    print("Найденные нарушения:")
    for violation in violations:
        print(f"- {violation.metric}: {violation.value:.2f} "
              f"(действие: {violation.action}, "
              f"серьезность: {violation.severity}, "
              f"срочность: {violation.urgency:.2f})")
    
    # Статус Хундуна
    hundun_status = enforcer.get_hundun_status(test_metrics, test_context)
    print(f"\nСтатус Хундуна:")
    print(f"- Температура хаоса: {hundun_status['chaos_temperature']:.2f}")
    print(f"- Готовность: {hundun_status['readiness_score']:.2f}")
    print(f"- Обнаруженные паттерны: {hundun_status['detected_patterns']}")
