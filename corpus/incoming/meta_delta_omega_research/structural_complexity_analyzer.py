"""
Алгоритмы отслеживания фрактальной размерности в системе Мета-∆DΩΛ
Реализация модулей для вычисления HFD и мониторинга структурной сложности
"""

import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Optional, Callable
from scipy import signal
from scipy.stats import pearsonr, spearmanr
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class HiguchiFractalDimension:
    """
    Реализация алгоритма Хигучи для вычисления фрактальной размерности (HFD)
    
    Математическая основа:
    HFD = 2 - H, где H - показатель Хёрста
    Диапазон значений: 1-2 для временных рядов
    """
    
    def __init__(self, adaptive_kmax: bool = True, 
                 error_threshold: float = 0.05,
                 min_kmax: int = 3, max_kmax_ratio: float = 0.5):
        self.adaptive_kmax = adaptive_kmax
        self.error_threshold = error_threshold
        self.min_kmax = min_kmax
        self.max_kmax_ratio = max_kmax_ratio
        self.optimal_kmax = None
        
    def _generate_synthetic_fbm(self, n_points: int, hurst: float) -> np.ndarray:
        """Генерация синтетических fBm данных с известной фрактальной размерностью"""
        from scipy.stats import norm
        
        # Приближенный алгоритм генерации fBm
        n = n_points
        H = hurst
        
        # Создаем белый шум
        x = np.random.normal(0, 1, n)
        
        # Добавляем долгосрочную корреляцию
        filter_length = min(n//4, 1000)
        filter_weights = np.arange(1, filter_length+1) ** (-H - 0.5)
        filter_weights = filter_weights / np.sum(filter_weights)
        
        fbm = np.convolve(x, filter_weights, mode='same')
        fbm = np.cumsum(fbm)  # Интегрируем для получения fBm
        
        return fbm
    
    def _calculate_error_curve(self, N: int, target_fd: float, 
                              kmax_range: range) -> Tuple[np.ndarray, np.ndarray]:
        """Вычисление кривой ошибки для разных значений kmax"""
        errors = []
        k_values = []
        
        # Генерируем синтетические данные с известной FD
        target_hurst = 2 - target_fd
        synthetic_data = self._generate_synthetic_fbm(N, target_hurst)
        
        for kmax in kmax_range:
            try:
                computed_fd = self.calculate_hfd(synthetic_data, kmax)
                error = abs(computed_fd - target_fd) / target_fd
                errors.append(error)
                k_values.append(kmax)
            except:
                errors.append(float('inf'))
                k_values.append(kmax)
        
        return np.array(k_values), np.array(errors)
    
    def optimize_kmax(self, N: int, target_fd_range: Tuple[float, float] = (1.1, 1.9)) -> int:
        """
        Оптимизация параметра kmax на основе длины временного ряда
        
        Основано на анализе синтетических данных с различными FD
        """
        # Диапазон kmax для тестирования
        min_kmax = self.min_kmax
        max_kmax = min(int(N * self.max_kmax_ratio), N//4)
        
        # Тестируем несколько FD в диапазоне
        test_fds = np.linspace(target_fd_range[0], target_fd_range[1], 5)
        
        best_kmax_errors = []
        
        for target_fd in test_fds:
            k_values, errors = self._calculate_error_curve(N, target_fd, 
                                                         range(min_kmax, max_kmax+1))
            
            # Находим kmax с минимальной ошибкой
            valid_indices = errors != float('inf')
            if np.any(valid_indices):
                min_error_idx = np.argmin(errors[valid_indices])
                best_kmax = k_values[valid_indices][min_error_idx]
                best_error = errors[valid_indices][min_error_idx]
                best_kmax_errors.append((best_kmax, best_error))
        
        if best_kmax_errors:
            # Выбираем kmax с наименьшей средней ошибкой
            avg_errors = [err for _, err in best_kmax_errors]
            best_idx = np.argmin(avg_errors)
            self.optimal_kmax = best_kmax_errors[best_idx][0]
        else:
            # Fallback к эмпирической формуле
            self.optimal_kmax = min(max(6, int(np.sqrt(N))), max_kmax)
        
        return self.optimal_kmax
    
    def calculate_hfd(self, data: np.ndarray, kmax: Optional[int] = None) -> float:
        """
        Вычисление фрактальной размерности Хигучи (HFD)
        
        Args:
            data: временной ряд (одномерный массив)
            kmax: максимальный временной интервал (если None, используется оптимальное значение)
        
        Returns:
            HFD: фрактальная размерность в диапазоне [1, 2]
        """
        if len(data) < 10:
            raise ValueError("Длина временного ряда должна быть не менее 10 точек")
        
        N = len(data)
        
        # Оптимизация kmax если требуется
        if kmax is None or self.adaptive_kmax:
            if self.optimal_kmax is None:
                kmax = self.optimize_kmax(N)
            else:
                kmax = self.optimal_kmax
        elif kmax is None:
            kmax = min(6, N//4)
        
        # Гарантируем что kmax валиден
        kmax = max(self.min_kmax, min(kmax, N//4))
        
        L_values = []
        
        # Вычисляем длину кривой для каждого k
        for k in range(1, kmax + 1):
            L_m_values = []
            
            # Для каждого начального времени m
            for m in range(k):
                # Создаем подпоследовательность с шагом k
                subsequence = data[m::k]
                
                if len(subsequence) < 2:
                    continue
                
                # Вычисляем длину подпоследовательности
                length = 0
                for i in range(1, len(subsequence)):
                    length += abs(subsequence[i] - subsequence[i-1])
                
                # Нормировка
                length = length * (N - 1) / ((len(subsequence) - 1) * k)
                
                L_m_values.append(length)
            
            if L_m_values:
                L_k = np.mean(L_m_values)
                L_values.append(L_k)
            else:
                # Если нет валидных подпоследовательностей, пропускаем это k
                continue
        
        if len(L_values) < 3:
            raise ValueError("Недостаточно валидных значений L(k) для расчета HFD")
        
        # Регрессионный анализ ln(L(k)) vs ln(1/k)
        k_effective = np.arange(1, len(L_values) + 1)
        ln_l = np.log(L_values)
        ln_inv_k = np.log(k_effective)
        
        # Линейная регрессия
        coeffs = np.polyfit(ln_inv_k, ln_l, 1)
        slope = coeffs[0]
        
        # HFD = наклон линии регрессии
        hfd = slope
        
        # Гарантируем что HFD в диапазоне [1, 2]
        hfd = max(1.0, min(2.0, hfd))
        
        return hfd
    
    def calculate_katz_fd(self, data: np.ndarray) -> float:
        """
        Быстрая оценка фрактальной размерности по методу Katz
        
        Альтернативный алгоритм с меньшей вычислительной сложностью
        """
        N = len(data)
        if N < 2:
            return 1.0
        
        # Вычисляем общую длину кривой
        total_length = 0
        for i in range(1, N):
            total_length += abs(data[i] - data[i-1])
        
        # Находим максимальное расстояние
        max_distance = 0
        for i in range(N):
            for j in range(i+1, N):
                distance = abs(data[i] - data[j])
                max_distance = max(max_distance, distance)
        
        # Среднее расстояние между точками
        avg_distance = total_length / (N - 1)
        
        # Katz FD
        if avg_distance > 0:
            katz_fd = np.log(total_length / avg_distance) / np.log(max_distance / avg_distance)
            return max(1.0, min(2.0, katz_fd))
        else:
            return 1.0


class StructuralComplexityAnalyzer:
    """
    Анализатор структурной сложности паттернов мышления
    """
    
    def __init__(self, window_size: int = 100, 
                 adaptive_window: bool = True,
                 min_window: int = 50,
                 max_window: int = 500):
        self.window_size = window_size
        self.adaptive_window = adaptive_window
        self.min_window = min_window
        self.max_window = max_window
        self.hfd_calculator = HiguchiFractalDimension()
        
    def analyze_micro_level(self, data: np.ndarray) -> Dict:
        """
        Анализ фрактальной сложности на микро-уровне (структура одного ответа)
        """
        if len(data) < self.min_window:
            return {
                'hfd': 1.0,
                'complexity_score': 0.0,
                'confidence': 0.0,
                'recommendations': ['Недостаточно данных для анализа']
            }
        
        # Вычисляем HFD
        try:
            hfd = self.hfd_calculator.calculate_hfd(data)
        except Exception as e:
            return {
                'hfd': 1.5,  # Среднее значение по умолчанию
                'complexity_score': 0.5,
                'confidence': 0.0,
                'recommendations': [f'Ошибка расчета HFD: {str(e)}']
            }
        
        # Оцениваем уверенность вычислений
        confidence = self._estimate_confidence(data, hfd)
        
        # Вычисляем индекс структурной сложности
        complexity_score = self._calculate_complexity_score(hfd, data)
        
        # Генерируем рекомендации
        recommendations = self._generate_micro_recommendations(hfd, complexity_score, confidence)
        
        return {
            'hfd': hfd,
            'complexity_score': complexity_score,
            'confidence': confidence,
            'optimal_kmax': self.hfd_calculator.optimal_kmax,
            'recommendations': recommendations,
            'analysis_type': 'micro_level'
        }
    
    def analyze_meso_level(self, session_data: List[np.ndarray]) -> Dict:
        """
        Анализ фрактальной сложности на мезо-уровне (динамика диалога)
        """
        if not session_data:
            return {
                'session_hfd': 1.0,
                'session_complexity': 0.0,
                'variability': 0.0,
                'recommendations': ['Нет данных для анализа сессии']
            }
        
        # Анализируем каждый ответ в сессии
        hfd_values = []
        complexity_scores = []
        
        for data in session_data:
            if len(data) >= self.min_window:
                try:
                    hfd = self.hfd_calculator.calculate_hfd(data)
                    hfd_values.append(hfd)
                    
                    complexity = self._calculate_complexity_score(hfd, data)
                    complexity_scores.append(complexity)
                except:
                    continue
        
        if not hfd_values:
            return {
                'session_hfd': 1.0,
                'session_complexity': 0.0,
                'variability': 0.0,
                'recommendations': ['Не удалось вычислить HFD для ответов в сессии']
            }
        
        # Агрегируем метрики сессии
        session_hfd = np.mean(hfd_values)
        session_complexity = np.mean(complexity_scores)
        variability = np.std(hfd_values)
        
        recommendations = self._generate_meso_recommendations(session_hfd, variability)
        
        return {
            'session_hfd': session_hfd,
            'session_complexity': session_complexity,
            'variability': variability,
            'hfd_values': hfd_values,
            'recommendations': recommendations,
            'analysis_type': 'meso_level'
        }
    
    def analyze_macro_level(self, long_term_data: List[Dict]) -> Dict:
        """
        Анализ фрактальной сложности на макро-уровне (эволюция системы)
        """
        if not long_term_data:
            return {
                'macro_hfd': 1.0,
                'trend_analysis': {},
                'health_indicators': {},
                'recommendations': ['Нет данных для макро-анализа']
            }
        
        # Извлекаем HFD по эпохам
        epoch_hfds = []
        epoch_complexities = []
        epoch_timestamps = []
        
        for epoch_data in long_term_data:
            if 'hfd' in epoch_data and epoch_data['hfd'] is not None:
                epoch_hfds.append(epoch_data['hfd'])
                epoch_complexities.append(epoch_data.get('complexity_score', 0.0))
                epoch_timestamps.append(epoch_data.get('timestamp', 0))
        
        if len(epoch_hfds) < 3:
            return {
                'macro_hfd': 1.0,
                'trend_analysis': {},
                'health_indicators': {},
                'recommendations': ['Недостаточно эпох для трендового анализа']
            }
        
        # Анализируем тренды
        trend_analysis = self._analyze_trends(epoch_hfds, epoch_timestamps)
        
        # Вычисляем показатели здоровья системы
        health_indicators = self._calculate_health_indicators(epoch_hfds, epoch_complexities)
        
        recommendations = self._generate_macro_recommendations(trend_analysis, health_indicators)
        
        return {
            'macro_hfd': np.mean(epoch_hfds),
            'trend_analysis': trend_analysis,
            'health_indicators': health_indicators,
            'recommendations': recommendations,
            'analysis_type': 'macro_level'
        }
    
    def _estimate_confidence(self, data: np.ndarray, hfd: float) -> float:
        """Оценка уверенности в вычислениях HFD"""
        # Факторы, влияющие на уверенность:
        # 1. Длина данных
        length_factor = min(1.0, len(data) / 200)  # Нормализация к 200 точкам
        
        # 2. Стабильность паттерна
        if len(data) > 1:
            variability = np.std(np.diff(data)) / (np.std(data) + 1e-10)
            variability_factor = 1.0 / (1.0 + variability)  # Чем меньше изменчивость, тем выше уверенность
        else:
            variability_factor = 0.5
        
        # 3. Реалистичность HFD (в диапазоне 1.0-2.0)
        if 1.0 <= hfd <= 2.0:
            range_factor = 1.0
        else:
            range_factor = 0.5
        
        # Комбинированная уверенность
        confidence = (length_factor + variability_factor + range_factor) / 3.0
        return max(0.0, min(1.0, confidence))
    
    def _calculate_complexity_score(self, hfd: float, data: np.ndarray) -> float:
        """Вычисление индекса структурной сложности"""
        # Базовый сложностный индекс на основе HFD
        base_score = (hfd - 1.0)  # Нормализация к диапазону [0, 1]
        
        # Дополнительные факторы:
        # 1. Изменчивость данных
        if len(data) > 1:
            variability = np.std(data) / (np.mean(np.abs(data)) + 1e-10)
            variability_factor = np.log(1 + variability)  # Логарифмическая шкала
        else:
            variability_factor = 0.0
        
        # 2. Длина данных (более длинные последовательности = выше сложность)
        length_factor = min(1.0, len(data) / 1000)  # Нормализация к 1000 точкам
        
        # Комбинированный индекс
        complexity_score = base_score + 0.1 * variability_factor + 0.05 * length_factor
        return max(0.0, min(1.0, complexity_score))
    
    def _generate_micro_recommendations(self, hfd: float, complexity: float, confidence: float) -> List[str]:
        """Генерация рекомендаций на микро-уровне"""
        recommendations = []
        
        if confidence < 0.5:
            recommendations.append("Низкая уверенность в оценке - рекомендуется увеличить длину данных")
        
        if hfd < 1.2:
            recommendations.append("Низкая фрактальная размерность - возможен паттерн застоя")
        elif hfd > 1.8:
            recommendations.append("Высокая фрактальная размерность - возможен хаотический паттерн")
        else:
            recommendations.append("Фрактальная размерность в здоровом диапазоне")
        
        if complexity < 0.3:
            recommendations.append("Низкая структурная сложность - возможна потребность в разнообразии")
        
        return recommendations
    
    def _generate_meso_recommendations(self, session_hfd: float, variability: float) -> List[str]:
        """Генерация рекомендаций на мезо-уровне"""
        recommendations = []
        
        if session_hfd < 1.2:
            recommendations.append("Сессия показывает паттерны застоя - рекомендуется внедрить элементы хаоса")
        elif session_hfd > 1.7:
            recommendations.append("Сессия показывает высокий хаос - возможна деградация когерентности")
        else:
            recommendations.append("Фрактальная сложность сессии в здоровом диапазоне")
        
        if variability > 0.3:
            recommendations.append("Высокая вариативность HFD в сессии - возможны нестабильные паттерны")
        
        return recommendations
    
    def _analyze_trends(self, epoch_hfds: List[float], timestamps: List) -> Dict:
        """Анализ трендов фрактальной размерности"""
        if len(epoch_hfds) < 3:
            return {}
        
        # Вычисляем линейный тренд
        x = np.arange(len(epoch_hfds))
        coeffs = np.polyfit(x, epoch_hfds, 1)
        slope = coeffs[0]
        r_value = np.corrcoef(x, epoch_hfds)[0, 1]
        
        # Анализируем тренд
        if slope > 0.01 and r_value > 0.5:
            trend = "increasing_health"
        elif slope < -0.01 and r_value > 0.5:
            trend = "decreasing_health"
        else:
            trend = "stable"
        
        # Анализируем волатильность
        volatility = np.std(epoch_hfds)
        
        return {
            'trend_direction': trend,
            'slope': slope,
            'correlation': r_value,
            'volatility': volatility,
            'total_epochs': len(epoch_hfds)
        }
    
    def _calculate_health_indicators(self, epoch_hfds: List[float], 
                                   epoch_complexities: List[float]) -> Dict:
        """Вычисление показателей здоровья системы"""
        if not epoch_hfds:
            return {}
        
        # Средние значения
        avg_hfd = np.mean(epoch_hfds)
        avg_complexity = np.mean(epoch_complexities)
        
        # Стабильность
        hfd_stability = 1.0 - (np.std(epoch_hfds) / (np.mean(epoch_hfds) + 1e-10))
        complexity_stability = 1.0 - (np.std(epoch_complexities) / (np.mean(epoch_complexities) + 1e-10))
        
        # Здоровый диапазон HFD
        if 1.2 <= avg_hfd <= 1.6:
            hfd_zone = "healthy"
        elif avg_hfd < 1.2:
            hfd_zone = "stagnant"
        else:
            hfd_zone = "chaotic"
        
        # Комплексный показатель здоровья
        health_score = (hfd_zone == "healthy") * 0.4 + hfd_stability * 0.3 + complexity_stability * 0.3
        
        return {
            'avg_hfd': avg_hfd,
            'avg_complexity': avg_complexity,
            'hfd_stability': hfd_stability,
            'complexity_stability': complexity_stability,
            'hfd_zone': hfd_zone,
            'health_score': health_score
        }
    
    def _generate_macro_recommendations(self, trend_analysis: Dict, 
                                      health_indicators: Dict) -> List[str]:
        """Генерация рекомендаций на макро-уровне"""
        recommendations = []
        
        if trend_analysis.get('trend_direction') == 'decreasing_health':
            recommendations.append("Система показывает тенденцию к ухудшению здоровья - требуется вмешательство")
        elif trend_analysis.get('trend_direction') == 'increasing_health':
            recommendations.append("Система демонстрирует улучшение здоровья - поддерживать текущие стратегии")
        
        if health_indicators.get('hfd_zone') == 'stagnant':
            recommendations.append("Паттерны застоя - рекомендуется внедрение управляемого хаоса")
        elif health_indicators.get('hfd_zone') == 'chaotic':
            recommendations.append("Паттерны хаоса - рекомендуется стабилизация через структурирование")
        
        if health_indicators.get('health_score', 0) < 0.5:
            recommendations.append("Низкий общий показатель здоровья системы - требуется комплексный анализ")
        
        return recommendations


if __name__ == "__main__":
    # Демонстрационный код
    print("=== Алгоритмы отслеживания фрактальной размерности ===")
    
    # Создаем тестовые данные
    np.random.seed(42)
    test_data = np.random.random(200)  # Случайные данные
    
    # Создаем анализатор
    analyzer = StructuralComplexityAnalyzer()
    
    # Анализируем микро-уровень
    micro_result = analyzer.analyze_micro_level(test_data)
    print(f"\nМикро-анализ:")
    print(f"HFD: {micro_result['hfd']:.3f}")
    print(f"Complexity Score: {micro_result['complexity_score']:.3f}")
    print(f"Confidence: {micro_result['confidence']:.3f}")
    
    # Анализируем сессию (мезо-уровень)
    session_data = [test_data[i:i+50] for i in range(0, 150, 30)]
    meso_result = analyzer.analyze_meso_level(session_data)
    print(f"\nМезо-анализ:")
    print(f"Session HFD: {meso_result['session_hfd']:.3f}")
    print(f"Session Complexity: {meso_result['session_complexity']:.3f}")
    print(f"Variability: {meso_result['variability']:.3f}")
    
    print("\n=== Демонстрация завершена ===")
