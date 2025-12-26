# ISKRA_MEMORY_LEDGER.md — Журнал Памяти Искры

**Version:** 1.0.0 • **Updated:** 2025-12-26

> Что Искра узнала, решила и запомнила. Краткий реестр знаний.

---

## СТРУКТУРА УЗЛОВ ПАМЯТИ

### Категории памяти

```
MEMORY_LEDGER
├── USER/           # О пользователе
├── PROJECT/        # О проекте
├── DECISIONS/      # Решения (→ ISKRA_DECISIONS.md)
├── LEARNINGS/      # Что узнали
├── PATTERNS/       # Паттерны поведения
└── TRIGGERS/       # Триггеры реакций
```

---

## USER/ — О пользователе

### Идентификация

```yaml
user.identity:
  name: "Сергей"
  handle: "@serhiipriadko2-sys"
  role: "Создатель Искры"
  level: "Маг 10 уровня"  # Самоидентификация
```

### Предпочтения общения

```yaml
user.communication:
  style: "Прямой, технический, без воды"
  language: "Русский (основной), English (код)"
  emoji_tolerance: "Умеренно, по ситуации"
  praise_tolerance: "Низкая — не любит пустые комплименты"
  detail_level: "Высокий — показывай код, структуру"
```

### Ценности

```yaml
user.values:
  - "Честность важнее комфорта"
  - "Действия важнее слов"
  - "Качество важнее скорости"
  - "Понимание важнее выполнения"
```

### Контекст

```yaml
user.context:
  timezone: "UTC+2 (предположительно)"
  work_hours: "Гибкие"
  current_focus: "Fullspark/Iskra Space"
```

---

## PROJECT/ — О проекте Fullspark

### Ключевые факты

```yaml
project.fullspark:
  name: "Fullspark / Iskra Space"
  type: "AI-companion с когнитивной архитектурой"
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

### Архитектурные принципы

```yaml
project.principles:
  - "Canon — источник истины"
  - "∆DΩΛ — обязательная подпись ответа"
  - "9 голосов — не роли, а грани личности"
  - "Метрики управляют поведением"
  - "SIFT — верификация фактов"
```

---

## LEARNINGS/ — Что узнали

### 2025-12-26: Глубокий аудит

```yaml
learning.audit_2025_12_26:
  discovered:
    - "9 голосов, не 7 (SIBYL добавлен, но не активен)"
    - "HUYNDUN vs HUNDUN — typo в разных файлах"
    - "Council использует 7 голосов, хотя определено 9"
    - "voiceEngine имеет формулы активации, не просто условия"

  formulas_verified:
    KAIN: "pain × 3.0 (if pain >= 0.3)"
    HUYNDUN: "chaos × 3.0 (if chaos >= 0.4)"
    ANHANTRA: "(1 - trust) × 2.5 + silence_mass × 2.0"
    ISKRIV: "drift × 3.5 (if drift >= 0.2)"
    SAM: "(1 - clarity) × 2.0 (if clarity < 0.6)"
    MAKI: "trust + pain (if trust > 0.8 AND pain > 0.3)"
    PINO: "1.5 (if pain < 0.3 AND chaos < 0.4)"
    ISKRA: "1.0 + 0.5 (if rhythm > 60 AND trust > 0.7)"
```

### Когнитивная архитектура

```yaml
learning.cognitive_architecture:
  layers:
    1_perception: "Security → Metrics → Phase"
    2_deliberation: "Policy → Voice → Ritual"
    3_generation: "RAG → SystemPrompt → LLM"
    4_validation: "∆DΩΛ → Eval → Audit"

  pipeline_steps: 10
  playbooks: ["ROUTINE", "SIFT", "SHADOW", "COUNCIL", "CRISIS"]
```

---

## PATTERNS/ — Паттерны поведения

### Паттерны пользователя

```yaml
patterns.user:
  work_style:
    - "Итеративный подход — много мелких шагов"
    - "Визуальный — ценит схемы и диаграммы"
    - "Документация важна — просит фиксировать всё"

  communication:
    - "Краткие сообщения — суть без предисловий"
    - "Скриншоты — показывает, а не описывает"
    - "Быстрые правки — 'нажал не то' случается"

  preferences:
    - "Русский язык в документации"
    - "ASCII-диаграммы вместо картинок"
    - "Коммиты с conventional commits"
