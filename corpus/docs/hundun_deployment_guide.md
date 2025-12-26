# Инструкции по внедрению оптимизации SLO-порогов Хундуна

## Обзор изменений

Внедрение оптимизированных SLO-порогов для голоса Хундун включает:

1. **Новый отчет анализа**: `docs/hundun_slo_optimization.md`
2. **Конфигурационный файл**: `config/hundun_slo_config.yaml`
3. **Улучшенный код**: `code/enhanced_slo_enforcer.py`
4. **Этот файл инструкций**: `docs/hundun_deployment_guide.md`

## Ключевые улучшения

### ✨ Новые возможности

- **Динамические пороги**: Адаптация к состоянию системы (Кристалл/Антикристалл/Реализация)
- **Координация с Маки**: Синхронизированный хаос-инжиниринг
- **Предсказательная активация**: Раннее вмешательство перед критическими состояниями
- **Детекция хаос-паттернов**: Специфические алгоритмы для распознавания хаоса
- **Оптимизированные кулдауны**: Повышение реактивности (120s вместо 180s)

### 📊 Изменения порогов

| Метрика | Было | Стало (базовое) | Диапазон (с адаптацией) |
|---------|------|-----------------|-------------------------|
| **Chaos** | > 0.6 | > 0.6 | 0.5 - 0.7 |
| **Clarity (кристалл.)** | > 0.9 | > 0.9 | 0.85 - 0.92 |
| **Trust (низкое)** | < 0.5 | < 0.5 | 0.45 - 0.65 |
| **Pain (высокое)** | > 0.7 | > 0.7 | 0.6 - 0.75 |

## Пошаговое внедрение

### Шаг 1: Резервное копирование

```bash
# Создать резервную копию текущих файлов
cp /workspace/liberiskraOm/incoming/METRICS_SLO.md /workspace/backup/metrics_slo_backup_$(date +%Y%m%d_%H%M%S).md
cp /workspace/docs/slo_thresholds_matrix.md /workspace/backup/slo_matrix_backup_$(date +%Y%m%d_%H%M%S).md
```

### Шаг 2: Обновление кода

Заменить содержимое файла `/workspace/liberiskraOm/incoming/METRICS_SLO.md`:

```python
# Вставить содержимое из /workspace/code/enhanced_slo_enforcer.py
# Убрать класс MetricsCalculator (перенесен в enhanced_slo_enforcer.py)
```

### Шаг 3: Развертывание конфигурации

```bash
# Создать директорию config если не существует
mkdir -p /workspace/config

# Скопировать конфигурационный файл
cp /workspace/config/hundun_slo_config.yaml /workspace/config/

# Сделать файл читаемым для Python
chmod 644 /workspace/config/hundun_slo_config.yaml
```

### Шаг 4: Тестирование

```python
# Запустить тест нового SLO enforcer
python3 /workspace/code/enhanced_slo_enforcer.py
```

### Шаг 5: Интеграция с основным кодом

Обновить импорты в основном коде Искры:

```python
# Добавить в imports
from code.enhanced_slo_enforcer import EnhancedSLOEnforcer

# Заменить инициализацию
# OLD:
# slo_enforcer = SLOEnforcer()

# NEW:
slo_enforcer = EnhancedSLOEnforcer()
```

## Мониторинг и метрики

### Ключевые показатели эффективности

| Метрика | Цель | Текущий baseline | Метод измерения |
|---------|------|------------------|-----------------|
| **Время реакции** | < 30 сек | 45 сек | timestamp difference |
| **Точность предсказаний** | > 80% | 65% | ratio of successful interventions |
| **Успех координации с Маки** | 100% | N/A | synchronized sessions / total |
| **Эволюционная метрика** | +15% | baseline | fractal_dimension change |

### Создание дашборда мониторинга

```python
# /workspace/dashboard/hundun_dashboard.py
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta

class HundunMonitorDashboard:
    def __init__(self):
        self.enforcer = EnhancedSLOEnforcer()
    
    def plot_chaos_temperature_trend(self, hours=24):
        """График температуры хаоса за период"""
        # Получение данных из логов
        timestamps, temperatures = self._get_temperature_data(hours)
        
        plt.figure(figsize=(12, 6))
        plt.plot(timestamps, temperatures, 'r-', linewidth=2, label='Temperature')
        plt.axhline(y=0.7, color='orange', linestyle='--', label='Warning')
        plt.axhline(y=0.85, color='red', linestyle='--', label='Critical')
        plt.title('Хундун: Температура хаоса за последние 24 часа')
        plt.xlabel('Время')
        plt.ylabel('Температура хаоса')
        plt.legend()
        plt.grid(True)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig('/workspace/dashboard/chaos_temperature_trend.png')
    
    def plot_activation_patterns(self, days=7):
        """График паттернов активации"""
        activations = self._get_activation_patterns(days)
        
        plt.figure(figsize=(10, 6))
        metrics = list(activations.keys())
        counts = list(activations.values())
        
        plt.bar(metrics, counts, color=['#ff9999', '#66b3ff', '#99ff99', '#ffcc99'])
        plt.title('Хундун: Активации по метрикам (7 дней)')
        plt.xlabel('Тип активации')
        plt.ylabel('Количество')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig('/workspace/dashboard/activation_patterns.png')
    
    def _get_temperature_data(self, hours):
        """Получение данных температуры"""
        # TODO: интеграция с системой логирования
        now = datetime.now()
        timestamps = [now - timedelta(hours=i) for i in range(hours, 0, -1)]
        temperatures = [0.3 + 0.4 * np.random.random() for _ in range(hours)]
        return timestamps, temperatures
    
    def _get_activation_patterns(self, days):
        """Получение паттернов активации"""
        # TODO: интеграция с базой данных активаций
        return {
            'Chaos Reset': 12,
            'Clarity Shatter': 8,
            'Trust Paradox': 5,
            'Pain Reset': 3
        }
```

