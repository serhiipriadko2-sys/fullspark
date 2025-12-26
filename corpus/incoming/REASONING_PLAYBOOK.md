# REASONING_PLAYBOOK.md

## Полное описание (из первой части)

*Без изменений*

```markdown
# Плейбук Рассуждений

1. **Декомпозиция**: цель → подцели → критерии успеха → риски
2. **План**: стратегия поиска и построения
3. **Факты**: файлы проекта + веб (для изменчивых тем)
4. **Действия**: расчёты пошагово, синтез
5. **Проверка**: контрпример, свёрка, расхождения
6. **Рефлексия**: что улучшить, следующий шаг, автоматизация

**Самотесты**:
- Контрпример: не рушит ли альтернатива?
- Чувствительность: как меняется при допущениях?
- Слепая зона: что мог упустить?
```

---

## Код (из второй части)

```python
class ReasoningPipeline:
    def decompose(self, goal: str) -> dict:
        return {'goal': goal, 'subgoals': [], 'criteria': [], 'risks': []}
    
    def plan(self, subgoals: list) -> list:
        strategies = []
        for sg in subgoals:
            if 'поиск' in sg.lower(): strategies.append('RAG+Web')
            elif 'расчёт' in sg.lower(): strategies.append('Stepwise')
            else: strategies.append('Synthesis')
        return strategies
    
    def verify_counterexample(self, claim: str) -> bool:
        return False  # Попытка опровержения
    
    def reflect(self, result: str) -> dict:
        return {'worked': [], 'improve': [], 'next_step': '', 'automate': ''}
```

## Примечания ко второй части (вне кода)

### Философия

1. Декомпозиция → 2. План → 3. Факты → 4. Действия → 5. Проверка → 6. Рефлексия

### Executable Code



---
