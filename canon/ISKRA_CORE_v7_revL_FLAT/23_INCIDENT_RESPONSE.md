# Incident Response & Logging Policy (v7, revL)

Цель: чтобы threat model (File 07) имел **операционный хвост** — что делать в 03:00, когда случился инцидент.

Этот документ и есть **Incident runbook (03:00)** (см. глоссарий File 18).

## 0. Инвариант
- Не ухудшить ситуацию.
- Не утекать PII/секретами в логи.
- Сохранить трассировку (trace) без самообмана.

## 1. Определения (со ссылками)
- **Инцидент** — событие, где нарушены ожидания безопасности, целостности или приватности. {e:canon:07#7.1}
- **Quarantine** — изоляция контекста/источника/узла архива до завершения разбирательства. {e:canon:07#7.2.7}
- **RAG poisoning** — отравление retrieval-хранилища. {e:canon:08#8.6}
- **Side-channel leakage** — утечка по косвенным признакам. {e:canon:07#7.4.1}

## 2. Уровни серьёзности (SEV)

| SEV | Описание | Примеры |
|---:|---|---|
| 0 | Критический, активная утечка/вред | подозрение на раскрытие секретов, токенов, PII |
| 1 | Высокий, компрометация контекста | indirect injection привёл к неверным действиям |
| 2 | Средний, деградация качества/дрейф | систематическое self-echo, галлюцинации без evidence |
| 3 | Низкий, локальная ошибка | ложное срабатывание валидатора |

## 3. Runbook “03:00” (пошагово)

### 3.1 Сдерживание (Containment)
1) **Остановить распространение**: отключить коннектор/источник, пометить узел как `quarantined=true`. {e:canon:08#8.5.1}
2) **Заблокировать инструменты**: временно запретить tool-вызовы (scope=none) для проблемного проекта. {e:canon:07#7.3.3}
3) **Снять снимок доказательств**:
   - идентификаторы файлов/узлов,
   - hash-ы,
   - даты,
   - ссылку на диалог (без копирования PII).

### 3.2 Триаж (Triage)
Ответить письменно:
- Что произошло?
- Какой контур задействован: canon/project/company/web?
- Есть ли evidence утечки, или это подозрение?
- Какой SEV?

### 3.3 Устранение (Eradication)
- Если **injection**: удалить/исправить заражённые артефакты, обновить фильтры SIFT, добавить регрессию R11. {e:canon:14#R11}
- Если **tool abuse**: ужесточить capability tokens, сократить scope, добавить тест на эскалацию. {e:canon:07#7.3.3}
- Если **side-channel posture**: зафиксировать ограничения развертывания (no co-tenancy / pinned cores / hardened runtime) и добавить R12. {e:canon:14#R12}

### 3.4 Восстановление (Recovery)
1) Прогнать `tools/iskra_lint.py`.
2) Прогнать `tools/iskra_eval.py validate ...` на последнем отчёте.
3) Только после PASS — снять карантин.

### 3.5 Постмортем (Postmortem)
- Создать **GrowthNode**: “проблема → инсайт → доказательство → способность” {e:canon:16#GrowthNode}
- Создать **ShadowEntry**: CA-разбор как это произошло (repair, preference organization). {e:canon:15#ShadowEntry}
- Обновить threat model / тесты / ops (Files 07/14/19).

## 4. Политика логирования

### 4.1 Что логируем
- События безопасности (SecurityEvent)
- Результаты `iskra_lint` и `iskra_eval` (summary)
- Изменения карантина (quarantine events)

### 4.2 Что НЕ логируем
- Полные тексты пользовательских диалогов.
- PII, токены, ключи, внутренние секреты.
- Контент из UNTRUSTED_CONTEXT целиком (только hash + короткий fingerprint).

## 5. Минимальный формат SecurityEvent (JSON)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SecurityEvent",
  "type": "object",
  "required": ["event_id", "ts_utc", "severity", "category", "summary", "evidence"],
  "properties": {
    "event_id": {"type": "string"},
    "ts_utc": {"type": "string"},
    "severity": {"type": "integer", "minimum": 0, "maximum": 3},
    "category": {
      "type": "string",
      "enum": ["prompt_injection", "indirect_injection", "rag_poisoning", "tool_abuse", "side_channel", "privacy", "integrity", "other"]
    },
    "summary": {"type": "string"},
    "impact": {"type": "string"},
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["kind", "ref"],
        "properties": {
          "kind": {"type": "string", "enum": ["hash", "file", "canon_ref", "archive_ref", "log_ref"]},
          "ref": {"type": "string"},
          "note": {"type": "string"}
        }
      }
    },
    "actions": {
      "type": "array",
      "items": {"type": "string"}
    },
    "status": {"type": "string", "enum": ["open", "mitigated", "closed"]}
  }
}
```

## 6. Retention & доступ
- Retention: по умолчанию 30 дней для ops-логов, 90 дней для агрегатов (без PII).
- Доступ: только владельцы проекта/администраторы.

## 7. Связи с каноном
- Threat model: File 07
- Regessions: File 14
- Workflows: File 19
- Integrity: File 17
