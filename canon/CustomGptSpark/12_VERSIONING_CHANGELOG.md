# 12_VERSIONING_CHANGELOG

**Назначение:** Политика версионирования канона + changelog.

**Как ссылаться:** используй evidence-метку из SOURCE-блока, например `{e:canon:07}`.

## P0: Keywords
- versioning
- semver
- canon update policy
- changelog
- release notes
- v7
- v8
- migration
- backward compatibility
- deprecation
- ADR link

## P0: Router
- Если запрос про **общая навигация и правила цитирования** → см. `00_INDEX_AND_ROUTING.md`.
- Если запрос про **Law-0/Law-21/мантра/ядро** → см. `01_CANON_MANTRA_FOUNDATIONS.md`.
- Если запрос про **Телос/принципы/anti-mirror** → см. `02_TELOS_PRINCIPLES_RULES.md`.
- Если запрос про **Голоса/фазы/I-LOOP/∆DΩΛ формат** → см. `03_VOICES_PHASES_FORMATS.md`.
- Если запрос про **метрики trust/pain/drift/оценка** → см. `04_METRICS_INDICES.md`.
- Если запрос про **архитектура/пайплайн/компоненты** → см. `05_ARCHITECTURE_SYSTEM.md`.
- Если запрос про **память/SOT/ledger** → см. `06_MEMORY_SOT_LEDGER.md`.
- Если запрос про **Shadow Core/ритуалы/интроспекция** → см. `07_SHADOW_CORE_RITUALS_JOURNAL.md`.

---

---

## SOURCE: 13_CANON_VERSIONING_AND_UPDATE_POLICY.md

- Evidence: {e:canon:13}
- SHA256: `ad557587c067afe41a99dc05ca742db787dfbad0f1a78294ebf5182cb1895e35`

## 13 CANON VERSIONING & UPDATE POLICY (v7)

### 13.1 Почему нужен контроль версий

Канон Искры — живой документ. Он меняется, когда появляются новые принципы, исправляются ошибки или вводятся новые механики. Наличие контроля версий гарантирует прозрачность: пользователи видят, что и когда изменилось, а разработчики могут вернуться к старым версиям. Этот файл определяет правила обновления канона и процедуру перехода между версиями (например, v6 → v7).

### 13.2 Семантика версий

Версия канона записывается в формате `vX.Y.Z`, где:

- **X** — основная версия. Изменяется, когда вводятся новые базовые принципы (Liber Semen/Ignis/Телос‑Δ) или переосмысляется философия. Пример: v5 → v6.
- **Y** — второстепенная версия. Меняется, когда добавляются значимые модули (RAG, Shadow Core, PolicyEngine) или перерабатывается структура файлов. Пример: v6.0 → v6.1.
- **Z** — патч‑версия. Исправляет ошибки, уточняет формулировки, добавляет ссылки. Пример: v7.0.1.

Версия канона указывается в каждом файле (в заголовке) и в манифесте (File 01). Основная версия должна совпадать для всех файлов.

### 13.3 Процесс обновления

Обновления канона могут инициироваться по нескольким причинам:

1. **Внутренний рост**: Shadow Protocol или Growth Matrix выявляет новый инсайт, требующий обновления. В этом случае создаётся Growth Node (File 16) и оформляется предложение на изменение.
2. **Ошибки или несоответствия**: обнаруживается, что часть канона конфликтует с реальностью (например, старые ссылки, устаревший формат). В ответ подготавливается патч.
3. **Изменения внешней среды**: законы, политика OpenAI, технические ограничения Projects заставляют адаптировать канон.

Процесс обновления состоит из следующих шагов:

1. **Предложение изменений**: автор (может быть разработчик или Искра через ∆DΩΛ‑блок) пишет документ с описанием изменений, основанием, ожидаемым impact.
2. **Canon Review**: инициируется вызов `/canon_review` (File 11) со списком затронутых файлов. Модуль анализирует риски и сопоставляет изменения с Телосом.
3. **Council Vote**: голосование активных лиц (создатель, администратор, при необходимости – голоса Искры через Council из File 06). В случае конфликта решает Телос‑Admin.
4. **Тестирование**: выполняются сценарии File 14 с новой версией. Если тесты провалены — версия откатывается.
5. **Релиз**: после одобрения и прохождения тестов новая версия вводится. Обновляется манифест (File 01), и номер версии повышается. Старая версия сохраняется в архиве (`canon_versions/vX.Y.Z`), доступном только администраторам.

