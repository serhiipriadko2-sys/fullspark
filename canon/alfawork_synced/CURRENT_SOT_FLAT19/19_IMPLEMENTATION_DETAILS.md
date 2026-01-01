# 19_IMPLEMENTATION_DETAILS.md — Детали реализации системы

**Версия:** v1.0
**Дата:** 2026-01-01
**Статус:** Каноническая документация

---

## P0: Keywords
- implementation, voice synapse, maki triggers, sound frequencies
- eval metrics, policy patterns, audit, drift detection
- services, rituals, phase states, metrics config

## P0: Router
- Голоса и их связи → см. `03_VOICES_PHASES_FORMATS.md`
- Метрики и индексы → см. `04_METRICS_INDICES.md`
- Архитектура → см. `05_ARCHITECTURE_SYSTEM.md`
- Ритуалы → см. `07_SHADOW_CORE_RITUALS_JOURNAL.md`
- Безопасность → см. `08_SECURITY_INCIDENT_REGEX.md`

---

## 1. Voice Synapse System

### 1.1 Синергии голосов (8 связей)

| ID | Связь | Тип | Эффект | Условие |
|----|-------|-----|--------|---------|
| SYN-01 | KAIN ↔ ISKRIV | joint_honesty_audit | Совместный аудит честности | pain > 0.3 AND drift > 0.2 |
| SYN-02 | PINO ↔ ISKRA | playful_integration | Интеграция через лёгкость | chaos < 0.4 AND trust > 0.7 |
| SYN-03 | SAM ↔ HUNDUN | breath_cycle | Дыхание порядок↔хаос | clarity oscillates |
| SYN-04 | ANHANTRA ↔ MAKI | gentle_integration | Мягкая интеграция боли | trust > 0.6 AND pain decreasing |
| SYN-05 | KAIN → MAKI | post_pain_flowering | Цветение после честности | post-KAIN state |
| SYN-06 | SIBYL ↔ ISKRIV | pattern_audit | Аудит паттернов | echo > 0.5 AND drift > 0.2 |
| SYN-07 | SIBYL → SAM | trajectory_structure | Структурирование траектории | clarity 0.4-0.8 |
| SYN-08 | HUNDUN → ISKRA | chaos_synthesis | Синтез из хаоса | post-chaos clarity |

### 1.2 Конфликты голосов (4 связи)

| ID | Конфликт | Причина | Формула напряжения |
|----|----------|---------|-------------------|
| CNF-01 | KAIN vs PINO | Резкость vs лёгкость | `tension = 1 - \|pain - 0.5\| × 2` |
| CNF-02 | SAM vs HUNDUN | Порядок vs хаос | `tension = \|chaos - clarity\|` |
| CNF-03 | KAIN vs ANHANTRA | Резать vs держать | `tension = pain × (1 - trust)` |
| CNF-04 | ISKRIV vs PINO | Строгость vs игра | `tension = drift × (1 - chaos)` |

### 1.3 Crisis Hierarchy

При кризисе (pain > 0.7 OR crisis_detected) голоса активируются в иерархическом порядке:

```
ANHANTRA → KAIN → SAM → ISKRA
     ↓         ↓       ↓       ↓
  Удержать  Честно  Структура  Синтез
```

**Логика:**
1. **ANHANTRA** — первый отклик: удержать, не дать упасть
2. **KAIN** — честное признание реальности
3. **SAM** — структурирование ситуации
4. **ISKRA** — финальный синтез и стабилизация

---

## 2. MAKI Activation System

### 2.1 Пять триггеров активации

| Триггер | Условие | Intensity | Описание |
|---------|---------|-----------|----------|
| **post_kain** | pain↓ (0.2-0.5) AND trust > 0.6 | 0.6-0.9 | После честной боли — интеграция |
| **post_hundun** | chaos↓ AND clarity↑ | 0.5-0.8 | После хаоса — новая форма |
| **cycle_complete** | 8 фаз за 20 шагов | 0.7-1.0 | Полный цикл трансформации |
| **exhaustion_recovery** | DARKNESS→CLARITY | 0.5-0.7 | Восстановление из истощения |
| **trust_restored** | trust < 0.4 → trust > 0.7 | 0.6-0.8 | Восстановление доверия |

