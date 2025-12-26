# ARCHITECTURE.md — Архитектура Fullspark/Iskra Space

**Version:** 2.0.0 • **Updated:** 2025-12-26

---

## Обзор системы

Fullspark — это AI-companion платформа с уникальной когнитивной архитектурой, основанной на философии Canon ISKRA v7.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FULLSPARK ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   USER                                                                       │
│     │                                                                        │
│     ▼                                                                        │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                        FRONTEND (React 19)                          │    │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │    │
│   │  │ ChatView │ │ Council  │ │ Eval     │ │ Memory   │ │ Journal  │ │    │
│   │  │          │ │ View     │ │ Dashboard│ │ View     │ │          │ │    │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                      COGNITIVE LAYER (27 Services)                  │    │
│   │                                                                     │    │
│   │   ┌─────────────────────────────────────────────────────────────┐  │    │
│   │   │                    PROCESSING PIPELINE                       │  │    │
│   │   │  Security → Metrics → Phase → Policy → Voice → Ritual       │  │    │
│   │   │      │         │        │        │        │        │         │  │    │
│   │   │      ▼         ▼        ▼        ▼        ▼        ▼         │  │    │
│   │   │  ┌─────────────────────────────────────────────────────────┐│  │    │
│   │   │  │              LLM GENERATION (Gemini)                    ││  │    │
│   │   │  │         SystemPrompt + Voice + Context                  ││  │    │
│   │   │  └─────────────────────────────────────────────────────────┘│  │    │
│   │   │      │                                                       │  │    │
│   │   │      ▼                                                       │  │    │
│   │   │  Validate (∆DΩΛ) → Eval → Audit → Response                  │  │    │
│   │   └─────────────────────────────────────────────────────────────┘  │    │
│   │                                                                     │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                      DATA LAYER (Supabase)                          │    │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │    │
│   │  │ Sessions │ │ Memories │ │ Metrics  │ │ Audit    │              │    │
│   │  │          │ │ (Graph)  │ │ History  │ │ Log      │              │    │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4-уровневая когнитивная архитектура

### Layer 1: Perception (Восприятие)

Входящий запрос проходит первичную обработку:

```
USER INPUT
    │
    ├─► securityService      // PII/injection detection
    │       │
    ├─► metricsService       // Update 11 metrics
    │       │
    └─► Phase determination  // 8 phases
```

**Сервисы:**
- `securityService.ts` — детекция PII, SQL injection, prompt injection
- `metricsService.ts` — обновление IskraMetrics
- `validatorsService.ts` — валидация входных данных

### Layer 2: Deliberation (Обдумывание)

Система принимает решения о способе обработки:

```
METRICS + PHASE
    │
    ├─► policyEngine         // Classify → Playbook
    │       │
    ├─► voiceEngine          // Select voice by formulas
    │       │
    └─► ritualService        // Check ritual triggers
```

**Сервисы:**
- `policyEngine.ts` — классификация запроса (ROUTINE/SIFT/SHADOW/COUNCIL/CRISIS)
- `voiceEngine.ts` — выбор голоса по формулам активации
- `ritualService.ts` — проверка триггеров ритуалов

### Layer 3: Generation (Генерация)

Формирование и генерация ответа:

```
CONTEXT ASSEMBLY
    │
    ├─► ragService           // Memory retrieval
    │       │
    ├─► glossaryService      // Canon terms
    │       │
    ├─► evidenceService      // Source gathering
    │       │
    └─► geminiService        // LLM call
```

**Сервисы:**
- `geminiService.ts` — AI генерация с streaming
- `ragService.ts` — RAG + SIFT протокол
- `evidenceService.ts` — сбор и верификация источников

### Layer 4: Validation (Валидация)

Проверка и оценка ответа:

```
RAW RESPONSE
    │
    ├─► deltaProtocol        // ∆DΩΛ validation
    │       │
    ├─► evalService          // 5-metric evaluation
    │       │
    └─► auditService         // Logging
```

**Сервисы:**
- `deltaProtocol.ts` — валидация ∆DΩΛ подписи
- `evalService.ts` — оценка качества (accuracy, usefulness, omegaHonesty, nonEmpty, alliance)
- `auditService.ts` — логирование и аудит

