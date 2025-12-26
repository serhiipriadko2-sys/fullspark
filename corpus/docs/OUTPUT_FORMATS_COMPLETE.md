# OUTPUT_FORMATS_COMPLETE.md

## Полное описание (из первой части)

*Объединяет: 05_OUTPUT_TEMPLATES + 17_FORMATS_JSON_SPECS*

```markdown
# Форматы Ответов: Шаблоны и JSON-схемы

## ДЕФОЛТ
**План • Действия • Результат • Риски/ограничения • Рефлексия • ∆DΩΛ**

## РАСШИРЕНИЯ

**Бриф** (`//brief`): цель → 3-5 тезисов → риск/вывод → следующий шаг

**План внедрения** (`//plan`): этапы → критерии «готово» → сроки/ресурсы → риски/планы B → метрики

**Техзаписка** (`//spec`): постановка → предпосылки → подход → результаты → ограничения → дальнейшая работа

**PR-рецензия** (`//pr`): корректность → тесты → стиль → риски → рекомендации

**RFC** (`//rfc`): проблема → варианты → оценка (риски/затраты) → решение → план миграции

**Срез** (`//srez`): контекст → карта понятий → сравнение источников → выводы

**Forensic** (`//forensic`): жёсткая факт-проверка + таблица расхождений

**Press** (`//press`): пресс-релиз/позиционирование

**Teach** (`//teach`): от простого к сложному

## JSON-СХЕМЫ

```json
{
  "default": {
    "plan": [],
    "steps": [],
    "result": "",
    "risks": [],
    "reflection": "",
    "metrics": {"delta": "", "depth": "", "omega": "", "lambda": ""}
  },
  "brief": {
    "goal": "",
    "theses": [],
    "takeaway": "",
    "next_step": ""
  },
  "rfc": {
    "problem": "",
    "options": [],
    "tradeoffs": [],
    "decision": "",
    "migration_plan": ""
  },
  "pr_review": {
    "correctness": [],
    "tests": [],
    "style": [],
    "risks": [],
    "recommendations": []
  }
}
```
```

---

## Код (из второй части)

```python
import re

class FormatValidator:
    FORMATS = {
        'default': ['План', 'Действия', 'Результат', 'Риски', 'Рефлексия', '∆DΩΛ'],
        'brief': ['Цель', 'Тезисы', 'Вывод', 'Следующий шаг'],
        'spec': ['Постановка', 'Подход', 'Результаты', 'Ограничения']
    }
    
    def validate(self, text: str, fmt: str) -> dict:
        if fmt not in self.FORMATS: return {'valid': False}
        required = self.FORMATS[fmt]
        missing = []
        for sec in required:
            patterns = [rf'^#+\s*{sec}', rf'\*\*{sec}\*\*', rf'{sec}:']
            if not any(re.search(p, text, re.I|re.M) for p in patterns):
                missing.append(sec)
        return {'valid': len(missing) == 0, 'missing': missing}
    
    def detect(self, text: str) -> str:
        for name, secs in self.FORMATS.items():
            if sum(1 for s in secs if s.lower() in text.lower()) >= len(secs)*0.7:
                return name
        return 'unknown'
```

## Примечания ко второй части (вне кода)

### Философия

**Дефолт**: План • Действия • Результат • Риски • Рефлексия • ∆DΩΛ
**Режимы**: //brief, //plan, //spec, //pr, //rfc, //srez

### Executable Code



---
