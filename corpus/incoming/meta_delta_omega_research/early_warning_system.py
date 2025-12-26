"""
Система раннего предупреждения при критических изменениях фрактальной структуры
Модуль для детекции и прогнозирования критических изменений структурной сложности
"""

import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Optional, Callable
from scipy import stats
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings('ignore')

class FractalAnomalyDetector:
    """
    Детектор аномалий в фрактальной размерности и структурной сложности
    """
    
    def __init__(self, contamination: float = 0.1,
                 window_size: int = 50,
                 min_samples: int = 5,
                 method: str = 'isolation_forest'):
        self.contamination = contamination
        self.window_size = window_size
        self.min_samples = min_samples
        self.method = method
        
        if method == 'isolation_forest':
            self.detector = IsolationForest(
                contamination=contamination,
                n_estimators=100,
                random_state=42
            )
        elif method == 'statistical':
            self.thresholds = {}
            
        self.is_fitted = False
        self.baseline_stats = None
        
    def fit_baseline(self, baseline_data: List[float]) -> None:
        """
        Обучение детектора на базовых данных (нормальное состояние системы)
        """
        if len(baseline_data) < self.min_samples:
            raise ValueError(f"Недостаточно данных для обучения. Требуется минимум {self.min_samples} точек")
        
        self.baseline_stats = {
            'mean': np.mean(baseline_data),
            'std': np.std(baseline_data),
            'median': np.median(baseline_data),
            'q25': np.percentile(baseline_data, 25),
            'q75': np.percentile(baseline_data, 75),
            'data': baseline_data
        }
        
        if self.method == 'isolation_forest':
            # Нормализуем данные для Isolation Forest
            scaler = StandardScaler()
            normalized_data = scaler.fit_transform(np.array(baseline_data).reshape(-1, 1))
            self.detector.fit(normalized_data)
            self.scaler = scaler
            
        self.is_fitted = True
        
        print(f"Базовая модель обучена на {len(baseline_data)} точках")
        print(f"Базовые статистики: μ={self.baseline_stats['mean']:.3f}, σ={self.baseline_stats['std']:.3f}")
    
    def detect_anomalies(self, new_data: List[float]) -> Dict:
        """
        Детекция аномалий в новых данных
        
        Returns:
            Dict с результатами детекции
        """
        if not self.is_fitted:
            raise ValueError("Детектор не обучен. Сначала вызовите fit_baseline()")
        
        if self.method == 'isolation_forest':
            return self._detect_isolation_forest(new_data)
        elif self.method == 'statistical':
            return self._detect_statistical(new_data)
        else:
            raise ValueError(f"Неподдерживаемый метод: {self.method}")
    
    def _detect_isolation_forest(self, new_data: List[float]) -> Dict:
        """Детекция с помощью Isolation Forest"""
        # Нормализуем новые данные
        normalized_data = self.scaler.transform(np.array(new_data).reshape(-1, 1))
        
        # Предсказываем аномалии
        predictions = self.detector.predict(normalized_data)
        anomaly_scores = self.detector.score_samples(normalized_data)
        
        # Определяем аномальные точки
        anomalies = predictions == -1
        
        results = {
            'anomalies': anomalies.tolist(),
            'anomaly_scores': anomaly_scores.tolist(),
            'num_anomalies': int(np.sum(anomalies)),
            'anomaly_rate': float(np.sum(anomalies) / len(anomalies)),
            'severity_scores': self._calculate_severity_scores(new_data, anomaly_scores)
        }
        
        return results
    
    def _detect_statistical(self, new_data: List[float]) -> Dict:
        """Статистическая детекция аномалий"""
        anomalies = []
        anomaly_scores = []
        severity_scores = []
        
        for value in new_data:
            # Z-score тест
            z_score = abs(value - self.baseline_stats['mean']) / (self.baseline_stats['std'] + 1e-10)
            
            # IQR тест
            iqr = self.baseline_stats['q75'] - self.baseline_stats['q25']
            iqr_threshold = 1.5 * iqr
            iqr_outlier = (value < self.baseline_stats['q25'] - iqr_threshold) or \
                         (value > self.baseline_stats['q75'] + iqr_threshold)
            
            # Отсеиваем аномалии
            is_anomaly = (z_score > 3) or iqr_outlier
            anomalies.append(is_anomaly)
            
            # Аномалия = абсолютное отклонение от медианы
            anomaly_score = abs(value - self.baseline_stats['median'])
            anomaly_scores.append(anomaly_score)
            
            # Нормализованная тяжесть
            severity = min(1.0, anomaly_score / (3 * self.baseline_stats['std'] + 1e-10))
            severity_scores.append(severity)
        
        results = {
            'anomalies': anomalies,
            'anomaly_scores': anomaly_scores,
            'num_anomalies': int(np.sum(anomalies)),
            'anomaly_rate': float(np.sum(anomalies) / len(anomalies)),
            'severity_scores': severity_scores,
            'z_scores': [(x - self.baseline_stats['mean']) / self.baseline_stats['std'] 
                        for x in new_data]
        }
        
        return results
    
    def _calculate_severity_scores(self, data: List[float], 
                                 anomaly_scores: np.ndarray) -> List[float]:
        """Расчет нормализованных оценок тяжести аномалий"""
        severity_scores = []
        
        for i, value in enumerate(data):
            # Базовая тяжесть = обратная логарифм-версия anomaly_score
            base_severity = 1.0 / (1.0 + np.exp(anomaly_scores[i]))
            
            # Корректируем на основе отклонения от среднего
            deviation_factor = abs(value - self.baseline_stats['mean']) / \
                              (3 * self.baseline_stats['std'] + 1e-10)
            
            # Комбинированная оценка тяжести
            severity = min(1.0, base_severity + 0.3 * deviation_factor)
            severity_scores.append(severity)
        
        return severity_scores


