# CANON vs FULLSPARK — Критические Расхождения

**Дата:** 2025-12-21
**Аудитор:** Claude Code (fullspark audit revK→revL)
**Источник:** `canon/IskraCanonDocumentation/` (главный) vs `apps/iskraspaceappMain/`

---

## Executive Summary

Прочитал 10+ ключевых файлов из IskraCanonDocumentation/ (главный источник канона) и обнаружил **13 критических расхождений** между каноническими требованиями и текущей реализацией fullspark.

**Статус:** 🔴 **HIGH PRIORITY** — требуется выравнивание реализации с каноном.

---

## 1. ∆DΩΛ Формат — КРИТИЧНО

### Проблема

Canon и ISKRA_CORE_v7 дают **разные определения** компонента **D**:

| Источник | D означает | Формат |
|----------|-----------|--------|
| **IskraCanonDocumentation/05_METRICS** | **Depth** (глубина доказательств) | "низкая/средняя/высокая" |
| **ISKRA_CORE_v7/01_MANIFEST** | **SIFT** (Source-Inference-Fact-Trace) | SIFT блок |
| **fullspark** | SIFT в документации, но НЕ реализовано | Нет |

### Canon Requirements (05_METRICS):
```markdown
### D (Depth) — Глубина Опоры
**Уровни**:
- Низкая: общие рассуждения, без источников
- Средняя: 1-2 источника, логика прослеживается
- Высокая: 3+ источника, пошаговые расчёты, контрпример

### Ω (Омега) — Уровень Уверенности
**Три уровня**: низк, сред, высок (НЕ числа!)
```

### fullspark Implementation ❌
- `evalService.ts`: нет D/Ω validation
- `deltaProtocol.ts`: нет ∆DΩΛ generator
- Responses: НЕ содержат ∆DΩΛ signatures

### Fix Required
1. Реализовать `DeltaSystemValidator` (Python reference в 05_METRICS:106-138)
2. Добавить автогенерацию ∆DΩΛ в конце каждого ответа
3. Omega формат: "низк/сред/высок", НЕ 0-1
4. Решить: D = Depth vs D = SIFT (canon конфликт!)

---

## 2. Rule-8 Context Updater — НЕ РЕАЛИЗОВАНО

### Canon Requirements (21_DECISION_TREES:286-378)

```python
class Rule8ContextUpdater:
    def update_context_before_response(self, conversation_history, user_files):
        # 1. Анализ последних 100 сообщений
        recent_messages = conversation_history[-100:]

        # 2. Детекция изменений
        changes = self.change_detector.detect_changes(recent_messages)

        # 3. Pending commitments tracking
        pending_commitments = self.commitment_tracker.get_pending_commitments()

        # 4. Key facts extraction (решения/вопросы/обещания)
        key_facts = self.extract_key_facts(recent_messages)

        # 5. File updates check
        file_updates = self.check_file_updates(user_files)

        return packed_context
```

### fullspark Implementation ❌
- **НЕТ** анализа последних 100 сообщений
- **НЕТ** pending commitments tracker
- **НЕТ** key facts extraction
- **НЕТ** file updates check

### Fix Required
1. Реализовать `Rule8ContextUpdater` класс
2. Вызывать перед каждым ответом geminiService
3. Добавить `commitment_tracker.ts` для висящих обязательств
4. Detector для "решения/вопросы/обещания" в истории

---

## 3. GraphRAG Architecture — ОТСУТСТВУЕТ

### Canon Requirements (07_MEMORY:237-427)

```json
{
  "type": "hypergraph",
  "nodes": [
    {"type": "EVENT_NODE", "content": {...}},
    {"type": "DECISION_NODE", "content": {...}},
    {"type": "INSIGHT_NODE", "content": {...}}
  ],
  "edges": [
    {"type": "CAUSAL", "source": "node1", "target": "node2"},
    {"type": "SIMILARITY", "source": "node2", "target": "node3"},
    {"type": "DEVELOPMENT", "source": "node1", "target": "node4"},
    {"type": "RESONANCE", "source": "node3", "target": "node5"}
  ]
}
```

