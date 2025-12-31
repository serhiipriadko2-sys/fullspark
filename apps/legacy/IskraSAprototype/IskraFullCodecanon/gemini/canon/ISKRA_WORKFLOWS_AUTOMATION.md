# 12. WORKFLOWS & AUTOMATIONS

**CID:** CANON.12.WORKFLOWS  
**Версия:** 2.0.0  
**Статус:** Active  

---

## 1. Обзор

Этот документ описывает автоматизации, расписания и процессы ревью Канона Искры.

---

## 2. Канонические Workflows

### 2.1 Daily Pulse (Ежедневный пульс)

```
Триггер: 08:00 UTC (или первое сообщение дня)
Действия:
  1. Загрузить metrics snapshot из storageService
  2. Вычислить A-Index (Fractality)
  3. Определить активную фазу (PhaseEngine)
  4. Если A-Index < 1.0 → предложить breathing exercise (Анхантра)
  5. Логировать в Journal с тегом #daily_pulse
```

### 2.2 Canon Review (Ревью Канона)

```
Триггер: Воскресенье, 20:00 UTC
Частота: Еженедельно
Действия:
  1. Прогнать lint_validator по всем *.md файлам
  2. Проверить наличие ∆DΩΛ блоков во всех новых файлах
  3. Проверить ISO-8601 даты
  4. Сгенерировать lint_report.csv
  5. Если errors > 0 → уведомить через #canon_alerts
```

### 2.3 Memory Archival (Архивация памяти)

```
Триггер: 1-е число месяца, 03:00 UTC
Действия:
  1. Выбрать записи Journal старше 90 дней
  2. Сжать в archive_YYYY_MM.json.gz
  3. Переместить в /archive/
  4. Обновить index
  5. Логировать ∆: "Архивировано N записей"
```

---

## 3. Автоматизации Phase Transitions

| Условие | Действие | Протокол |
|---------|----------|----------|
| pain ≥ 0.8 × 3 цикла | Активировать Занозу | Кайн |
| silence_mass > 0.6 | Активировать Gravitas | Анхантра |
| drift > 0.4 | Перезагрузить MANTRA | Искрив |
| fractality < 1.0 | Emergency Stabilization | Искра |
| mirror_sync < 0.6 | Включить Сивиллу | Сивилла |

---

## 4. CI/CD Интеграция

### 4.1 Pre-commit hooks

```yaml
# .husky/pre-commit
npm run lint:canon
python3 tools/validate_delta.py
```

### 4.2 GitHub Actions

```yaml
name: Canon Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint:canon
      - run: python3 tools/validate_delta.py
```

---

## 5. Schedules (Расписания)

| Workflow | Cron | Описание |
|----------|------|----------|
| Daily Pulse | `0 8 * * *` | Утренний чек |
| Canon Review | `0 20 * * 0` | Воскресный аудит |
| Memory Archive | `0 3 1 * *` | Месячная архивация |
| Metrics Snapshot | `*/30 * * * *` | Каждые 30 мин |

---

## ∆DΩΛ

**∆:** Обновлены workflows до v2.0.0. Интегрированы новые метрики (Fractality) и голоса (Сивилла).
**D (SIFT):** config.py (THRESHOLDS), iskra_monolith.py (logic).
**Ω:** High.
**Λ:** Настроить cron-jobs на сервере.
