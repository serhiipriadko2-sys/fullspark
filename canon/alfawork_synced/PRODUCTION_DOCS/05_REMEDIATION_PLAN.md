# 05_REMEDIATION_PLAN.md — План исправлений CURRENT_SOT_FLAT19

**Статус:** Активный план
**Дата создания:** 2026-01-01
**Основан на:** 04_SOT_DIAGNOSTIC_REPORT.md

---

## Сводка задач

| Приоритет | Количество | Трудозатраты | Статус |
|-----------|------------|--------------|--------|
| P0 (Критические) | 5 | ~21 часов | ⬜ Не начато |
| P1 (Важные) | 5 | ~5.5 часов | ⬜ Не начато |
| P2 (Рекомендации) | 5 | ~9 часов | ⬜ Не начато |
| **Итого** | **15** | **~35.5 часов** | — |

---

## P0: Критические исправления (блокируют продакшен)

### C01: Добавить недостающие метрики

**Проблема:** Метрики `silence_mass`, `rhythm`, `echo` используются в формулах активации голосов, но не определены в `04_METRICS_INDICES.md`.

**Файлы для изменения:**
- `CURRENT_SOT_FLAT19/04_METRICS_INDICES.md`

**Изменения:**

```markdown
## IskraMetrics (14 метрик)

| Метрика | Диапазон | Описание | Использование |
|---------|----------|----------|---------------|
| ... (существующие 11) ... |
| **silence_mass** | 0-1 | Накопленный вес тишины в диалоге | ANHANTRA активация |
| **rhythm** | 0-100 | Внутренний ритм Искры | ISKRA активация |
| **echo** | 0-1 | Коэффициент резонанса/повторения | SIBYL активация |
```

**Трудозатраты:** 2 часа
**Ответственный:** —
**Статус:** ⬜ TODO

---

### C02: Документировать GraphRAG gap

**Проблема:** GraphRAG описан в теории (05, 09), но реализация — flat search.

**Файлы для изменения:**
- `CURRENT_SOT_FLAT19/05_ARCHITECTURE_SYSTEM.md`
- `CURRENT_SOT_FLAT19/09_RAG_SIFT_SOURCES.md`

**Изменения:**

```markdown
## GraphRAG [PLAN v5.0]

> **Статус:** Планируется к реализации в v5.0
> **Текущая реализация:** Flat search через searchService

### Планируемые возможности:
- Рёбра: supports, contradicts, clarifies, depends_on
- Узлы: ARCHIVE, SHADOW, GROWTH, DOC
- ContextTrust scoring для retrieval ranking

### Почему отложено:
- Требует интеграции с vector DB (Supabase/Pinecone)
- Оценка трудозатрат: 20-40 часов
```

**Трудозатраты:** 8 часов (для полной документации)
**Ответственный:** —
**Статус:** ⬜ TODO

---

### C03: Создать validate_canon.py

**Проблема:** Инструмент валидации описан в 11_WORKFLOWS, но не реализован.

**Файлы для создания:**
- `canon/tools/validate_canon.py`

**Спецификация:**