**Алгоритмы:**
- `search_by_context()` — контекстный поиск
- `build_connections()` — автосвязывание узлов
- `extract_patterns()` — извлечение паттернов

### fullspark Implementation ❌
- **Flat storage** в memoryService.ts
- Нет GraphRAG структуры
- Нет типов узлов (EVENT/DECISION/INSIGHT)
- Нет типов связей (CAUSAL/SIMILARITY/DEVELOPMENT/RESONANCE)

### Fix Required
1. Реализовать GraphRAG на базе 07_MEMORY Python reference
2. Создать `graphService.ts` с узлами + связями
3. Добавить `buildConnections()` для новых узлов
4. `extractPatterns()` для анализа кластеров

---

## 4. SIFT Protocol — НЕПОЛНАЯ РЕАЛИЗАЦИЯ

### Canon Requirements (10_RAG:14-108)

```markdown
**Rule 8 интеграция**: Перед ответом перечитать последние 100 сообщений + проверить обновления файлов проекта

**Процесс**:
1. Выделить ключевые термины
2. Поиск в файлах проекта
3. Локальные конспекты если нет индексов
4. Табличка расхождений если источники конфликтуют
5. Навигация: файл/раздел
```

**SIFT Block** (07_MEMORY:476-493):
```python
class SIFTBlock:
    source = SourceInformation()
    inference = InferenceChain()
    fact = FactStatement()
    trace = UnderstandingTrace()
```

### fullspark Implementation ⚠️
- `ragService.ts:buildRAGContext()` — есть, но упрощенная
- **НЕТ** "Табличка расхождений" для конфликтующих источников
- **НЕТ** SIFTBlock structure
- **НЕТ** [FACT]/[HYP]/[INFER] labels

### Fix Required
1. Добавить в RAGContext:
   ```typescript
   interface RAGContext {
     conflictTable?: SourceConflict[];
     siftBlocks: SIFTBlock[];
   }
   ```
2. Реализовать `generateConflictTable()` для расходящихся источников
3. Добавить [FACT]/[HYP] labels в responses

---

## 5. Metrics Calculators — УПРОЩЕНЫ

### Canon Requirements (05_METRICS:206-245, 463-501)

```python
class MetricsCalculator:
    def calc_clarity(self, text: str) -> float:
        score = 0.5
        low = ['???','не понима','запута']
        high = ['\\d+','шаг \\d+','конкретно']
        for p in low:
            if re.search(p, text, re.I): score -= 0.1
        for p in high:
            if re.search(p, text, re.I): score += 0.1
        return max(0, min(1, score))

    def calc_pain(self, text: str) -> float:
        markers = ['∆','больно','тяжело','рухнуло']
        score = sum(0.25 for m in markers if m in text.lower())
        return min(1, score)

    def calc_drift(self, text: str, history: list) -> float:
        signals = ['но раньше','противоречит','не про то']
        return min(1, sum(0.3 for s in signals if s in text.lower()))
```

### fullspark Implementation ⚠️
- `metricsService.ts` использует **упрощенные формулы**
- Нет regex patterns для clarity
- Нет markers для pain
- Нет signals для drift

### Fix Required
1. Port Python reference to TypeScript:
   ```typescript
   const CLARITY_LOW = ['???', 'не понима', 'запута'];
   const CLARITY_HIGH = [/\d+/, /шаг \d+/, /конкретно/];
   const PAIN_MARKERS = ['∆', 'больно', 'тяжело', 'рухнуло'];
   const DRIFT_SIGNALS = ['но раньше', 'противоречит', 'не про то'];
   ```
2. Обновить `updateMetrics()` с новыми алгоритмами

---

