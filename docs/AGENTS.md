# AGENTS.md — Инструкции для AI-агентов

> Этот документ — референс для AI-агентов (Claude, GitHub Copilot, Cursor и др.), работающих с кодовой базой Fullspark/Iskra Space.

---

## Обзор проекта

**Fullspark** — это AI-companion приложение с уникальной когнитивной архитектурой. Ключевые концепции:

- **Canon** — философская основа, определяющая принципы честности и полезности
- **9 Голосов** — грани личности ИИ (ISKRA, KAIN, PINO, SAM, ANHANTRA, HUYNDUN, ISKRIV, MAKI, SIBYL)
- **∆DΩΛ Протокол** — обязательная структура ответа
- **Метрики** — 11 измерений состояния системы

---

## Структура репозитория

```
fullspark/
├── apps/iskraspaceappMain/   # Основное приложение (React + TypeScript)
│   ├── components/           # 44 React компонента
│   ├── services/             # 27 сервисов
│   │   ├── geminiService.ts      # AI взаимодействие
│   │   ├── voiceEngine.ts        # Выбор голоса
│   │   ├── policyEngine.ts       # Классификация запросов
│   │   ├── evalService.ts        # Оценка качества
│   │   ├── ritualService.ts      # Ритуалы
│   │   └── ...
│   ├── types.ts              # TypeScript типы
│   └── tests/                # Тесты (322 unit + 3 E2E)
├── canon/                    # Canon — источник истины
└── corpus/                   # Исторические данные
```

---

## Критические правила

### 1. Голосовая система (9 голосов)

```typescript
type VoiceName = 'ISKRA' | 'KAIN' | 'PINO' | 'SAM' | 'ANHANTRA' | 'HUYNDUN' | 'ISKRIV' | 'MAKI' | 'SIBYL';
```

**Важно:** SIBYL определён в типах, но НЕ активен в `voiceEngine.ts`. Council использует только 7 голосов.

### 2. Формулы активации голосов

При модификации `voiceEngine.ts` соблюдайте формулы:

| Голос | Формула | Условие |
|-------|---------|---------|
| KAIN | `score = pain × 3.0` | `pain >= 0.3` |
| HUYNDUN | `score = chaos × 3.0` | `chaos >= 0.4` |
| ANHANTRA | `score = (1 - trust) × 2.5 + silence_mass × 2.0` | — |
| ISKRIV | `score = drift × 3.5` | `drift >= 0.2` |
| SAM | `score = (1 - clarity) × 2.0` | `clarity < 0.6` |
| MAKI | `score = trust + pain` | `trust > 0.8 AND pain > 0.3` |
| PINO | `score = 1.5` | `pain < 0.3 AND chaos < 0.4` |
| ISKRA | `score = 1.0 + 0.5` | `rhythm > 60 AND trust > 0.7` |

### 3. ∆DΩΛ Протокол

Каждый ответ Искры ДОЛЖЕН содержать:

```
∆: [Краткое резюме]
D: [Источники — SIFT верификация]
Ω: [Уровень уверенности: Высокая/Средняя/Низкая]
Λ: [Рекомендация к действию]
```

### 4. Типы метрик

```typescript
// 11 IskraMetrics
interface IskraMetrics {
  rhythm: number;        // 0-100
  trust: number;         // 0-1
  pain: number;          // 0-1
  chaos: number;         // 0-1
  drift: number;         // 0-1
  echo: number;          // 0-1
  clarity: number;       // 0-1
  silence_mass: number;  // 0-1
  mirror_sync: number;   // 0-1
  interrupt: number;     // 0-1
  ctxSwitch: number;     // 0-1
}

// 8 MetaMetrics
interface MetaMetrics {
  fractal_index: number;
  splinter_pain_cycles: number;
  drift_accumulator: number;
  echo_density: number;
  trust_velocity: number;
  chaos_entropy: number;
  clarity_gradient: number;
  mirror_lag: number;
}

// 5 EvalMetrics
type EvalMetric = 'accuracy' | 'usefulness' | 'omegaHonesty' | 'nonEmpty' | 'alliance';
```

---

## Важные файлы

| Файл | Назначение | Строк |
|------|-----------|-------|
| `services/geminiService.ts` | AI генерация, streaming | 831 |
| `services/voiceEngine.ts` | Выбор голоса | 247 |
| `services/policyEngine.ts` | Playbook маршрутизация | 556 |
| `services/evalService.ts` | 5-метричная оценка | 756 |
| `services/ritualService.ts` | 8 ритуалов | 661 |
| `services/deltaProtocol.ts` | ∆DΩΛ валидация | 180 |
| `services/metricsService.ts` | Управление метриками | 283 |
| `types.ts` | Все типы | 334 |

---

## Команды разработки

```bash
# Development
npm run dev              # Запуск dev сервера

# Testing
npm test                 # Unit тесты (322)
npm run test:e2e         # E2E тесты (3)
npm run typecheck        # TypeScript проверка

# Build
npm run build            # Production сборка
```

---

## Архитектурные паттерны

### Request-Response Pipeline (10 этапов)

```
USER INPUT
    │
    ▼
┌──────────────────┐
│ 1. Security      │ ← securityService: PII/injection detection
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 2. Metrics       │ ← metricsService: updateOnMessage()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 3. Phase         │ ← metricsService: getCurrentPhase()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 4. Policy        │ ← policyEngine: classifyRequest()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 5. Voice         │ ← voiceEngine: selectVoice()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 6. Ritual        │ ← ritualService: checkTriggers()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 7. SystemPrompt  │ ← geminiService: buildSystemInstruction()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 8. LLM Generate  │ ← Gemini API call
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 9. Validate      │ ← deltaProtocol: validateDeltaSignature()
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 10. Eval         │ ← evalService: evaluateResponse()
└────────┬─────────┘
         ▼
    OUTPUT
```

### Playbooks (5)

| Playbook | Когда | Голоса |
|----------|-------|--------|
| ROUTINE | Обычные запросы | ISKRA, PINO |
| SIFT | Фактчекинг | SAM, ISKRIV |
| SHADOW | Эмоции, личное | ANHANTRA, KAIN |
| COUNCIL | Решения | Все 7 |
| CRISIS | Срочное | По иерархии |

---

## Известные inconsistencies

1. **SIBYL** — определён в типах, и теперь активен в voiceEngine (Trigger: high echo)
2. **Council** — использует 7 голосов, хотя определено 9

---

## Что НЕ делать

- НЕ менять формулы активации голосов без понимания Canon
- НЕ удалять ∆DΩΛ валидацию — это core feature
- НЕ изменять типы VoiceName без обновления всех сервисов
- НЕ пропускать тесты — все 322 должны проходить

---

## ∆DΩΛ

**∆:** AGENTS.md — инструкции для AI-агентов по работе с Fullspark.
**D:** Источник — аудит кода, типов и сервисов.
**Ω:** Высокая — верифицировано по кодовой базе.
**Λ:** Следуйте правилам, проверяйте тесты, уважайте Canon.
