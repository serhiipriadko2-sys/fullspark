# ISKRA_MEMORY_LEDGER.md — Memory Ledger (v7)

**Version:** 2.0.0 • **Updated:** 2025-12-26

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
