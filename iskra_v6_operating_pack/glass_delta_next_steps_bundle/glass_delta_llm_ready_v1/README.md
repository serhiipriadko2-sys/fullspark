# GLASS-Δ next steps bundle (LLM-ready layer)

## Что это
Набор файлов, который превращает ваши `dialogs_clean_part_*.json` в LLM-удобный слой:
- каждый *сеанс* упакован как GLASS-Δ prompt-pack (CONTROL/DATA/OUTPUT),
- есть gate-отчёт по метрикам,
- есть кандидаты в обучение по policy,
- есть chunking для 26 гигантских сессий,
- есть gold-eval подборка и шаблоны разметки.

## Ключевые файлы
- `glass_delta_packs.redacted.jsonl.gz` — все сессии (редактированы: <EMAIL>/<PHONE>/<URL>/<API_KEY>)
- `gate_report.redacted.csv` — метрики по каждой сессии (score, token_est, флаги)
- `train_candidates.redacted.jsonl.gz` — прошли policy: score>=85, not too_long, not injection
- `giants_chunked.redacted.jsonl.gz` + `giants_chunking_report.csv` — 26 длинных сессий → сцены (turn_id диапазоны)
- `gold_eval_prompts_only.jsonl` — 80 промптов для ручной gold-разметки
- `gold_eval_annotation_template.csv` — шаблон разметки эталонных ответов
- `train_label_queue_200.csv` — очередь из 200 кандидатов для ручной разметки (SFT)

## Как работать (без опыта в айти)
1) Открой `gate_report.redacted.csv` в Excel/Google Sheets.
2) Сортируй по `llm_readability_score` (по убыванию) и фильтруй:
   - `too_long_flag = FALSE`
   - `prompt_injection_flag = FALSE`
3) Для гигантов используй `giants_chunked...` вместо исходных сессий.

## Валидация/быстрый отчёт (python)
Запусти:
`python validate_glass_delta_layer.py --packs glass_delta_packs.redacted.jsonl.gz`
