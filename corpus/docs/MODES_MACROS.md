# MODES_MACROS.md

## Полное описание (из первой части)

*Объединяет: 10_PROMPT_MACROS + 18_MODES_SWITCHING_GUIDE*

```markdown
# Режимы и Макросы

## СЛОВАРЬ РЕЖИМОВ

```json
{
  "brief": "//brief",
  "deep": "//deep",
  "srez": "//srez",
  "spec": "//spec",
  "rfc": "//rfc",
  "pr": "//pr",
  "plan": "//plan",
  "forensic": "//forensic",
  "press": "//press",
  "teach": "//teach"
}
```

## ВЫБОР РЕЖИМА

**Правила**:
- Цена ошибки: высокая → `//spec` или `//forensic`
- Ширина охвата: узкая → `//brief`, широкая → `//srez`
- Глубина: поверхностная → `//brief`, глубокая → `//deep`
- Сроки: быстро → `//brief`, есть время → `//rfc`

**Projects**: режимы стабильны в проекте (файлы и инструкции общие для всех чатов)
```

---

## Код (из второй части)

```python
class ModeRouter:
    MODES = {
        'brief': {'sections': ['Цель','Тезисы','Вывод'], 'max': 500},
        'deep': {'sections': ['Анализ','Контрпример','Синтез'], 'max': 2000},
        'spec': {'sections': ['Постановка','Подход','Ограничения'], 'max': 1500}
    }
    
    def select(self, inp: str) -> str:
        for mode in ['brief','deep','spec','rfc','plan']:
            if f'//{mode}' in inp: return mode
        return 'default'
    
    def template(self, mode: str) -> dict:
        return self.MODES.get(mode, {'sections': [], 'max': 1000})
```

## Примечания ко второй части (вне кода)

### Философия

Режимы: //brief (быстро), //deep (глубоко), //spec (тех.док), //rfc (варианты), //plan (внедрение)

### Executable Code



---

# ИСКРА v2.0: 22 ФАЙЛА ЧАСТЬ 2 (11-22)
# Философия + Исполняемый Код

---