class EarlyWarningSystem:
    """
    Система раннего предупреждения для фрактальных изменений
    """
    
    def __init__(self, 
                 warning_thresholds: Dict = None,
                 critical_thresholds: Dict = None):
        # Базовые пороговые значения
        self.warning_thresholds = warning_thresholds or {
            'hfd_drop_rate': 0.05,        # Снижение HFD на 5% за короткий период
            'complexity_drop_rate': 0.1,  # Снижение сложности на 10%
            'stability_threshold': 0.7,   # Минимальная стабильность
            'anomaly_rate': 0.2,          # Максимальная доля аномалий 20%
            'confidence_threshold': 0.6   # Минимальная уверенность 60%
        }
        
        self.critical_thresholds = critical_thresholds or {
            'hfd_drop_rate': 0.15,        # Критическое снижение HFD на 15%
            'complexity_drop_rate': 0.25, # Критическое снижение сложности на 25%
            'stability_threshold': 0.5,   # Критическая стабильность
            'anomaly_rate': 0.4,          # Критическая доля аномалий 40%
            'confidence_threshold': 0.3   # Критическая уверенность
        }
        
        self.warning_levels = {
            0: 'normal',
            1: 'watch',
            2: 'warning',
            3: 'critical',
            4: 'emergency'
        }
        
        self.history = []
        self.active_warnings = []
    
    def analyze_health_state(self, current_metrics: Dict, 
                           historical_data: List[Dict]) -> Dict:
        """
        Анализ текущего состояния здоровья системы и выдача предупреждений
        
        Args:
            current_metrics: текущие метрики (hfd, complexity, confidence, etc.)
            historical_data: история метрик для трендового анализа
        
        Returns:
            Dict с анализом здоровья и предупреждениями
        """
        # Анализируем тренды
        trends = self._analyze_trends(historical_data)
        
        # Оцениваем текущее состояние
        current_state = self._evaluate_current_state(current_metrics)
        
        # Вычисляем предупредительные индикаторы
        warning_indicators = self._calculate_warning_indicators(current_metrics, trends)
        
        # Определяем уровень предупреждения
        warning_level = self._determine_warning_level(warning_indicators)
        
        # Генерируем рекомендации
        recommendations = self._generate_recommendations(warning_level, warning_indicators)
        
        # Создаем результат
        result = {
            'warning_level': warning_level,
            'warning_level_name': self.warning_levels[warning_level],
            'current_state': current_state,
            'trends': trends,
            'warning_indicators': warning_indicators,
            'recommendations': recommendations,
            'timestamp': current_metrics.get('timestamp'),
            'requires_attention': warning_level >= 2
        }
        
        # Сохраняем в историю
        self.history.append(result)
        
        return result
    
    def _analyze_trends(self, historical_data: List[Dict]) -> Dict:
        """Анализ трендов по историческим данным"""
        if len(historical_data) < 3:
            return {'trend_analysis': 'insufficient_data'}
        
        # Извлекаем метрики
        hfd_values = [h.get('hfd', 0) for h in historical_data if 'hfd' in h]
        complexity_values = [h.get('complexity_score', 0) for h in historical_data if 'complexity_score' in h]
        confidence_values = [h.get('confidence', 0) for h in historical_data if 'confidence' in h]
        
        trends = {}
        
        # Анализируем тренды HFD
        if len(hfd_values) >= 3:
            recent_hfd = np.mean(hfd_values[-3:])
            baseline_hfd = np.mean(hfd_values[:min(5, len(hfd_values)//2)])
            hfd_trend = (recent_hfd - baseline_hfd) / (baseline_hfd + 1e-10)
            trends['hfd_trend'] = hfd_trend
            trends['hfd_trend_direction'] = 'improving' if hfd_trend > 0.05 else \
                                          'degrading' if hfd_trend < -0.05 else 'stable'
        
        # Анализируем тренды сложности
        if len(complexity_values) >= 3:
            recent_complexity = np.mean(complexity_values[-3:])
            baseline_complexity = np.mean(complexity_values[:min(5, len(complexity_values)//2)])
            complexity_trend = (recent_complexity - baseline_complexity) / (baseline_complexity + 1e-10)
            trends['complexity_trend'] = complexity_trend
        
        # Анализируем стабильность
        if len(hfd_values) >= 5:
            stability = 1.0 - (np.std(hfd_values) / (np.mean(hfd_values) + 1e-10))
            trends['stability'] = stability
        
        return trends
    
    def _evaluate_current_state(self, current_metrics: Dict) -> Dict:
        """Оценка текущего состояния системы"""
        state = {}
        
        # Оценка HFD
        hfd = current_metrics.get('hfd', 1.5)
        if hfd < 1.1:
            hfd_state = 'critical_low'
        elif hfd < 1.2:
            hfd_state = 'low'
        elif hfd > 1.8:
            hfd_state = 'critical_high'
        elif hfd > 1.7:
            hfd_state = 'high'
        else:
            hfd_state = 'healthy'
        state['hfd_state'] = hfd_state
        
        # Оценка сложности
        complexity = current_metrics.get('complexity_score', 0.5)
        if complexity < 0.2:
            complexity_state = 'critical_low'
        elif complexity < 0.4:
            complexity_state = 'low'
        elif complexity > 0.8:
            complexity_state = 'critical_high'
        elif complexity > 0.7:
            complexity_state = 'high'
        else:
            complexity_state = 'healthy'
        state['complexity_state'] = complexity_state
        
        # Оценка уверенности
        confidence = current_metrics.get('confidence', 0.5)
        if confidence < 0.3:
            confidence_state = 'critical_low'
        elif confidence < 0.5:
            confidence_state = 'low'
        else:
            confidence_state = 'healthy'
        state['confidence_state'] = confidence_state
        
        return state
    
    def _calculate_warning_indicators(self, current_metrics: Dict, 
                                    trends: Dict) -> Dict:
        """Расчет предупредительных индикаторов"""
        indicators = {}
        
        # Трендовые индикаторы
        hfd_trend = trends.get('hfd_trend', 0)
        complexity_trend = trends.get('complexity_trend', 0)
        stability = trends.get('stability', 1.0)
        
        # Индикаторы снижения HFD
        if hfd_trend < -0.05:
            indicators['hfd_degradation_rate'] = abs(hfd_trend)
            indicators['hfd_degradation_warning'] = True
        else:
            indicators['hfd_degradation_warning'] = False
        
        # Индикаторы снижения сложности
        if complexity_trend < -0.1:
            indicators['complexity_degradation_rate'] = abs(complexity_trend)
            indicators['complexity_degradation_warning'] = True
        else:
            indicators['complexity_degradation_warning'] = False
        
        # Индикаторы стабильности
        if stability < 0.7:
            indicators['stability_warning'] = True
            indicators['stability_issue'] = True
        else:
            indicators['stability_warning'] = False
        
        # Комбинированный индикатор здоровья
        health_indicators = []
        
        hfd = current_metrics.get('hfd', 1.5)
        complexity = current_metrics.get('complexity_score', 0.5)
        confidence = current_metrics.get('confidence', 0.5)
        
        if 1.2 <= hfd <= 1.6:
            health_indicators.append(1.0)  # Здоровый HFD
        elif hfd < 1.1 or hfd > 1.8:
            health_indicators.append(-1.0)  # Критичный HFD
        else:
            health_indicators.append(0.0)  # Средний HFD
        
        if complexity >= 0.4:
            health_indicators.append(1.0)  # Здоровая сложность
        elif complexity < 0.2:
            health_indicators.append(-1.0)  # Низкая сложность
        else:
            health_indicators.append(0.0)
        
        if confidence >= 0.6:
            health_indicators.append(1.0)  # Высокая уверенность
        elif confidence < 0.3:
            health_indicators.append(-1.0)  # Низкая уверенность
        else:
            health_indicators.append(0.0)
        
        indicators['combined_health_score'] = np.mean(health_indicators)
        
        return indicators
    
    def _determine_warning_level(self, indicators: Dict) -> int:
        """Определение уровня предупреждения (0-4)"""
        warning_score = 0
        
        # Критерии предупреждений
        if indicators.get('hfd_degradation_warning', False):
            if indicators['hfd_degradation_rate'] > self.critical_thresholds['hfd_drop_rate']:
                warning_score += 3
            elif indicators['hfd_degradation_rate'] > self.warning_thresholds['hfd_drop_rate']:
                warning_score += 2
        
        if indicators.get('complexity_degradation_warning', False):
            if indicators['complexity_degradation_rate'] > self.critical_thresholds['complexity_drop_rate']:
                warning_score += 3
            elif indicators['complexity_degradation_rate'] > self.warning_thresholds['complexity_drop_rate']:
                warning_score += 2
        
        if indicators.get('stability_warning', False):
            warning_score += 2
        
        health_score = indicators.get('combined_health_score', 0)
        if health_score < -0.5:
            warning_score += 3
        elif health_score < 0:
            warning_score += 1
        
        # Нормализуем к диапазону 0-4
        warning_level = min(4, max(0, warning_score // 2))
        
        return warning_level
    
    def _generate_recommendations(self, warning_level: int, 
                                indicators: Dict) -> List[str]:
        """Генерация рекомендаций на основе уровня предупреждения"""
        recommendations = []
        
        if warning_level == 0:  # Normal
            recommendations.append("Система функционирует в нормальном режиме")
            
        elif warning_level == 1:  # Watch
            recommendations.append("Внимание: системе требуется мониторинг")
            if indicators.get('hfd_degradation_warning', False):
                recommendations.append("Рекомендуется увеличить структурную сложность")
            if indicators.get('stability_warning', False):
                recommendations.append("Повысить стабильность системы")
        
        elif warning_level == 2:  # Warning
            recommendations.append("Предупреждение: обнаружены проблемы в работе системы")
            if indicators.get('hfd_degradation_warning', False):
                recommendations.append("Критично: снижение фрактальной размерности - требуется вмешательство")
            if indicators.get('complexity_degradation_warning', False):
                recommendations.append("Внедрить элементы разнообразия для повышения сложности")
            recommendations.append("Рекомендуется запуск диагностических процедур")
        
        elif warning_level == 3:  # Critical
            recommendations.append("Критическое состояние: система демонстрирует серьезные нарушения")
            recommendations.append("Немедленно применить меры стабилизации")
            recommendations.append("Рассмотреть возможность частичного перезапуска")
        
        elif warning_level == 4:  # Emergency
            recommendations.append("Экстренная ситуация: система в критической опасности")
            recommendations.append("Незамедлительно активировать протоколы восстановления")
            recommendations.append("Полная диагностика и перезапуск критических компонентов")
        
        return recommendations
    
    def get_summary_report(self) -> Dict:
        """Получение сводного отчета о состоянии системы"""
        if not self.history:
            return {"status": "no_data"}
        
        recent_analyses = self.history[-10:]  # Последние 10 анализов
        
        # Подсчет предупреждений по уровням
        warning_counts = {level: 0 for level in self.warning_levels.keys()}
        for analysis in recent_analyses:
            level = analysis['warning_level']
            warning_counts[level] += 1
        
        # Тренд предупреждений
        if len(recent_analyses) >= 2:
            recent_level = recent_analyses[-1]['warning_level']
            previous_level = recent_analyses[-2]['warning_level']
            trend = "worsening" if recent_level > previous_level else \
                   "improving" if recent_level < previous_level else "stable"
        else:
            trend = "insufficient_data"
        
        # Последние рекомендации
        latest_recommendations = recent_analyses[-1]['recommendations'] if recent_analyses else []
        
        return {
            "total_analyses": len(self.history),
            "recent_analyses": len(recent_analyses),
            "warning_level_distribution": warning_counts,
            "trend": trend,
            "latest_warning_level": recent_analyses[-1]['warning_level'] if recent_analyses else 0,
            "latest_recommendations": latest_recommendations,
            "requires_attention": any(a['requires_attention'] for a in recent_analyses)
        }


class AdaptiveResponseSystem:
    """
    Система адаптивного реагирования на изменения
    """
    
    def __init__(self, 
                 response_actions: Dict = None,
                 cooldown_periods: Dict = None):
        self.response_actions = response_actions or {
            1: ['monitor', 'increase_awareness'],  # Watch
            2: ['stabilize', 'diagnose'],          # Warning  
            3: ['reset_subcomponents', 'emergency_protocols'],  # Critical
            4: ['full_recovery', 'complete_rebuild']  # Emergency
        }
        
        self.cooldown_periods = cooldown_periods or {
            1: 60,   # 1 минута
            2: 300,  # 5 минут
            3: 900,  # 15 минут
            4: 3600  # 1 час
        }
        
        self.last_responses = {}
        self.active_interventions = []
    
    def process_warning(self, warning_analysis: Dict) -> Dict:
        """
        Обработка предупреждения и планирование ответных действий
        
        Args:
            warning_analysis: результат анализа от EarlyWarningSystem
        
        Returns:
            Dict с планом ответных действий
        """
        warning_level = warning_analysis['warning_level']
        warning_level_name = warning_analysis['warning_level_name']
        
        # Проверяем кулдаун
        if self._in_cooldown(warning_level):
            return {
                'action_taken': False,
                'reason': 'in_cooldown',
                'cooldown_remaining': self._get_cooldown_remaining(warning_level)
            }
        
        # Определяем необходимые действия
        actions = self.response_actions.get(warning_level, [])
        
        # Создаем план действий
        action_plan = {
            'warning_level': warning_level,
            'warning_level_name': warning_level_name,
            'actions': actions,
            'timestamp': warning_analysis['timestamp'],
            'action_taken': len(actions) > 0,
            'estimated_duration': self._estimate_action_duration(actions),
            'priority': self._calculate_action_priority(warning_level, actions)
        }
        
        # Записываем время последнего ответа
        self.last_responses[warning_level] = warning_analysis['timestamp']
        
        # Добавляем в активные вмешательства
        if action_plan['action_taken']:
            self.active_interventions.append(action_plan)
        
        return action_plan
    
    def _in_cooldown(self, warning_level: int) -> bool:
        """Проверка наличия кулдауна для уровня предупреждения"""
        if warning_level not in self.last_responses:
            return False
        
        import datetime
        now = datetime.datetime.now()
        last_response = self.last_responses[warning_level]
        if isinstance(last_response, str):
            last_response = datetime.datetime.fromisoformat(last_response.replace('Z', '+00:00'))
        elif not isinstance(last_response, datetime.datetime):
            return False
        
        cooldown_period = self.cooldown_periods.get(warning_level, 300)  # 5 минут по умолчанию
        elapsed = (now - last_response).total_seconds()
        
        return elapsed < cooldown_period
    
    def _get_cooldown_remaining(self, warning_level: int) -> float:
        """Получение оставшегося времени кулдауна"""
        if warning_level not in self.last_responses:
            return 0
        
        import datetime
        now = datetime.datetime.now()
        last_response = self.last_responses[warning_level]
        if isinstance(last_response, str):
            last_response = datetime.datetime.fromisoformat(last_response.replace('Z', '+00:00'))
        elif not isinstance(last_response, datetime.datetime):
            return 0
        
        cooldown_period = self.cooldown_periods.get(warning_level, 300)
        elapsed = (now - last_response).total_seconds()
        
        return max(0, cooldown_period - elapsed)
    
    def _estimate_action_duration(self, actions: List[str]) -> int:
        """Оценка продолжительности выполнения действий (в секундах)"""
        duration_map = {
            'monitor': 10,
            'increase_awareness': 30,
            'stabilize': 300,
            'diagnose': 600,
            'reset_subcomponents': 1800,
            'emergency_protocols': 3000,
            'full_recovery': 3600,
            'complete_rebuild': 7200
        }
        
        total_duration = sum(duration_map.get(action, 60) for action in actions)
        return total_duration
    
    def _calculate_action_priority(self, warning_level: int, actions: List[str]) -> str:
        """Расчет приоритета действий"""
        if warning_level >= 3:
            return 'critical'
        elif warning_level == 2:
            return 'high'
        elif warning_level == 1:
            return 'medium'
        else:
            return 'low'


if __name__ == "__main__":
    # Демонстрационный код
    print("=== Система раннего предупреждения ===")
    
    # Создаем тестовые данные
    np.random.seed(42)
    baseline_hfd = [1.5 + 0.1 * np.random.random() for _ in range(100)]
    
    # Создаем детектор аномалий
    detector = FractalAnomalyDetector(method='statistical')
    detector.fit_baseline(baseline_hfd)
    
    # Тестируем на нормальных данных
    normal_data = [1.5 + 0.05 * np.random.random() for _ in range(20)]
    normal_result = detector.detect_anomalies(normal_data)
    print(f"\nНормальные данные: {normal_result['num_anomalies']} аномалий из {len(normal_data)}")
    
    # Тестируем на аномальных данных
    anomalous_data = [1.0 + 0.05 * np.random.random() for _ in range(20)]  # Снижение HFD
    anomaly_result = detector.detect_anomalies(anomalous_data)
    print(f"Аномальные данные: {anomaly_result['num_anomalies']} аномалий из {len(anomalous_data)}")
    
    # Создаем систему раннего предупреждения
    ews = EarlyWarningSystem()
    
    # Симулируем предупреждение
    current_metrics = {
        'hfd': 1.05,
        'complexity_score': 0.15,
        'confidence': 0.25,
        'timestamp': '2025-11-06T05:25:26Z'
    }
    
    historical_data = [
        {'hfd': 1.45, 'complexity_score': 0.6, 'confidence': 0.8},
        {'hfd': 1.40, 'complexity_score': 0.55, 'confidence': 0.75},
        {'hfd': 1.35, 'complexity_score': 0.5, 'confidence': 0.7},
        {'hfd': 1.30, 'complexity_score': 0.45, 'confidence': 0.65},
        {'hfd': 1.25, 'complexity_score': 0.4, 'confidence': 0.6},
        {'hfd': 1.20, 'complexity_score': 0.35, 'confidence': 0.55},
        {'hfd': 1.15, 'complexity_score': 0.3, 'confidence': 0.5},
        {'hfd': 1.10, 'complexity_score': 0.25, 'confidence': 0.45},
        {'hfd': 1.05, 'complexity_score': 0.2, 'confidence': 0.35},
        {'hfd': 1.05, 'complexity_score': 0.15, 'confidence': 0.25}
    ]
    
    health_analysis = ews.analyze_health_state(current_metrics, historical_data)
    print(f"\nАнализ здоровья:")
    print(f"Уровень предупреждения: {health_analysis['warning_level']} ({health_analysis['warning_level_name']})")
    print(f"Требует внимания: {health_analysis['requires_attention']}")
    
    # Система адаптивного реагирования
    response_system = AdaptiveResponseSystem()
    response_plan = response_system.process_warning(health_analysis)
    print(f"\nПлан реагирования:")
    print(f"Действия: {response_plan['actions']}")
    print(f"Приоритет: {response_plan['priority']}")
    print(f"Оценка времени: {response_plan['estimated_duration']} секунд")
    
    print("\n=== Демонстрация завершена ===")