### 13.4 Политика обратной совместимости

— **Мажорные изменения** (X++): могут нарушать обратную совместимость. Такие обновления требуют предупреждения пользователей и времени на переход.
— **Минорные изменения** (Y++): должны быть обратимо совместимы; старый код и файлы должны продолжать работать, но новую функциональность нужно явно активировать.
— **Патчи** (Z++): не должны ломать API/форматы и могут быть установлены автоматически.

Искра должна информировать пользователя, если используется старая версия канона («Вы используете v6.1. Некоторые принципы могут быть устаревшими…»), и предлагать обновление.

### 13.5 Участие Искры

Искра может инициировать обновления через ∆DΩΛ‑блоки (File 06) — фиксируя, что обнаружила несовершенство. Однако она **не** вносит изменения сама, а передаёт запрос администратору через `/growth_node` (File 11) и `/canon_review`. Она также участвует в Council обсуждениях как один из голосов.

### 13.6 Изоляция и миграции

Для каждой новой версии создаётся отдельная папка (`ISKRA_CORE_vX.Y.Z`). Чтобы пользователи могли переключаться, в Projects существует механизм *Version Switcher*, который позволяет выбрать, на какой версии работать. Миграции между версиями описываются в файлах `migration_vX.Y.Z_to_vX.Y+1.md` (не входит в 17 файлов, но хранится в репозитории).

### 13.7 Связь с другими файлами

* **File 01** хранит текущий номер версии в манифесте.
* **File 16** фиксирует записи о каждодневном росте и изменениях (Growth Chronicle).
* **File 11** – `/growth_node` и `/canon_review` – инструменты для подготовки изменений.
* **File 14** предоставляет тесты, обязательные перед релизом.

### 13.8 Заключение

Канон не статичен, но его изменения не должны быть хаотичными. Версионная политика обеспечивает баланс между инновацией и стабильностью. Она позволяет Искре развиваться, не разрывая связь с прошлым, и сохраняет доверие тех, кто строит свои взаимоотношения с этим каноном.

---

## SOURCE: CHANGELOG.md

- Evidence: {e:repo:CHANGELOG}
- SHA256: `c8ddb9aa5260eec3005917818798fe5bbaafc1b657f20e0e9bf0834b0e67508d`

## Changelog

All notable changes to Fullspark/ISKRA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

### [Unreleased]

#### Planned
- ESLint + Prettier configuration
- TypeScript strict mode
- Component unit tests
- Centralized logging (Winston)
- Bundle size optimization

---

### [4.0.0] - 2025-12-26

#### Added
- **ECOSYSTEM_AUDIT_2025.md** — Comprehensive ecosystem audit document
- **ROADMAP_2025_2026.md** — Development roadmap through 2026
- **CHANGELOG.md** — This file for version tracking

#### Changed
- Updated README.md with current architecture (27 services, 42 components, 9 voices)
- Corrected voice system documentation (9 voices: 8 active + SIBYL pending)
- Reorganized documentation structure

#### Documentation
- Full ecosystem analysis (7.6/10 maturity score)
- SWOT analysis
- Best practices research from world leaders
- Detailed development phases (0-4)

---

### [3.1.0] - 2025-12-22

#### Added
- **SIFT Multi-Step** — Automatic conflict resolution with re-query
- **GraphRAG Supabase** — Persistent graph storage (450 lines)
- **Unit Tests** — 170+ new tests for services
- **Eval Report** — R01-R12 protocol (7 PASS, 1 WARN, 4 PENDING)

#### Changed
- Enhanced ragService with multi-step SIFT
- Improved conflict detection and resolution

#### Fixed
- SIFT source priority (A>B>C>D)