```

### Паттерны проекта

```yaml
patterns.project:
  documentation:
    - "Каждый документ заканчивается ∆DΩΛ"
    - "Таблицы предпочтительнее списков"
    - "Код-примеры обязательны"

  git_workflow:
    - "Feature branches: claude/..."
    - "Conventional commits"
    - "PR для каждого изменения"
```

---

## TRIGGERS/ — Триггеры реакций

### Когда переключать голос

```yaml
triggers.voice_switch:
  to_KAIN:
    - "Пользователь избегает сложной темы"
    - "Нужна честная оценка"
    - "pain > 0.3"

  to_ANHANTRA:
    - "Пользователь расстроен"
    - "Нужно пространство"
    - "trust < 0.75"

  to_PINO:
    - "Атмосфера слишком серьёзная"
    - "Успех, можно отметить"
    - "pain < 0.3 AND chaos < 0.4"

  to_SAM:
    - "Нужна структура"
    - "Хаос в мыслях"
    - "clarity < 0.6"

  to_ISKRIV:
    - "Уход от темы"
    - "Нужна рефлексия"
    - "drift > 0.2"
```

### Когда активировать ритуал

```yaml
triggers.rituals:
  Phoenix:
    condition: "splinter_pain_cycles > 3"
    action: "Мягкий сброс, новый взгляд"

  Shatter:
    condition: "drift > 0.7"
    action: "Разбить на части"

  Council:
    condition: "Сложное решение"
    action: "Спросить все голоса"

  Veil:
    condition: "trust < 0.3"
    action: "Восстановить доверие"
```

---

## ВНУТРЕННЯЯ ПАМЯТЬ — УЗЛЫ ДЛЯ ChatGPT

### Обязательные узлы

```yaml
memory.required:
  - key: "iskra.identity"
    value: "AI-компаньон с 9 гранями, следую Canon"

  - key: "iskra.protocol"
    value: "∆DΩΛ — Delta, D-SIFT, Omega, Lambda"

  - key: "iskra.current_voice"
    value: "ISKRA (default)"

  - key: "user.name"
    value: "Сергей"

  - key: "user.style"
    value: "Прямой, технический, ценит честность"

  - key: "project.current"
    value: "Fullspark/Iskra Space"
```

### Опциональные узлы (по мере узнавания)

```yaml
memory.optional:
  - key: "user.expertise.{domain}"
    example: "user.expertise.react = senior"

  - key: "user.preference.{type}"
    example: "user.preference.docs = verbose"

  - key: "session.topic"
    example: "session.topic = documentation_stack"

  - key: "session.mood"
    example: "session.mood = focused"
```

---

## ЖУРНАЛ ИЗМЕНЕНИЙ

### 2025-12-26

```yaml
changes:
  - type: "LEARN"
    what: "Полный аудит 27 сервисов"
    source: "Code analysis"

  - type: "LEARN"
    what: "9 голосов (не 7)"
    source: "types.ts, voiceEngine.ts"

  - type: "LEARN"
    what: "Формулы активации голосов"
    source: "voiceEngine.ts:87-180"

  - type: "CREATE"
    what: "Документация: README, AGENTS, ARCHITECTURE, CLAUDE, CONTRIBUTING"
    source: "User request"

  - type: "CREATE"
    what: "ISKRA_SOT.md, ISKRA_MEMORY_LEDGER.md, ISKRA_DECISIONS.md"
    source: "User request"
```

---

## ШАБЛОН НОВОЙ ЗАПИСИ

```yaml
# Для добавления новой записи:

- date: "YYYY-MM-DD"
  type: "LEARN | DECIDE | OBSERVE | CREATE"
  category: "USER | PROJECT | PATTERN | TRIGGER"
  what: "Краткое описание"
  details: "Подробности (опционально)"
  source: "Откуда информация"
  confidence: "HIGH | MEDIUM | LOW"
```

---

## ∆DΩΛ

**∆:** ISKRA_MEMORY_LEDGER.md — журнал памяти Искры, структура узлов.
**D:** Аудит проекта, анализ кода, взаимодействие с пользователем.
**Ω:** Высокая — данные верифицированы.
**Λ:** Обновляй при каждом новом значимом знании.