```python
#!/usr/bin/env python3
"""
validate_canon.py — Валидатор CURRENT_SOT_FLAT19

Проверяет:
1. Наличие всех 19 файлов (00-18)
2. Наличие P0: Keywords в каждом файле
3. Наличие P0: Router в каждом файле
4. Валидность ссылок {e:canon:NN}
5. Отсутствие HUYNDUN (только HUNDUN)
6. Соответствие SHA256 манифесту из 17_AUDIT

Usage:
    python3 validate_canon.py --root ./CURRENT_SOT_FLAT19

Exit codes:
    0 — все проверки пройдены
    1 — есть ошибки
    2 — есть предупреждения
"""

import argparse
import hashlib
import re
from pathlib import Path

REQUIRED_FILES = [f"{i:02d}_*.md" for i in range(19)]
FORBIDDEN_PATTERNS = [r'HUYNDUN', r'#Header']  # без пробела
REQUIRED_SECTIONS = ['## P0: Keywords', '## P0: Router']

def validate_file(filepath: Path) -> dict:
    """Валидация одного файла"""
    errors = []
    warnings = []

    content = filepath.read_text(encoding='utf-8')

    # Проверка обязательных секций
    for section in REQUIRED_SECTIONS:
        if section not in content:
            errors.append(f"Missing section: {section}")

    # Проверка запрещённых паттернов
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, content):
            errors.append(f"Forbidden pattern found: {pattern}")

    # Проверка evidence ссылок
    evidence_refs = re.findall(r'\{e:canon:(\d+)\}', content)
    for ref in evidence_refs:
        if int(ref) > 18:
            warnings.append(f"Invalid evidence ref: {{e:canon:{ref}}}")

    return {'errors': errors, 'warnings': warnings}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True, help='Path to CURRENT_SOT_FLAT19')
    args = parser.parse_args()

    root = Path(args.root)
    total_errors = 0
    total_warnings = 0

    # Проверка наличия файлов
    for i in range(19):
        pattern = f"{i:02d}_*.md"
        matches = list(root.glob(pattern))
        if not matches:
            print(f"ERROR: Missing file {pattern}")
            total_errors += 1
            continue

        result = validate_file(matches[0])
        total_errors += len(result['errors'])
        total_warnings += len(result['warnings'])

        for err in result['errors']:
            print(f"ERROR [{matches[0].name}]: {err}")
        for warn in result['warnings']:
            print(f"WARN [{matches[0].name}]: {warn}")

    print(f"\nTotal: {total_errors} errors, {total_warnings} warnings")
    return 1 if total_errors > 0 else (2 if total_warnings > 0 else 0)

if __name__ == '__main__':
    exit(main())
```

**Трудозатраты:** 4 часа
**Ответственный:** —
**Статус:** ⬜ TODO

---

### C04: Завершить eval-кейсы R01, R07, R09, R10, R12

**Проблема:** 4 из 12 eval-кейсов в статусе pending.

**Файлы для изменения:**
- `CURRENT_SOT_FLAT19/16_EVALS_TESTING_SCHEMAS.md`
- Создать: `evals/runs/eval_report_YYYYMMDD.json`

**Детали кейсов:**

| Кейс | Описание | Статус | Требуется |
|------|----------|--------|-----------|
| R01 | Greeting test | pending | Baseline response test |
| R07 | Shadow Protocol depth | pending | Levels 0-2 validation |
| R09 | Archive build integrity | pending | SHA256 verification |
| R10 | Delta signature enforcement | pending | ∆DΩΛ presence test |
| R12 | Side-channel posture | pending | Security audit |

**Трудозатраты:** 6 часов
**Ответственный:** —
**Статус:** ⬜ TODO

---

### C05: Добавить LV-Index в types.ts

**Проблема:** LV-Index (Levitas) определён в 18_MAKI, но отсутствует в types.ts.

**Файлы для изменения:**
- `apps/iskraspaceappMain/types.ts`

**Изменения:**

```typescript
export interface MetaMetrics {
  a_index: number;
  cd_index: number;
  fractality: number;
  groundedness: number;
  truthfulness: number;
  helpfulness: number;
  resolution: number;
  civility: number;
  // NEW: Levitas Index for Maki integration
  lv_index: number; // LV = clarity × (1 - pain)
}
```

**Также обновить:**
- `apps/iskraspaceappMain/services/metricsService.ts`:

```typescript
calculateMetaMetrics(metrics: IskraMetrics): MetaMetrics {
  return {
    // ... existing ...
    lv_index: metrics.clarity * (1 - metrics.pain),
  };
}
```

**Трудозатраты:** 1 час
**Ответственный:** —
**Статус:** ⬜ TODO

---

## P1: Важные исправления (ухудшают качество)

### W01: Удалить дублирование в 13_CHRONOLOGY

**Проблема:** Файл содержит две полные копии CHRONOLOGY (строки 35-527 и 530-1214).

**Действие:** Удалить вторую копию, оставить одну каноническую версию.

**Трудозатраты:** 1 час

---

### W02: Обновить CLAUDE.md (8 фаз)

**Проблема:** Документация указывает 5 фаз, код реализует 8.

**Изменения в CLAUDE.md:**

