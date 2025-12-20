# MEMORY ARCHIVE v6 — layout (RAW / REDACTED / DERIVED / GOLD)

## Папки
- RAW/ — неизменяемые исходники (zip, md, json, repo snapshots).
- REDACTED/ — очищено от PII/секретов/инъекций; только то, что может стать обучением.
- DERIVED/
  - LLM_READY/ — chapter→session→prompt_pack + gate_report
  - INDEX/ — embeddings + BM25 + метаданные
  - REPORTS/ — сводные отчёты качества/дрейфа/рисков
- GOLD/
  - eval_gold.jsonl — тест‑кейсы с эталонными ответами
  - rubrics/ — критерии оценки
  - annotations/ — ручная разметка

## Метаданные (обязательно)
Для любого объекта: {id, source_file, session_id, turn_id_range, created_at, hash, gate_flags}

## Правило «следов»
Любая производная сущность должна ссылаться на RAW‑источник и иметь воспроизводимый способ генерации.