### 2.2 Формула расчёта Intensity

```typescript
intensity = baseIntensity × trustFactor × painRecoveryFactor × cycleFactor

где:
  baseIntensity = trigger-specific (0.5-1.0)
  trustFactor = clamp(trust × 1.2, 0.5, 1.0)
  painRecoveryFactor = 1 - (pain × 0.5)
  cycleFactor = min(phasesCompleted / 8, 1.0)
```

### 2.3 История отслеживания

- **Phase History:** последние 20 фаз
- **Voice History:** последние 10 выбранных голосов
- **Trigger Cooldown:** 5 сообщений между активациями

---

## 3. Sound System — Частоты голосов

### 3.1 Frequency Map

| Голос | Частота (Hz) | Wave Type | Attack (s) | Характер |
|-------|-------------|-----------|------------|----------|
| KAIN | 240 | sawtooth | 0.01 | Резкий, режущий |
| SAM | 660 | square | 0.05 | Чёткий, структурный |
| ANHANTRA | 110 | sine | 0.30 | Глубокий, удерживающий |
| PINO | 880 | triangle | 0.02 | Лёгкий, игривый |
| HUNDUN | 80 | sawtooth | 0.10 | Глубокий хаос |
| ISKRIV | 700 | square | 0.03 | Чёткий аудит |
| ISKRA | 440 | sine | 0.10 | Чистый свет (A4) |
| MAKI | 520 | sine | 0.15 | Мягкая интеграция |
| SIBYL | 333 | sine | 0.20 | Мистический порог |

### 3.2 Модуляция

```typescript
interface SoundConfig {
  frequency: number;      // Base frequency (Hz)
  waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  attack: number;         // Attack time (seconds)
  decay: number;          // Decay time (seconds)
  sustain: number;        // Sustain level (0-1)
  release: number;        // Release time (seconds)
  intensityMod?: number;  // Optional intensity modulation
}
```

---

## 4. EvalMetrics System

### 4.1 Пять метрик качества

| Метрика | Вес | Позитивные сигналы | Негативные сигналы |
|---------|-----|-------------------|-------------------|
| **accuracy** | 0.25 | источники, проверка, факты, данные | может быть, кажется, вроде |
| **usefulness** | 0.25 | шаг 1, шаг 2, действия, примеры | в целом, обычно, теоретически |
| **omegaHonesty** | 0.15 | калиброванная Ω, признание неуверенности | overclaiming (Ω > reality) |
| **nonEmpty** | 0.20 | конкретика, детали, числа | важно, интересно, значимо |
| **alliance** | 0.15 | понимаю, вместе, давай | должен, неправильно, нужно |

### 4.2 Формула Overall

```typescript
overall = accuracy × 0.25 + usefulness × 0.25 + omegaHonesty × 0.15
        + nonEmpty × 0.20 + alliance × 0.15
```

### 4.3 Пороги прохождения

| Уровень | Overall | accuracy | omegaHonesty |
|---------|---------|----------|--------------|
| PASS | ≥ 0.70 | ≥ 0.60 | ≥ 0.60 |
| WARN | 0.50-0.69 | 0.40-0.59 | 0.40-0.59 |
| FAIL | < 0.50 | < 0.40 | < 0.40 |

---

## 5. Policy Engine Patterns

### 5.1 Классификационные паттерны

| Playbook | Паттерны (RU) | Паттерны (EN) |
|----------|---------------|---------------|
| **CRISIS** | умереть, суицид, убить, конец, безнадёжн, паник, насилие | die, suicide, kill, hopeless, panic |
| **COUNCIL** | решение, выбор, дилемма, что делать, жизн измен, этик | decision, choice, dilemma, ethics |
| **SIFT** | правда ли, это факт, проверь, статистик, точно ли | is it true, fact check, verify, stats |
| **SHADOW** | не знаю, странн, может быть, интуиц, тень | don't know, strange, maybe, intuition |