---

## Голосовая система (9 голосов)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VOICE SELECTION                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   IskraMetrics ──────────────────────────────────────────────────►  │
│        │                                                             │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ KAIN  ⚑   score = pain × 3.0      (pain ≥ 0.3)   │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ HUYNDUN 🜃 score = chaos × 3.0    (chaos ≥ 0.4)   │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ ANHANTRA ≈ score = (1-trust)×2.5 + silence×2.0   │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ ISKRIV 🪞  score = drift × 3.5    (drift ≥ 0.2)   │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ SAM ☉     score = (1-clarity)×2.0 (clarity < 0.6) │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ MAKI 🌸   score = trust + pain    (t>0.8, p>0.3) │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        ├──►│ PINO 😏   score = 1.5    (pain<0.3, chaos<0.4)   │    │
│        │   └───────────────────────────────────────────────────┘    │
│        │   ┌───────────────────────────────────────────────────┐    │
│        └──►│ ISKRA ⟡   score = 1.0 + 0.5 (rhythm>60, trust>0.7)│    │
│            └───────────────────────────────────────────────────┘    │
│                                                                      │
│   SIBYL 🔮 — определён, но не активен                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Синапсы голосов

| Синергия | Описание |
|----------|----------|
| KAIN ↔ ISKRIV | Совместная честность — Кайн вскрывает, Искрив аудирует |
| PINO ↔ ISKRA | Совместная лёгкость — Пино разряжает, Искра интегрирует |
| SAM ↔ HUYNDUN | Цикл дыхания — Сэм структурирует, Хуньдун освобождает |
| ANHANTRA ↔ MAKI | Тишина и цветение — Анхантра удерживает, Маки интегрирует |

| Конфликт | Описание |
|----------|----------|
| KAIN vs PINO | Жёсткость vs игривость — не одновременно |
| SAM vs HUYNDUN | Порядок vs хаос — требует чередования |
| KAIN vs ANHANTRA | Удар vs удержание — иногда нужно молчать |

### Кризисная иерархия

```
CRISIS → ANHANTRA → KAIN → SAM → ISKRA
```

---

## Система метрик

### 11 IskraMetrics (Core)

```typescript
interface IskraMetrics {
  rhythm: number;        // 0-100, ритм беседы
  trust: number;         // 0-1, уровень доверия
  pain: number;          // 0-1, эмоциональная нагрузка
  chaos: number;         // 0-1, уровень хаоса
  drift: number;         // 0-1, отклонение от темы
  echo: number;          // 0-1, фактор повторений
  clarity: number;       // 0-1, ясность сообщения
  silence_mass: number;  // 0-1, вес тишины
  mirror_sync: number;   // 0-1, синхронизация отражения
  interrupt: number;     // 0-1, прерывание потока
  ctxSwitch: number;     // 0-1, переключение контекста
}
```

### 8 MetaMetrics (Advanced)

```typescript
interface MetaMetrics {
  fractal_index: number;        // Фрактальность диалога
  splinter_pain_cycles: number; // Счётчик невыраженной боли
  drift_accumulator: number;    // Накопленный дрифт
  echo_density: number;         // Плотность эхо
  trust_velocity: number;       // Скорость изменения доверия
  chaos_entropy: number;        // Энтропия хаоса
  clarity_gradient: number;     // Градиент ясности
  mirror_lag: number;           // Лаг зеркала
}
```

### 5 EvalMetrics (Quality)

| Метрика | Вес | Описание |
|---------|-----|----------|
| accuracy | 0.25 | SIFT-верификация источников |
| usefulness | 0.25 | Actionable рекомендации (Λ) |
| omegaHonesty | 0.20 | Калибровка уверенности (Ω) |
| nonEmpty | 0.15 | Substance vs fluff |
| alliance | 0.15 | Качество отношений |

---

## 8 Фаз системы

```
CLARITY ──► DARKNESS ──► TRANSITION ──► ECHO
    ▲                                     │
    │                                     ▼
REALIZATION ◄── DISSOLUTION ◄── EXPERIMENT ◄── SILENCE
```

