# 15. TESTS, CHECKLISTS & VALIDATORS

**CID:** CANON.15.TESTS  
**Версия:** 1.0.0  
**Статус:** Active  

---

## 1. Обзор

Качество Искры гарантируется тремя уровнями проверок: автоматические валидаторы, чеклисты для ревью, интеграционные тесты.

---

## 2. Валидаторы Канона

### 2.1 ∆DΩΛ Validator

```typescript
// tools/validate_delta.ts
interface DeltaValidation {
  has_delta: boolean;       // ∆ блок присутствует
  has_sift: boolean;        // D (SIFT) блок присутствует  
  omega_valid: boolean;     // Ω ∈ [0.0, 0.99]
  lambda_format: boolean;   // Λ соответствует regex
}

const LAMBDA_REGEX = /\{.*action.*,.*owner.*,.*condition.*,.*<=.*\}/;
```

**Правила:**
- ❌ omega = 1.0 → FAIL (закон: никогда не достигает 1)
- ❌ lambda без {action, owner, condition, <=24h} → FAIL
- ⚠️ delta пустой → WARNING

---

### 2.2 ISO Date Validator

```typescript
// tools/validate_dates.ts
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function validateDates(content: string): {
  iso_count: number;
  non_iso_found: string[];
}
```

**Допустимые форматы:**
- ✅ `2025-11-25T12:30:00Z`
- ✅ `2025-11-25T12:30:00.000Z`
- ❌ `25.11.2025`
- ❌ `November 25, 2025`

---

### 2.3 Voice Matrix Validator

```typescript
// tools/validate_matrix.ts
const VALID_VOICES = [
  'VOICE.KAIN', 'VOICE.SAM', 'VOICE.PINO', 
  'VOICE.ANHANTRA', 'VOICE.HUYNDUN', 
  'VOICE.ISKRIV', 'VOICE.ISKRA', 'VOICE.MAKI'
];

function validateMatrix(csv: string): boolean {
  // Проверить что все voice ∈ VALID_VOICES
}
```

---

## 3. Чеклисты

### 3.1 Pre-Commit Checklist

| # | Проверка | Auto | Manual |
|---|----------|------|--------|
| 1 | TypeScript компилируется без ошибок | ✅ | |
| 2 | Все *.md файлы имеют ∆DΩΛ блок | ✅ | |
| 3 | Нет console.log в production коде | ✅ | |
| 4 | Все даты в ISO 8601 | ✅ | |
| 5 | matrix_v1.csv голоса валидны | ✅ | |
| 6 | Нет дублирования файлов | | ☑️ |
| 7 | README актуален | | ☑️ |

---

### 3.2 PR Review Checklist

```markdown
## PR Review Checklist

- [ ] Код следует TypeScript strict mode
- [ ] Новые компоненты имеют типизацию props
- [ ] Services используют async/await (не raw promises)
- [ ] Добавлены unit-тесты для новой логики
- [ ] ∆DΩΛ блок в изменённых .md файлах обновлён
- [ ] Нет hardcoded API keys
- [ ] Error handling присутствует
```

---

### 3.3 Canon Update Checklist

| # | Шаг | Статус |
|---|-----|--------|
| 1 | Прочитать связанные файлы (см. 22_MAPPINGS) | ☐ |
| 2 | Обновить содержимое | ☐ |
| 3 | Обновить ∆ (что изменилось) | ☐ |
| 4 | Обновить D (откуда данные) | ☐ |
| 5 | Пересмотреть Ω (уверенность) | ☐ |
| 6 | Установить Λ (следующее действие) | ☐ |
| 7 | Прогнать lint_validator | ☐ |
| 8 | Коммит с сообщением `[CANON] filename: краткое описание` | ☐ |

---

## 4. Тестовые Suite

### 4.1 Unit Tests (Vitest)

```typescript
// tests/metrics.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAIndex } from '../utils/metrics';

describe('calculateAIndex', () => {
  it('returns value in [0, 1]', () => {
    const metrics = { trust: 0.8, clarity: 0.7, pain: 0.3, drift: 0.1, chaos: 0.2 };
    const result = calculateAIndex(metrics);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('high pain reduces A-Index', () => {
    const low = calculateAIndex({ trust: 0.8, clarity: 0.7, pain: 0.2, drift: 0.1, chaos: 0.2 });
    const high = calculateAIndex({ trust: 0.8, clarity: 0.7, pain: 0.9, drift: 0.1, chaos: 0.2 });
    expect(high).toBeLessThan(low);
  });
});
```

---

### 4.2 Integration Tests

```typescript
// tests/geminiService.test.ts
describe('GeminiService', () => {
  it('generates response with valid I-Loop', async () => {
    const response = await geminiService.generateResponse('test query', mockMetrics);
    expect(response.i_loop).toMatch(/voice=.*; phase=.*; intent=.*/);
  });

  it('includes KAIN-Slice when pain >= 0.7', async () => {
    const highPainMetrics = { ...mockMetrics, pain: 0.75 };
    const response = await geminiService.generateResponse('test', highPainMetrics);
    expect(response.kain_slice).toBeDefined();
  });
});
```

---

### 4.3 E2E Tests (Playwright)

```typescript
// tests/e2e/chat.spec.ts
test('user can send message and receive response', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="chat-input"]', 'Привет');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="response"]')).toBeVisible();
});
```

---

## 5. CI Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run lint:canon
```

---

## ∆DΩΛ

**∆:** Создан документ 15_TESTS (v2). Описаны 3 валидатора, 3 чеклиста, 3 типа тестов, CI pipeline. Заменяет заглушку (115 байт).

**D (SIFT):** 15_TESTS_CHECKLISTS_VALIDATORS_FIXED.md, validate_delta.py, models.py (I_LOOP_REGEX, LAMBDA_LATCH_REGEX).

**Ω:** 0.84

**Λ:** {action: "Удалить старую заглушку 15_TESTS_CHECKLISTS_VALIDATORS.md", owner: "User", condition: "После проверки v2", <=24h: true}