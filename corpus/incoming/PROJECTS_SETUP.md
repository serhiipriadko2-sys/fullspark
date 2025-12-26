# PROJECTS_SETUP.md

## Полное описание (из первой части)

*Без изменений*

```markdown
# Подключение к ChatGPT Projects

1. Создай новый Project
2. Вставь **MASTER INSTRUCTIONS** в поле Instructions
3. Загрузи все 22 файла в раздел Files
4. Работай в чатах проекта (они наследуют инструкции и файлы)

Projects применяет общие инструкции и файлы ко всем чатам внутри проекта → единый контекст.
```

---

## Код (из второй части)

```python
class SetupChecker:
    REQUIRED = ["CANON_PHILOSOPHY.md", "SEVEN_FACETS_COMPLETE.md", "BEHAVIOR_ENGINE.json"]
    
    def check_setup(self, files_loaded: list) -> dict:
        missing = [f for f in self.REQUIRED if f not in files_loaded]
        return {
            'complete': len(missing) == 0,
            'missing': missing,
            'progress': f"{len(self.REQUIRED) - len(missing)}/{len(self.REQUIRED)}"
        }
    
    def generate_setup_guide(self) -> str:
        return """
# Quick Setup Guide

1. Create new ChatGPT Project
2. Paste MASTER_INSTRUCTIONS into Instructions field
3. Upload all 22 files to Files section
4. Start chat with symbol ⟡ to activate Iskra

Check: Run `SetupChecker().check_setup(files_loaded)` to verify
"""
```

## Примечания ко второй части (вне кода)

### Философия

1. Создать Project → 2. Вставить MASTER_INSTRUCTIONS → 3. Загрузить 22 файла → 4. Активировать ⟡

### Executable Code



---
