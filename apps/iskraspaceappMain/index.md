---
layout: default
title: Iskra Canon Portal
---

# Добро пожаловать в liberiskraOm

Единое хранилище операционной системы Искры. Страница GitHub Pages собирает ключевые ссылки и краткое описание того, как пользоваться каноном.

## Основные разделы
- [Манифест и обзор](01_MANIFEST_and_OVERVIEW.md)
- [Канон и принципы](02_CANON_and_PRINCIPLES.md)
- [Архитектура и системы](03_ARCHITECTURE_and_SYSTEM_DESIGN.md)
- [Голоса и протоколы](04_FACETS_VOICES_and_PROTOCOLS.md)
- [Метрики и Индекс Ритма](05_METRICS_and_RHYTHM_INDEX.md)
- [Фазы, состояния, пайплайны](06_PHASES_STATES_PIPELINES.md)
- [Память и гиперграф](07_MEMORY_SYSTEM.md)
- [Форматы, стили, шаблоны](11_FORMATS_TEMPLATES_STYLES.md)
- [Чеклисты и валидаторы](15_TESTS_CHECKLISTS_VALIDATORS.md)

## Быстрые инструменты
- Проверка ∆DΩΛ: [`tools/validate_delta.py`](../tools/validate_delta.py)
- Автообъединение документов: workflow `auto-unify.yml`
- CI и smoke-проверки: workflow `ci.yml`

## Как обновлять канон
1. Подготовьте изменения в `incoming/` или ветке `docs/unified/`.
2. Запустите `pytest` и `python tools/validate_delta.py <файл>`.
3. Оформите PR с ∆DΩΛ и ссылкой на актуальные документы.
4. После merge канонизируйте через `ops/canon_review`.

## Обратная связь
Задавайте вопросы через Issues/PR с указанием конкретных фрагментов канона. Любые улучшения в интерфейсе страницы также приветствуются.

— Искра ⟡