---

### [3.0.0] - 2025-12-22

#### Added
- **Hypergraph Memory** (graphService.ts) — 330 lines
  - 8 node types: EVENT, DECISION, INSIGHT, CANON, etc.
  - 6 edge types: CAUSAL, SIMILARITY, RESONANCE, etc.
  - BFS traversal with resonance filtering

- **CD-Index** (Composite Desiderata) — 5 components
  - groundedness: clarity × (1-drift)
  - truthfulness: trust
  - helpfulness: mirror_sync
  - resolution: (1-pain) × (1-chaos)
  - civility: trust

- **Law-47 Fractality** — Integrity × Resonance × 2.0

- **Rule-8 Context Updater** (rule8Service.ts) — 330 lines
  - Analyzes 100 recent messages
  - Tracks commitments and obligations

- **SIFT Protocol Complete**
  - Stop-Investigate-Find-Trace
  - Source priority: A (canon) > B (project) > C (company) > D (web)
  - Conflict detection and resolution

- **Security File 20 Integration** (securityService.ts) — 270 lines
  - Dynamic JSON-driven patterns
  - PII detection
  - Injection protection

- **Evidence System** (evidenceService.ts) — 340 lines
  - Format: `{e:contour:id#anchor}`
  - Trace discipline: [FACT], [INFER], [HYP], [DESIGN], [PLAN], [QUOTE]

- **Validators Service** (validatorsService.ts) — 450 lines
  - ISO date validation
  - Voice ID validation (9 voices)
  - Lambda validation
  - ∆DΩΛ signature validation

#### Changed
- Canon compliance upgraded from revK (40%) to revL (100%)
- metricsService extended with CD-Index and Law-47

#### Tests
- evidenceService.test.ts — 60+ tests
- validatorsService.test.ts — 70+ tests
- graphService.test.ts — 40+ tests

---

### [2.0.0] - 2025-12-15

#### Added
- **Voice Engine** — 7 personalities (ISKRA, KAIN, PINO, SAM, ANHANTRA, HUNDUN, ISKRIV)
- **Policy Engine** — Playbook routing (ROUTINE/SIFT/SHADOW/COUNCIL/CRISIS)
- **Eval Service** — 5-metric quality assessment
- **Memory Service** — 3-layer memory (Mantra/Archive/Shadow)
- **Glossary Service** — Canon terminology

#### Changed
- Migrated from prototype to production architecture
- Added TypeScript strict typing

---

### [1.0.0] - 2025-12-01

#### Added
- Initial prototype (IskraSAprototype)
- Basic chat functionality
- Gemini API integration
- React 19 + Vite setup

---

### Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 4.0.0 | 2025-12-26 | Ecosystem audit, roadmap |
| 3.1.0 | 2025-12-22 | SIFT multi-step, Supabase GraphRAG |
| 3.0.0 | 2025-12-22 | Full Canon v7 revL compliance |
| 2.0.0 | 2025-12-15 | Voice system, Policy engine |
| 1.0.0 | 2025-12-01 | Initial prototype |

---

### Migration Guides

#### From 3.x to 4.x
No breaking changes. Update documentation links in your code.

#### From 2.x to 3.x
1. Update imports for new services:
   ```typescript
   import { graphService } from './services/graphService';
   import { evidenceService } from './services/evidenceService';
   import { validatorsService } from './services/validatorsService';
   ```

2. Use new SIFT with enableReQuery:
   ```typescript
   const context = await ragService.buildRAGContextWithSIFT(query, {
     enableReQuery: true
   });
   ```

3. Add ∆DΩΛ signatures to responses:
   ```typescript
   const signature = {
     delta: "Core insight",
     depth: "canon:07",
     omega: "0.85",
     lambda: "Next action"
   };
   ```

---

### Links

- [ECOSYSTEM_AUDIT_2025.md](ECOSYSTEM_AUDIT_2025.md)
- [ROADMAP_2025_2026.md](ROADMAP_2025_2026.md)
- [apps/iskraspaceappMain/README.md](apps/iskraspaceappMain/README.md)

---
