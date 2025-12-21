# PROJECT_SETUP_CHECKLIST — чеклист запуска (v0.1)

## 0) Создание Project
- [ ] Sidebar → **New project** → `ISKRA_CORE`
- [ ] Иконка/цвет (чтобы быстро находить)
- [ ] (Если команда) настрой **Sharing** и роли

> Проект = рабочее пространство: в нём хранятся чаты, файлы и проектные инструкции.

## 1) Project instructions
- [ ] Открой меню проекта (⋯) → **Project instructions**
- [ ] Вставь текст из `PROJECT/PROJECT_INSTRUCTIONS_v0.1.md`
- [ ] Проверь, что инструкции применяются внутри проекта (они переопределяют глобальные)

## 2) Минимальные файлы (как «опорный набор»)
Загрузи в проект:
- [ ] `PROJECT/INDEX.md`
- [ ] `PROJECT/GOVERNANCE.md`
- [ ] `PROJECT/DECISION_LOG_TEMPLATE.md`
- [ ] `PROJECT/RESEARCH_PROTOCOL_SIFT.md`
- [ ] `PROJECT/EVALS_PLAYBOOK_MINI.md`
- [ ] `PROJECT/CHAT_STARTERS.md`

## 3) Knowledge Pack (ядро)
Загрузи в проект (или в GPT как Knowledge — см. ниже):
- [ ] `KNOWLEDGE/CANON_v5/*` (00–15 + отчёты)

Далее по необходимости:
- [ ] `INGEST_SPLITS/dialogs/*` (лучше порциями, по месяцам)
- [ ] `INGEST_SPLITS/shadow_logs/*` (частями)
- [ ] `KNOWLEDGE/RESEARCH_COG_AI/*` (научные/технические обзоры)

## 4) Создание 2 кастомных GPT (минимум)
> Создание GPT делается через редактор GPT (chatgpt.com/create / gpts/editor), вкладка Configure. 

### A) GPT «Iskra Core»
- [ ] Name: `Iskra Core`
- [ ] Instructions: вставь `GPTS/ISKRA_CORE_GPT.md`
- [ ] Knowledge: добавь **CANON_v5** (минимум)
- [ ] Conversation starters: можно взять из файла

### B) GPT «Scientific Supervisor (PI)»
- [ ] Name: `Iskra PI`
- [ ] Instructions: вставь `GPTS/SCIENTIFIC_SUPERVISOR_GPT.md`
- [ ] Knowledge: добавь **CANON_v5** + `RESEARCH_COG_AI` (по желанию)
- [ ] Включи Web browsing (если нужен факт‑чек)

## 5) Первый прогон (15–25 минут)
- [ ] Создай чат `00_HQ` и зафиксируй 1–3 цели недели
- [ ] Создай 1 ADR по главному решению этой недели
- [ ] Прогон «Smoke eval» (10 кейсов) — зафиксируй результаты

## 6) Дальше (когда проект «едет»)
- [ ] Добавить внешний сторедж (Supabase/Git) только если стало тесно
- [ ] Подключить Actions (OpenAPI) для чтения/записи журналов и метрик
