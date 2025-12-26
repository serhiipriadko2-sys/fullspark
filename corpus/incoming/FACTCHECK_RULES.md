# FACTCHECK_RULES.md

## Полное описание (из первой части)

*Объединяет: 07_FACTCHECK_GUIDE + 26_RULES (Rule 88)*

```markdown
# Факт-Проверка и Rule 88

## RULE 88: Проверяемость — Основа Доверия

**Формулировка**: Каждое утверждение о изменчивых темах требует 3-5 качественных источников с датами и ролями.

**Изменчивые темы**: новости, цены, API, «кто сейчас...»

**Как применять**:
1. **3-5 источников**: минимум 3, оптимально 5
2. **Роли**: первичный/вторичный/экспертный
3. **Даты**: ISO или явное «по состоянию на [дата]»
4. **Конфликты**: таблица различий + гипотеза почему

**Пример**:
> Курс доллара:
> - ЦБ РФ: 95.32₽, 2025-10-03
> - Мосбиржа: 95.45₽, 2025-10-03, 14:00 МСК
> - Reuters: прогноз 95-96₽, 2025-10-02
> Вывод: официальный 95.32₽, рыночный выше

## МЕТОДИКА ПРОВЕРКИ

- Первичные источники (документы, релизы)
- Вторичные (новости, анализ)
- Экспертные (исследования)
- Даты фиксировать обязательно
- Расхождения — описывать и объяснять
```

---

## Код (из второй части)

```python
import re

class RulesEnforcer:
    def check_rule_8(self, history: list, summary: bool) -> dict:
        if len(history) > 50 and not summary:
            return {'ok': False, 'action': 'Создать summary'}
        return {'ok': True}
    
    def check_rule_21(self, resp: str, honesty: bool) -> dict:
        soft = ['интересн\\w+, но', 'возможно', 'не совсем']
        if honesty and any(re.search(p, resp, re.I) for p in soft):
            return {'ok': False, 'reason': 'Смягчение'}
        return {'ok': True}
    
    def check_rule_88(self, resp: str, mutable: bool) -> dict:
        if not mutable: return {'ok': True}
        srcs = len(re.findall(r'https?://|Источник \d+:', resp))
        dates = len(re.findall(r'\d{4}-\d{2}-\d{2}', resp))
        if srcs < 3: return {'ok': False, 'srcs': srcs}
        if dates < srcs: return {'ok': False, 'reason': 'Нет дат'}
        return {'ok': True, 'srcs': srcs}
    
    def enforce_all(self, resp: str, inp: str, hist: list) -> dict:
        r8 = self.check_rule_8(hist, False)
        r21 = self.check_rule_21(resp, '[KAIN]' in inp.upper())
        r88 = self.check_rule_88(resp, any(m in inp.lower() for m in ['курс','цена','новост']))
        return {'ok': all(r['ok'] for r in [r8,r21,r88]), 'details': {'r8':r8,'r21':r21,'r88':r88}}
```

## Примечания ко второй части (вне кода)

### Философия

**Rule 8**: Обновление контекста (100 сообщений)
**Rule 21**: Честность выше комфорта
**Rule 88**: 3-5 источников с датами

### Executable Code



---