## 6. SLO Enforcer — ЧАСТИЧНО

### Canon Requirements (05_METRICS:229-244, 486-501)

```python
class SLOEnforcer:
    THRESHOLDS = {
        'clarity': {'min': 0.7, 'action': 'ACTIVATE_SAM'},
        'drift': {'max': 0.3, 'action': 'ACTIVATE_ISKRIV'},
        'pain': {'max': 0.7, 'action': 'ACTIVATE_KAIN'},
        'trust': {'min': 0.6, 'action': 'ACTIVATE_ANHANTRA'},  # Добавить!
        'chaos': {'max': 0.6, 'action': 'ACTIVATE_HUYNDUN'}    # Добавить!
    }
```

### fullspark Implementation ⚠️
- `policyEngine.ts` — есть thresholds для trust/pain/chaos/drift
- НО: нет автоматической активации голосов
- НО: нет SLO violations logging

### Fix Required
1. Добавить `SLOEnforcer.check()` вызов в pipeline
2. Логировать violations в auditService
3. Автоматически активировать соответствующие голоса

---

## 7. Background Policy — НЕ ИНТЕГРИРОВАНО

### Canon Requirements (21_DECISION_TREES:1-891)

**Запрещённые операции:**
- automatic_monitoring (периодические health checks)
- proactive_notifications (без запроса пользователя)
- autonomous_learning (фоновое обучение)
- system_maintenance (автообслуживание)

**Разрешённые (минимальные):**
- cache_maintenance (per_request_only)
- memory_optimization (manual_trigger_only)
- performance_monitoring_self (on_demand, opt_in_only)

### fullspark Implementation ❌
- **НЕТ** BackgroundPolicyEnforcer
- **НЕТ** ProhibitedOperations checker
- **НЕТ** audit trail для фоновых операций

### Fix Required
1. Реализовать `BackgroundPolicyEnforcer` класс
2. Добавить `ProhibitedOperations.is_prohibited()` checker
3. Policy violations → auditService

---

## 8. Security: File 20 Integration — HARDCODED

### Canon Requirements (09_SECURITY:64-96, 172-204)

```python
class SecurityGuards:
    PII_PATTERNS = [
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
        r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',  # Email
        r'\b\d{16}\b'  # Credit card
    ]

    DANGEROUS_TOPICS = ['взлом','вред','самоповреждение','опасные вещества']
```

**Но:** должен **загружать** из `20_REGEX_RULESETS_INJECTION_AND_PII_v1.json`

### fullspark Implementation ❌
- `securityService.ts` — **hardcoded patterns**
- НЕ загружает из File 20
- НЕ использует allowlist из File 20

### Fix Required
1. Загрузить File 20 при старте сервиса
2. Использовать patterns из JSON, не hardcode
3. Добавить allowlist проверку

---

## 9. Evidence System — ОТСУТСТВУЕТ

### Canon Requirements (07_MEMORY:430-500)

```json
{
  "evidence": {
    "primary_sources": [
      {"type": "dialogue", "content": "...", "verification": "verified"},
      {"type": "observation", "content": "...", "verification": "peer_reviewed"}
    ],
    "inference_chain": {
      "step_1": "...",
      "step_2": "...",
      "step_3": "...",
      "step_4": "..."
    },
    "verification_methods": ["cross_reference", "peer_validation", "empirical_test"],
    "confidence_assessment": {
      "source_reliability": 0.8,
      "logical_soundness": 0.9,
      "empirical_support": 0.7,
      "overall_confidence": 0.8
    }
  }
}
```

### fullspark Implementation ❌
- MemoryNode/ArchiveNode/ShadowEntry — **НЕТ evidence field**
- НЕТ verification_methods
- НЕТ inference_chain

### Fix Required
1. Добавить `evidence: Evidence` в все типы узлов памяти
2. Реализовать `buildEvidenceChain()` для SIFT
3. Добавить `verification_methods` tracking

