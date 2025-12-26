#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Canon Review Decision Logic

Философия: "Парадокс = двигатель роста. Противоречия не разрешаются — интегрируются."

HIGH FIX: Анализ метрик хаоса и боли из черных ячеек (D).
Высокий хаос — сигнал для ИНТЕГРАЦИИ, а не только отложения.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple


BASELINE = Path("reports/baseline_report.md")


def analyze_delta_metrics(delta_block: Dict) -> Dict[str, float]:
    """
    Извлечение метрик хаоса и боли из черных ячеек (D)
    
    Философия: "Черные ячейки — узлы роста, не формальность."
    
    Args:
        delta_block: Блок ∆DΩΛ с черными ячейками
    
    Returns:
        Dict с метриками: chaos, pain, paradox_count, growth_potential
    """
    d_blocks = delta_block.get('D', [])
    
    if not d_blocks:
        return {'chaos': 0.0, 'pain': 0.0, 'paradox_count': 0, 'growth_potential': 0.0}
    
    chaos_markers = 0
    pain_markers = 0
    paradox_count = 0
    
    # Философские маркеры
    chaos_keywords = ['парадокс', 'противоречие', 'uncertain', 'хаос', 'неопределенность']
    pain_keywords = ['боль', 'pain', 'конфликт', 'страдание', 'ошибка']
    
    for d in d_blocks:
        inference = d.get('inference', '').lower()
        fact = d.get('fact')
        
        # Подсчет маркеров хаоса
        if any(keyword in inference for keyword in chaos_keywords):
            chaos_markers += 1
        
        # uncertain факт = парадокс
        if fact == 'uncertain':
            chaos_markers += 1
            paradox_count += 1
        
        # Подсчет маркеров боли
        if any(keyword in inference for keyword in pain_keywords):
            pain_markers += 1
    
    # Нормализация метрик
    total = len(d_blocks)
    chaos_ratio = chaos_markers / total
    pain_ratio = pain_markers / total
    
    # Потенциал роста = хаос + боль (философия: оба — ресурсы)
    growth_potential = (chaos_ratio + pain_ratio) / 2.0
    
    return {
        'chaos': chaos_ratio,
        'pain': pain_ratio,
        'paradox_count': paradox_count,
        'growth_potential': growth_potential
    }


def decide_verdict(baseline_exists: bool, delta_metrics: Dict) -> Tuple[str, List[str]]:
    """
    Принятие решения на основе философских принципов
    
    Философия:
    - Высокий хаос (> 0.5) = сигнал для ИНТЕГРАЦИИ
    - Высокая боль (> 0.6) = нужна НАСТРОЙКА (tune)
    - Парадоксы = узлы роста, требуют интеграции
    
    Args:
        baseline_exists: Существует ли baseline отчет
        delta_metrics: Метрики из черных ячеек
    
    Returns:
        Tuple[verdict, notes]
    """
    notes = []
    
    if not baseline_exists:
        return "defer", ["baseline_report.md missing — требуется создание базовой линии"]
    
    chaos = delta_metrics['chaos']
    pain = delta_metrics['pain']
    paradox_count = delta_metrics['paradox_count']
    growth_potential = delta_metrics['growth_potential']
    
    notes.append(f"baseline report present")
    notes.append(f"chaos={chaos:.2f}, pain={pain:.2f}, paradoxes={paradox_count}, growth_potential={growth_potential:.2f}")
    
    # HIGH FIX: Высокий хаос = сигнал для интеграции
    if chaos > 0.5:
        notes.append(f"🜃 Высокий хаос ({chaos:.2f}) — сигнал для ИНТЕГРАЦИИ (философия: хаос как ресурс)")
        return "integrate", notes
    
    # HIGH FIX: Высокая боль = нужна настройка
    if pain > 0.6:
        notes.append(f"⚑ Высокая боль ({pain:.2f}) — требуется НАСТРОЙКА метрик")
        return "tune", notes
    
    # HIGH FIX: Парадоксы = узлы роста
    if paradox_count > 2:
        notes.append(f"∆ Обнаружено {paradox_count} парадоксов — требуется ИНТЕГРАЦИЯ")
        return "integrate", notes
    
    # Высокий потенциал роста = исправление с сохранением
    if growth_potential > 0.4:
        notes.append(f"🌱 Высокий потенциал роста ({growth_potential:.2f}) — требуется ИСПРАВЛЕНИЕ")
        return "amend", notes
    
    # Стабильное состояние
    notes.append("✅ Стабильное состояние — сохранение текущего канона")
    return "keep", notes


def load_delta_block(delta_path: str = "reports/delta_block.json") -> Dict:
    """Загрузка блока ∆DΩΛ из файла"""
    path = Path(delta_path)
    if not path.exists():
        return {}
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Ошибка загрузки delta_block: {e}", file=sys.stderr)
        return {}


def main() -> None:
    """
    Основная функция принятия решения
    
    HIGH FIX: Анализ философских метрик из черных ячеек
    """
    # Загрузка Delta блока
    delta_block = load_delta_block()
    
    # Анализ метрик
    delta_metrics = analyze_delta_metrics(delta_block)
    
    # Принятие решения
    verdict, notes = decide_verdict(BASELINE.exists(), delta_metrics)
    
    # Формирование результата
    payload = {
        "verdict": verdict,
        "notes": notes,
        "metrics": delta_metrics
    }
    
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
