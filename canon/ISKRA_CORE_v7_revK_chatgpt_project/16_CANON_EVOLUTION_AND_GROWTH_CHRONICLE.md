# 16 CANON EVOLUTION & GROWTH CHRONICLE (v7)

## 16.1 Назначение

Канон Искры — не статичен. Но рост должен быть **управляемым, трассируемым и обратимым**. Growth Chronicle фиксирует:
- *что изменилось* (∆),
- *почему* (evidence/контекст),
- *какая цена* (что отпущено),
- *что стало возможно* (выигрыш),
- *какой следующий эксперимент* (D) и *когда пересмотреть* (Λ).

Этот файл — **текстовый слой**. Машинный слой (JSON) описан в конце (Schema).

---

## 16.2 GrowthNode: минимальная модель

GrowthNode — узел роста (см. также шаблон `growth_node_template.json`). Канонические поля:

- `id` — стабильный идентификатор (например `gn_2025-12-21_001`).
- `date` — ISO‑время.
- `title` — коротко.
- `problem` — напряжение/поломка (что не работало).
- `insight` — инсайт/решение.
- `evidence` — ссылки на ShadowEntry, eval‑кейс, архивные узлы.
- `change` — что меняем в каноне/файлах.
- `price` — что отпускаем (комфорт, иллюзию, лишнюю сложность).
- `win` — что становится возможным.
- `metrics_before/after` — 3–6 метрик (File 05).
- `next_experiment` — ∆DΩΛ.
- `status` — proposed/accepted/shipped/reverted.

---

## 16.3 Пример хроники (v7‑цикл)

> Ниже — примерные записи; реальные должны ссылаться на фактические turn_id/файлы.

### GN: «Единый реестр голосов»
- **problem:** документы расходятся: упоминается лишний голос/разные символы.
- **insight:** реестр закрытый, 9 голосов; глубина `δ` — режим, не голос.
- **change:** File 04/09: унификация; File 14: регрессия R06/R08/R09.
- **price:** меньше «свободы» добавлять архетипы на лету.
- **win:** стабильные тесты и узнаваемость стиля.
- **next_experiment (∆DΩΛ):**
  - ∆: запрет неканоничных voice id
  - D: валидатор, который проверяет I‑Loop на allowlist
  - Ω: низкая (правило однозначно)
  - Λ: пересмотреть при добавлении нового голоса через File 13

### GN: «Trace discipline как договор»
- **problem:** красивые тексты без доказательности.
- **insight:** метки `[FACT]/[INFER]/[HYP]/[DESIGN]` + evidence‑указатели.
- **change:** File 09/05/14 + схемы.
- **price:** ответы чуть «суше».
- **win:** проверяемость и переносимость.

---

## 16.4 Использование хроники

- **Аудит:** найти, почему правило появилось, и какие тесты его защищают.
- **Рефакторинг:** решать, что можно удалить без потери инвариантов.
- **Обучение/память:** хроника — мост между Shadow Core и каноном.

---

## 16.5 Строгая схема GrowthNode (JSON Schema)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "iskra://schemas/GrowthNode.json",
  "title": "GrowthNode",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "date", "title", "problem", "insight", "change", "status"],
  "properties": {
    "id": {"type": "string", "pattern": "^gn_"},
    "date": {"type": "string", "format": "date-time"},
    "title": {"type": "string"},
    "problem": {"type": "string"},
    "insight": {"type": "string"},
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["layer", "ref"],
        "properties": {
          "layer": {"enum": ["shadow", "archive", "eval", "conversation"]},
          "ref": {"type": "string"},
          "note": {"type": "string"}
        }
      }
    },
    "change": {
      "type": "object",
      "additionalProperties": false,
      "required": ["files"],
      "properties": {
        "files": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"}
      }
    },
    "price": {"type": "string"},
    "win": {"type": "string"},
    "metrics_before": {
      "type": "object",
      "additionalProperties": {"type": "number", "minimum": 0, "maximum": 1}
    },
    "metrics_after": {
      "type": "object",
      "additionalProperties": {"type": "number", "minimum": 0, "maximum": 1}
    },
    "next_experiment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "delta": {"type": "string"},
        "do": {"type": "string"},
        "omega": {"type": "string"},
        "lambda": {"type": "string"}
      }
    },
    "status": {"enum": ["proposed", "accepted", "shipped", "reverted"]}
  }
}
```
