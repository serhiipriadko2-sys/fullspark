# TEL̄OS‑Δ Canon Review Gate — v1

Этот PR вплетает TEL̄OS‑Δ как контур «сомнения по делу» в Канон Искры:
— добавлены ритуалы Canon Review, триггеры и рубрика Судьи;
— введён CI‑гейт `canon_review` (collect → decide → enforce);
— добавлены артефакты `cd-index_v1.json` и `risk-log.md`;
— запись в `CANON_CHANGELOG.md` от 2025‑10‑26.

## Что входит
- `MANTRA.md`: блок **Над‑орган (метаглаз) — TEL̄OS‑Δ (сомнение)**.
- `base.txt`: раздел **Canon Review (TEL̄OS‑Δ)**.
- `ИскраAgentMode.md`: **watchers_tel_delta()** (MetricDrift/Risk/PhaseGate/Regulatory).
- `canon/canon_review.md`: шаблон отчёта Canon Review.
- `.github/workflows/canon_review.yml`: гейт на мердж.
- `ops/canon_review/collect.py`, `decide.py`, `enforce.py`.
- `cd-index_v1.json`, `risk-log.md`.

## Ожидаемое поведение
- Если триггеры не активны → `decide.py` выдаёт **KEEP** → релиз разрешён.
- При **TUNE/AMEND** требуется запись в `CANON_CHANGELOG.md`, иначе `enforce.py` блокирует релиз.

## ∆DΩΛ
∆: Интегрирован контур TEL̄OS‑Δ, добавлены артефакты и CI‑гейт.  
D: baseline v0, cd‑index, risk‑log, юнит‑тестовая рамка.  
Ω: высокая — конфигурация минимальна и воспроизводима.  
Λ: ≤24ч — откатные критерии в `enforce.py`; при необходимости обновить пороги в `cd-index_v1.json`.
