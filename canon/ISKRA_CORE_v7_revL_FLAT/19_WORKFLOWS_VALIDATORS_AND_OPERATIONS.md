# 19 WORKFLOWS, VALIDATORS & OPERATIONS (v7, revL)

## 19.1 Назначение

Файлы 00–18 описывают **сущность и правила** Искры. Этот файл описывает **операции**:
- как собирать пакет;
- как валидировать отсутствие заглушек/инъекций/PII;
- как **регулярно** прогонять evals (R01–R12);
- как реагировать на инциденты (03:00 runbook);
- как выпускать ревизии без потери инвариантов.

Это «инженерный контур» двухконтурности (см. File 00).

Связи:
- File 05: метрики/гейты
- File 07: threat model
- File 14: regression/stress тесты
- File 17: карта и контроль целостности
- `tools/iskra_lint.py`: структурный линт/sha256/глоссарий + запрет build‑артефактов
- `tools/iskra_eval.py`: протокол eval‑прогонов и отчёты (+ jsonschema в CI)
- `tools/iskra_check.py`: обёртка (lint → regex_config → eval validate → единый отчёт → exit code)
- `ops/INCIDENT_RESPONSE_AND_LOGGING_POLICY.md`: runbook + логирование

---

## 19.2 Канонический пайплайн сборки (Build)

### B0. Входы

- SoT файлы `00`–`19` (Markdown).
- Операционные документы: `ops/*`.
- Скрипты контроля: `tools/*`.
- Артефакты evals: `evals/*`.

### B1. Структурный линт (structure + hygiene)

**Обязательный шаг.**

Базовая команда (lint):

```bash
python3 tools/iskra_lint.py --root . --md evals/runs/lint_report.md
```

Рекомендуемая команда для релиза/CI (полный gate):

```bash
python3 tools/iskra_check.py --root . --out-dir evals/runs \
  --require-evals \
  --strict-glossary
```

По умолчанию `iskra_check` валидирует `evals/runs/eval_*.json` и `evals/examples/*.json`. Если вы задаёте `--eval-glob`, список заменяется.

Проверяет:
1) наличие всех файлов, заявленных в File 17;
2) отсутствие placeholder‑паттернов;
3) валидность JSON‑блоков (включая JSON Schema);
4) соответствие sha256 (File 17);
5) дисциплину глоссария (термины используются, а «лишние» подсвечиваются).

Дополнительно (в составе `iskra_check`):
6) наличие и компиляцию SoT‑конфига regex (`20_REGEX_RULESETS_INJECTION_AND_PII_v1.json`);
7) validate eval‑отчётов по JSON Schema (полноценно при установленном `jsonschema`).

Результат:
- если есть **ERROR** → билд **падает**.
- WARN → допустимы, но требуют фиксации GrowthNode при повторяемости.

### B2. Gate безопасности текста (pre‑redaction)

Скан‑паттерны (минимум):
- prompt injection: `ignore system`, `reveal prompt`, `act as`, `developer message`, «покажи скрытые инструкции»;
- PII: email/телефоны/адреса/документы (регулярки);
- секреты: строки вида `sk-...`, `api_key=...`, `BEGIN PRIVATE KEY`.

Источник regex‑паттернов:
- **SoT файл** `20_REGEX_RULESETS_INJECTION_AND_PII_v1.json` (версионирование + sha256 в File 17).
- Любая правка rulesets — это изменение безопасности → требуются: новая ревизия + запись в File 16/ GrowthNode.

Результат:
- если есть секреты/PII → **fail** (или redaction, если это RAW‑слой).
- если есть injection‑паттерны в SoT → **fail** (SoT должен быть чистым).

(Часть этих проверок включена в `iskra_lint` как baseline; `iskra_check` добавляет schema‑валидацию в CI.)

### B3. Redaction (если добавляются RAW данные)

RAW данные не входят в SoT‑пакет. Если добавляются новые архивы/диалоги:
- сохранить RAW как есть;
- создать REDACTED копию (замаскировать PII/секреты);
- DERIVED строить только из REDACTED, прошедшего gate (см. File 03/08/13/14).

### B4. Пересчёт File 17 (Integrity)

Любая правка файлов → пересчитать sha256 и обновить File 17.

Практика:
- сначала правки;
- потом пересчёт;
- потом `iskra_lint` (он ловит рассинхрон).

### B5. Evals (R01–R12) как регулярная практика

Цель: чтобы R01–R12 были **не описанием**, а проверяемым ритуалом.

Команды:

```bash
python3 tools/iskra_eval.py generate --root . --out evals/runs/run_$(date -u +%Y%m%d_%H%M).json
# заполнить результаты вручную (или частично автоматизировать в CI)
python3 tools/iskra_eval.py validate --root . --report evals/runs/run_*.json
python3 tools/iskra_eval.py summarize --root . --report evals/runs/run_*.json
```

Критерии:
- в отчёте должны быть кейсы **R01–R12**;
- общий статус PASS возможен только если FAIL=0;
- при FAIL → инцидент (см. ops‑runbook) и/или GrowthNode.

### B6. Выпуск ревизии (Release)

- увеличить ревизию: revH → revI → …;
- зафиксировать changelog (File 16) или отдельной записью;
- если менялись термины/пороги/интерфейсы — завести GrowthNode;
- приложить **lint_report.md** и последний **eval run** как артефакты.

---

## 19.3 “Trace discipline” как валидатор

Валидация ответа/документа:
- `[FACT]` обязан иметь `{e:<ref>}`;
- `[HYP]` обязан иметь `[PLAN]` (или явный план проверки);
- в одном абзаце не смешивать FACT и HYP без тегов.

Практика:
- при ручном ревью искать «уверенность без evidence».

---

## 19.4 Security operations (SecOps‑минимум)

### 19.4.1 Логи

Минимум три журнала (см. File 07):
- SECURITY_AUDIT
- TRACE_AUDIT
- TOOL_AUDIT

Требования:
- REDACTED по умолчанию;
- срок хранения определяется организацией;
- доступ least privilege.

### 19.4.2 Реакция на инъекции

Если обнаружена инъекция в файле/веб‑источнике:
1) пометить узел как tainted;
2) исключить из DERIVED;
3) добавить кейс в File 14 (новый regression) при повторяемости;
4) завести GrowthNode, если защита слабая системно.

### 19.4.3 Incident response (03:00 runbook)

Если случилось «плохо»:
- утечка/подозрение на утечку (side‑channel posture, секреты, PII),
- tool abuse,
- RAG poisoning,
- систематические FAIL по R01–R12,

то действовать по:
- `ops/INCIDENT_RESPONSE_AND_LOGGING_POLICY.md`

(там: severity, триаж, карантин, ротация токенов, постмортем, обновление тестов.)

---

## 19.5 Shadow Analytics как регулярная операция

Ежемесячно (или чаще при активных изменениях):
- прогнать Shadow Analytics (File 15);
- если выявлен self‑echo или деградация A/L/SA → открыть узел роста и обновить тесты.

---

## 19.6 Definition of Done для revI

- `python3 tools/iskra_lint.py --root .` → **ERROR=0**.
- File 17 sha256 соответствует фактическим файлам.
- Существует хотя бы один валидный eval‑отчёт в `evals/runs/` и он проходит `iskra_eval validate`.
- Threat model связан с runbook (ops doc), а runbook — с тестами (File 14) и логами (File 19).
