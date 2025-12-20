# LLM-ready слой: GLASS-Δ prompt packs (v0.1)

Сгенерировано из `dialogs_clean_part_01..05.json`.

## Файлы
- `glass_delta_packs.jsonl.gz` — 1 строка = 1 сессия (prompt-pack + DATA + gate)
- `glass_delta_packs.redacted.jsonl.gz` — то же, но с редактированием PII (`<EMAIL>`, `<PHONE>`, `<URL>`)
- `gate_report.csv` — сводка метрик по сессиям (raw)
- `gate_report.redacted.csv` — сводка (redacted)
- `chapter_index.json` — индекс: chapter → session → pack_id
- `validate_glass_delta_layer.py` — пересчёт gate-метрик и базовая проверка структуры

## Quick check
```bash
python validate_glass_delta_layer.py glass_delta_packs.redacted.jsonl.gz --out check.csv
```

## Gate (что проверяем)
- оценка длины (token_estimate)
- PII/URL/handle флаги
- prompt-injection флаг (по простым паттернам)
- роль/баланс сообщений
- приблизительный LLM_readability_score (см. gate_report)

## Сводка (raw)
- sessions: 1306
- chapters: 433
- avg_llm_readability: 82.52
- pii_sessions: 416
- inj_sessions: 76
- too_long_sessions: 26
- token_est_p95: 31197.0
- token_est_max: 153956
