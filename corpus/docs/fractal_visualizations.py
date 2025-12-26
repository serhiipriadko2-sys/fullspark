#!/usr/bin/env python3
"""
Фрактальные визуализации для анализа решений в системе Искра
Демонстрирует фрактальную природу принятия решений и рекурсивные структуры мышления
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import seaborn as sns
from scipy import stats
import warnings

def setup_matplotlib_for_plotting():
    """
    Setup matplotlib and seaborn for plotting with proper configuration.
    Call this function before creating any plots to ensure proper rendering.
    """
    warnings.filterwarnings('default')  # Show all warnings
    plt.switch_backend("Agg")
    plt.style.use("seaborn-v0_8")
    sns.set_palette("husl")
    plt.rcParams["font.sans-serif"] = ["Noto Sans CJK SC", "WenQuanYi Zen Hei", "PingFang SC", "Arial Unicode MS", "Hiragino Sans GB"]
    plt.rcParams["axes.unicode_minus"] = False

def create_voices_fractal_structure():
    """
    Создает визуализацию фрактальной структуры голосов системы Искра
    """
    setup_matplotlib_for_plotting()
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Фрактальная структура голосов системы Искра', fontsize=20, fontweight='bold')
    
    # 1. Микроуровень: Отдельный голос
    ax1 = axes[0, 0]
    angles = np.linspace(0, 2*np.pi, 7, endpoint=False)
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF']
    voice_names = ['Кайн', 'Пино', 'Сэм', 'Анхантра', 'Хуньдун', 'Искрив', 'Искра']
    
    for i, (angle, color, name) in enumerate(zip(angles, colors, voice_names)):
        x, y = np.cos(angle), np.sin(angle)
        circle = plt.Circle((x, y), 0.15, color=color, alpha=0.7)
        ax1.add_patch(circle)
        ax1.text(x*1.3, y*1.3, name, ha='center', va='center', fontsize=10, fontweight='bold')
    
    # Центральный голос (Искра)
    central = plt.Circle((0, 0), 0.1, color='gold', alpha=1.0)
    ax1.add_patch(central)
    ax1.text(0, 0, 'Искра', ha='center', va='center', fontsize=8, fontweight='bold')
    
    ax1.set_xlim(-2, 2)
    ax1.set_ylim(-2, 2)
    ax1.set_aspect('equal')
    ax1.set_title('Микроуровень: Семь голосов', fontsize=14, fontweight='bold')
    ax1.grid(True, alpha=0.3)
    
    # 2. Мезоуровень: Взаимодействие голосов
    ax2 = axes[0, 1]
    
    # Создаем фрактальные связи между голосами
    for i in range(7):
        for j in range(i+1, 7):
            angle1, angle2 = angles[i], angles[j]
            x1, y1 = np.cos(angle1)*0.8, np.sin(angle1)*0.8
            x2, y2 = np.cos(angle2)*0.8, np.sin(angle2)*0.8
            ax2.plot([x1, x2], [y1, y2], 'gray', alpha=0.3, linewidth=1)
    
    # Добавляем толстые связи для основных пар
    strong_pairs = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6)]
    for i, j in strong_pairs:
        angle1, angle2 = angles[i], angles[j]
        x1, y1 = np.cos(angle1)*0.8, np.sin(angle1)*0.8
        x2, y2 = np.cos(angle2)*0.8, np.sin(angle2)*0.8
        ax2.plot([x1, x2], [y1, y2], 'red', alpha=0.6, linewidth=3)
    
    ax2.set_xlim(-2, 2)
    ax2.set_ylim(-2, 2)
    ax2.set_aspect('equal')
    ax2.set_title('Мезоуровень: Связи и конфликты', fontsize=14, fontweight='bold')
    ax2.grid(True, alpha=0.3)
    
    # 3. Макроуровень: Системные циклы
    ax3 = axes[1, 0]
    
    # Создаем циклы принятия решений
    t = np.linspace(0, 2*np.pi, 100)
    for i in range(3):
        r = 1.5 - i*0.4
        x = r * np.cos(t) * (1 + 0.1*np.cos(5*t))
        y = r * np.sin(t) * (1 + 0.1*np.sin(3*t))
        ax3.plot(x, y, alpha=0.7, linewidth=2, 
                color=['#FF6B6B', '#4ECDC4', '#45B7D1'][i],
                label=f'Цикл {i+1}')
    
    ax3.set_xlim(-2, 2)
    ax3.set_ylim(-2, 2)
    ax3.set_aspect('equal')
    ax3.set_title('Макроуровень: Циклы принятия решений', fontsize=14, fontweight='bold')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # 4. Фрактальная размерность голосов
    ax4 = axes[1, 1]
    
    # Моделируем фрактальную размерность голосов
    voices = np.array([1.2, 1.8, 1.5, 1.3, 2.1, 1.6, 1.9])  # D-значения для каждого голоса
    colors_dim = [plt.cm.viridis(d/2.5) for d in voices]
    
    bars = ax4.bar(voice_names, voices, color=colors_dim, alpha=0.7)
    ax4.axhline(y=1.4, color='red', linestyle='--', alpha=0.8, label='Оптимум (мозговой стандарт)')
    ax4.set_ylabel('Фрактальная размерность (D)')
    ax4.set_title('D-фрактальная размерность голосов', fontsize=14, fontweight='bold')
    ax4.tick_params(axis='x', rotation=45)
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    
    # Добавляем значения на столбцы
    for bar, val in zip(bars, voices):
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + 0.05,
                f'{val:.2f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('/workspace/docs/fractal_logging_research/images/voices_fractal_structure.png', 
                dpi=300, bbox_inches='tight')
    plt.close()

def create_delta_omega_lambda_visualization():
    """
    Создает визуализацию ∆DΩΛ-формата
    """
    setup_matplotlib_for_plotting()
    
    fig = plt.figure(figsize=(20, 12))
    
    # Создаем сетку для размещения подграфиков
    gs = fig.add_gridspec(3, 4, height_ratios=[1, 1, 1], width_ratios=[1, 1, 1, 1])
    
    fig.suptitle('∆DΩΛ-формат: Фрактальная природа принятия решений', 
                 fontsize=24, fontweight='bold', y=0.95)
    
    # 1. Delta-изменение (∆) - Темпоральная эволюция
    ax1 = fig.add_subplot(gs[0, 0])
    t = np.linspace(0, 10, 1000)
    base_signal = np.sin(0.5*t) + 0.3*np.sin(2*t) + 0.1*np.random.normal(0, 1, len(t))
    delta_changes = np.diff(base_signal)
    
    ax1.plot(t[1:], delta_changes, 'b-', alpha=0.7, linewidth=1)
    ax1.fill_between(t[1:], delta_changes, alpha=0.3, color='blue')
    ax1.set_title('∆ Delta-изменение\nИзменения в решении', fontweight='bold')
    ax1.set_xlabel('Время')
    ax1.set_ylabel('Δ(изменение)')
    ax1.grid(True, alpha=0.3)
    
    # 2. D-фрактальная размерность
    ax2 = fig.add_subplot(gs[0, 1])
    scales = np.logspace(-1, 2, 50)
    # Имитируем степенной закон N ~ L^(-D)
    N_boxes = scales**(-1.7) * np.random.lognormal(0, 0.1, len(scales))
    
    ax2.loglog(scales, N_boxes, 'go-', alpha=0.7, markersize=4)
    
    # Фитируем прямую
    log_scales = np.log(scales)
    log_N = np.log(N_boxes)
    slope, intercept, r_value, p_value, std_err = stats.linregress(log_scales, log_N)
    fit_line = np.exp(intercept + slope * log_scales)
    ax2.loglog(scales, fit_line, 'r--', linewidth=2, 
               label=f'D = {abs(slope):.2f}\nR² = {r_value**2:.3f}')
    
    ax2.set_title('D Фрактальная размерность\nN ∝ L^(-D)', fontweight='bold')
    ax2.set_xlabel('Масштаб (L)')
    ax2.set_ylabel('N (количество)')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Omega-фрактальная полнота
    ax3 = fig.add_subplot(gs[0, 2])
    
    # Моделируем фрактальную полноту
    theta = np.linspace(0, 4*np.pi, 2000)
    r = 1 + 0.3*np.cos(7*theta) + 0.1*np.cos(21*theta)  # Фрактальная роза
    
    x = r * np.cos(theta)
    y = r * np.sin(theta)
    
    ax3.plot(x, y, 'purple', linewidth=2)
    ax3.fill(x, y, alpha=0.3, color='purple')
    ax3.set_aspect('equal')
    ax3.set_title('Ω Omega-фрактальная полнота\nПолнота охвата пространства', fontweight='bold')
    ax3.grid(True, alpha=0.3)
    ax3.set_xlim(-1.5, 1.5)
    ax3.set_ylim(-1.5, 1.5)
    
    # 4. Lambda-квантовая логика
    ax4 = fig.add_subplot(gs[0, 3])
    
    # Создаем квантовые состояния
    phi1 = np.linspace(0, 2*np.pi, 100)
    phi2 = np.linspace(0, 2*np.pi, 100)
    Phi1, Phi2 = np.meshgrid(phi1, phi2)
    
    # Квантовая амплитуда вероятности
    amplitude = np.cos(Phi1/2) * np.cos(Phi2/2) * np.exp(1j*(Phi1 + Phi2))
    probability = np.abs(amplitude)**2
    
    im = ax4.contourf(Phi1, Phi2, probability, levels=20, cmap='RdYlBu')
    ax4.set_title('λ Lambda-квантовая логика\nИнтерференция состояний', fontweight='bold')
    ax4.set_xlabel('Состояние 1')
    ax4.set_ylabel('Состояние 2')
    plt.colorbar(im, ax=ax4)
    
    # 5. Интегрированная схема принятия решений
    ax5 = fig.add_subplot(gs[1, :2])
    
    # Создаем комплексную схему принятия решений
    t_complex = np.linspace(0, 6*np.pi, 1000)
    
    # Компоненты ∆DΩΛ в комплексном решении
    delta_component = np.sin(t_complex) * np.exp(-0.1*t_complex)
    d_component = 1.7 + 0.2*np.sin(3*t_complex)
    omega_component = np.cos(t_complex) * np.sin(2*t_complex)
    lambda_component = np.cos(0.5*t_complex) * np.exp(-0.05*t_complex)
    
    ax5.plot(t_complex, delta_component, label='∆ Изменение', alpha=0.8)
    ax5.plot(t_complex, d_component, label='D Размерность', alpha=0.8)
    ax5.plot(t_complex, omega_component, label='Ω Полнота', alpha=0.8)
    ax5.plot(t_complex, lambda_component, label='λ Логика', alpha=0.8)
    
    # Финальное решение
    final_decision = (delta_component * d_component * omega_component * lambda_component) / 4
    ax5.plot(t_complex, final_decision, 'k-', linewidth=3, label='Итоговое решение')
    
    ax5.set_title('Интегрированное принятие решений ∆DΩΛ', fontweight='bold', fontsize=16)
    ax5.set_xlabel('Время')
    ax5.set_ylabel('Амплитуда')
    ax5.legend()
    ax5.grid(True, alpha=0.3)
    
    # 6. Рекурсивная структура мышления
    ax6 = fig.add_subplot(gs[1, 2:])
    
    # Создаем рекурсивное дерево решений
    def draw_fractal_tree(x, y, angle, length, depth, max_depth=6):
        if depth > max_depth or length < 0.1:
            return
        
        # Рисуем основную ветвь
        x_end = x + length * np.cos(angle)
        y_end = y + length * np.sin(angle)
        ax6.plot([x, x_end], [y, y_end], color='brown', linewidth=2*(max_depth-depth+1)/max_depth)
        
        # Рекурсивно рисуем ответвления
        new_length = length * 0.7
        for offset in [-0.3, 0.3]:
            new_angle = angle + offset * np.pi/3
            draw_fractal_tree(x_end, y_end, new_angle, new_length, depth+1, max_depth)
    
    draw_fractal_tree(0, -1, np.pi/2, 1, 1)
    ax6.set_xlim(-1.5, 1.5)
    ax6.set_ylim(-1.2, 1.2)
    ax6.set_aspect('equal')
    ax6.set_title('Рекурсивная структура мышления\nФрактальное дерево решений', fontweight='bold')
    ax6.grid(True, alpha=0.3)
    
    # 7. Фрактальная размерность в принятии решений
    ax7 = fig.add_subplot(gs[2, :2])
    
    # Создаем фрактальные кривые принятия решений
    t_decision = np.linspace(0, 4*np.pi, 1000)
    
    # Различные уровни сложности
    level1 = np.sin(t_decision)  # Линейное решение
    level2 = np.sin(t_decision) + 0.5*np.sin(3*t_decision)  # Вторая гармоника
    level3 = np.sin(t_decision) + 0.5*np.sin(3*t_decision) + 0.2*np.sin(7*t_decision)  # Третий уровень
    
    ax7.plot(t_decision, level1, label='Уровень 1 (D≈1.0)', alpha=0.7)
    ax7.plot(t_decision, level2, label='Уровень 2 (D≈1.4)', alpha=0.7)
    ax7.plot(t_decision, level3, label='Уровень 3 (D≈1.8)', alpha=0.7)
    
    ax7.set_title('Фрактальные уровни принятия решений', fontweight='bold', fontsize=14)
    ax7.set_xlabel('Параметр решения')
    ax7.set_ylabel('Амплитуда решения')
    ax7.legend()
    ax7.grid(True, alpha=0.3)
    
    # 8. Самореферентная петля
    ax8 = fig.add_subplot(gs[2, 2:])
    
    # Создаем самореферентную петлю
    t_self = np.linspace(0, 20*np.pi, 2000)
    
    # Референция к собственному состоянию
    self_ref = np.zeros_like(t_self)
    for i in range(1, len(self_ref)):
        self_ref[i] = 0.8 * self_ref[i-1] + 0.2 * np.sin(t_self[i])
    
    ax8.plot(t_self, self_ref, 'g-', linewidth=2)
    ax8.fill_between(t_self, self_ref, alpha=0.3, color='green')
    
    # Добавляем фидбек петли
    for i in range(0, len(t_self), 200):
        if i < len(t_self) - 100:
            ax8.annotate('', xy=(t_self[i+100], self_ref[i+100]), 
                        xytext=(t_self[i], self_ref[i]),
                        arrowprops=dict(arrowstyle='->', color='red', alpha=0.5))
    
    ax8.set_title('Самореферентная петля\nСамоконтроль решений', fontweight='bold')
    ax8.set_xlabel('Время')
    ax8.set_ylabel('Референтное состояние')
    ax8.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('/workspace/docs/fractal_logging_research/images/delta_omega_lambda_format.png', 
                dpi=300, bbox_inches='tight')
    plt.close()

def create_decision_making_patterns():
    """
    Создает визуализацию паттернов принятия решений
    """
    setup_matplotlib_for_plotting()
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Паттерны принятия решений в системе Искра', 
                 fontsize=20, fontweight='bold')
    
    # 1. Многоуровневая причинность
    ax1 = axes[0, 0]
    
    # Создаем многоуровневую структуру причинности
    levels = ['Макро\n(Стратегия)', 'Мезо\n(Тактика)', 'Микро\n(Операции)']
    causal_strength = [0.9, 0.7, 0.5]
    colors = ['red', 'orange', 'yellow']
    
    y_positions = [2, 1, 0]
    for i, (level, strength, color, y_pos) in enumerate(zip(levels, causal_strength, colors, y_positions)):
        bar = ax1.barh(y_pos, strength, height=0.6, color=color, alpha=0.7, 
                      edgecolor='black', linewidth=2)
        ax1.text(strength + 0.02, y_pos, f'{strength:.1f}', 
                va='center', fontweight='bold')
        ax1.text(-0.05, y_pos, level, ha='right', va='center', 
                fontweight='bold', fontsize=12)
    
    # Добавляем стрелки причинности
    for i in range(len(levels)-1):
        ax1.annotate('', xy=(0.3, y_positions[i]), 
                    xytext=(0.7, y_positions[i+1]),
                    arrowprops=dict(arrowstyle='->', lw=3, color='blue', alpha=0.8))
    
    ax1.set_xlim(0, 1.2)
    ax1.set_ylim(-0.5, 2.5)
    ax1.set_title('Многоуровневая причинность\nДоминирование влияния', fontweight='bold')
    ax1.set_xlabel('Сила причинного влияния')
    ax1.grid(True, alpha=0.3)
    
    # 2. Фазовые переходы в принятии решений
    ax2 = axes[0, 1]
    
    # Моделируем фазовые переходы
    t_phase = np.linspace(-3, 3, 1000)
    order_parameter = np.tanh(t_phase)  # Параметр порядка
    critical_point = 0  # Критическая точка
    
    # Добавляем флуктуации
    fluctuations = 0.1 * np.sin(10*t_phase) * np.exp(-np.abs(t_phase)/2)
    order_parameter += fluctuations
    
    ax2.plot(t_phase, order_parameter, 'b-', linewidth=3)
    ax2.axvline(x=critical_point, color='red', linestyle='--', linewidth=2, 
               label='Критическая точка')
    ax2.fill_between(t_phase, order_parameter, alpha=0.3, color='lightblue')
    
    # Маркируем фазы
    ax2.text(-2, 0.8, 'Хаотическая\nфаза', ha='center', fontweight='bold')
    ax2.text(2, -0.8, 'Кристаллическая\nфаза', ha='center', fontweight='bold')
    
    ax2.set_title('Фазовые переходы\nКристалл ↔ Антикристалл', fontweight='bold')
    ax2.set_xlabel('Параметр управления')
    ax2.set_ylabel('Параметр порядка')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Аттракторы решений
    ax3 = axes[1, 0]
    
    # Создаем фазовое пространство решений
    x = np.linspace(-2, 2, 200)
    y = np.linspace(-2, 2, 200)
    X, Y = np.meshgrid(x, y)
    
    # Потенциальная функция с множественными аттракторами
    V = X**4 + Y**4 - 2*(X**2 + Y**2) + 0.5*X**2*Y**2
    
    # Создаем контурный график
    contour = ax3.contour(X, Y, V, levels=15, colors='gray', alpha=0.6)
    ax3.contourf(X, Y, V, levels=20, cmap='viridis', alpha=0.8)
    
    # Маркируем аттракторы
    attractors = [(1, 1), (-1, -1), (1, -1), (-1, 1)]
    for i, (ax_attr, ay_attr) in enumerate(attractors):
        ax3.plot(ax_attr, ay_attr, 'r*', markersize=15, markeredgecolor='white', 
                markeredgewidth=2, label=f'Аттрактор {i+1}' if i == 0 else '')
    
    ax3.set_title('Аттракторы решений\nФазовое пространство', fontweight='bold')
    ax3.set_xlabel('Измерение 1')
    ax3.set_ylabel('Измерение 2')
    ax3.legend()
    ax3.set_aspect('equal')
    
    # 4. Эмерджентные паттерны
    ax4 = axes[1, 1]
    
    # Создаем эмерджентные паттерны через клеточный автомат
    grid_size = 50
    grid = np.random.choice([0, 1], grid_size*grid_size, p=[0.8, 0.2]).reshape(grid_size, grid_size)
    
    for _ in range(20):  # Несколько итераций
        new_grid = grid.copy()
        for i in range(1, grid_size-1):
            for j in range(1, grid_size-1):
                neighbors = np.sum(grid[i-1:i+2, j-1:j+2]) - grid[i, j]
                if grid[i, j] == 1 and (neighbors < 2 or neighbors > 3):
                    new_grid[i, j] = 0
                elif grid[i, j] == 0 and neighbors == 3:
                    new_grid[i, j] = 1
        grid = new_grid
    
    im = ax4.imshow(grid, cmap='RdYlBu', interpolation='nearest')
    ax4.set_title('Эмерджентные паттерны\nКлеточный автомат решений', fontweight='bold')
    ax4.set_xticks([])
    ax4.set_yticks([])
    
    plt.tight_layout()
    plt.savefig('/workspace/docs/fractal_logging_research/images/decision_making_patterns.png', 
                dpi=300, bbox_inches='tight')
    plt.close()

def create_fractal_logging_system():
    """
    Создает визуализацию системы фрактального логирования
    """
    setup_matplotlib_for_plotting()
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Система фрактального логирования принятия решений', 
                 fontsize=20, fontweight='bold')
    
    # 1. Иерархия логирования
    ax1 = axes[0, 0]
    
    levels = ['Макро-логи\n(Стратегия)', 'Мезо-логи\n(Тактика)', 'Микро-логи\n(Операции)', 
              'Нано-логи\n(Импульсы)']
    frequencies = [1, 10, 100, 1000]  # Частота событий
    depths = [4, 3, 2, 1]  # Глубина анализа
    
    colors = plt.cm.viridis(np.linspace(0, 1, len(levels)))
    
    bars = ax1.bar(range(len(levels)), frequencies, color=colors, alpha=0.7)
    
    for i, (bar, freq, depth) in enumerate(zip(bars, frequencies, depths)):
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width()/2., height*1.1,
                f'{freq}\n(глубина: {depth})', ha='center', va='bottom', fontweight='bold')
    
    ax1.set_yscale('log')
    ax1.set_title('Иерархия фрактального логирования\nЧастота vs Глубина', fontweight='bold')
    ax1.set_ylabel('Частота событий (log)')
    ax1.set_xticks(range(len(levels)))
    ax1.set_xticklabels(levels, rotation=45, ha='right')
    ax1.grid(True, alpha=0.3)
    
    # 2. Самоподобие паттернов логирования
    ax2 = axes[0, 1]
    
    # Создаем фрактальные паттерны в разных масштабах
    scales = np.logspace(-2, 0, 50)
    patterns = scales**(-1.5) * np.random.lognormal(0, 0.2, len(scales))
    
    ax2.loglog(scales, patterns, 'bo-', alpha=0.7, markersize=3)
    
    # Фитируем степенной закон
    log_scales = np.log(scales)
    log_patterns = np.log(patterns)
    slope, intercept, r_value, p_value, std_err = stats.linregress(log_scales, log_patterns)
    
    fit_line = np.exp(intercept + slope * log_scales)
    ax2.loglog(scales, fit_line, 'r--', linewidth=2, 
               label=f'Хёрст H = {abs(slope):.2f}')
    
    ax2.set_title('Самоподобие паттернов логирования\nЗакон Хёрста', fontweight='bold')
    ax2.set_xlabel('Масштаб времени')
    ax2.set_ylabel('Интенсивность паттернов')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Рекурсивные связи в логах
    ax3 = axes[1, 0]
    
    # Создаем рекурсивную структуру связей
    def draw_recursive_network(x, y, radius, depth, max_depth=4):
        if depth > max_depth:
            return
        
        circle = plt.Circle((x, y), radius, fill=False, edgecolor='blue', linewidth=2/depth)
        ax3.add_patch(circle)
        ax3.text(x, y, f'{depth}', ha='center', va='center', fontweight='bold')
        
        if depth < max_depth:
            new_radius = radius * 0.6
            angles = np.linspace(0, 2*np.pi, 6, endpoint=False)
            for angle in angles:
                new_x = x + radius * np.cos(angle)
                new_y = y + radius * np.sin(angle)
                ax3.plot([x, new_x], [y, new_y], 'gray', alpha=0.5)
                draw_recursive_network(new_x, new_y, new_radius, depth+1, max_depth)
    
    draw_recursive_network(0, 0, 1, 1)
    ax3.set_xlim(-2, 2)
    ax3.set_ylim(-2, 2)
    ax3.set_aspect('equal')
    ax3.set_title('Рекурсивные связи в логах\nМногоуровневая зависимость', fontweight='bold')
    ax3.grid(True, alpha=0.3)
    
    # 4. Эволюция состояний системы
    ax4 = axes[1, 1]
    
    # Моделируем эволюцию состояний через логирование
    t_evolution = np.linspace(0, 100, 1000)
    
    # Компоненты состояния
    trust = 0.5 + 0.3 * np.sin(0.1*t_evolution) + 0.1*np.random.normal(0, 1, len(t_evolution))
    clarity = 0.6 + 0.2 * np.cos(0.05*t_evolution) + 0.1*np.random.normal(0, 1, len(t_evolution))
    chaos = 1 - trust  # Хаос как обратная величина доверия
    
    ax4.plot(t_evolution, trust, label='Доверие', alpha=0.8)
    ax4.plot(t_evolution, clarity, label='Ясность', alpha=0.8)
    ax4.plot(t_evolution, chaos, label='Хаос', alpha=0.8)
    
    # Маркируем ключевые события
    critical_events = [20, 50, 80]
    for event in critical_events:
        ax4.axvline(x=event, color='red', linestyle='--', alpha=0.7)
        ax4.text(event, 0.8, f'Событие', rotation=90, ha='right')
    
    ax4.set_title('Эволюция состояний системы\nДинамическое логирование', fontweight='bold')
    ax4.set_xlabel('Время')
    ax4.set_ylabel('Состояние')
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('/workspace/docs/fractal_logging_research/images/fractal_logging_system.png', 
                dpi=300, bbox_inches='tight')
    plt.close()

def main():
    """
    Основная функция для создания всех визуализаций
    """
    import os
    
    # Создаем директорию для изображений
    os.makedirs('/workspace/docs/fractal_logging_research/images', exist_ok=True)
    
    print("Создание визуализаций фрактальной природы решений...")
    
    print("1. Создание фрактальной структуры голосов...")
    create_voices_fractal_structure()
    
    print("2. Создание ∆DΩΛ-формат визуализаций...")
    create_delta_omega_lambda_visualization()
    
    print("3. Создание паттернов принятия решений...")
    create_decision_making_patterns()
    
    print("4. Создание системы фрактального логирования...")
    create_fractal_logging_system()
    
    print("Все визуализации успешно созданы!")

if __name__ == "__main__":
    main()