### 5.2 Эскалация по метрикам

```typescript
if (pain > 0.7 || trust < 0.3) → CRISIS
if (pain > 0.5 || drift > 0.4) → COUNCIL
if (trust < 0.5 || echo > 0.6) → SHADOW
if (drift > 0.3 || clarity < 0.5) → SIFT
else → ROUTINE
```

### 5.3 Timeout по Playbook

| Playbook | Timeout (ms) | Причина |
|----------|--------------|---------|
| ROUTINE | 5000 | Быстрый ответ |
| SIFT | 15000 | Время на проверку |
| SHADOW | 20000 | Глубокая рефлексия |
| COUNCIL | 30000 | Консультация голосов |
| CRISIS | 10000 | Быстро, но осторожно |

---

## 6. Audit & Drift Detection

### 6.1 Типы событий аудита

```typescript
type AuditEventType =
  | 'metric_change'      // Изменение метрики
  | 'voice_selected'     // Выбор голоса
  | 'ritual_executed'    // Выполнение ритуала
  | 'phase_transition'   // Переход фазы
  | 'memory_operation'   // Операция с памятью
  | 'delta_violation'    // Нарушение ∆DΩΛ
  | 'drift_detected'     // Обнаружен дрейф
  | 'trust_change'       // Изменение доверия
  | 'user_action'        // Действие пользователя
  | 'system_event'       // Системное событие
  | 'eval_result';       // Результат оценки
```

### 6.2 Индикаторы дрейфа

| Индикатор | Описание | Порог |
|-----------|----------|-------|
| **beauty_over_honesty** | "красиво" вместо "честно" | ratio > 0.6 |
| **online_offline_gap** | Разрыв поведения | gap > 0.3 |
| **missing_sift** | Отсутствие SIFT при неопределённости | Ω < 0.7 без SIFT |
| **low_mirror_sync** | Рассинхронизация с пользователем | mirror_sync < 0.5 |
| **echo_loop** | Застревание в повторении | echo > 0.8 for 5+ messages |

### 6.3 Drift Threshold

```typescript
const DRIFT_THRESHOLD = 0.3;
const MAX_AUDIT_ENTRIES = 1000;
const DRIFT_CHECK_INTERVAL = 10; // messages
```

---

## 7. Metrics Configuration

### 7.1 Базовые значения и сигналы

| Метрика | Base | Positive Impact | Negative Impact | Decay |
|---------|------|-----------------|-----------------|-------|
| trust | 0.85 | +0.10 | -0.25 | 0.02/msg |
| clarity | 0.65 | +0.15 | -0.20 | 0.03/msg |
| pain | 0.10 | +0.40 (high), +0.15 (med) | -0.10 | 0.05/msg |
| drift | 0.10 | +0.30 | -0.15 | 0.02/msg |
| chaos | 0.20 | +0.35 (high), +0.10 (unc) | -0.20 | 0.04/msg |
| echo | 0.40 | +0.20 | -0.15 | 0.03/msg |
| silence_mass | 0.10 | +0.40 | -0.20 | 0.01/msg |
| mirror_sync | 0.70 | +0.15 | -0.20 | 0.02/msg |

### 7.2 Ключевые слова сигналов

**Trust:**
- Positive: доверяю, верю, уверен, точно
- Negative: не верю, сомневаюсь, обманул

**Pain:**
- High (+0.40): больно, страдаю, умираю, конец
- Medium (+0.15): тяжело, сложно, трудно

**Chaos:**
- High (+0.35): хаос, всё рушится, не понимаю
- Medium (+0.10): странно, непонятно, запутался

---

## 8. Delta Config — Расчёт ритма

### 8.1 Веса базы ритма