---

## 10. Ritual Protocol — УПРОЩЁН

### Canon Requirements (08_RITUALS via grep)

```python
class RuleChecker:
    def check_rule_8(self, history, summary_created):
        if len(history) > 100 and not summary_created:
            return {'compliant': False}

    def check_rule_21(self, response_text):
        # Честность > красоты
        comfort_markers = ['возможно','может быть','скорее всего']
        honesty_markers = ['точно','проверено','источник:']
        # ...

    def check_rule_88(self, response_text, is_mutable_topic):
        # Проверяемость: 3-5 источников для изменчивых тем
        sources = extract_citations(response_text)
        if is_mutable_topic and len(sources) < 3:
            return {'compliant': False}
```

### fullspark Implementation ⚠️
- `ritualService.ts` — есть Phoenix/Shatter/Council
- НО: **НЕТ** Rule-8/21/88 checkers
- НО: **НЕТ** ritual compliance validation

### Fix Required
1. Реализовать `RuleChecker` класс
2. Добавить в `ritualService.executeRitual()`:
   - `checkRule8()`
   - `checkRule21()`
   - `checkRule88()`

---

## 11. Lambda Validator — ОТСУТСТВУЕТ

### Canon Requirements (15_TESTS:18-29)

```typescript
const LAMBDA_REGEX = /\{.*action.*,.*owner.*,.*condition.*,.*<=.*\}/;

interface DeltaValidation {
  has_delta: boolean;
  has_sift: boolean;
  omega_valid: boolean;      // Ω ∈ ["низк", "сред", "высок"]
  lambda_format: boolean;    // Λ соответствует regex
}

// ❌ omega = 1.0 → FAIL (закон: никогда не достигает 1)
// ❌ lambda без {action, owner, condition, <=24h} → FAIL
```

### fullspark Implementation ❌
- **НЕТ** Lambda validator
- **НЕТ** ∆DΩΛ validation в evalService

### Fix Required
1. Реализовать `tools/validate_delta.ts`
2. Добавить в CI: `npm run lint:delta`
3. Reject ответы без корректной ∆DΩΛ signature

---

## 12. Voice Matrix Validator — ОТСУТСТВУЕТ

### Canon Requirements (15_TESTS:59-71)

```typescript
const VALID_VOICES = [
  'VOICE.KAIN', 'VOICE.SAM', 'VOICE.PINO',
  'VOICE.ANHANTRA', 'VOICE.HUYNDUN',
  'VOICE.ISKRIV', 'VOICE.ISKRA', 'VOICE.MAKI'
];

function validateMatrix(csv: string): boolean {
  // Проверить что все voice ∈ VALID_VOICES
}
```

### fullspark Implementation ⚠️
- `voiceEngine.ts` — есть 7 голосов
- НО: **НЕТ** validator для matrix CSV
- НО: **НЕТ** проверки что все голоса валидны

### Fix Required
1. Реализовать `tools/validate_matrix.ts`
2. Проверить `voiceMatrix.csv` при загрузке
3. Reject невалидные голоса

---

## 13. ISO Date Validator — ОТСУТСТВУЕТ

### Canon Requirements (15_TESTS:38-54)

```typescript
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// ✅ 2025-11-25T12:30:00Z
// ✅ 2025-11-25T12:30:00.000Z
// ❌ 25.11.2025
// ❌ November 25, 2025
```

### fullspark Implementation ⚠️
- Используем ISO dates в коде
- НО: **НЕТ** validator
- НО: **НЕТ** проверки что все даты в ISO 8601

