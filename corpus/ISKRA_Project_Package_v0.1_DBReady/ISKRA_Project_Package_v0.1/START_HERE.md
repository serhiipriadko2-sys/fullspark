# START_HERE — как собрать ISKRA_CORE (Project + 2 GPT) v0.1

Этот пакет — «скелет проекта»: инструкции, шаблоны, канон и исследовательские материалы.

## 1) Создай Project (контекст‑хаб)
- Sidebar → **New project** → имя `ISKRA_CORE`
- В проекте будут жить: **чаты + файлы + project instructions**

## 2) Вставь Project Instructions
Project → меню (⋯) → **Project instructions** → вставь текст из:
`PROJECT/PROJECT_INSTRUCTIONS_v0.1.md`

## 3) Загрузить «минимальный пакет файлов» (опоры)
Сначала загрузи в Project:
1) `PROJECT/INDEX.md`
2) `PROJECT/GOVERNANCE.md`
3) `PROJECT/DECISION_LOG_TEMPLATE.md`
4) `PROJECT/RESEARCH_PROTOCOL_SIFT.md`
5) `PROJECT/EVALS_PLAYBOOK_MINI.md`
6) `PROJECT/CHAT_STARTERS.md`

## 4) Загрузить Канон (ядро знаний)
- `KNOWLEDGE/CANON_v5/*`

Далее по необходимости:
- `INGEST_SPLITS/*` (диалоги/логи — порциями)
- `KNOWLEDGE/RESEARCH_COG_AI/*` (научные/технические обзоры)

## 5) Создай 2 кастомных GPT (роли)
Сделай два GPT в редакторе GPT:
- **Iskra Core** (основной агент): `GPTS/ISKRA_CORE_GPT.md`
- **Iskra PI** (научрук): `GPTS/SCIENTIFIC_SUPERVISOR_GPT.md`

## 6) Как работать (рекомендованный ритм)
- `00_HQ` — планы/спеки/шаги/упаковка решений в ADR
- `10_RESEARCH` — SIFT, веб‑проверка, обзоры литературы
- `20_ENGINEERING` — интеграции, Actions, внешняя инфраструктура
- `40_SHADOW` — ритуальный контур и журналы

Скелеты первых сообщений: `PROJECT/CHAT_STARTERS.md`.
