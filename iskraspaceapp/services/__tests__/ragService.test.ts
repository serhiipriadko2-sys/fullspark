/**
 * Tests for RAG Service - Retrieval Augmented Generation
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

// Mock memoryService
vi.mock('../memoryService', () => ({
  memoryService: {
    getArchive: vi.fn(() => []),
    getShadow: vi.fn(() => []),
    getMantra: vi.fn(() => null),
  },
}));

// Mock searchService
vi.mock('../searchService', () => ({
  searchService: {
    searchHybrid: vi.fn(async () => []),
  },
}));

import { buildRAGContext, enhanceMessageWithRAG, generateSourceAttribution } from '../ragService';

describe('ragService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('buildRAGContext', () => {
    it('returns RAGContext object', async () => {
      const context = await buildRAGContext('test query');

      expect(context).toHaveProperty('query');
      expect(context).toHaveProperty('relevantMemories');
      expect(context).toHaveProperty('contextBlock');
      expect(context).toHaveProperty('sources');
    });

    it('includes query in context', async () => {
      const context = await buildRAGContext('specific search term');
      expect(context.query).toBe('specific search term');
    });

    it('returns empty memories when no matches', async () => {
      const context = await buildRAGContext('nonexistent term xyz');
      expect(context.relevantMemories).toEqual([]);
    });

    it('respects maxMemories option', async () => {
      const context = await buildRAGContext('test', { maxMemories: 2 });
      expect(context.relevantMemories.length).toBeLessThanOrEqual(2);
    });
  });

  describe('enhanceMessageWithRAG', () => {
    it('returns context block and sources', async () => {
      const result = await enhanceMessageWithRAG('test question');

      expect(result).toHaveProperty('contextBlock');
      expect(result).toHaveProperty('sources');
    });

    it('works with empty history', async () => {
      const result = await enhanceMessageWithRAG('test', []);

      expect(result.contextBlock).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('works with message history', async () => {
      const history = [
        { role: 'user' as const, text: 'previous question' },
        { role: 'assistant' as const, text: 'previous answer' },
      ];
      const result = await enhanceMessageWithRAG('new question', history);

      expect(result).toHaveProperty('contextBlock');
      expect(result).toHaveProperty('sources');
    });
  });

  describe('generateSourceAttribution', () => {
    it('returns empty string for no sources', () => {
      const formatted = generateSourceAttribution([]);
      expect(formatted).toBe('');
    });

    it('formats single source', () => {
      const sources = [
        { id: '1', title: 'Test Source', type: 'archive', confidence: 0.8 },
      ];
      const formatted = generateSourceAttribution(sources);

      expect(formatted).toContain('Test Source');
      expect(formatted).toContain('Источники');
    });

    it('formats multiple sources', () => {
      const sources = [
        { id: '1', title: 'Source One', type: 'archive', confidence: 0.9 },
        { id: '2', title: 'Source Two', type: 'mantra', confidence: 0.8 },
      ];
      const formatted = generateSourceAttribution(sources);

      expect(formatted).toContain('Source One');
      expect(formatted).toContain('Source Two');
    });

    it('includes confidence percentage', () => {
      const sources = [
        { id: '1', title: 'Test', type: 'archive', confidence: 0.85 },
      ];
      const formatted = generateSourceAttribution(sources);

      expect(formatted).toContain('85%');
    });
  });
});
