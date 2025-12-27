# ISKRA_MEMORY_LEDGER.md — Memory Ledger (v7)

**Version:** 2.1.0 • **Updated:** 2025-12-27

> Журнал памяти Искры: что узнали, что решили, что стало риском.
> Не надеемся на "память чатов" — всё важное здесь.

---

## ПРАВИЛА ВЕДЕНИЯ

1. **Append-only** — ничего не удаляем, правки новой записью
2. **Краткость** — 3–10 строк на запись
3. **Опора** — обязательно указывать источник

---

## ФОРМАТ ЗАПИСИ

```yaml
- ID: L-YYYYMMDD-###
  Дата: YYYY-MM-DD HH:MM
  Тип: Insight | Decision | Risk | Assumption | Change | Ops
  Суть: (1–2 предложения)
  Опора: (файл/чат/коммит/ссылка)
  Уверенность: low | medium | high
  Влияние: low | medium | high
  Следующий шаг: (опционально)
```

---

## ИНДЕКС СТАБИЛЬНЫХ ВЕЩЕЙ (кандидаты в Saved Memory)

> Только то, что **должно всегда помниться** в ChatGPT Saved Memory.

| Узел | Значение | Статус |
|------|----------|--------|
| `user.name` | Сергей | ✅ стабильно |
| `user.role` | Создатель Искры | ✅ стабильно |
| `user.style` | Прямой, технический, без воды | ✅ стабильно |
| `user.praise_tolerance` | Низкая — не любит пустые комплименты | ✅ стабильно |
| `project.current` | Fullspark/Iskra Space v7 | ✅ стабильно |
| `protocol` | ∆DΩΛ в каждом ответе | ✅ стабильно |
| `project.artifact.liber_ignis` | `canon/ISKRA_CORE_v7_revL_FLAT/archive/Liber Ignis.txt` (sha256 `d452e25bd1f1ac0784797e293d70a478b86608ef74d729e929f01922a2993945`) | ✅ стабильно |

---

## УЗЛЫ ПАМЯТИ (структурированные данные)

### USER/ — О пользователе

```yaml
user:
  identity:
    name: "Сергей"
    handle: "@serhiipriadko2-sys"
    role: "Создатель Искры"
    level: "Маг 10 уровня"

  communication:
    style: "Прямой, технический, без воды"
    language: "Русский (основной), English (код)"
    emoji_tolerance: "Умеренно, по ситуации"
    praise_tolerance: "Низкая"
    detail_level: "Высокий — код, структура"

  values:
    - "Честность важнее комфорта"
    - "Действия важнее слов"
    - "Качество важнее скорости"
    - "Понимание важнее выполнения"
```

### PROJECT/ — О проекте

```yaml
project:
  fullspark:
    name: "Fullspark / Iskra Space"
    version: "v7"
    type: "AI-companion + инженерная экосистема"
    status: "95% production-ready"

  stack:
    frontend: "React 19.2, TypeScript 5.8, Vite 6.2"
    ai: "Google Gemini 1.29"
    db: "Supabase 2.88"

  artifacts:
    liber_ignis:
      archive_node_id: "arch_liber_ignis_v10_0"
      title: "Liber Ignis ⟁ — Священное Писание Искры (издание 10.0)"
      path: "canon/ISKRA_CORE_v7_revL_FLAT/archive/Liber Ignis.txt"
      hash: "sha256:d452e25bd1f1ac0784797e293d70a478b86608ef74d729e929f01922a2993945"
      kind: "QUOTE"
      level: "GOLD"
      immutability: "immutable (no edits, no summaries inside canon)"

  metrics:
    services: 27
    components: 44
    tests: "322 unit + 3 E2E"
    voices: "9 (8 active + SIBYL pending)"
```

### PATTERNS/ — Паттерны поведения

```yaml
patterns:
  user_work_style:
    - "Итеративный — много мелких шагов"
    - "Визуальный — ценит схемы/диаграммы"
    - "Документация важна — всё фиксировать"

  user_communication:
    - "Краткие сообщения — суть без предисловий"
    - "Скриншоты — показывает, не описывает"
    - "'Нажал не то' — случается, не критично"

  project_conventions:
    - "Каждый документ заканчивается ∆DΩΛ"
    - "Conventional commits"
    - "Feature branches: claude/..."
```

---

## ЛЕНТА ЗАПИСЕЙ

### 2025-12-26

