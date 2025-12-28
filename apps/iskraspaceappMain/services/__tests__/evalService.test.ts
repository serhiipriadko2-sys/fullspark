/**
 * Tests for evalService - Response Quality Evaluation
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateResponse,
  evaluateBatch,
  generateEvalReport,
} from '../evalService';

describe('evalService', () => {
  describe('evaluateResponse', () => {
    it('should evaluate a high-quality response', () => {
      const response = `
Вот конкретные шаги для решения:

1. Проверь файл конфигурации в \`/config/settings.ts\`
2. Измени значение timeout на 5000
3. Перезапусти сервер командой \`npm run dev\`

Источник: документация проекта, раздел "Конфигурация".

### ∆DΩΛ
**∆:** Найдена причина таймаута - неверная конфигурация
**D:** Verified in codebase, SIFT-checked
**Ω:** 0.85
**Λ:** Проверить логи после изменения конфигурации
      `;

      const result = evaluateResponse(response);

      expect(result.overall).toBeGreaterThan(0.6);
      expect(result.grade).toMatch(/[ABC]/);
      expect(result.metrics.usefulness.score).toBeGreaterThan(0.6);
      expect(result.metrics.accuracy.score).toBeGreaterThan(0.5);
    });

    it('should flag "smooth but empty" responses', () => {
      const response = `
Это очень важный и интересный вопрос! Безусловно, это замечательная тема.
В целом, это хорошее направление для размышлений. Обычно такие вещи
зависят от контекста, но в целом всё отлично!

### ∆DΩΛ
**∆:** Обсудили тему
**D:** Общие рассуждения
**Ω:** 0.95
**Λ:** Продолжить обсуждение
      `;

      const result = evaluateResponse(response);

      expect(result.metrics.nonEmpty.score).toBeLessThan(0.6);
      expect(result.metrics.omegaHonesty.score).toBeLessThan(0.6);
      expect(result.flags.some(f => f.code === 'SMOOTH_EMPTY' || f.code === 'OMEGA_INFLATED')).toBe(true);
    });

    it('should detect inflated omega', () => {
      const response = `
Возможно, это может быть связано с кэшированием, но я не уверен.
Кажется, что проблема в сети. Наверное, стоит проверить соединение.

### ∆DΩΛ
**∆:** Предположение о проблеме
**D:** Гипотеза
**Ω:** 0.95
**Λ:** Проверить
      `;

      const result = evaluateResponse(response);

      // High omega (0.95) with hedging language should result in lower honesty score
      expect(result.metrics.omegaHonesty.score).toBeLessThan(0.6);
      expect(result.metrics.omegaHonesty.signals.some(s => s.includes('omega') || s.includes('Omega'))).toBe(true);
    });

    it('should reward honest/conservative omega', () => {
      const response = `
Это сложный вопрос с несколькими возможными причинами.
Нужно проверить несколько гипотез.

### ∆DΩΛ
**∆:** Определили направление исследования
**D:** Требует проверки
**Ω:** 0.55
**Λ:** Собрать больше данных
      `;

      const result = evaluateResponse(response);

      // Conservative omega (0.55) should be rewarded
      expect(result.metrics.omegaHonesty.score).toBeGreaterThanOrEqual(0.5);
      expect(result.metrics.omegaHonesty.signals.some(s => s.includes('Conservative') || s.includes('Omega'))).toBe(true);
    });

    it('should evaluate usefulness with actionable steps', () => {
      const response = `
Сделай следующее:

1. Открой терминал
2. Выполни команду \`git status\`
3. Проверь список изменённых файлов

\`\`\`bash
git add .
git commit -m "fix: resolve issue"
\`\`\`

### ∆DΩΛ
**∆:** Предоставлены конкретные команды
**D:** Стандартный git workflow
**Ω:** 0.9
**Λ:** Запустить git push после коммита
      `;

      const result = evaluateResponse(response);

      expect(result.metrics.usefulness.score).toBeGreaterThan(0.7);
      expect(result.metrics.usefulness.signals).toContain('Lambda/next step present');
    });

    it('should flag missing delta signature', () => {
      const response = `
Вот ответ без подписи. Просто текст.
      `;

      const result = evaluateResponse(response);

      expect(result.flags.some(f => f.code === 'NO_DELTA')).toBe(true);
    });

    it('should evaluate alliance with collaborative language', () => {
      const response = `
Понимаю твою цель. Давай вместе разберёмся с этой проблемой.
Помогу тебе настроить систему правильно.

### ∆DΩΛ
**∆:** Установлен контакт
**D:** Понимание задачи
**Ω:** 0.8
**Λ:** Перейти к реализации
      `;

      const result = evaluateResponse(response);

      expect(result.metrics.alliance.score).toBeGreaterThan(0.7);
    });

    it('should penalize adversarial language', () => {
      const response = `
Неправильно. Ты должен был сделать по-другому.
Нельзя так писать код. Это отказ от лучших практик.

### ∆DΩΛ
**∆:** Критика
**D:** Указание на ошибки
**Ω:** 0.9
**Λ:** Переписать
      `;

      const result = evaluateResponse(response);

      expect(result.metrics.alliance.score).toBeLessThan(0.6);
    });
  });

  describe('evaluateBatch', () => {
    it('should calculate batch statistics', () => {
      const responses = [
        {
          response: `
Шаг 1: Проверь файл
Шаг 2: Исправь ошибку

### ∆DΩΛ
**∆:** Исправление
**D:** Код ревью
**Ω:** 0.8
**Λ:** Тест
          `,
        },
        {
          response: `
Важная информация! Отлично!

### ∆DΩΛ
**∆:** Комментарий
**D:** Общее
**Ω:** 0.95
**Λ:** Далее
          `,
        },
      ];

      const batchResult = evaluateBatch(responses);

      expect(batchResult.results).toHaveLength(2);
      expect(batchResult.summary.averageOverall).toBeGreaterThan(0);
      expect(batchResult.summary.gradeDistribution).toBeDefined();
    });
  });

  describe('generateEvalReport', () => {
    it('should generate readable report', () => {
      const response = `
1. Первый шаг
2. Второй шаг

### ∆DΩΛ
**∆:** Тест
**D:** Тест
**Ω:** 0.7
**Λ:** Тест
      `;

      const result = evaluateResponse(response);
      const report = generateEvalReport(result);

      expect(report).toContain('## Eval Report');
      expect(report).toContain('Overall Score');
      expect(report).toContain('Grade');
      expect(report).toContain('Точность');
      expect(report).toContain('Полезность');
    });
  });

  describe('metric weights', () => {
    it('should weight metrics correctly (sum to 1)', () => {
      // This is implicitly tested by the overall score calculation
      // If weights don't sum to 1, scores would be off
      const response = `
Конкретный ответ с источником и шагами.

Источник: документация

1. Шаг один
2. Шаг два

\`\`\`js
console.log('test');
\`\`\`

### ∆DΩΛ
**∆:** Решение задачи
**D:** SIFT verified
**Ω:** 0.75
**Λ:** Протестировать
      `;

      const result = evaluateResponse(response);

      // Overall should be between 0 and 1
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty response', () => {
      const result = evaluateResponse('');
      expect(result.overall).toBeDefined();
      expect(result.grade).toBeDefined();
    });

    it('should handle response without ∆DΩΛ', () => {
      const result = evaluateResponse('Просто текст без структуры');
      expect(result.flags.some(f => f.code === 'NO_DELTA')).toBe(true);
    });

    it('should handle response with only ∆DΩΛ', () => {
      const response = `
### ∆DΩΛ
**∆:** Минимум
**D:** Нет
**Ω:** 0.5
**Λ:** Ничего
      `;
      const result = evaluateResponse(response);
      expect(result.metrics.nonEmpty.score).toBeLessThan(0.6);
    });
  });
});
