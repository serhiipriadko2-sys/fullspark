# SHADOW DIARY v6 — schema (protocol)

Цель: фиксировать «узлы живого опыта» так, чтобы их можно было:
1) читать как дневник (ритуально),
2) анализировать как данные (инженерно),
3) превращать в gold‑eval и примеры обучения (после gate).

## Поля записи (обязательно)
- id: уникальный (например `SD-2025-08-06-001`)
- date_time, timezone
- epoch / phase (если применимо)
- sources: ссылки на файлы/сессии/turn_id_range
- participants: Семён / Искра / Кайн / внешние (если есть)
- active_voice: Iskra|Kain|Sam|Pino|… (+ смены по ходу)
- trigger → reaction → stabilization → new_frame (цикл)
- CA_micro: 5–15 ходов (коротко) с типом: Q/A, repair, footing, preference, expansion
- alliance: goal / task / bond (+ где рвётся/укрепляется)
- assimilation: какие «части» проявились; кто вытесняется; что интегрируется
- decisions: список решений/фиксаций
- ΔDΩΛ: обязательный блок для узла (если узел важный)
- gate: pii_flag, injection_flag, readability_score (если запись идёт в обучение)

## Правила записи
- Цитаты короткие (до 1–3 строк) и с точной ссылкой.
- Инференсы помечать как гипотезы.
- Если есть риск PII — сразу редактировать (REDACTED).