/**
 * Tests for Search Service - Hybrid search (lexical + semantic)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock storageService
vi.mock('../storageService', () => ({
  storageService: {
    getTasks: vi.fn(() => [
      { id: '1', title: 'Test task one', ritualTag: 'daily' },
      { id: '2', title: 'Another task', ritualTag: 'weekly' },
    ]),
    getJournalEntries: vi.fn(() => [
      { id: 'j1', text: 'Journal entry about testing', timestamp: new Date().toISOString(), prompt: { question: 'How are you?' } },
    ]),
  },
}));

// Mock memoryService
vi.mock('../memoryService', () => ({
  memoryService: {
    getArchive: vi.fn(() => [
      {
        id: 'arc1',
        title: 'Archive memory',
        content: { text: 'Important archived content' },
        timestamp: new Date().toISOString(),
        type: 'insight',
        layer: 'archive',
        tags: ['important'],
        evidence: [],
      },
    ]),
    getShadow: vi.fn(() => [
      {
        id: 'shd1',
        title: 'Shadow memory',
        content: { text: 'Uncertain shadow content' },
        timestamp: new Date().toISOString(),
        type: 'event',
        layer: 'shadow',
        tags: ['uncertain'],
        evidence: [],
      },
    ]),
  },
}));

// Mock geminiService
vi.mock('../geminiService', () => ({
  IskraAIService: vi.fn().mockImplementation(() => ({
    getEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
  })),
}));

import { searchService } from '../searchService';

describe('searchService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('searchHybrid', () => {
    it('returns array of results', async () => {
      const results = await searchService.searchHybrid('test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns results with required fields', async () => {
      const results = await searchService.searchHybrid('task');

      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('snippet');
        expect(result).toHaveProperty('score');
      }
    });

    it('filters by type', async () => {
      const results = await searchService.searchHybrid('test', { type: ['task'] });

      results.forEach(r => {
        expect(r.type).toBe('task');
      });
    });

    it('filters by layer for memory type', async () => {
      const results = await searchService.searchHybrid('content', { layer: ['archive'] });

      results.forEach(r => {
        if (r.type === 'memory') {
          expect(r.layer).toBe('archive');
        }
      });
    });

    it('returns empty for no matches', async () => {
      const results = await searchService.searchHybrid('xyznonexistent123');
      expect(results.length).toBe(0);
    });

    it('scores results between 0 and 1', async () => {
      const results = await searchService.searchHybrid('task');

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });

    it('sorts results by score descending', async () => {
      const results = await searchService.searchHybrid('test');

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('handles empty query gracefully', async () => {
      const results = await searchService.searchHybrid('');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('build', () => {
    it('builds index without error', async () => {
      // First search triggers build
      await expect(searchService.searchHybrid('test')).resolves.not.toThrow();
    });
  });
});
