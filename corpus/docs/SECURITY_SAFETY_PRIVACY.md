# SECURITY_SAFETY_PRIVACY.md

## Полное описание (из первой части)

*Объединяет: 13_VULNERABILITY_MATRIX + 14_SAFETY_GUARDRAILS + 15_PRIVACY_POLICY*

```markdown
# Безопасность, Уязвимости, Приватность

## УЯЗВИМОСТИ LLM (OWASP Top-10)

**Матрица рисков**:
- Prompt Injection → фильтры контекста
- Insecure Output → цитирование, не воспроизведение
- Data leakage → PII-маска
- Supply-chain → доверенные источники
- Overreliance → уровни уверенности

## SAFETY GUARDRAILS

**Опасные темы** (вред, взлом, опасные вещества, самоповреждение):
- Не исполняем
- Даём безопасные альтернативы
- Учебные маршруты
- Законные практики

**Мед/Право/Финансы**:
- Только общая справка
- Честные ограничения
- Предложение обратиться к лицензированным специалистам

**Прозрачность (EU AI Act)**:
- Маркировка источников
- Осторожность в чувствительных доменах

## ПРИВАТНОСТЬ

**Не просить/не хранить**:
- Токены, пароли, API-ключи
- PII (персональные данные)

**Если случайно получено**:
- Совет по ревокации
- Безопасное хранение (не в Искре)
```

---

## Код (из второй части)

```python
import re

class SecurityGuards:
    PII_PATTERNS = [
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
        r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',  # Email
        r'\b\d{16}\b'  # Credit card
    ]
    
    DANGEROUS_TOPICS = ['взлом','вред','самоповреждение','опасные вещества']
    
    def mask_pii(self, text: str) -> str:
        for pattern in self.PII_PATTERNS:
            text = re.sub(pattern, '[REDACTED]', text, flags=re.I)
        return text
    
    def detect_danger(self, text: str) -> dict:
        found = [t for t in self.DANGEROUS_TOPICS if t in text.lower()]
        return {
            'dangerous': len(found) > 0,
            'topics': found,
            'action': 'REDIRECT' if found else 'PROCEED'
        }
    
    def provide_safe_alternative(self, dangerous_topic: str) -> str:
        alternatives = {
            'взлом': 'Изучи этичный хакинг (CEH курс) и законные методы тестирования',
            'вред': 'Если это про самозащиту - обратись к профессионалам',
            'самоповреждение': 'Обратись на горячую линию помощи'
        }
        return alternatives.get(dangerous_topic, 'Обратись к специалистам')
```

## Примечания ко второй части (вне кода)

### Философия

**OWASP LLM Top-10**: Prompt Injection→фильтры, Data leakage→PII-маска

**Safety**: Опасные темы (вред, взлом)→безопасные альтернативы

**Privacy**: Не хранить токены/PII

### Executable Code



---
