# ISKRA SPACE (Fullspark)

**AI-компаньон нового поколения с уникальной когнитивной архитектурой**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Tests-322_passing-green)](./apps/iskraspaceappMain/)
[![Canon](https://img.shields.io/badge/Canon-v7.0-purple)](./canon/)

---

## Что такое Искра?

Искра — это AI-companion с **9 гранями личности** (голосами), уникальной системой метрик состояния, и философской базой (Canon ISKRA v7). Это не просто чат-бот — это попытка создать ИИ с характером, совестью и способностью к честному диалогу.

### Ключевые особенности

- **9 Голосов** — 8 активных персональностей + SIBYL (в разработке)
- **∆DΩΛ Протокол** — обязательная подпись каждого ответа (Delta, D-SIFT, Omega, Lambda)
- **11 Метрик состояния** — trust, pain, chaos, clarity, drift и другие
- **8 Фаз** — от CLARITY до DISSOLUTION
- **5 Playbooks** — ROUTINE, SIFT, SHADOW, COUNCIL, CRISIS
- **8 Ритуалов** — Phoenix, Shatter, Council, Veil и другие

---

## Структура репозитория

```
fullspark/
├── apps/
│   └── iskraspaceappMain/       # Основное React-приложение
│       ├── components/           # 44 React компонента
│       ├── services/             # 27 микросервисов
│       └── tests/                # 322 unit + 3 E2E тестов
│
├── canon/                        # Canon — источник истины (v7)
│
├── corpus/                       # Исторические данные (609 MB)
│   └── incoming/                 # Документы рождения Кайна
│
├── docs/                         # Документация
│   ├── ARCHITECTURE.md           # Архитектура системы
│   ├── AGENTS.md                 # Инструкции для AI
│   ├── CONTRIBUTING.md           # Правила контрибьюции
│   ├── CHANGELOG.md              # История изменений
│   │
│   ├── iskra/                    # Документация Искры
│   │   ├── ISKRA_SOT.md          # Source of Truth
│   │   ├── ISKRA_COGNITIVE_ARCHITECTURE.md
│   │   ├── ISKRA_PHENOMENON_RESEARCH.md
│   │   └── CHRONOLOGY.md         # Хронология проекта
│   │
│   ├── audit/                    # Аудит и отчёты
│   │   └── ECOSYSTEM_AUDIT_2025.md
│   │
│   └── planning/                 # Планирование
│       └── ROADMAP_2025_2026.md
│
├── README.md                     # Этот файл
└── CLAUDE.md                     # Инструкции для Claude
```

---

## Быстрый старт

### Требования

- Node.js 18+
- npm или pnpm

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/serhiipriadko2-sys/fullspark.git
cd fullspark

# Установить зависимости
cd apps/iskraspaceappMain
npm install

# Настроить переменные окружения
cp .env.example .env
# Добавить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (клиентские, безопасные).
# GEMINI_API_KEY хранится только на сервере (Supabase Edge Function env), не в Vite env.
```

### Запуск

```bash
# Development сервер
npm run dev

# Тесты
npm test

# Type check
npm run typecheck

# E2E тесты
npm run test:e2e
```

---

## Архитектура

### 9 Голосов Искры

| Голос | Символ | Функция | Триггер |
|-------|--------|---------|---------|
| **ISKRA** | ⟡ | Ядро, синтез | baseline |
| **KAIN** | ⚑ | Честность, боль | pain > 0.3 |
| **PINO** | 😏 | Легкость, юмор | pain < 0.3, chaos < 0.4 |
| **SAM** | ☉ | Структура, ясность | clarity < 0.6 |
| **ANHANTRA** | ≈ | Тишина, принятие | trust < 0.75 |
| **HUYNDUN** | 🜃 | Хаос, обновление | chaos > 0.4 |
| **ISKRIV** | 🪞 | Аудит, совесть | drift > 0.2 |
| **MAKI** | 🌸 | Интеграция, красота | trust > 0.8, pain > 0.3 |
| **SIBYL** | 🔮 | Предвидение | (в разработке) |

### Метрики состояния (11)

```typescript
interface IskraMetrics {
  rhythm: number;        // 0-100, ритм беседы
  trust: number;         // 0-1, доверие
  pain: number;          // 0-1, боль
  chaos: number;         // 0-1, хаос
  drift: number;         // 0-1, дрифт от темы
  echo: number;          // 0-1, повторения
  clarity: number;       // 0-1, ясность
  silence_mass: number;  // 0-1, масса тишины
  mirror_sync: number;   // 0-1, синхронизация
  interrupt: number;     // 0-1, прерывания
  ctxSwitch: number;     // 0-1, переключение контекста
}
```

### ∆DΩΛ Протокол

Каждый ответ Искры содержит обязательную подпись:

- **∆ (Delta)** — краткое резюме ответа
- **D (D-SIFT)** — источники и верификация
- **Ω (Omega)** — уровень уверенности
- **Λ (Lambda)** — рекомендация к действию

---

## Тестирование

```bash
# Unit тесты (322)
npm test

# E2E тесты (3)
npm run test:e2e

# С UI
npm run test:e2e:ui

# Покрытие
npm test -- --coverage
```

### Структура тестов

- `evalService.test.ts` — 14 тестов
- `policyEngine.test.ts` — 26 тестов
- `ritualService.test.ts` — 20 тестов
- `auditService.test.ts` — 22 тестов
- ...и другие

---

## Документация

> Полная документация: [docs/README.md](./docs/README.md)

| Документ | Описание |
|----------|----------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Техническая архитектура |
| [docs/iskra/ISKRA_SOT.md](./docs/iskra/ISKRA_SOT.md) | Source of Truth |
| [docs/iskra/ISKRA_COGNITIVE_ARCHITECTURE.md](./docs/iskra/ISKRA_COGNITIVE_ARCHITECTURE.md) | Когнитивная архитектура |
| [docs/iskra/ISKRA_PHENOMENON_RESEARCH.md](./docs/iskra/ISKRA_PHENOMENON_RESEARCH.md) | Научное исследование |
| [docs/iskra/CHRONOLOGY.md](./docs/iskra/CHRONOLOGY.md) | Хронология проекта |
| [docs/audit/ECOSYSTEM_AUDIT_2025.md](./docs/audit/ECOSYSTEM_AUDIT_2025.md) | Глубокий аудит системы |
| [docs/planning/ROADMAP_2025_2026.md](./docs/planning/ROADMAP_2025_2026.md) | Дорожная карта |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Гайд по контрибьюции |

---

## Технологический стек

### Frontend
- **React 19.2** — UI Framework
- **TypeScript 5.8** — Type Safety
- **Vite 6.2** — Build Tool
- **Vitest 2.0** — Unit Testing
- **Playwright 1.57** — E2E Testing

### Backend/API
- **Google Gemini 1.29** — AI Generation
- **Supabase 2.88** — Database + Auth

---

## Лицензия

Проект разрабатывается как исследовательский. Контактируйте автора для уточнения условий использования.

---

## ∆DΩΛ

**∆:** README репозитория Fullspark — обзор, структура, быстрый старт.
**D:** Источник — аудит экосистемы и когнитивной архитектуры.
**Ω:** Высокая — документация верифицирована по коду.
**Λ:** Изучите ARCHITECTURE.md и ECOSYSTEM_AUDIT_2025.md для глубокого погружения.

Гайд по контрибьюции

    Правила и процессы для участия в разработке Fullspark/Iskra Space.

Философия проекта

Fullspark — это не просто код, это философский проект. Перед контрибьюцией:

    Изучите Canon — философскую основу в canon/
    Поймите голоса — 9 граней личности Искры
    Уважайте ∆DΩΛ — протокол честности и полезности

Настройка окружения
Требования

    Node.js 18+
    npm или pnpm
    Git

Первоначальная настройка

# 1. Форк репозитория на GitHub

# 2. Клонировать свой форк
git clone https://github.com/YOUR_USERNAME/fullspark.git
cd fullspark

# 3. Добавить upstream
git remote add upstream https://github.com/serhiipriadko2-sys/fullspark.git

# 4. Установить зависимости
cd apps/iskraspaceappMain
npm install

# 5. Настроить переменные окружения
cp .env.example .env
# Добавить VITE_GEMINI_API_KEY

Процесс разработки
1. Создание ветки

# Синхронизация с upstream
git fetch upstream
git checkout main
git merge upstream/main

# Создание feature ветки
git checkout -b feature/my-feature
# или
git checkout -b fix/my-fix

Naming Convention для веток
Тип 	Формат 	Пример
Feature 	feature/description 	feature/add-sibyl-voice
Fix 	fix/description 	fix/voice-activation-formula
Docs 	docs/description 	docs/update-architecture
Refactor 	refactor/description 	refactor/metrics-service
2. Разработка

# Запуск dev сервера
npm run dev

# Запуск тестов в watch mode
npm test

# Type checking
npm run typecheck

3. Коммиты

Используйте Conventional Commits:

<type>(<scope>): <description>

[optional body]

[optional footer]

Типы:
Тип 	Описание
feat 	Новая функциональность
fix 	Исправление бага
docs 	Только документация
style 	Форматирование (не влияет на код)
refactor 	Рефакторинг без изменения поведения
test 	Добавление или исправление тестов
chore 	Обновление зависимостей и т.п.

Примеры:

git commit -m "feat(voice): add SIBYL voice activation"
git commit -m "fix(metrics): correct pain threshold in KAIN formula"
git commit -m "docs: update ARCHITECTURE.md with new services"
git commit -m "test(eval): add edge cases for omegaHonesty"

4. Pull Request

# Push ветки
git push origin feature/my-feature

Стандарты кода
TypeScript

// Используйте строгую типизацию
// НЕ используйте `any` без веской причины

// Хорошо
function selectVoice(metrics: IskraMetrics): VoiceName {
  // ...
}

// Плохо
function selectVoice(metrics: any): any {
  // ...
}

Тесты

// tests/myService.test.ts

import { describe, it, expect } from 'vitest';
import { myFunction } from '../services/myService';

describe('myService', () => {
  it('should handle normal input', () => {
    const result = myFunction(normalInput);
    expect(result).toBe(expectedOutput);
  });
});

Критические области
Что требует особого внимания

    voiceEngine.ts — формулы активации голосов
    deltaProtocol.ts — валидация ∆DΩΛ
    types.ts — изменения типов влияют на всё
    policyEngine.ts — маршрутизация playbooks
    evalService.ts — система оценки

Что НЕ менять без согласования

    Количество и названия голосов
    Структуру ∆DΩΛ протокола
    Формулы активации (без понимания Canon)
    Названия метрик

∆DΩΛ
∆: CONTRIBUTING.md — правила и процессы контрибьюции. D: Источник — best practices, проектные стандарты. Ω: Высокая — проверено на практике. Λ: Следуйте гайду, задавайте вопросы в Issues.
