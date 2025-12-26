"""
Модуль визуализации и бенчмаркинга для алгоритмов отслеживания фрактальной размерности
Создание дашбордов, отчетов и тестирование производительности
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Dict, Tuple, Optional
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

class FractalDimensionVisualizer:
    """
    Визуализатор данных фрактальной размерности и метрик системы
    """
    
    def __init__(self, output_dir: str = "visualizations"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Настройка стиля matplotlib
        plt.style.use('seaborn-v0_8')
        self.colors = {
            'primary': '#2E86AB',
            'secondary': '#A23B72', 
            'accent': '#F18F01',
            'success': '#C73E1D',
            'warning': '#F18F01',
            'danger': '#D62828'
        }
    
    def create_real_time_dashboard(self, time_series_data: List[Dict], 
                                 save_path: str = None) -> str:
        """
        Создание интерактивного дашборда реального времени
        
        Args:
            time_series_data: список словарей с метриками по времени
            save_path: путь для сохранения HTML файла
        
        Returns:
            Путь к сохраненному дашборду
        """
        df = pd.DataFrame(time_series_data)
        
        # Создаем subplots
        fig = make_subplots(
            rows=3, cols=2,
            subplot_titles=(
                'Фрактальная Размерность (HFD) во времени',
                'Индекс Структурной Сложности',
                'Уверенность Вычислений', 
                'Скорость Изменений HFD',
                'Предупредительные Индикаторы',
                'Распределение Аномалий'
            ),
            specs=[[{"secondary_y": True}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # График 1: HFD во времени
        if 'hfd' in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index if 'timestamp' not in df.columns else df['timestamp'],
                    y=df['hfd'],
                    mode='lines+markers',
                    name='HFD',
                    line=dict(color=self.colors['primary'], width=2)
                ),
                row=1, col=1
            )
            
            # Добавляем зоны здоровья
            fig.add_hrect(
                y0=1.2, y1=1.6,
                fillcolor="rgba(0, 255, 0, 0.1)",
                line_width=0,
                row=1, col=1
            )
            
            fig.add_hrect(
                y0=1.0, y1=1.2,
                fillcolor="rgba(255, 255, 0, 0.1)", 
                line_width=0,
                row=1, col=1
            )
            
            fig.add_hrect(
                y0=1.6, y1=1.8,
                fillcolor="rgba(255, 255, 0, 0.1)",
                line_width=0,
                row=1, col=1
            )
        
        # График 2: Индекс сложности
        if 'complexity_score' in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index if 'timestamp' not in df.columns else df['timestamp'],
                    y=df['complexity_score'],
                    mode='lines+markers',
                    name='Complexity Score',
                    line=dict(color=self.colors['secondary'], width=2)
                ),
                row=1, col=2
            )
        
        # График 3: Уверенность
        if 'confidence' in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index if 'timestamp' not in df.columns else df['timestamp'],
                    y=df['confidence'],
                    mode='lines+markers',
                    name='Confidence',
                    line=dict(color=self.colors['accent'], width=2)
                ),
                row=2, col=1
            )
            
            # Добавляем пороговые линии
            fig.add_hline(y=0.6, line_dash="dash", line_color="red", row=2, col=1)
            fig.add_hline(y=0.3, line_dash="dot", line_color="red", row=2, col=1)
        
        # График 4: Скорость изменений
        if 'hfd' in df.columns and len(df) > 1:
            hfd_diff = df['hfd'].diff()
            fig.add_trace(
                go.Scatter(
                    x=df.index[1:] if 'timestamp' not in df.columns else df['timestamp'][1:],
                    y=hfd_diff[1:],
                    mode='lines+markers',
                    name='HFD Change Rate',
                    line=dict(color=self.colors['warning'], width=2)
                ),
                row=2, col=2
            )
            
            # Добавляем нулевую линию
            fig.add_hline(y=0, line_dash="dot", line_color="gray", row=2, col=2)
        
        # График 5: Предупредительные индикаторы
        if 'warning_level' in df.columns:
            fig.add_trace(
                go.Scatter(
                    x=df.index if 'timestamp' not in df.columns else df['timestamp'],
                    y=df['warning_level'],
                    mode='lines+markers',
                    name='Warning Level',
                    line=dict(color=self.colors['danger'], width=2)
                ),
                row=3, col=1
            )
        
        # График 6: Распределение HFD
        if 'hfd' in df.columns:
            fig.add_trace(
                go.Histogram(
                    x=df['hfd'],
                    nbinsx=20,
                    name='HFD Distribution',
                    marker_color=self.colors['primary'],
                    opacity=0.7
                ),
                row=3, col=2
            )
        
        # Обновляем layout
        fig.update_layout(
            title={
                'text': "Система Мониторинга Фрактальной Размерности - Мета-∆DΩΛ",
                'x': 0.5,
                'font': {'size': 20}
            },
            height=900,
            showlegend=True,
            template="plotly_white"
        )
        
        # Обновляем оси
        fig.update_xaxes(title_text="Время", row=1, col=1)
        fig.update_xaxes(title_text="Время", row=2, col=1)
        fig.update_xaxes(title_text="HFD", row=3, col=2)
        
        fig.update_yaxes(title_text="Фрактальная Размерность", row=1, col=1)
        fig.update_yaxes(title_text="Complexity Score", row=1, col=2)
        fig.update_yaxes(title_text="Уверенность", row=2, col=1)
        fig.update_yaxes(title_text="Изменение HFD", row=2, col=2)
        fig.update_yaxes(title_text="Уровень Предупреждения", row=3, col=1)
        fig.update_yaxes(title_text="Частота", row=3, col=2)
        
        if save_path is None:
            save_path = self.output_dir / "fractal_dashboard.html"
        
        fig.write_html(str(save_path))
        return str(save_path)
    
    def create_heatmap_analysis(self, data_matrix: np.ndarray, 
                              labels: List[str] = None,
                              title: str = "Анализ Фрактальной Структуры") -> str:
        """
        Создание тепловой карты для анализа корреляций
        
        Args:
            data_matrix: матрица данных для анализа
            labels: метки для осей
            title: заголовок графика
        
        Returns:
            Путь к сохраненному изображению
        """
        plt.figure(figsize=(12, 10))
        
        # Вычисляем корреляционную матрицу
        correlation_matrix = np.corrcoef(data_matrix)
        
        # Создаем heatmap
        sns.heatmap(
            correlation_matrix,
            annot=True,
            cmap='RdYlBu_r',
            center=0,
            square=True,
            fmt='.2f',
            cbar_kws={'label': 'Корреляция'}
        )
        
        if labels:
            plt.xticks(range(len(labels)), labels, rotation=45)
            plt.yticks(range(len(labels)), labels, rotation=0)
        
        plt.title(title, fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        save_path = self.output_dir / "correlation_heatmap.png"
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        return str(save_path)
    
    def create_trend_analysis_chart(self, trend_data: Dict, 
                                  save_path: str = None) -> str:
        """
        Создание графика трендового анализа
        
        Args:
            trend_data: данные трендов
            save_path: путь для сохранения
        
        Returns:
            Путь к сохраненному файлу
        """
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Трендовый Анализ Фрактальной Размерности', fontsize=16, fontweight='bold')
        
        # График 1: Тренд HFD
        if 'hfd_history' in trend_data:
            axes[0, 0].plot(trend_data['hfd_history'], 
                          color=self.colors['primary'], 
                          linewidth=2, 
                          marker='o', 
                          markersize=4)
            axes[0, 0].axhline(y=1.2, color='green', linestyle='--', alpha=0.7, label='Нижняя граница здоровья')
            axes[0, 0].axhline(y=1.6, color='green', linestyle='--', alpha=0.7, label='Верхняя граница здоровья')
            axes[0, 0].set_title('Тренд Фрактальной Размерности')
            axes[0, 0].set_ylabel('HFD')
            axes[0, 0].legend()
            axes[0, 0].grid(True, alpha=0.3)
        
        # График 2: Стабильность
        if 'stability_history' in trend_data:
            axes[0, 1].plot(trend_data['stability_history'], 
                          color=self.colors['secondary'], 
                          linewidth=2, 
                          marker='s', 
                          markersize=4)
            axes[0, 1].axhline(y=0.7, color='orange', linestyle='--', alpha=0.7, label='Порог стабильности')
            axes[0, 1].set_title('Индекс Стабильности')
            axes[0, 1].set_ylabel('Стабильность')
            axes[0, 1].legend()
            axes[0, 1].grid(True, alpha=0.3)
        
        # График 3: Скорость изменений
        if 'change_rates' in trend_data:
            axes[1, 0].plot(trend_data['change_rates'], 
                          color=self.colors['accent'], 
                          linewidth=2, 
                          marker='^', 
                          markersize=4)
            axes[1, 0].axhline(y=0, color='gray', linestyle='-', alpha=0.5)
            axes[1, 0].set_title('Скорость Изменений HFD')
            axes[1, 0].set_ylabel('Изменение/единицу времени')
            axes[1, 0].grid(True, alpha=0.3)
        
        # График 4: Распределение аномалий
        if 'anomaly_distribution' in trend_data:
            anomaly_counts = trend_data['anomaly_distribution']
            colors = [self.colors['success'] if level <= 1 else 
                     self.colors['warning'] if level == 2 else 
                     self.colors['danger'] for level in anomaly_counts.keys()]
            
            bars = axes[1, 1].bar(anomaly_counts.keys(), 
                                anomaly_counts.values(), 
                                color=colors, 
                                alpha=0.7)
            axes[1, 1].set_title('Распределение Уровней Предупреждений')
            axes[1, 1].set_xlabel('Уровень Предупреждения')
            axes[1, 1].set_ylabel('Частота')
            axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path is None:
            save_path = self.output_dir / "trend_analysis.png"
        
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        return str(save_path)
    
    def create_comparative_analysis(self, results_dict: Dict[str, Dict], 
                                  save_path: str = None) -> str:
        """
        Создание сравнительного анализа различных конфигураций
        
        Args:
            results_dict: словарь с результатами для разных конфигураций
            save_path: путь для сохранения
        
        Returns:
            Путь к сохраненному файлу
        """
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('Сравнительный Анализ Алгоритмов', fontsize=16, fontweight='bold')
        
        configurations = list(results_dict.keys())
        
        # График 1: Время выполнения
        exec_times = [results_dict[config]['execution_time'] for config in configurations]
        bars1 = axes[0, 0].bar(configurations, exec_times, color=self.colors['primary'], alpha=0.7)
        axes[0, 0].set_title('Время Выполнения (сек)')
        axes[0, 0].set_ylabel('Время (сек)')
        axes[0, 0].tick_params(axis='x', rotation=45)
        for i, bar in enumerate(bars1):
            axes[0, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.001,
                           f'{exec_times[i]:.3f}', ha='center', va='bottom')
        
        # График 2: Точность HFD
        hfd_accuracies = [results_dict[config]['hfd_accuracy'] for config in configurations]
        bars2 = axes[0, 1].bar(configurations, hfd_accuracies, color=self.colors['secondary'], alpha=0.7)
        axes[0, 1].set_title('Точность HFD (%)')
        axes[0, 1].set_ylabel('Точность (%)')
        axes[0, 1].tick_params(axis='x', rotation=45)
        for i, bar in enumerate(bars2):
            axes[0, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                           f'{hfd_accuracies[i]:.1f}%', ha='center', va='bottom')
        
        # График 3: Доля обнаруженных аномалий
        anomaly_detections = [results_dict[config]['anomaly_detection_rate'] for config in configurations]
        bars3 = axes[0, 2].bar(configurations, anomaly_detections, color=self.colors['accent'], alpha=0.7)
        axes[0, 2].set_title('Доля Обнаруженных Аномалий (%)')
        axes[0, 2].set_ylabel('Доля (%)')
        axes[0, 2].tick_params(axis='x', rotation=45)
        for i, bar in enumerate(bars3):
            axes[0, 2].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                           f'{anomaly_detections[i]:.1f}%', ha='center', va='bottom')
        
        # График 4: Скорость обучения
        learning_rates = [results_dict[config]['learning_rate'] for config in configurations]
        bars4 = axes[1, 0].bar(configurations, learning_rates, color=self.colors['warning'], alpha=0.7)
        axes[1, 0].set_title('Скорость Обучения')
        axes[1, 0].set_ylabel('Улучшение/итерацию')
        axes[1, 0].tick_params(axis='x', rotation=45)
        for i, bar in enumerate(bars4):
            axes[1, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.001,
                           f'{learning_rates[i]:.3f}', ha='center', va='bottom')
        
        # График 5: Память (потребление)
        memory_usage = [results_dict[config]['memory_usage_mb'] for config in configurations]
        bars5 = axes[1, 1].bar(configurations, memory_usage, color=self.colors['success'], alpha=0.7)
        axes[1, 1].set_title('Использование Памяти (MB)')
        axes[1, 1].set_ylabel('Память (MB)')
        axes[1, 1].tick_params(axis='x', rotation=45)
        for i, bar in enumerate(bars5):
            axes[1, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                           f'{memory_usage[i]:.1f}', ha='center', va='bottom')
        
        # График 6: Общий балл
        overall_scores = [results_dict[config]['overall_score'] for config in configurations]
        bars6 = axes[1, 2].bar(configurations, overall_scores, color=self.colors['danger'], alpha=0.7)
        axes[1, 2].set_title('Общий Балл')
        axes[1, 2].set_ylabel('Балл')
        axes[1, 2].tick_params(axis='x', rotation=45)
        for i, bar in enumerate(bars6):
            axes[1, 2].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                           f'{overall_scores[i]:.2f}', ha='center', va='bottom')
        
        plt.tight_layout()
        
        if save_path is None:
            save_path = self.output_dir / "comparative_analysis.png"
        
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        return str(save_path)


class PerformanceBenchmark:
    """
    Система бенчмаркинга производительности алгоритмов
    """
    
    def __init__(self):
        self.benchmark_results = {}
        
    def run_comprehensive_benchmark(self, test_data_generator, 
                                   algorithm_configs: List[Dict]) -> Dict:
        """
        Запуск комплексного бенчмаркинга
        
        Args:
            test_data_generator: функция генерации тестовых данных
            algorithm_configs: список конфигураций алгоритмов для тестирования
        
        Returns:
            Словарь с результатами бенчмаркинга
        """
        print("Запуск комплексного бенчмаркинга...")
        
        results = {}
        
        for i, config in enumerate(algorithm_configs):
            config_name = config.get('name', f'config_{i}')
            print(f"Тестирование конфигурации: {config_name}")
            
            # Генерируем тестовые данные
            test_data = test_data_generator(config)
            
            # Запускаем алгоритм и измеряем производительность
            result = self._benchmark_algorithm(config, test_data)
            results[config_name] = result
            
            print(f"  Время выполнения: {result['execution_time']:.3f} сек")
            print(f"  Точность HFD: {result['hfd_accuracy']:.1f}%")
            print(f"  Память: {result['memory_usage_mb']:.1f} MB")
            print()
        
        self.benchmark_results = results
        return results
    
    def _benchmark_algorithm(self, config: Dict, test_data: np.ndarray) -> Dict:
        """
        Бенчмаркинг отдельного алгоритма
        """
        from structural_complexity_analyzer import StructuralComplexityAnalyzer
        from early_warning_system import FractalAnomalyDetector, EarlyWarningSystem
        
        result = {
            'execution_time': 0,
            'hfd_accuracy': 0,
            'anomaly_detection_rate': 0,
            'learning_rate': 0,
            'memory_usage_mb': 0,
            'overall_score': 0,
            'detailed_metrics': {}
        }
        
        try:
            # Создаем анализатор
            analyzer = StructuralComplexityAnalyzer(
                window_size=config.get('window_size', 100),
                adaptive_window=config.get('adaptive_window', True)
            )
            
            # Измеряем время выполнения
            start_time = time.time()
            
            # Запускаем анализ
            analysis_result = analyzer.analyze_micro_level(test_data)
            
            # Измеряем время
            execution_time = time.time() - start_time
            result['execution_time'] = execution_time
            
            # Оцениваем точность HFD (для тестовых данных с известной FD)
            if 'expected_hfd' in config:
                expected_hfd = config['expected_hfd']
                computed_hfd = analysis_result.get('hfd', 1.5)
                hfd_error = abs(computed_hfd - expected_hfd) / expected_hfd
                result['hfd_accuracy'] = max(0, (1 - hfd_error) * 100)
            
            # Тестируем детектор аномалий
            if config.get('test_anomaly_detection', False):
                detector = FractalAnomalyDetector()
                
                # Создаем базовые данные
                baseline_data = test_data[:len(test_data)//2]
                detector.fit_baseline(baseline_data.tolist())
                
                # Тестируем на аномальных данных
                anomalous_data = test_data[len(test_data)//2:]
                anomaly_result = detector.detect_anomalies(anomalous_data.tolist())
                
                result['anomaly_detection_rate'] = anomaly_result['anomaly_rate'] * 100
            
            # Вычисляем общий балл (комбинация метрик)
            accuracy_score = result['hfd_accuracy'] / 100
            speed_score = max(0, 1 - execution_time / 1.0)  # Нормализуем к 1 сек
            anomaly_score = min(1.0, result['anomaly_detection_rate'] / 100)
            
            result['overall_score'] = (accuracy_score * 0.4 + 
                                     speed_score * 0.3 + 
                                     anomaly_score * 0.3)
            
            result['detailed_metrics'] = analysis_result
            
        except Exception as e:
            print(f"Ошибка при тестировании конфигурации {config}: {str(e)}")
            result['error'] = str(e)
        
        return result
    
    def generate_benchmark_report(self, save_path: str = None) -> str:
        """
        Генерация отчета о результатах бенчмаркинга
        """
        if not self.benchmark_results:
            return "Нет данных для генерации отчета"
        
        report_lines = [
            "# Отчет о Бенчмаркинге Алгоритмов Фрактальной Размерности",
            f"**Дата генерации:** {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Количество конфигураций:** {len(self.benchmark_results)}",
            "",
            "## Сводные Результаты",
            ""
        ]
        
        # Создаем таблицу результатов
        report_lines.extend([
            "| Конфигурация | Время (сек) | Точность HFD (%) | Обнаружение аномалий (%) | Общий балл |",
            "|--------------|-------------|------------------|---------------------------|------------|"
        ])
        
        for config_name, result in self.benchmark_results.items():
            exec_time = result.get('execution_time', 0)
            hfd_acc = result.get('hfd_accuracy', 0)
            anomaly_rate = result.get('anomaly_detection_rate', 0)
            overall_score = result.get('overall_score', 0)
            
            report_lines.append(
                f"| {config_name} | {exec_time:.3f} | {hfd_acc:.1f} | {anomaly_rate:.1f} | {overall_score:.3f} |"
            )
        
        # Добавляем анализ
        report_lines.extend([
            "",
            "## Детальный Анализ",
            ""
        ])
        
        best_config = max(self.benchmark_results.keys(), 
                         key=lambda k: self.benchmark_results[k].get('overall_score', 0))
        best_score = self.benchmark_results[best_config]['overall_score']
        
        report_lines.extend([
            f"**Лучшая конфигурация:** {best_config} (общий балл: {best_score:.3f})",
            "",
            "### Ключевые Выводы:",
            ""
        ])
        
        # Анализируем результаты
        execution_times = [r.get('execution_time', 0) for r in self.benchmark_results.values()]
        accuracies = [r.get('hfd_accuracy', 0) for r in self.benchmark_results.values()]
        
        report_lines.extend([
            f"- **Диапазон времени выполнения:** {min(execution_times):.3f} - {max(execution_times):.3f} сек",
            f"- **Диапазон точности HFD:** {min(accuracies):.1f}% - {max(accuracies):.1f}%",
            f"- **Средний общий балл:** {np.mean([r.get('overall_score', 0) for r in self.benchmark_results.values()]):.3f}",
            ""
        ])
        
        # Рекомендации
        report_lines.extend([
            "## Рекомендации по Внедрению",
            "",
            "1. **Приоритет производительности:** Используйте конфигурацию с наименьшим временем выполнения",
            "2. **Приоритет точности:** Выберите конфигурацию с наивысшей точностью HFD", 
            "3. **Баланс:** Оптимальная конфигурация обеспечивает компромисс между скоростью и точностью",
            "4. **Мониторинг:** Регулярно переоценивайте производительность при изменении нагрузки",
            ""
        ])
        
        if save_path is None:
            save_path = "benchmark_report.md"
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report_lines))
        
        return save_path


def generate_test_scenarios():
    """
    Генерация тестовых сценариев для валидации алгоритмов
    """
    scenarios = {}
    
    # Сценарий 1: Здоровая система
    np.random.seed(42)
    healthy_data = []
    for i in range(100):
        # Здоровый HFD в диапазоне 1.3-1.5
        hfd = 1.4 + 0.1 * np.random.normal()
        complexity = 0.6 + 0.2 * np.random.random()
        confidence = 0.8 + 0.1 * np.random.random()
        
        healthy_data.append({
            'timestamp': i,
            'hfd': hfd,
            'complexity_score': complexity,
            'confidence': confidence,
            'warning_level': 0,
            'scenario': 'healthy'
        })
    
    scenarios['healthy_system'] = np.array([d['hfd'] for d in healthy_data])
    
    # Сценарий 2: Система в застое
    stagnant_data = []
    for i in range(100):
        # Низкий HFD
        hfd = 1.1 + 0.05 * np.random.normal()
        complexity = 0.2 + 0.1 * np.random.random()
        confidence = 0.4 + 0.1 * np.random.random()
        
        stagnant_data.append({
            'timestamp': i,
            'hfd': hfd,
            'complexity_score': complexity,
            'confidence': confidence,
            'warning_level': 2,
            'scenario': 'stagnant'
        })
    
    scenarios['stagnant_system'] = np.array([d['hfd'] for d in stagnant_data])
    
    # Сценарий 3: Система в хаосе
    chaotic_data = []
    for i in range(100):
        # Высокий HFD
        hfd = 1.7 + 0.1 * np.random.normal()
        complexity = 0.8 + 0.1 * np.random.random()
        confidence = 0.3 + 0.2 * np.random.random()
        
        chaotic_data.append({
            'timestamp': i,
            'hfd': hfd,
            'complexity_score': complexity,
            'confidence': confidence,
            'warning_level': 3,
            'scenario': 'chaotic'
        })
    
    scenarios['chaotic_system'] = np.array([d['hfd'] for d in chaotic_data])
    
    # Сценарий 4: Переходный период
    transition_data = []
    hfd_trend = np.linspace(1.4, 1.1, 100)  # Переход от здорового к застою
    
    for i in range(100):
        hfd = hfd_trend[i] + 0.05 * np.random.normal()
        complexity = max(0.1, 0.6 - i * 0.004 + 0.1 * np.random.random())
        confidence = max(0.1, 0.8 - i * 0.005 + 0.1 * np.random.random())
        
        transition_data.append({
            'timestamp': i,
            'hfd': hfd,
            'complexity_score': complexity,
            'confidence': confidence,
            'warning_level': min(3, i // 20),
            'scenario': 'transition'
        })
    
    scenarios['transition_system'] = np.array([d['hfd'] for d in transition_data])
    
    return scenarios


if __name__ == "__main__":
    print("=== Модуль Визуализации и Бенчмаркинга ===")
    
    # Создаем визуализатор
    visualizer = FractalDimensionVisualizer()
    
    # Генерируем тестовые данные
    np.random.seed(42)
    test_time_series = []
    
    for i in range(50):
        # Симулируем эволюцию системы
        base_hfd = 1.4 + 0.1 * np.sin(i * 0.2) + 0.05 * np.random.normal()
        complexity = 0.6 + 0.1 * np.cos(i * 0.15) + 0.05 * np.random.random()
        confidence = 0.8 - 0.005 * i + 0.05 * np.random.random()
        
        test_time_series.append({
            'timestamp': f"2025-11-06T{5 + i//30:02d}:{(i%60):02d}:{i%60:02d}Z",
            'hfd': base_hfd,
            'complexity_score': complexity,
            'confidence': confidence,
            'warning_level': max(0, int((1.5 - base_hfd) * 2)),
            'anomaly_score': 0.1 if i > 30 else 0.0
        })
    
    # Создаем дашборд
    dashboard_path = visualizer.create_real_time_dashboard(test_time_series)
    print(f"Дашборд сохранен: {dashboard_path}")
    
    # Создаем heatmap корреляций
    data_matrix = np.array([[d['hfd'], d['complexity_score'], d['confidence'], d['warning_level']] 
                           for d in test_time_series])
    heatmap_path = visualizer.create_heatmap_analysis(
        data_matrix, 
        labels=['HFD', 'Complexity', 'Confidence', 'Warning'],
        title="Корреляционный Анализ Фрактальных Метрик"
    )
    print(f"Тепловая карта сохранена: {heatmap_path}")
    
    # Создаем трендовый анализ
    trend_data = {
        'hfd_history': [d['hfd'] for d in test_time_series],
        'stability_history': [1.0 - abs(d['hfd'] - 1.4) for d in test_time_series],
        'change_rates': [0] + [test_time_series[i]['hfd'] - test_time_series[i-1]['hfd'] 
                               for i in range(1, len(test_time_series))],
        'anomaly_distribution': {0: 30, 1: 15, 2: 5}
    }
    trend_path = visualizer.create_trend_analysis_chart(trend_data)
    print(f"Трендовый анализ сохранен: {trend_path}")
    
    # Запускаем бенчмаркинг
    benchmark = PerformanceBenchmark()
    
    algorithm_configs = [
        {
            'name': 'baseline_adaptive',
            'window_size': 100,
            'adaptive_window': True,
            'expected_hfd': 1.4,
            'test_anomaly_detection': True
        },
        {
            'name': 'fixed_window',
            'window_size': 200,
            'adaptive_window': False,
            'expected_hfd': 1.4,
            'test_anomaly_detection': False
        },
        {
            'name': 'high_accuracy',
            'window_size': 300,
            'adaptive_window': True,
            'expected_hfd': 1.4,
            'test_anomaly_detection': True
        }
    ]
    
    def test_data_generator(config):
        np.random.seed(42)
        return np.random.normal(1.4, 0.1, 500)
    
    benchmark_results = benchmark.run_comprehensive_benchmark(test_data_generator, algorithm_configs)
    
    # Создаем сравнительный анализ
    comparative_path = visualizer.create_comparative_analysis(benchmark_results)
    print(f"Сравнительный анализ сохранен: {comparative_path}")
    
    # Генерируем отчет о бенчмаркинге
    report_path = benchmark.generate_benchmark_report("benchmark_report.md")
    print(f"Отчет о бенчмаркинге сохранен: {report_path}")
    
    print("\n=== Визуализация и бенчмаркинг завершены ===")
    print(f"Все файлы сохранены в директории: {visualizer.output_dir}")