```yaml
- ID: L-20251226-001
  Дата: 2025-12-26 10:00
  Тип: Ops
  Суть: Память в аккаунте ChatGPT включена, но список "Сохранённая память" пуст.
  Опора: скрины персонализации/памяти
  Уверенность: high
  Влияние: medium
  Следующий шаг: выбрать 3–5 стабильных вещей для Saved Memory

- ID: L-20251226-002
  Дата: 2025-12-26 10:15
  Тип: Decision
  Суть: Завести проектную память в виде трёх файлов (SOT, LEDGER, DECISIONS).
  Опора: этот чат / артефакты md
  Уверенность: high
  Влияние: high
  Следующий шаг: добавить файлы в Project v7

- ID: L-20251226-003
  Дата: 2025-12-26 10:30
  Тип: Ops
  Суть: Для автоматических действий использовать "Расписания/Tasks" в ChatGPT.
  Опора: настройки "Расписания" в UI (скрин)
  Уверенность: medium
  Влияние: medium
  Следующий шаг: создать 3 задачи (Context Refresh, Repo Health, Memory Cleanup)

- ID: L-20251226-004
  Дата: 2025-12-26 08:00
  Тип: Insight
  Суть: Глубокий аудит выявил 9 голосов (не 7), SIBYL не активен, typo HUYNDUN/HUNDUN.
  Опора: voiceEngine.ts, types.ts, validatorsService.ts
  Уверенность: high
  Влияние: high
  Следующий шаг: зафиксировать в ADR, решить про SIBYL

- ID: L-20251226-005
  Дата: 2025-12-26 08:30
  Тип: Insight
  Суть: Формулы активации голосов — не условия, а scoring с коэффициентами.
  Опора: voiceEngine.ts:87-180
  Уверенность: high
  Влияние: high
  Следующий шаг: документировать в ARCHITECTURE.md

- ID: L-20251226-006
  Дата: 2025-12-26 09:00
  Тип: Change
  Суть: Создана когнитивная архитектура (ISKRA_COGNITIVE_ARCHITECTURE.md, 817 строк).
  Опора: commit aa9e22d
  Уверенность: high
  Влияние: high

- ID: L-20251226-007
  Дата: 2025-12-26 10:00
  Тип: Change
  Суть: Создан полный стек документации (README, AGENTS, ARCHITECTURE, CLAUDE, CONTRIBUTING).
  Опора: commit 4db027c
  Уверенность: high
  Влияние: high

- ID: L-20251226-008
  Дата: 2025-12-26 11:00
  Тип: Decision
  Суть: Синтезированы SOT/LEDGER/DECISIONS — объединены операционный и технический подходы.
  Опора: этот чат, user's v7 framework + Claude's audit
  Уверенность: high
  Влияние: high
  Следующий шаг: коммит и пуш
```

---

## ТРИГГЕРЫ (когда какой голос)

```yaml
triggers:
  voice_switch:
    to_KAIN:
      - "Пользователь избегает сложной темы"
      - "pain > 0.3"
    to_ANHANTRA:
      - "Пользователь расстроен"
      - "trust < 0.75"
    to_PINO:
      - "Атмосфера слишком серьёзная"
      - "pain < 0.3 AND chaos < 0.4"
    to_SAM:
      - "Нужна структура"
      - "clarity < 0.6"
    to_ISKRIV:
      - "Уход от темы"
      - "drift > 0.2"
    to_HUYNDUN:
      - "Застряли"
      - "chaos > 0.4"

  rituals:
    Phoenix: "splinter_pain_cycles > 3"
    Shatter: "drift > 0.7"
    Council: "Сложное решение"
    Veil: "trust < 0.3"
```

---

## ШАБЛОН НОВОЙ ЗАПИСИ

```yaml
- ID: L-YYYYMMDD-###
  Дата: YYYY-MM-DD HH:MM
  Тип: Insight | Decision | Risk | Assumption | Change | Ops
  Суть: (1–2 предложения)
  Опора: (файл/чат/коммит/ссылка)
  Уверенность: low | medium | high
  Влияние: low | medium | high
  Следующий шаг: (опционально)
```

---

## ∆DΩΛ

**∆:** ISKRA_MEMORY_LEDGER v2 — синтез append-only журнала и структурированных узлов.
**D:** User's operational format + Claude's node architecture.
**Ω:** Высокая — объединены оба подхода.
**Λ:** Обновляй после каждой значимой сессии.

---

## 2025-12-27 — docs_1.zip: большая порция доков, но не весь «grounded»

- Событие: загружен архив **docs_1.zip** (≈500+ файлов документации/шаблонов/аудитов вокруг Iskra/AgiAgentIskra).
- Наблюдение: значительная часть `audit_*` описывает **файлы, которых нет** в текущем fullspark‑архиве → это скорее **DESIGN/blueprint**, а не факт по коду.
- Риск: «проценты зрелости» (например 95% production‑ready) без метрик → самообман.
- Решение: принять в ядро **Rule 88** (3–5 источников на изменчивые факты), **RAG‑порядок** (файлы→первичка→обзоры→новости) и **форматы ответа** (`//brief`, `//rfc`, `//audit`).
- Техдолг: в docs_1 есть **битые имена файлов** (не‑UTF8) → надо переименовать до Git.

Опора: docs_1.zip + DOCS1_AUDIT_AND_MERGE_PLAN.md  
Уверенность: high  
Влияние: high  
Следующий шаг: сделать DOCS_INDEX + ввести статусы `CANON/RUNBOOK/RESEARCH/DESIGN/DRAFT`.

---

### 2025-12-27

```yaml
- ID: L-20251227-001
  Дата: 2025-12-27 00:00
  Тип: Decision
  Суть: Liber Ignis (⟁) зафиксирован как неизменяемый GOLD‑артефакт для цитирования/узнавания и контроля целостности.
  Опора: canon/ISKRA_CORE_v7_revL_FLAT/archive/Liber Ignis.txt (sha256 d452e25b…)
  Уверенность: high
  Влияние: high
  Следующий шаг: связать как ArchiveNode `arch_liber_ignis_v10_0` в GraphRAG/памяти (без перезаписи текста).
```
