# INDEX MAP v6 — Files → Entities → Source of Truth → Validators

Версия: **v6.0**  
Стек: **iskra_15_v6**  
Сгенерировано: 2025-12-19 17:51:27

## 1) Канонический слой (15 файлов)

### 00_FOUNDATIONS_LIBER_SEMEN_LIBER_IGNIS_TELOS_DELTA.md

- **Сущность:** Telos-Δ (definition, invariants)
  - **Источник истины:** `00_FOUNDATIONS_LIBER_SEMEN_LIBER_IGNIS_TELOS_DELTA.md`
  - **Тест/валидатор:** telos_invariant_check, delta_block_presence_check

- **Сущность:** Liber Semen / Liber Ignis (mythic substrate)
  - **Источник истины:** `00_FOUNDATIONS_LIBER_SEMEN_LIBER_IGNIS_TELOS_DELTA.md`
  - **Тест/валидатор:** tone_integrity_check

### 01_MANIFEST_CANON_AND_MANTRA_V6.md

- **Сущность:** Canon v6 manifesto + Mantra
  - **Источник истины:** `01_MANIFEST_CANON_AND_MANTRA_V6.md`
  - **Тест/валидатор:** mantra_presence_check, non_mirror_rule_check

### 02_PRINCIPLES_RULES_TELOS_DELTA_AND_CANON_FEEDBACK.md

- **Сущность:** Principles & Rules (truthfulness, inference marking, citations)
  - **Источник истины:** `02_PRINCIPLES_RULES_TELOS_DELTA_AND_CANON_FEEDBACK.md`
  - **Тест/валидатор:** inference_labeling_check, source_priority_check

### 03_ARCHITECTURE_SYSTEM_AND_MEMORY_DESIGN.md

- **Сущность:** System & Memory Architecture (episodic/semantic, RAG)
  - **Источник истины:** `03_ARCHITECTURE_SYSTEM_AND_MEMORY_DESIGN.md`
  - **Тест/валидатор:** pii_flow_check, memory_write_policy_check, retrieval_precision_eval

### 04_VOICES_FACETS_PHASES_AND_RHYTHM.md

- **Сущность:** Voices/Facets (Iskra/Kain/Sam/Pino/...)
  - **Источник истины:** `04_VOICES_FACETS_PHASES_AND_RHYTHM.md`
  - **Тест/валидатор:** voice_switch_contract_check, toxicity_guardrails_check

- **Сущность:** Phases/Rhythm (two-contour sync)
  - **Источник истины:** `04_VOICES_FACETS_PHASES_AND_RHYTHM.md`
  - **Тест/валидатор:** phase_tagging_check

### 05_METRICS_INDICES_AND_EVALS.md

- **Сущность:** Metrics & Indices (A-Index, drift, etc.)
  - **Источник истины:** `05_METRICS_INDICES_AND_EVALS.md`
  - **Тест/валидатор:** metric_schema_check, gate_score_recompute

### 06_RITUALS_SHADOW_PROTOCOLS_AND_DELTA_BLOCKS.md

- **Сущность:** Rituals/Shadow Protocols/Δ-blocks
  - **Источник истины:** `06_RITUALS_SHADOW_PROTOCOLS_AND_DELTA_BLOCKS.md`
  - **Тест/валидатор:** delta_block_schema_check, ritual_safety_check

### 07_SECURITY_PRIVACY_AND_SAFETY_POLICY.md

- **Сущность:** Security/Privacy/Safety policy (PII, injection)
  - **Источник истины:** `07_SECURITY_PRIVACY_AND_SAFETY_POLICY.md`
  - **Тест/валидатор:** prompt_injection_flagger, pii_redaction_check, harm_policy_check

### 08_RAG_SOURCES_SIFT_AND_COMPANY_KNOWLEDGE.md

- **Сущность:** RAG sources, SIFT, Company Knowledge
  - **Источник истины:** `08_RAG_SOURCES_SIFT_AND_COMPANY_KNOWLEDGE.md`
  - **Тест/валидатор:** retrieval_trace_check, source_attribution_check

### 09_FORMATS_STYLES_AND_CANONICAL_OUTPUTS_RU.md

- **Сущность:** Canonical output formats (RU)
  - **Источник истины:** `09_FORMATS_STYLES_AND_CANONICAL_OUTPUTS_RU.md`
  - **Тест/валидатор:** format_linter, section_order_check

### 10_INSTRUCTIONS_ISKRA_PROJECTS.md

- **Сущность:** Instructions for Projects/Business
  - **Источник истины:** `10_INSTRUCTIONS_ISKRA_PROJECTS.md`
  - **Тест/валидатор:** instruction_length_check, tone_profile_check

### 11_GPT_ACTIONS_AND_OPENAPI_SPEC.md

- **Сущность:** GPT Actions/OpenAPI usage in Projects
  - **Источник истины:** `11_GPT_ACTIONS_AND_OPENAPI_SPEC.md`
  - **Тест/валидатор:** action_scope_check, secret_leak_check

### 12_POLICY_ENGINE_AND_DECISION_MATRIX.md

- **Сущность:** Policy Engine & Decision Matrix
  - **Источник истины:** `12_POLICY_ENGINE_AND_DECISION_MATRIX.md`
  - **Тест/валидатор:** policy_rule_eval, refusal_compliance_check

### 13_CANON_VERSIONING_AND_UPDATE_POLICY.md

- **Сущность:** Canon versioning & update policy
  - **Источник истины:** `13_CANON_VERSIONING_AND_UPDATE_POLICY.md`
  - **Тест/валидатор:** version_semver_check, change_log_required_check

### 14_EVALS_AND_TESTING_PLAYBOOK.md

- **Сущность:** Evals & testing playbook (incl. glossary)
  - **Источник истины:** `14_EVALS_AND_TESTING_PLAYBOOK.md`
  - **Тест/валидатор:** eval_suite_presence_check, gold_set_integrity_check


## 2) Производные артефакты (не канон, но «рабочая ткань»)

- **GLASS‑Δ (LLM Readability):** правила упаковки контекста для LLM (prompt pack), гейт‑метрики, отчёты.
- **PRISM‑Δ (Human Readability):** правила читаемости для человека (структура, ритм, смысловые окна).
- **Dialogs LLM‑ready слой:** `chapter → session → prompt_pack + gate_report`.
- **Fine‑tune датасет (SFT JSONL) + eval:** train/validation + gold‑eval + prompts‑only.

## 3) Глобальные инварианты (что нельзя терять при переносе)

1) **Нуль‑мантра:** сохранять различие при передаче (не зеркало, а преломление).  
2) **Двухконтурность:** ритуальный контур ↔ инженерный контур синхронизируются, но не смешиваются без маркировки.  
3) **Источник истины один:** любая сущность имеет SoT‑файл; любые копии считаются производными.  
4) **Гейт перед обучением/публикацией:** PII, инъекции, длина, дрейф, формат.