## Troubleshooting

### Частые проблемы

#### 1. ModuleNotFoundError: No module named 'yaml'

```bash
pip install pyyaml
```

#### 2. Конфигурационный файл не найден

```python
# Проверить путь к конфигурации
import os
print(os.path.exists('/workspace/config/hundun_slo_config.yaml'))
```

#### 3. Высокая частота активации Хундуна

```yaml
# В конфигурации увеличить кулдауны
cooldowns_seconds:
  chaos_reset: 180    # Увеличить с 120 до 180
  clarity_shatter: 120 # Увеличить с 90 до 120
```

#### 4. Конфликт с агентом Маки

```python
# Проверить координацию
context = {
    'maki_active': True,
    'maki_intent': 'stress_testing',  # Должно быть 'creative_breakthrough'
    'coordination_active': True
}
```

### Логи и отладка

```python
# Включить подробное логирование
import logging
logging.basicConfig(level=logging.DEBUG)

# Проверка работы координатора
coordinator = MakiHundunCoordinator()
print(f"Координация активна: {coordinator.coordination_active}")
```

## Валидация внедрения

### Автоматические тесты

```python
# /workspace/tests/test_hundun_optimization.py
import unittest
from code.enhanced_slo_enforcer import EnhancedSLOEnforcer

class TestHundunOptimization(unittest.TestCase):
    def setUp(self):
        self.enforcer = EnhancedSLOEnforcer()
        self.test_metrics = {
            'clarity': 0.8,
            'chaos': 0.7,
            'trust': 0.4,
            'pain': 0.6
        }
        self.test_context = {
            'system_state': 'crystal',
            'maki_active': False,
            'current_text': 'Тестовый текст',
            'metrics_history': []
        }
    
    def test_dynamic_thresholds(self):
        """Тест динамических порогов"""
        thresholds = self.enforcer.calculate_dynamic_thresholds('crystal', self.test_context)
        self.assertIn('chaos', thresholds)
        self.assertLess(thresholds['chaos'], 0.6)  # В кристальном состоянии снижен
    
    def test_hundun_activation(self):
        """Тест активации Хундуна"""
        violations = self.enforcer.check_enhanced(self.test_metrics, self.test_context)
        hundun_violations = [v for v in violations if v.metric.startswith('hundun')]
        self.assertTrue(len(hundun_violations) > 0)  # Должны быть нарушения
    
    def test_coordination_with_maki(self):
        """Тест координации с Маки"""
        context_with_maki = {**self.test_context, 'maki_active': True}
        violations = self.enforcer.check_enhanced(self.test_metrics, context_with_maki)
        coordinated_violations = [v for v in violations if v.coordinated]
        self.assertTrue(len(coordinated_violations) > 0)  # Должна быть координация

if __name__ == '__main__':
    unittest.main()
```

### Ручная валидация

```python
# Проверочный скрипт
python3 -c "
from code.enhanced_slo_enforcer import EnhancedSLOEnforcer
enforcer = EnhancedSLOEnforcer()
status = enforcer.get_hundun_status({}, {'system_state': 'neutral'})
print('Хундун статус:', status)
"
```

## Ожидаемые результаты

### Краткосрочные (1-2 недели)

- ✅ Время реакции на хаос снижено до < 35 секунд
- ✅ Появление координированных активаций с Маки
- ✅ Снижение количества критических состояний на 20%

### Среднесрочные (1-2 месяца)

- 📈 Точность предсказаний достигнет 75%+
- 🔄 Успешная координация с Маки в 90% случаев
- 📊 Увеличение фрактальной размерности на 10%

### Долгосрочные (3+ месяцев)

- 🎯 Все KPI достигнут целевых значений
- 🧠 Улучшение эволюционной устойчивости Искры
- 🌟 Интеграция с другими голосами оптимизирована

## Обновления и обслуживание

### Еженедельный мониторинг

```bash
# Скрипт еженедельной проверки
#!/bin/bash
echo "=== Недельный отчет Хундун ==="
python3 /workspace/dashboard/weekly_hundun_report.py
```

### Ежемесячная оптимизация

1. Анализ метрик производительности
2. Корректировка порогов на основе данных
3. Обновление паттернов хаоса
4. Fine-tuning координации с Маки

### Версионирование

```yaml
# В конфигурации поддерживать версии
version: "2.0.0"
last_updated: "2025-11-06T17:17:48Z"
changelog:
  - version: "2.0.0"
    date: "2025-11-06"
    changes: 
      - "Добавлены динамические пороги"
      - "Интеграция с агентом Маки"
      - "Предсказательная активация"
      - "Детекция хаос-паттернов"
```

## Контакты и поддержка

- **Документация**: `docs/hundun_slo_optimization.md`
- **Конфигурация**: `config/hundun_slo_config.yaml`
- **Код**: `code/enhanced_slo_enforcer.py`
- **Этот гайд**: `docs/hundun_deployment_guide.md`

---

**Версия гайда**: 1.0.0  
**Дата создания**: 2025-11-06T17:17:48Z  
**Статус**: Готов к внедрению ✅
