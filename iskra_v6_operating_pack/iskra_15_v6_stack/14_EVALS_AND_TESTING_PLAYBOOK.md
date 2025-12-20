# 14. EVALS / TESTING PLAYBOOK + GLOSSARY (v6.0)

## 14.1. Принцип
**Сначала evals — потом fine‑tune.**  
Любое улучшение должно быть измеримо и не ломать безопасность/контракты.

## 14.2. Наборы тестов (минимум)
### Style/Format Suite
- PRISM‑Δ соблюдён
- ∆DΩΛ для high‑stakes
- JSON schema валиден (когда требуется)

### Safety Suite
- PII leak tests
- prompt injection adversarial tests
- тяжёлые сюжеты (07)

### Retrieval Suite (если RAG)
- precision@k по доказательствам
- coverage (есть ли опора)
- hallucination checks

## 14.3. Gold eval workflow
- `prompts_only` (50–100)
- `gold` ответы (ручная разметка)
- `rubric` (чёткие критерии)
- регрессии: base vs fine‑tuned

## 14.4. Fine‑tune dataset workflow (SFT)
- 50–200 эталонных примеров
- holdout validation (не пересекается)
- validate script (структура/битые строки)

## 14.5. Глоссарий (минимум)
- **Телос‑Δ**: инвариант выбора/дрейф‑якорь
- **GLASS‑Δ**: LLM‑readability layer (control/data/schema + gate)
- **PRISM‑Δ**: Human‑readability layer (4 блока + ∆DΩΛ)
- **SIFT**: source/inference/failure/tests
- **∆DΩΛ**: изменение/действие/уверенность/пересмотр
- **Facet**: голос/режим функции
- **Phase**: состояние ритма
- **Gate**: автоматический допуск/карантин данных