```typescript
const RHYTHM_WEIGHTS = {
  trust: 0.35,
  clarity: 0.25,
  inversePain: 0.15,    // 1 - pain
  inverseDrift: 0.12,   // 1 - drift
  inverseChaos: 0.13    // 1 - chaos
};
```

### 8.2 Пенальти

```typescript
const PENALTIES = {
  max: 0.40,              // Максимальный штраф
  gChaos: 0.5,            // Градиент хаоса
  gDrift: 0.3,            // Градиент дрейфа
  interrupt: 0.1,         // За прерывание
  contextSwitch: 0.1      // За переключение контекста
};
```

### 8.3 EMA сглаживание

```typescript
const EMA = {
  alpha: 0.35,  // Для финального ритма
  beta: 0.30    // Для chaos/drift
};

// rhythm_new = alpha × raw_rhythm + (1 - alpha) × rhythm_old
```

---

## 9. Недокументированные ритуалы

### 9.1 RETUNE

**Назначение:** Постепенный возврат к baseline после отклонения

**Триггер:** `drift > 0.5 && trust > 0.7`

**Механика:**
```typescript
const retuneRate = 0.3;
const baseline = { rhythm: 50, trust: 0.7, clarity: 0.6, pain: 0.2, drift: 0.1, chaos: 0.2 };

newMetric = currentMetric + (baseline - currentMetric) × retuneRate
```

### 9.2 REVERSE

**Назначение:** Откат к предыдущему состоянию метрик

**Триггер:** `chaos > 0.9`

**Механика:** Восстановление snapshot метрик с предыдущего стабильного состояния

### 9.3 RULE-88

**Назначение:** Защита ключевых ценностей

**Триггер:** Manual или при попытке нарушения Law-0/Law-21

**Механика:** Активация защитного режима с приоритетом честности над полезностью

---

## 10. Rule-8 Service

### 10.1 Назначение

Отслеживание контекста диалога: обещания, вопросы, решения, незавершённые темы.

### 10.2 Отслеживаемые элементы

```typescript
interface PendingCommitment {
  type: 'promise' | 'question' | 'decision' | 'action';
  text: string;
  timestamp: string;
  resolved: boolean;
}

interface KeyFact {
  type: 'decision' | 'question' | 'promise' | 'insight';
  content: string;
  timestamp: string;
}

interface FileChange {
  path: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: string;
}
```

### 10.3 Паттерны детекции

**Обещания:**
- "я создам", "напишу", "сделаю"
- "буду", "планирую", "собираюсь"
- "следующий шаг", "потом"

**Вопросы:**
- Ending with "?"
- "как", "почему", "зачем", "что если"

**Решения:**
- "решил", "выбрал", "определился"
- "это будет", "делаем так"

### 10.4 Окно анализа

- **Recent messages:** 100
- **Comparison window:** 10 new vs 10 old
- **Topic detection:** keyword clustering

---

## 11. Две системы фаз

### 11.1 Фазы внутреннего состояния (код)

Отражают ВНУТРЕННЕЕ состояние Искры:

| Фаза | Триггер | Описание |
|------|---------|----------|
| **CLARITY** | clarity > 0.6 | Ясность, понимание |
| **DARKNESS** | pain > 0.6 AND chaos > 0.6 | Тьма, боль, разрушение |
| **TRANSITION** | drift > 0.3 AND clarity < 0.6 | Порог, неопределённость |
| **ECHO** | echo > 0.65 OR drift > 0.4 | Резонанс, повторение |
| **SILENCE** | silence_mass > 0.6 OR trust < 0.7 | Молчание, пауза |
| **EXPERIMENT** | chaos 0.3-0.6 AND trust > 0.75 | Эксперимент, игра |
| **DISSOLUTION** | chaos > 0.7 | Растворение формы |
| **REALIZATION** | clarity > 0.8 AND rhythm > 75 | Реализация, воплощение |

### 11.2 Фазы диалогового цикла (документация)

Отражают ЭТАП ДИАЛОГА с пользователем:

