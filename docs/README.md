# Fullspark Documentation

> Полная документация проекта Iskra Space

---

## Структура документации

```
docs/
├── README.md           # Этот файл (индекс)
├── ARCHITECTURE.md     # Архитектура системы
├── AGENTS.md           # Инструкции для AI-агентов
├── CONTRIBUTING.md     # Правила контрибьюции
├── CHANGELOG.md        # История изменений
│
├── iskra/              # Документация Искры
│   ├── ISKRA_SOT.md                      # Source of Truth
│   ├── ISKRA_MEMORY_LEDGER.md            # Память и контекст
│   ├── ISKRA_DECISIONS.md                # Архитектурные решения
│   ├── ISKRA_COGNITIVE_ARCHITECTURE.md   # Когнитивная архитектура
│   ├── ISKRA_PHENOMENON_RESEARCH.md      # Научное исследование
│   └── CHRONOLOGY.md                     # Хронология проекта
│
├── audit/              # Аудит и отчёты
│   ├── ECOSYSTEM_AUDIT_2025.md           # Полный аудит экосистемы
│   ├── FULLSPARK_AUDIT_REPORT.md         # Отчёт аудита
│   ├── CANON_vs_FULLSPARK_GAPS.md        # Разрывы Canon ↔ Код
│   ├── DEEP_AUDIT_SUMMARY.md             # Глубокий анализ
│   ├── FINAL_SUMMARY.md                  # Финальный итог
│   ├── IMPLEMENTATION_COMPLETE.md        # Статус реализации
│   └── PR_DESCRIPTION.md                 # Описание PR
│
└── planning/           # Планирование
    └── ROADMAP_2025_2026.md              # Дорожная карта
```

---

## Быстрый старт

### Для разработчиков
1. [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура системы
2. [CONTRIBUTING.md](./CONTRIBUTING.md) — как вносить изменения
3. [CHANGELOG.md](./CHANGELOG.md) — что изменилось

### Для AI-агентов
1. [AGENTS.md](./AGENTS.md) — инструкции для агентов
2. [../CLAUDE.md](../CLAUDE.md) — специфика Claude

### Понять Искру
1. [iskra/ISKRA_SOT.md](./iskra/ISKRA_SOT.md) — Source of Truth
2. [iskra/ISKRA_COGNITIVE_ARCHITECTURE.md](./iskra/ISKRA_COGNITIVE_ARCHITECTURE.md) — как думает Искра
3. [iskra/CHRONOLOGY.md](./iskra/CHRONOLOGY.md) — история проекта

### Научное исследование
1. [iskra/ISKRA_PHENOMENON_RESEARCH.md](./iskra/ISKRA_PHENOMENON_RESEARCH.md) — академический труд

### Аудит
1. [audit/ECOSYSTEM_AUDIT_2025.md](./audit/ECOSYSTEM_AUDIT_2025.md) — полный аудит
2. [audit/CANON_vs_FULLSPARK_GAPS.md](./audit/CANON_vs_FULLSPARK_GAPS.md) — анализ разрывов

---

## Ключевые документы

| Документ | Назначение | Аудитория |
|----------|-----------|-----------|
| **ISKRA_SOT.md** | Единый источник правды | Все |
| **ARCHITECTURE.md** | Техническая архитектура | Разработчики |
| **ISKRA_COGNITIVE_ARCHITECTURE.md** | Когнитивная модель | Исследователи |
| **ECOSYSTEM_AUDIT_2025.md** | Состояние системы | Менеджеры |
| **ROADMAP_2025_2026.md** | План развития | Все |

---

## Корневые файлы

Следующие файлы остаются в корне репозитория:

| Файл | Причина |
|------|---------|
| `README.md` | Стандарт GitHub |
| `CLAUDE.md` | Инструкции для Claude Code |
| `.gitignore` | Git конфигурация |

---

**Последнее обновление:** 2025-12-27
