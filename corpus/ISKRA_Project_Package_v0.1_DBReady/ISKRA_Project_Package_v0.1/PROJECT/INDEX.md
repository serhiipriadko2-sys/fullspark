# INDEX — карта проекта ISKRA_CORE (v0.1)

## START_HERE.md
Точка входа: что это за пакет и как его использовать.

## PROJECT/
- `PROJECT_INSTRUCTIONS_v0.1.md` — текст для поля Project instructions (копипаст)
- `STACK_OVERVIEW.md` / `STACK_FULL.md` — стек (кратко / подробно)
- `PROJECT_SETUP_CHECKLIST.md` — пошаговый чеклист запуска (включая 2 GPT)
- `GOVERNANCE.md` — роли, доступы, правила игры
- `DECISION_LOG_TEMPLATE.md` — шаблон записей решений (ADR/∆DΩΛ)
- `RESEARCH_PROTOCOL_SIFT.md` — быстрый протокол проверки источников
- `EVALS_PLAYBOOK_MINI.md` — минимальный плейбук “анти-дрейфа”
- `CHAT_STARTERS.md` — стартовые промпты для разных чатов
- `UPLOAD_PLAN.md` — как грузить файлы и в каком порядке

## GPTS/
- `ISKRA_CORE_GPT.md` — инструкции для кастомного GPT “Iskra Core”
- `SCIENTIFIC_SUPERVISOR_GPT.md` — инструкции для кастомного GPT “Iskra PI”
- `PROMPT_SNIPPETS.md` — быстрые вставки: ADR / Research Note / SIFT / DoD

## KNOWLEDGE/
- `CANON_v5/` — 00–15 файлы Канона + отчёты (рекомендуемый минимум для загрузки)
- `RESEARCH_COG_AI/` — дополнительные научные/технические исследования и планы
## KNOWLEDGE/DIALOGS_DB/
- `messages.jsonl` / `sessions.jsonl` — очищенные диалоги в формате для БД
- `iskra_dialogs.sqlite` — готовая SQLite БД + полнотекстовый поиск
- `ANALYSIS_REPORT.md` — статистика и правила очистки
- `shards/` — 5 равных порций messages.jsonl


## ARCHIVE_RESEARCH/
- `FULLSPARK_MANIFEST.csv` — полный перечень файлов архива fullsparklife.zip (путь/размер/тип)
- `FULLSPARK_SUMMARY.md` — обзор структуры репозитория и что из него важно
- `DUPLICATES_REPORT.md` — дубликаты больших документов и рекомендации по дедупликации
- `DIALOGS_INDEX.csv` — индекс нарезки DIALOGS_FULL_v3 по датам (размер/заголовки)

## INGEST_SPLITS/
- `dialogs/` — DIALOGS_FULL_v3 разбит по датам (для загрузки в Project/knowledge)
- `shadow_logs/` — большие shadow-журналы разбиты на части безопасного размера

## SOURCE_DOCS/
Ключевые документы из архива (чтобы не искать):
- `README_fullspark.md`
- `SETUP_GUIDE_fullspark.md`
- `AGENTS_fullspark.md`
- `ALIGNMENT_REPORT_fullspark.md`
- `AUDIT_REPORT_fullspark.md`
- `TESTING_REPORT_fullspark.md`
