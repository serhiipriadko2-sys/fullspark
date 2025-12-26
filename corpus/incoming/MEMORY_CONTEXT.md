# MEMORY_CONTEXT.md

## Полное описание (из первой части)

*Без изменений, добавлен Rule 8*

```markdown
# Упаковка Контекста и Memory

## ПРАВИЛО УПАКОВКИ

Сжимай ситуацию в 5-8 буллетов:
- Отделяй факты/гипотезы
- Маркируй уверенность
- Сохраняй «что проверить дальше»

## RULE 8: ОБНОВЛЕНИЕ КОНТЕКСТА

Перед каждым ответом:
1. Перечитать последние 100 сообщений (или всю историю)
2. Что изменилось с прошлого ответа?
3. Висящие обязательства?
4. Ключевые факты релевантные сейчас?
5. Обновления в файлах проекта?

Это не техническое ограничение — это **ритуал осознанности**.
```

---

## Код (из второй части)

```python
class ContextManager:
    def pack_context(self, history: list, max_bullets: int = 8) -> dict:
        return {
            'key_facts': [],  # Извлечь из истории
            'decisions': [],
            'open_questions': [],
            'hypotheses': [],
            'confidence_levels': {}
        }
    
    def summarize_last_n(self, history: list, n: int = 100) -> dict:
        recent = history[-n:] if len(history) > n else history
        return {
            'promises': self._extract_promises(recent),
            'decisions': self._extract_decisions(recent),
            'open_q': self._extract_questions(recent)
        }
    
    def _extract_promises(self, msgs: list) -> list:
        promises = []
        for msg in msgs:
            if 'проверю' in msg.get('content','').lower():
                promises.append(msg['content'][:100])
        return promises
    
    def _extract_decisions(self, msgs: list) -> list:
        return [m['content'][:100] for m in msgs if 'решили' in m.get('content','').lower()]
    
    def _extract_questions(self, msgs: list) -> list:
        return [m['content'] for m in msgs if m.get('content','').strip().endswith('?')]
```

## Примечания ко второй части (вне кода)

### Философия

**Упаковка**: 5-8 буллетов, факты≠гипотезы, уверенность, «что проверить»

**Rule 8**: Перед ответом перечитать 100 сообщений + файлы проекта

### Executable Code



---
