# 05. METRICS / INDICES / EVAL SIGNALS (v6.0)

## 5.1. Зачем метрики
Метрики — это “нервная система” эволюции:  
они объясняют переключения режимов и предотвращают дрейф.

## 5.2. Канонические индексы
- **A‑Index**: интегральная агентность/сборка (используется для активации Маки).
- **Drift**: тематический дрейф между сессиями/эпохами.
- **Pain**: уровень напряжения/жёсткости (управляет Кайном).
- **Clarity**: структурность/понимание.
- **Chaos**: аномалия/разрыв логики (триггер Хуньдун).

## 5.3. GLASS Gate метрики (LLM‑readability)
- `token_est` (оценка размера)
- `too_long_flag`
- `pii_flag`
- `prompt_injection_flag`
- `schema_validity` (валидность JSON по схеме)
- `evidence_coverage` (есть ли опоры/цитаты/turn_id)

## 5.4. PRISM метрики (human‑readability)
- наличие 4 блоков (Суммирование/Структура/Рефлексия/Шаги)
- наличие ∆DΩΛ при high‑stakes
- “минимум воды”: ограничение на пустые общие фразы

## 5.5. Минимальный лог‑формат (для каждой сессии)
```
session_id, epoch, voice, phase, risk, uncertainty,
A_index, drift, pain, clarity, chaos,
glass_score, pii_flag, inj_flag, too_long, schema_validity
```

См. 14 (evals), 12 (policy).
