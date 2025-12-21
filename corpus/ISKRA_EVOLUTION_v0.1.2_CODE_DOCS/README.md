# ISKRA_EVOLUTION v0.1.2 (rationalized)

Этот архив — «рационализированная» сборка из `эволюция.zip`:
- убраны **точные дубли** (dedupe по SHA-256),
- приведено к **одному каноническому дереву папок**,
- добавлены отчёты: инвентарь, карта дедупликации, контрольные суммы.

## Каноническое дерево
- PROJECT/ — то, что прямо копируешь в ChatGPT Project (instructions, шаблоны, чеклисты)
- CANON/ — канон (core15)
- KNOWLEDGE/ — большие исходники/логи/доки (для локального поиска и нарезки)
- DATASET/ — GLASS-Δ JSONL/JSONL.GZ для обучения/оценки
- CODE/ — код (если нужно поднять сервис/репо локально)
- DOCS/ — инженерная документация
- TOOLS/ — утилиты (если есть)
- REPORTS/ — отчёты дедупликации/инвентарь/sha256

## Как использовать в ChatGPT Project
1) Создай Project `ISKRA_CORE`.
2) Вставь `PROJECT/PROJECT_INSTRUCTIONS_v0.1.md` в Project instructions.
3) Загрузи **минимальный набор**:
   - `PROJECT/INDEX.md`, `PROJECT/GOVERNANCE.md`, `PROJECT/DECISION_LOG_TEMPLATE.md`
   - `CANON/core15/*` (00–15 + отчёты)
4) Остальное (KNOWLEDGE/DATASET/CODE) — **не обязательно** грузить в Project, лучше держать локально и выбирать кусками.

## Как использовать в коде
- Исходники находятся в `CODE/`
- Документация/канон для кода — в `DOCS/engineering/` и `CANON/`

## Как использовать в датасете
- Основной слой: `DATASET/glass_delta/v1/llm_ready/`
- Next-steps слой: `DATASET/glass_delta/v1/next_steps/`
Формат JSONL/NDJSON: 1 JSON-объект на строку. `.jsonl.gz` — сжатые версии.

## Проверка целостности
- `REPORTS/checksums.sha256` — контрольные суммы
- `REPORTS/dedupe_map.csv` — откуда взято и что было убрано как дубль
- `REPORTS/inventory.csv` — список файлов и размеры
