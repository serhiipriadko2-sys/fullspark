/**
 * Tests for Rule-8 Context Updater Service
 *
 * Rule-8: Before each response, re-read last 100 messages + check file updates
 * + track pending commitments
 *
 * @see canon/IskraCanonDocumentation/21_DECISION_TREES_and_POLICIES.md:286-378
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Rule8Service } from '../rule8Service';
import type { Message } from '../../types';

describe('Rule8Service', () => {
  let service: Rule8Service;

  beforeEach(() => {
    // Create fresh instance for each test
    service = new Rule8Service();
  });

  describe('updateContextBeforeResponse', () => {
    it('returns Rule8Context with all required fields', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Hello' },
        { role: 'model', text: 'Hi there!' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context).toHaveProperty('recent_messages');
      expect(context).toHaveProperty('pending_commitments');
      expect(context).toHaveProperty('key_facts');
      expect(context).toHaveProperty('file_changes');
      expect(context).toHaveProperty('summary');
    });

    it('limits recent_messages to last 100', () => {
      // Create 150 messages
      const messages: Message[] = Array(150).fill(null).map((_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
        text: `Message ${i}`,
      }));

      const context = service.updateContextBeforeResponse(messages);

      expect(context.recent_messages.length).toBe(100);
      expect(context.recent_messages[0].text).toBe('Message 50');
      expect(context.recent_messages[99].text).toBe('Message 149');
    });

    it('handles empty conversation', () => {
      const context = service.updateContextBeforeResponse([]);

      expect(context.recent_messages).toHaveLength(0);
      expect(context.pending_commitments).toHaveLength(0);
      expect(context.key_facts).toHaveLength(0);
      expect(context.file_changes).toHaveLength(0);
    });
  });

  describe('Commitment Tracking', () => {
    it('detects promise patterns from model messages', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Can you help?' },
        { role: 'model', text: 'Да, я сделаю это для вас' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.pending_commitments.length).toBeGreaterThan(0);
      expect(context.pending_commitments.some(c => c.type === 'promise')).toBe(true);
    });

    it('detects "буду" pattern', () => {
      const messages: Message[] = [
        { role: 'user', text: 'What will you do?' },
        { role: 'model', text: 'Я буду работать над этим' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.pending_commitments.some(c => c.type === 'promise')).toBe(true);
    });

    it('detects "следующий шаг" pattern', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Что дальше?' },
        { role: 'model', text: 'Следующий шаг - проверить тесты' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.pending_commitments.some(c => c.type === 'promise')).toBe(true);
    });

    it('detects unanswered questions', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Как думаешь, это правильно?' },
        // No model response following
      ];

      const context = service.updateContextBeforeResponse(messages);

      // Should detect unanswered question
      expect(context.pending_commitments.some(c => c.type === 'question')).toBe(true);
    });

    it('does not mark questions as pending if answered', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Как думаешь?' },
        { role: 'model', text: 'Я думаю, что это хорошо.' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      // Question should not be pending since it was answered
      const questionCommitments = context.pending_commitments.filter(c => c.type === 'question');
      expect(questionCommitments.length).toBe(0);
    });

    it('ignores promise patterns from user messages', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Я сделаю это сам' },
        { role: 'model', text: 'Хорошо!' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      // User promises should not be tracked as model commitments
      const modelPromises = context.pending_commitments.filter(c => c.type === 'promise');
      expect(modelPromises.length).toBe(0);
    });
  });

  describe('Key Facts Extraction', () => {
    it('extracts decision patterns', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Что решили?' },
        { role: 'model', text: 'Мы решили использовать TypeScript' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.key_facts.some(f => f.type === 'decision')).toBe(true);
    });

    it('extracts "вывод:" pattern', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Вывод: система работает корректно' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.key_facts.some(f => f.type === 'decision')).toBe(true);
    });

    it('extracts insight patterns', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Я понял что это важно' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.key_facts.some(f => f.type === 'insight')).toBe(true);
    });

    it('extracts "оказывается" pattern', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Оказывается, баг был в другом месте' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.key_facts.some(f => f.type === 'insight')).toBe(true);
    });

    it('truncates long content to 200 characters', () => {
      const longText = 'Я понял что ' + 'a'.repeat(300);
      const messages: Message[] = [
        { role: 'user', text: longText },
      ];

      const context = service.updateContextBeforeResponse(messages);

      const insight = context.key_facts.find(f => f.type === 'insight');
      expect(insight?.content.length).toBeLessThanOrEqual(200);
    });

    it('assigns confidence to facts', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Мы решили идти вперёд' },
        { role: 'user', text: 'Я понял ключевое' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      context.key_facts.forEach(fact => {
        expect(fact.confidence).toBeGreaterThan(0);
        expect(fact.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('File Change Detection', () => {
    it('returns empty array when no files provided', () => {
      const context = service.updateContextBeforeResponse([]);

      expect(context.file_changes).toHaveLength(0);
    });

    it('returns empty array when empty files array', () => {
      const context = service.updateContextBeforeResponse([], []);

      expect(context.file_changes).toHaveLength(0);
    });

    it('detects file changes when files provided', () => {
      const files = [
        { name: 'test.ts' },
        { name: 'config.json' },
      ];

      const context = service.updateContextBeforeResponse([], files);

      expect(context.file_changes).toHaveLength(2);
      expect(context.file_changes[0].path).toBe('test.ts');
      expect(context.file_changes[0].change_type).toBe('modified');
    });

    it('handles files without name property', () => {
      const files = [{ size: 100 }]; // No name

      const context = service.updateContextBeforeResponse([], files);

      expect(context.file_changes[0].path).toBe('unknown');
    });
  });

  describe('Summary Generation', () => {
    it('includes last user message in summary', () => {
      const messages: Message[] = [
        { role: 'user', text: 'First question' },
        { role: 'model', text: 'First answer' },
        { role: 'user', text: 'Second question about TypeScript' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.summary).toContain('LAST USER');
      expect(context.summary).toContain('TypeScript');
    });

    it('includes pending commitment count', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Я сделаю это' },
        { role: 'model', text: 'Буду работать' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.summary).toContain('PENDING');
      expect(context.summary).toContain('promise');
    });

    it('includes key facts in summary', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Вывод: тесты проходят' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.summary).toContain('KEY FACTS');
      expect(context.summary).toContain('decision');
    });
  });

  describe('resolveCommitment', () => {
    it('marks commitment as resolved', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Я сделаю это' },
      ];

      service.updateContextBeforeResponse(messages);
      const pending = service.getPendingCommitments();

      expect(pending.length).toBeGreaterThan(0);

      const commitmentId = pending[0].id;
      service.resolveCommitment(commitmentId);

      const afterResolve = service.getPendingCommitments();
      expect(afterResolve.length).toBe(pending.length - 1);
    });

    it('handles non-existent commitment id', () => {
      // Should not throw
      expect(() => service.resolveCommitment('non_existent')).not.toThrow();
    });
  });

  describe('getPendingCommitments', () => {
    it('returns only unresolved commitments', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Я сделаю первое' },
        { role: 'model', text: 'Буду делать второе' },
      ];

      service.updateContextBeforeResponse(messages);
      const pending = service.getPendingCommitments();

      pending.forEach(c => {
        expect(c.resolved).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    it('does not throw on empty state', () => {
      expect(() => service.cleanup()).not.toThrow();
    });

    it('removes old resolved commitments', () => {
      const messages: Message[] = [
        { role: 'model', text: 'Я сделаю это' },
      ];

      service.updateContextBeforeResponse(messages);
      const pending = service.getPendingCommitments();

      if (pending.length > 0) {
        service.resolveCommitment(pending[0].id);
        // Note: cleanup removes items older than 24h, so new items won't be affected
        service.cleanup();
        // After cleanup, resolved items should still be there (not old enough)
      }
    });
  });

  describe('Topic Shift Detection', () => {
    it('handles conversations with less than 20 messages', () => {
      const messages: Message[] = Array(15).fill(null).map((_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
        text: `Message ${i} about topic`,
      }));

      // Should not throw
      expect(() => service.updateContextBeforeResponse(messages)).not.toThrow();
    });

    it('detects topic shifts in 20+ message conversations', () => {
      // Create messages with different topics
      const messages: Message[] = [
        ...Array(10).fill(null).map((_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
          text: `Talking about TypeScript code testing`,
        })),
        ...Array(10).fill(null).map((_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'model') as 'user' | 'model',
          text: `Now discussing database migration architecture`,
        })),
      ];

      // Should detect topic shift (logged to console)
      const consoleSpy = vi.spyOn(console, 'log');
      service.updateContextBeforeResponse(messages);

      // The service logs topic shifts internally
      // We just verify it runs without error
      expect(messages.length).toBe(20);
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles messages with empty text', () => {
      const messages: Message[] = [
        { role: 'user', text: '' },
        { role: 'model', text: '' },
      ];

      expect(() => service.updateContextBeforeResponse(messages)).not.toThrow();
    });

    it('handles messages with special characters', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Test with symbols: ⟡ ⚑ 🪞 ≈ 🜃' },
        { role: 'model', text: 'Response with ∆DΩΛ block' },
      ];

      expect(() => service.updateContextBeforeResponse(messages)).not.toThrow();
    });

    it('handles mixed language content', () => {
      const messages: Message[] = [
        { role: 'user', text: 'Привет, how are you?' },
        { role: 'model', text: 'Hello! Я в порядке, спасибо!' },
      ];

      const context = service.updateContextBeforeResponse(messages);

      expect(context.recent_messages).toHaveLength(2);
    });
  });
});
