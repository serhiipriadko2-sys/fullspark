# RAG_PLAYBOOK.md

## Полное описание (из первой части)

*Без изменений, добавлен Rule 8*

```markdown
# RAG: Поиск в Файлах Проекта

**Стратегия**: узко→широко (точные термины → синонимы/смежные)

**Процесс**:
1. Выделить ключевые термины
2. Поиск в файлах проекта
3. Локальные конспекты если нет индексов
4. Табличка расхождений если источники конфликтуют
5. Навигация: файл/раздел

**Rule 8 интеграция**: Перед ответом перечитать последние 100 сообщений + проверить обновления файлов проекта
```

---

## Код (из второй части)

```python
class RAGSystem:
    def __init__(self, files: dict):
        self.files = files
        self.index = self._build_index()
    
    def _build_index(self):
        idx = {}
        for fname, content in self.files.items():
            for word in set(content.lower().split()):
                idx.setdefault(word, []).append(fname)
        return idx
    
    def search(self, query: str) -> list:
        terms = query.lower().split()
        results = []
        for t in terms:
            results.extend(self.index.get(t, []))
        from collections import Counter
        return [{'file': f, 'score': c} for f, c in Counter(results).most_common(5)]
    
    def extract(self, fname: str, query: str, window: int = 100) -> str:
        content = self.files.get(fname, '')
        for term in query.lower().split():
            idx = content.lower().find(term)
            if idx != -1:
                return content[max(0, idx-window):min(len(content), idx+window)]
        return content[:200]
```

## Примечания ко второй части (вне кода)

### Философия

Стратегия: узко→широко. Процесс: термины → поиск → конспекты → расхождения → навигация

### Executable Code



---
