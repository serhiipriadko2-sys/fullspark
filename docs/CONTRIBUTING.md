# CONTRIBUTING.md — Гайд по контрибьюции

> Правила и процессы для участия в разработке Fullspark/Iskra Space.

---

## Философия проекта

Fullspark — это не просто код, это **философский проект**. Перед контрибьюцией:

1. **Изучите Canon** — философскую основу в `canon/`
2. **Поймите голоса** — 9 граней личности Искры
3. **Уважайте ∆DΩΛ** — протокол честности и полезности

---

## Настройка окружения

### Требования

- Node.js 18+
- npm или pnpm
- Git

### Первоначальная настройка

```bash
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
```

---

## Процесс разработки

### 1. Создание ветки

```bash
# Синхронизация с upstream
git fetch upstream
git checkout main
git merge upstream/main

# Создание feature ветки
git checkout -b feature/my-feature
# или
git checkout -b fix/my-fix
```

### Naming Convention для веток

| Тип | Формат | Пример |
|-----|--------|--------|
| Feature | `feature/description` | `feature/add-sibyl-voice` |
| Fix | `fix/description` | `fix/voice-activation-formula` |
| Docs | `docs/description` | `docs/update-architecture` |
| Refactor | `refactor/description` | `refactor/metrics-service` |

### 2. Разработка

```bash
# Запуск dev сервера
npm run dev

# Запуск тестов в watch mode
npm test

# Type checking
npm run typecheck
```

### 3. Коммиты

Используйте **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Типы:**

| Тип | Описание |
|-----|----------|
| `feat` | Новая функциональность |
| `fix` | Исправление бага |
| `docs` | Только документация |
| `style` | Форматирование (не влияет на код) |
| `refactor` | Рефакторинг без изменения поведения |
| `test` | Добавление или исправление тестов |
| `chore` | Обновление зависимостей и т.п. |

**Примеры:**

```bash
git commit -m "feat(voice): add SIBYL voice activation"
git commit -m "fix(metrics): correct pain threshold in KAIN formula"
git commit -m "docs: update ARCHITECTURE.md with new services"
git commit -m "test(eval): add edge cases for omegaHonesty"
```

### 4. Pull Request

```bash
# Push ветки
git push origin feature/my-feature
```

---

## Стандарты кода

### TypeScript

```typescript
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
```

### Тесты

```typescript
// tests/myService.test.ts

import { describe, it, expect } from 'vitest';
import { myFunction } from '../services/myService';

describe('myService', () => {
  it('should handle normal input', () => {
    const result = myFunction(normalInput);
    expect(result).toBe(expectedOutput);
  });
});
```

---

## Критические области

### Что требует особого внимания

1. **voiceEngine.ts** — формулы активации голосов
2. **deltaProtocol.ts** — валидация ∆DΩΛ
3. **types.ts** — изменения типов влияют на всё
4. **policyEngine.ts** — маршрутизация playbooks
5. **evalService.ts** — система оценки

### Что НЕ менять без согласования

- Количество и названия голосов
- Структуру ∆DΩΛ протокола
- Формулы активации (без понимания Canon)
- Названия метрик

---

## ∆DΩΛ

**∆:** CONTRIBUTING.md — правила и процессы контрибьюции.
**D:** Источник — best practices, проектные стандарты.
**Ω:** Высокая — проверено на практике.
**Λ:** Следуйте гайду, задавайте вопросы в Issues.
