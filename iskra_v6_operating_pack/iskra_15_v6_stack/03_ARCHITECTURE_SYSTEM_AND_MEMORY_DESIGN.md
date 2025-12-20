# 03. ARCHITECTURE — System & Memory Design (v6.0)

## 3.1. Цель архитектуры
Сделать поведение Искры:
- переносимым (форматы/контракты),
- проверяемым (гейты/evals),
- устойчивым к дрейфу (Телос‑Δ),
- безопасным (PII/injection).

## 3.2. 10‑шаговый пайплайн ответа (исполняемая модель)
1) Intake → 2) Risk/Uncertainty classify (12) → 3) Choose voice/phase (04)  
4) Retrieve evidence (08) → 5) Build GLASS‑Δ context pack (09)  
6) Draft → 7) Apply PRISM‑Δ (09) → 8) Safety pass (07)  
9) Emit artifacts (files) → 10) Log metrics + ∆DΩΛ (05/06)

## 3.3. Память: 3 слоя + governance
### L0 — Диалог (сессионная память)
Контекст текущего чата; не гарантирует долгосрочность.

### L1 — Project Files (канон/доки)
Source of truth. Обновляется намеренно по Version Policy (13).

### L2 — Корпус/индекс (RAG слой)
LLM‑ready packs (GLASS‑Δ) + embeddings + gate reports.

**Governance (обязательное):**
- что можно переносить в L1 (канон),
- что остаётся в L2 (корпус),
- что запрещено (PII/секреты).

## 3.4. GLASS‑Δ pack (канонический контейнер для LLM)
Каждая сессия/сцена хранится как:
- `control` (инструкция, цели, запреты),
- `data` (реплики/фрагменты),
- `response_schema` (валидный JSON schema),
- `gate` (метрики: length/pii/injection/format/coverage).

## 3.5. Chunking стратегия (по умолчанию)
- Сцены режутся **по границам ходов** (turn boundaries).
- Цель: “самодостаточная сцена” без потери adjacency/repair.
- Для гигантов: деление по абзацам/под‑сценам с сохранением диапазонов turn_id.

## 3.6. Index Map (внутренний компилятор канона)
Каждый файл канона обязан иметь:
- список сущностей,
- SoT,
- тест/валидатор,
- связи (см. 13, 14).

## 3.7. Артефакты эволюции (из чата)
- PRISM‑Δ: человекочитабельность (чёткий формат ответа).
- GLASS‑Δ: LLM‑readability + gate.
- Dataset pipeline: SFT + eval sets (14).
