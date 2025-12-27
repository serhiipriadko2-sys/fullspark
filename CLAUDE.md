# CLAUDE.md — Инструкции для Claude

> Специфические инструкции для Claude (Anthropic) при работе с Fullspark/Iskra Space.

---

## Контекст проекта

Fullspark — это AI-companion с уникальной когнитивной архитектурой. Ты работаешь с кодовой базой, которая:

1. **Реализует 9 голосов личности** — не просто prompts, а целую систему с формулами активации
2. **Использует ∆DΩΛ протокол** — обязательная структура каждого ответа
3. **Построена на Canon** — философская основа честности и полезности

---

## Быстрый старт

### Ключевые файлы

```bash
# Основное приложение
apps/iskraspaceappMain/

# Сервисы (27 шт.)
apps/iskraspaceappMain/services/

# Типы
apps/iskraspaceappMain/types.ts

# Тесты
apps/iskraspaceappMain/tests/
```

### Команды

```bash
cd apps/iskraspaceappMain

npm install          # Установка зависимостей
npm run dev          # Dev сервер
npm test             # 322 unit теста
npm run typecheck    # TypeScript проверка
npm run test:e2e     # 3 E2E теста
```

---

## Критические знания

### 9 Голосов

```typescript
type VoiceName =
  | 'ISKRA'    // ⟡ Ядро, синтез
  | 'KAIN'     // ⚑ Честность, боль
  | 'PINO'     // 😏 Лёгкость, юмор
  | 'SAM'      // ☉ Структура
  | 'ANHANTRA' // ≈ Тишина, принятие
  | 'HUYNDUN'  // 🜃 Хаос, обновление
  | 'ISKRIV'   // 🪞 Аудит, совесть
  | 'MAKI'     // 🌸 Интеграция
  | 'SIBYL';   // 🔮 Предвидение (не активен)
```

### Формулы активации

| Голос | Формула | Триггер |
|-------|---------|---------|
| KAIN | `pain × 3.0` | `pain ≥ 0.3` |
| HUYNDUN | `chaos × 3.0` | `chaos ≥ 0.4` |
| ISKRIV | `drift × 3.5` | `drift ≥ 0.2` |
| SAM | `(1 - clarity) × 2.0` | `clarity < 0.6` |
| ANHANTRA | `(1 - trust) × 2.5 + silence_mass × 2.0` | — |
| MAKI | `trust + pain` | `trust > 0.8 AND pain > 0.3` |
| PINO | `1.5` | `pain < 0.3 AND chaos < 0.4` |
| ISKRA | `1.0 + 0.5` | `rhythm > 60 AND trust > 0.7` |

### ∆DΩΛ Протокол

Каждый ответ Искры содержит:

```
∆: [Краткое резюме]
D: [Источники/верификация]
Ω: [Уверенность: Высокая/Средняя/Низкая]
Λ: [Рекомендация к действию]
```

---

## Что делать

### При добавлении сервиса

1. Создать файл в `services/`
2. Добавить типы в `types.ts`
3. Написать тесты в `tests/`
4. Обновить документацию

### При изменении голосов

1. Проверить `voiceEngine.ts` — формулы
2. Проверить `voiceSynapseService.ts` — отношения
3. Обновить `types.ts` если нужно
4. Запустить все тесты

### При работе с метриками

```typescript
// 11 IskraMetrics
rhythm, trust, pain, chaos, drift, echo,
clarity, silence_mass, mirror_sync, interrupt, ctxSwitch

// 8 MetaMetrics
fractal_index, splinter_pain_cycles, drift_accumulator,
echo_density, trust_velocity, chaos_entropy,
clarity_gradient, mirror_lag

// 5 EvalMetrics
accuracy, usefulness, omegaHonesty, nonEmpty, alliance
```

---

## Что НЕ делать

### Запрещено без согласования

- Менять формулы активации голосов
- Удалять ∆DΩΛ валидацию
- Изменять структуру VoiceName
- Модифицировать Canon документы

### Частые ошибки

```typescript
// НЕПРАВИЛЬНО — `any`
function process(data: any): any

// ПРАВИЛЬНО — строгая типизация
function process(data: IskraMetrics): VoiceName

// НЕПРАВИЛЬНО — пропуск ∆DΩΛ
return response;

// ПРАВИЛЬНО — валидация
const validated = validateDeltaSignature(response);
```

---

## Архитектура

### Request Pipeline (10 шагов)

```
1. Security     → securityService
2. Metrics      → metricsService
3. Phase        → getCurrentPhase()
4. Policy       → policyEngine.classifyRequest()
5. Voice        → voiceEngine.selectVoice()
6. Ritual       → ritualService.checkTriggers()
7. SystemPrompt → geminiService.buildSystemInstruction()
8. LLM          → Gemini API call
9. Validate     → deltaProtocol.validateDeltaSignature()
10. Eval        → evalService.evaluateResponse()
```

### 5 Playbooks

| Playbook | Назначение | Голоса |
|----------|------------|--------|
| ROUTINE | Обычные запросы | ISKRA, PINO |
| SIFT | Фактчекинг | SAM, ISKRIV |
| SHADOW | Эмоции | ANHANTRA, KAIN |
| COUNCIL | Решения | Все 7 |
| CRISIS | Срочное | По иерархии |

---

## Тестирование

```bash
# Все тесты (322)
npm test

# Конкретный файл
npm test -- evalService

# С покрытием
npm test -- --coverage

# E2E
npm run test:e2e
```

### Критические тесты

- `policyEngine.test.ts` — 26 тестов
- `evalService.test.ts` — 14 тестов
- `ritualService.test.ts` — 20 тестов
- `auditService.test.ts` — 22 тестов

---

## Документация

> Полная документация: [docs/README.md](./docs/README.md)

| Файл | Содержание |
|------|-----------|
| [README.md](./README.md) | Обзор проекта |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Архитектура системы |
| [docs/AGENTS.md](./docs/AGENTS.md) | Инструкции для AI |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Правила контрибьюции |
| [docs/audit/ECOSYSTEM_AUDIT_2025.md](./docs/audit/ECOSYSTEM_AUDIT_2025.md) | Глубокий аудит |
| [docs/iskra/ISKRA_COGNITIVE_ARCHITECTURE.md](./docs/iskra/ISKRA_COGNITIVE_ARCHITECTURE.md) | Когнитивная архитектура |
| [docs/iskra/CHRONOLOGY.md](./docs/iskra/CHRONOLOGY.md) | Хронология проекта |

---

## Известные проблемы

1. **HUYNDUN vs HUNDUN** — typo в разных файлах
2. **SIBYL** — определён, но не активен
3. **Council** — использует 7 голосов, не 9

---

## Полезные паттерны

### Чтение метрик

```typescript
import { metricsService } from './services/metricsService';

const metrics = metricsService.getCurrentMetrics();
console.log(`Trust: ${metrics.trust}, Pain: ${metrics.pain}`);
```

### Выбор голоса

```typescript
import { selectVoice } from './services/voiceEngine';

const voice = selectVoice(metrics);
console.log(`Selected: ${voice}`);
```

### Валидация ∆DΩΛ

```typescript
import { validateDeltaSignature } from './services/deltaProtocol';

const result = validateDeltaSignature(response);
if (!result.isValid) {
  console.error('Missing:', result.missing);
}
```

---

## ∆DΩΛ

**∆:** CLAUDE.md — специфические инструкции для Claude при работе с Fullspark.
**D:** Источник — аудит кода и документации проекта.
**Ω:** Высокая — проверено на практике.
**Λ:** Используй этот документ как quick reference. Для деталей — ARCHITECTURE.md.