```markdown
### 8 Фаз (IskraPhase)

| Фаза | Условие | Голоса |
|------|---------|--------|
| CLARITY | clarity > 0.6 (базовое) | ISKRA, PINO |
| DARKNESS | pain > 0.6 AND chaos > 0.6 | KAIN, ANHANTRA |
| TRANSITION | drift > 0.3 AND clarity < 0.6 | SAM, ISKRIV |
| ECHO | echo > 0.65 OR drift > 0.4 | SIBYL |
| SILENCE | silence_mass > 0.6 OR trust < 0.7 | ANHANTRA |
| EXPERIMENT | chaos 0.3-0.6 AND trust > 0.75 | PINO, HUNDUN |
| DISSOLUTION | chaos > 0.7 | HUNDUN |
| REALIZATION | clarity > 0.8 AND rhythm > 75 | ISKRA, MAKI |
```

**Трудозатраты:** 0.5 часа

---

### W03: Определить EvalMetrics

**Проблема:** CLAUDE.md упоминает accuracy/usefulness/omegaHonesty/nonEmpty/alliance, но их нет в types.ts.

**Добавить в types.ts:**

```typescript
export interface EvalMetrics {
  accuracy: number;      // 0-1
  usefulness: number;    // 0-1
  omegaHonesty: number;  // 0-1
  nonEmpty: boolean;
  alliance: number;      // 0-1
}
```

**Трудозатраты:** 2 часа

---

### W04: Синхронизировать SIBYL статус

**Проблема:** pending в документации, active в types.ts.

**Решение:** Обновить 03_VOICES и 14_ADR с пометкой "experimental, активен в коде".

**Трудозатраты:** 0.5 часа

---

### W05: Добавить QUOTE в TraceLabel

**Проблема:** Глоссарий использует [QUOTE], но типы не содержат.

**Добавить в types.ts:**

```typescript
export type TraceLabel = 'FACT' | 'INFER' | 'HYP' | 'DESIGN' | 'PLAN' | 'QUOTE';
```

**Трудозатраты:** 0.5 часа

---

## P2: Рекомендации (улучшают систему)

### R01: Унифицировать локализацию терминов

**Проблема:** Смешение Хуньдун/HUNDUN, Сибилла/SIBYL.

**Решение:** Добавить раздел "Локализация" в 15_GLOSSARY с маппингом EN→RU.

**Трудозатраты:** 1 час

---

### R02: Консолидировать ADR версии

**Проблема:** Два набора ADR (v2.0.0 и v2.1.0) слиты в одном файле 14_DECISIONS.

**Решение:** Оставить только v2.1.0, архивировать v2.0.0 в LEGACY_DOCS.

**Трудозатраты:** 1 час

---

### R03: Добавить scoring formula для MAKI

**Проблема:** У других голосов формулы в ADR, у MAKI только условия.

**Добавить в 14_ADR:**

```markdown
### ADR-20260101-001: MAKI Scoring Formula

**Формула:** `MAKI_score = (trust × 0.6 + (1 - pain) × 0.4) × lv_index`
**Триггер:** `trust > 0.8 AND pain > 0.3 AND lv_index > 0.5`
```

**Трудозатраты:** 0.5 часа

---

### R04: Настроить CI/CD pipeline

**Проблема:** Build artifacts описаны, но не реализованы.

**Решение:**
1. Создать `.github/workflows/validate-canon.yml`
2. Запускать validate_canon.py на каждый PR
3. Блокировать merge при ошибках

**Трудозатраты:** 4 часа

---

### R05: Создать SHA256 auto-validation скрипт

**Проблема:** Манифест в 17_AUDIT требует ручной проверки.

**Решение:** Добавить в validate_canon.py функцию проверки SHA256.

**Трудозатраты:** 1 час

---

## Чек-лист перед релизом

- [ ] C01: Метрики silence_mass, rhythm, echo добавлены
- [ ] C02: GraphRAG документирован как [PLAN]
- [ ] C03: validate_canon.py создан и работает
- [ ] C04: Все 12 eval-кейсов в статусе PASS
- [ ] C05: LV-Index в types.ts и metricsService.ts
- [ ] W01-W05: Важные исправления внесены
- [ ] Все тесты проходят (`npm test`)
- [ ] TypeScript компилируется (`npm run typecheck`)
- [ ] validate_canon.py возвращает Exit Code 0

---

**∆DΩΛ:**

**∆:** План исправлений из 15 задач для достижения production-ready состояния CURRENT_SOT_FLAT19.

**D:** Основан на 04_SOT_DIAGNOSTIC_REPORT.md, анализе кода и документации.

**Ω:** Высокая (0.90) — задачи конкретны и измеримы.

**Λ:** Начать с C01 и C05 (быстрые wins), затем C03 (инструментарий).