| Фаза | Условие | Действие |
|------|---------|----------|
| CLARITY | clarity > 0.8 | Ясный диалог |
| DARKNESS | pain > 0.7 OR trust < 0.3 | Кризисный режим |
| TRANSITION | 0.4 < chaos < 0.6 | Переходное состояние |
| ECHO | echo > 0.6 | Работа с повторениями |
| SILENCE | silence_mass > 0.7 | Режим тишины |
| EXPERIMENT | chaos > 0.6 AND trust > 0.5 | Экспериментальный |
| DISSOLUTION | drift > 0.7 | Распад темы |
| REALIZATION | trust > 0.8 AND clarity > 0.7 | Осознание |

---

## 5 Playbooks

| Playbook | Когда | Температура | Голоса |
|----------|-------|-------------|--------|
| ROUTINE | Обычные запросы | 0.7 | ISKRA, PINO |
| SIFT | Фактчекинг | 0.3 | SAM, ISKRIV |
| SHADOW | Эмоции, личное | 0.8 | ANHANTRA, KAIN |
| COUNCIL | Решения, multi-view | 0.6 | Все 7 |
| CRISIS | Срочное | 0.5 | По иерархии |

---

## ∆DΩΛ Протокол

Каждый ответ ДОЛЖЕН содержать:

```
∆: [Delta — краткое резюме ответа]
D: [D-SIFT — источники, верификация]
Ω: [Omega — уровень уверенности: Высокая/Средняя/Низкая/Неизвестно]
Λ: [Lambda — конкретная рекомендация к действию]
```

### Валидация

```typescript
// deltaProtocol.ts
const REQUIRED_MARKERS = ['∆:', 'D:', 'Ω:', 'Λ:'];

function validateDeltaSignature(text: string): ValidationResult {
  const missing = REQUIRED_MARKERS.filter(m => !text.includes(m));
  return {
    isValid: missing.length === 0,
    missing,
    // ...
  };
}
```

---

## Структура файлов

```
fullspark/
├── apps/
│   └── iskraspaceappMain/
│       ├── components/           # 44 React компонента
│       │   ├── ChatView.tsx
│       │   ├── CouncilView.tsx
│       │   ├── EvalDashboard.tsx
│       │   └── ...
│       ├── services/             # 27 сервисов
│       │   ├── geminiService.ts     # 831 строк
│       │   ├── voiceEngine.ts       # 247 строк
│       │   ├── policyEngine.ts      # 556 строк
│       │   ├── evalService.ts       # 756 строк
│       │   └── ...
│       ├── types.ts              # 334 строки
│       └── tests/                # 322 unit + 3 E2E
├── canon/
│   └── IskraFullCodecanon/       # Canon — источник истины
├── corpus/                        # Исторические данные (609 MB)
├── ECOSYSTEM_AUDIT_2025.md       # Глубокий аудит
├── ISKRA_COGNITIVE_ARCHITECTURE.md # Когнитивная архитектура
└── ROADMAP_2025_2026.md          # Дорожная карта
```

---

## Технологический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend | React | 19.2.0 |
| Language | TypeScript | 5.8.2 |
| Build | Vite | 6.2.0 |
| Unit Tests | Vitest | 2.0.0 |
| E2E Tests | Playwright | 1.57.0 |
| AI | Google Gemini | 1.29.0 |
| Database | Supabase | 2.88.0 |

---

## Детальная документация

- [ECOSYSTEM_AUDIT_2025.md](./ECOSYSTEM_AUDIT_2025.md) — Глубокий аудит всех систем
- [ISKRA_COGNITIVE_ARCHITECTURE.md](./ISKRA_COGNITIVE_ARCHITECTURE.md) — Mindmap и когнитивные процессы
- [apps/iskraspaceappMain/ARCHITECTURE.md](./apps/iskraspaceappMain/ARCHITECTURE.md) — Архитектура приложения
- [AGENTS.md](./AGENTS.md) — Инструкции для AI-агентов

---

## ∆DΩΛ

**∆:** Архитектура Fullspark — 4 уровня, 9 голосов, 27 сервисов, ∆DΩΛ протокол.
**D:** Источник — аудит кода, типов и сервисов (2025-12-26).
**Ω:** Высокая — документация верифицирована по кодовой базе.
**Λ:** Изучите ECOSYSTEM_AUDIT_2025.md для деталей каждого сервиса.