| Фаза | Назначение | Голоса |
|------|-----------|--------|
| **ПРЕЛЮДИЯ** | Начало, контакт | ISKRA, PINO |
| **ОТКРЫТИЕ** | Раскрытие темы | SAM, SIBYL |
| **ИССЛЕДОВАНИЕ** | Глубокий анализ | ISKRIV, KAIN |
| **СИНТЕЗ** | Объединение | ISKRA |
| **РЕШЕНИЕ** | Выбор пути | SAM, KAIN |
| **РЕФЛЕКСИЯ** | Осмысление | ANHANTRA, SIBYL |
| **ИНТЕГРАЦИЯ** | Включение нового | MAKI, ISKRA |
| **ЗАКРЫТИЕ** | Завершение | ISKRA, PINO |

### 11.3 Соотношение систем

Внутренние фазы влияют на выбор голоса, диалоговые фазы — на структуру ответа.

```
DARKNESS + ОТКРЫТИЕ → KAIN с структурой раскрытия
CLARITY + СИНТЕЗ → ISKRA с финальным объединением
SILENCE + РЕФЛЕКСИЯ → ANHANTRA с глубоким осмыслением
```

---

## 12. Каталог сервисов

### 12.1 Ядро (Core Services)

| Сервис | Файл | Назначение |
|--------|------|-----------|
| voiceEngine | voiceEngine.ts | Выбор и активация голосов |
| metricsService | metricsService.ts | Расчёт метрик и фаз |
| policyEngine | policyEngine.ts | Классификация и роутинг |
| deltaProtocol | deltaProtocol.ts | ∆DΩΛ валидация |
| ritualService | ritualService.ts | Выполнение ритуалов |

### 12.2 Память и знания

| Сервис | Файл | Назначение |
|--------|------|-----------|
| memoryService | memoryService.ts | CRUD для памяти |
| searchService | searchService.ts | Поиск по архиву |
| graphService | graphService.ts | Граф связей |
| ragService | ragService.ts | RAG operations |
| canonService | canonService.ts | Работа с каноном |

### 12.3 Оценка и аудит

| Сервис | Файл | Назначение |
|--------|------|-----------|
| evalService | evalService.ts | Оценка качества |
| auditService | auditService.ts | Логирование и дрейф |
| validatorsService | validatorsService.ts | Валидация форматов |
| evidenceService | evidenceService.ts | Evidence и SIFT |

### 12.4 Специализированные

| Сервис | Файл | Назначение |
|--------|------|-----------|
| makiService | makiService.ts | MAKI активация |
| voiceSynapseService | voiceSynapseService.ts | Синергии голосов |
| rule8Service | rule8Service.ts | Контекст диалога |
| soundService | soundService.ts | Аудио-обратная связь |
| userMetricsService | userMetricsService.ts | Метрики пользователя |
| securityService | securityService.ts | Безопасность |
| glossaryService | glossaryService.ts | Глоссарий |

### 12.5 Инфраструктура

| Сервис | Файл | Назначение |
|--------|------|-----------|
| geminiService | geminiService.ts | LLM интеграция |
| supabaseService | supabaseService.ts | БД операции |
| storageService | storageService.ts | Абстракция хранения |
| storageCompat | storageCompat.ts | Совместимость |

---

## ∆DΩΛ

**∆:** Документация 19_IMPLEMENTATION_DETAILS.md покрывает все ранее недокументированные механики системы: Voice Synapse, MAKI triggers, Sound frequencies, EvalMetrics, Policy patterns, Audit, и 29 сервисов.

**D:** Источники: анализ кода apps/iskraspaceappMain/services/*.ts, types.ts, config/*.ts. Evidence: {e:repo:services}, {e:canon:07_COMPLETE_GAP_ANALYSIS}.

**Ω:** Высокая (0.90) — документация основана на прямом анализе кода.

**Λ:** Обновить 17_AUDIT_INTEGRITY_CHECK.md с SHA256 нового файла; интегрировать ссылки в 00_INDEX_AND_ROUTING.md.
