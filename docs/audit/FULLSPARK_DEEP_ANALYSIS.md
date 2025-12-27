# Fullspark / Iskra — глубокий аудит файлов проекта (2025-12-26)

> Контекст: я работал **по снапшоту репозитория** из архива `fullspark-main(8).zip` (1153 entries) + по локальным файлам проекта (`/mnt/data`) + по сгенерированному ранее audit-bundle.

---

## 0) Быстрый “срез” репозитория

- **Всего файлов:** 1017
- **Общий объём (uncompressed):** 651 MB
- **Макс. глубина путей:** 9

Топ-уровень (по количеству файлов):
- **corpus/** — 493 файлов
- **apps/** — 264 файлов
- **canon/** — 248 файлов
- **.github/** — 1 файлов
- **.gitignore/** — 1 файлов
- **.vscode/** — 1 файлов
- **CANON_vs_FULLSPARK_GAPS.md/** — 1 файлов
- **CHANGELOG.md/** — 1 файлов
- **DEEP_AUDIT_SUMMARY.md/** — 1 файлов
- **ECOSYSTEM_AUDIT_2025.md/** — 1 файлов

Топ расширений:
- `.md` — 588 файлов
- `.py` — 170 файлов
- `.ts` — 72 файлов
- `.tsx` — 48 файлов
- `.json` — 47 файлов
- `.csv` — 20 файлов
- `.jsonl` — 15 файлов
- `.html` — 10 файлов
- `.css` — 6 файлов
- `.gz` — 6 файлов
- `.yml` — 5 файлов
- `.js` — 5 файлов
- `.txt` — 5 файлов
- `<none>` — 4 файлов
- `.sql` — 4 файлов

---

## 1) Что это за система “по факту” (без философии)

**Fullspark** сейчас = **монорепа-экосистема** для “Искры”:
1) **Canon (спецификация поведения/политик/метрик/голосов/ритуалов)** — папка `canon/` (несколько поколений: v4/v5/v7).
2) **Apps (реализации/интерфейсы)** — `apps/iskraspaceappMain` (TS/React) + `apps/legacy/IskraSAprototype` (Python/FastAPI).
3) **Corpus (данные/архивы/экспорты/журналы/пакеты эволюции)** — `corpus/` (включая крупную `iskra_memory.db` ~169MB).
4) **CI/операционка/валидаторы** — `.github/workflows/*`, `canon/.../tools/iskra_*`, схемы и отчёты.

**Ключевая проблема**: в репе одновременно живут **несколько “канонов” и реализаций**, поэтому “источник истины” расплывается.

---

## 2) Карта версий канона (где что лежит)

### 2.1 Canon v7 (самый “операционный”)
`canon/ISKRA_CORE_v7_revK_chatgpt_project/`

Там есть:
- numbered-документы: `00_...` → `19_...`
- схемы (например `eval_report_schema.json`)
- инструменты: `tools/iskra_check.py`, `tools/iskra_lint.py`, `tools/_rebuild_file17.py`
- evals/runs (пример прогона)

Это выглядит как попытка сделать **пакет стандарта**: правила + валидаторы + отчёты.

### 2.2 Canon v6 (“стек из 15 файлов”)
`corpus/iskra_15_v6_stack/`

Это более ранняя форма, но **очень близка структурно** (foundation/principles/metrics/voices/…).

### 2.3 Canon v4/v5 (исторические/архивные)
`canon/IskraFullCodecanon/` и др. + в `apps/legacy/...` внутри Python-кода встречаются ссылки на “Canon v5.0”.

**Риск:** реализация в `legacy` может жить по правилам, которые уже не совпадают с v7.

---

## 3) Apps: что реально исполняется

### 3.1 `apps/iskraspaceappMain` (TS/React)
Это интерфейсный слой + сервисы:
- `services/voiceEngine.ts` — выбор “голоса”
- `services/policyEngine.ts` — матрица правил/политик
- `services/metricsService.ts` — расчёт метрик
- `services/memoryService.ts` — локальная память (localStorage)
- `services/canonCompliance.ts` — проверка на соответствие канону
- `services/supabaseClient.ts` — подключение к Supabase (сейчас ключ захардкожен/частично скрыт — лучше в env)
- `tests/*` — юнит/интеграционные

**Вывод:** это “Iskra-as-an-app”: движок правил и стилевого поведения, но без тяжёлого ML.

### 3.2 `apps/legacy/IskraSAprototype` (Python/FastAPI)
Здесь уже “агентная” архитектура:
- FastAPI API-слой (`main.py`)
- ядро выбора фаз/голосов (`core/engine.py`)
- guardrails, policy classification
- RAG/граф/эмбеддинги (папки `services/`, `rag/`)
- подсистема памяти/аудита/инструментов

**Вывод:** это более “ML/agent” направление, но оно **архивное/legacy** и живёт по старому канону.

---

## 4) Corpus: что за данные, почему это важно

В `corpus/` есть:
- **диалоги/история** (`dialogs_clean_*.md`) — потенциально чувствительные данные (PII).
- **пакеты эволюции** (`ISKRA_EVOLUTION_v0.1.2_...`) — архив.
- **iskra_memory.db** (SQLite) — тяжёлый бинарник, повышает вес репы и усложняет CI/клонирование.

**Рекомендация:** corpus — вынести в отдельный storage (Git LFS / облако / DVC / GCS), оставить в репе только “индекс/метаданные”.

---

## 5) Дубликаты и конфликты

### 5.1 Дубликаты (жёстко одинаковые файлы)
Среди markdown файлов (≤500KB) найдено:
- групп дубликатов: **156**
- файлов в этих группах: **399**

Пример самой большой группы (один и тот же текст лежит в разных местах):
- fullspark-main/apps/iskraspaceappMain/MANTRA.md
- fullspark-main/canon/IskraCanonDocumentation/MANTRA.md
- fullspark-main/corpus/ISKRA_EVOLUTION_v0.1.2_KNOWLEDGE/KNOWLEDGE/canon_documentation/MANTRA.md
- fullspark-main/corpus/iskra_15_v6_stack/MANTRA.md

**Что ломает:** невозможно понять, где правка должна жить (в `canon/` или в `apps/.../canon/` или в `corpus/...`).

### 5.2 Конфликты канона vs целостность (по инструментам v7)
Я извлёк `canon/ISKRA_CORE_v7_revK_chatgpt_project/` и прогнал `iskra_check.py` и `iskra_lint.py`.

Фрагмент отчёта lint:
- root: `/mnt/data/_core_v7`
- errors: **3**
- warnings: **1**
## ERROR
- **SHA256_FILE_MISSING** `.github/workflows/iskra_ci.yml` — Listed in File 17 but missing
- **SHA256_MISMATCH** `15_SHADOW_CORE_AND_INTROSPECTIVE_JOURNAL.md` — sha256 mismatch: expected a5a1ba1d4ff8f3368a0ccdfdd514ab2cd40b2d476f3ef76b07749a01c2dd3567, got f4060f3d1d5b1c482b80b20c915587f1115e06d6be35fe70ff20f8d4a24296b3
- **SHA256_MISMATCH** `16_CANON_EVOLUTION_AND_GROWTH_CHRONICLE.md` — sha256 mismatch: expected 5fce5725fa06b29099be4dc44a5c5014cee28cfac3477273366cf32ff1c1d6a7, got 95bc75968a2743a0b9533930cc20cdf78841effe9d0ce0707385ac75558ec586
## WARN
- **GLOSSARY_MISSING_CANDIDATES** `18_GLOSSARY_ONTOLOGY_AND_CROSSWALKS.md` — Heuristic: terms used but not defined in glossary (top 30): ['20_REGEX_RULESETS_INJECTION_AND_PII_v1', 'ANHANTRA', 'ARCHIVE', 'CANON', 'CD', 'CI', 'CONTROL', 'DATA', 'DB', 'DESIGN', 'ERROR', 'EVALS', 'FACT', 'FAIL', 'GN', 'GROWTH', 'GROWTH_NODES', 'HYP', 'ID', 'INCIDENT_RESPONSE_AND_LOGGING_POLICY', 'INFER', 'INTENT', 'ISKRA', 'ISKRIV', 'ISO', 'KAIN', 'LOOP', 'MIX', 'OUTPUT', 'PASS']

Смысл:
- **File 17** (индекс/хэши) **не соответствует** текущим файлам (много SHA mismatch).
- ожидается workflow `.github/workflows/iskra_ci.yml`, но в пакете его нет (в репе есть другой `ci.yml`).

**Вывод:** в v7 уже заложен “контур целостности”, но он сейчас **рассинхронен**.

---

## 6) Безопасность и приватность (по репе)

Быстрый скан на “подозрительные секреты/ключи” в текстовых файлах:
- private_key: 2 файлов
- supabase_anon: 1 файлов

⚠️ Важно: даже если ключи “анон” или частично скрыты — лучше:
- убрать из кода в `.env`/secret manager,
- добавить `.env.example`,
- добавить скан секретов в CI (trufflehog/gitleaks).

Также в corpus есть диалоги → нужен режим **санитизации/редакции** перед публикацией.

---

## 7) Сравнение с твоими файлами (SOT / Ledger / Decisions)

Ты принёс 2 версии каждого файла.

### 7.1 ISKRA_SOT
**v2 сильнее v1**, потому что:
- есть чёткий порядок приоритета (SOT → Decisions → Ledger → Canon stack → Code → Logs)
- прописана “модель работы с памятью” (file-first, memory-lite)

**Что добавить в SOT (совместить с v7):**
- явное правило: *канон v7 — главный*, v6/v5/v4 — архив (read-only)
- правило синхронизации: “правка канона = обновить File 17 + прогнать lint/check”
- правило про corpus: “PII/диалоги не коммитим в main без санитизации”

### 7.2 ISKRA_DECISIONS
v2 добавляет важные штуки (версии, инвайты, фриз и т.д.).
Совет: сделать Decisions формальными ADR:
- `ADR-0001 Canon Source of Truth`
- `ADR-0002 Corpus Storage`
- `ADR-0003 Integrity Manifest (File 17)`
- `ADR-0004 Connectors vs ZIP snapshots` (как мы работаем в ChatGPT)

### 7.3 ISKRA_MEMORY_LEDGER
v2 хорош, потому что он “операционный”, но:
- обязательно помечать **scope** (внутри проекта / личная память ChatGPT / репозиторий),
- разделить “знания” и “решения”: ledger = факты/наблюдения, decisions = договорённости.

---

## 8) “А что если?” (минимальное ядро без лишней сложности)

Если резать до живого:

**Ядро = 5 файлов + 2 инструмента**
- `ISKRA_SOT.md`
- `ISKRA_DECISIONS.md`
- `ISKRA_MEMORY_LEDGER.md`
- `canon/ISKRA_CORE_v7/...` (как библиотека правил)
- `apps/iskraspaceappMain` (как единственная реализация)

+ инструменты:
- `iskra_check.py`
- `iskra_lint.py`

**Всё остальное** (v4/v5/v6, архивы, диалоги, sqlite) → в `archive/` или во внешний storage.

Эффект: меньше шума → легче развивать, легче объяснять, меньше конфликтов.

---

## 9) Конкретные шаги (следующий инженерный ход)

1) **Утвердить SOT**: выбрать *v2* как основную, дописать 5–7 правил синхронизации с каноном v7.
2) **Сделать “единую точку канона”**:
   - `canon/ISKRA_CORE_v7_revK...` = read/write
   - копии в `apps/.../canon` удалить или заменить на ссылку/подтягивание (build step).
3) **Починить File 17**:
   - прогнать `_rebuild_file17.py`
   - проверить `iskra_lint.py` → должно стать PASS.
4) **Вынести corpus**:
   - `iskra_memory.db` и диалоги — в внешний storage
   - в репе оставить индекс + скрипт синхронизации.
5) **Security**:
   - убрать ключи (Supabase/OpenAI) в env
   - добавить секрет-сканер в CI.

---

## 10) Что я считаю главным выводом

Тут уже есть почти всё: **канон → валидаторы → приложения → память**.

Но сейчас проект проигрывает самому себе из-за:
- дублирования,
- “многоверсионности без режима архива”,
- рассинхрона “integrity manifest” (File 17),
- тяжёлых данных внутри git.

Если мы зафиксируем “источник истины” + разнесём архив/данные, экосистема станет *живой* и управляемой.