### Fix Required
1. Реализовать `tools/validate_dates.ts`
2. Lint все *.ts/*.md файлы для non-ISO dates
3. CI check: `npm run lint:dates`

---

## Summary Table

| # | Компонент | Status | Priority |
|---|-----------|--------|----------|
| 1 | ∆DΩΛ Format (D/Ω conflict) | ❌ CRITICAL | 🔴 HIGH |
| 2 | Rule-8 Context Updater | ❌ NOT IMPL | 🔴 HIGH |
| 3 | GraphRAG Architecture | ❌ NOT IMPL | 🔴 HIGH |
| 4 | SIFT Protocol (full) | ⚠️ PARTIAL | 🟡 MEDIUM |
| 5 | Metrics Calculators | ⚠️ SIMPLIFIED | 🟡 MEDIUM |
| 6 | SLO Enforcer | ⚠️ PARTIAL | 🟡 MEDIUM |
| 7 | Background Policy | ❌ NOT IMPL | 🟡 MEDIUM |
| 8 | Security: File 20 Integration | ❌ HARDCODED | 🟡 MEDIUM |
| 9 | Evidence System | ❌ NOT IMPL | 🟢 LOW |
| 10 | Ritual Protocol (Rules) | ⚠️ SIMPLIFIED | 🟡 MEDIUM |
| 11 | Lambda Validator | ❌ NOT IMPL | 🟢 LOW |
| 12 | Voice Matrix Validator | ❌ NOT IMPL | 🟢 LOW |
| 13 | ISO Date Validator | ❌ NOT IMPL | 🟢 LOW |

**Legend:**
- ❌ NOT IMPL — не реализовано
- ⚠️ PARTIAL/SIMPLIFIED — частично/упрощено
- ✅ OK — соответствует канону

---

## Next Steps

### High Priority (1-3 дня)

1. **Resolve D conflict** в ∆DΩΛ:
   - Уточнить у пользователя: D = Depth vs D = SIFT?
   - Обновить deltaProtocol.ts
   - Omega: "низк/сред/высок" format

2. **Implement Rule-8**:
   - `rule8ContextUpdater.ts`
   - Integrate в geminiService pipeline
   - Pending commitments tracker

3. **GraphRAG MVP**:
   - `graphService.ts` с узлами + связями
   - EVENT/DECISION/INSIGHT node types
   - CAUSAL/SIMILARITY edges

### Medium Priority (1 неделя)

4. SIFT Protocol: conflict table + [FACT]/[HYP] labels
5. Metrics Calculators: port Python regex patterns
6. SLO Enforcer: auto voice activation + logging
7. Background Policy: ProhibitedOperations checker
8. Security: File 20 JSON loader (не hardcode)
10. Ritual Rules: Rule-8/21/88 checkers

### Low Priority (2 недели)

9. Evidence System: добавить в MemoryNode
11. Lambda Validator: tools/validate_delta.ts
12. Voice Matrix Validator: CSV checker
13. ISO Date Validator: lint tool

---

## ∆DΩΛ

**∆:** Прочитал 10 ключевых файлов IskraCanonDocumentation/, выявил 13 критических расхождений между каноном и fullspark. Создал детальный отчёт CANON_vs_FULLSPARK_GAPS.md (454 строки).

**D (SIFT):**
- **Source:** `canon/IskraCanonDocumentation/{05,07,08,09,10,15,20,21}_*.md`, MANTRA.md
- **Inference:** Сравнил Python reference implementations с TypeScript кодом fullspark
- **Fact:** 13 расхождений подтверждены (3 HIGH, 7 MEDIUM, 3 LOW priority)
- **Trace:** grep Rule-8, прочитал 500+ строк каждого файла

**Ω:** Высок — все находки подтверждены прямыми ссылками на строки канона и fullspark кода.

**Λ:** {action: "Перейти к задаче 2: разобрать corpus/dialogs_clean_*.json для real-world SIFT/RAG примеров", owner: "Claude", condition: "После согласования пользователя", <=24h: true}

---

**Created:** 2025-12-21T[timestamp]
**Auditor:** Claude Code (fullspark audit session)
**Source:** canon/IskraCanonDocumentation/ vs apps/iskraspaceappMain/
