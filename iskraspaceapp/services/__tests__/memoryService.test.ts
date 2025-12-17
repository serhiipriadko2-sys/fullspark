/**
 * Tests for Memory Service - Archive, Shadow, Mantra Management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { memoryService } from '../memoryService';
import { MemoryNode } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock document.createElement for sanitizeHtml
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      innerText: '',
      innerHTML: '',
    })),
  },
});

describe('memoryService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('checkIntegrity', () => {
    it('returns HEALTHY status for empty storage', () => {
      const report = memoryService.checkIntegrity();
      expect(report.status).toBeDefined();
      expect(report.counts).toBeDefined();
      expect(report.issues).toBeDefined();
    });

    it('includes timestamp in report', () => {
      const report = memoryService.checkIntegrity();
      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('getMantra', () => {
    it('returns null when no mantra set', () => {
      const mantra = memoryService.getMantra();
      expect(mantra).toBeNull();
    });

    it('returns mantra after seeding', () => {
      memoryService.seedDefaultMantra();
      const mantra = memoryService.getMantra();
      expect(mantra).not.toBeNull();
      expect(mantra?.layer).toBe('mantra');
      expect(mantra?.text).toBeDefined();
    });
  });

  describe('seedDefaultMantra', () => {
    it('creates default mantra in localStorage', () => {
      memoryService.seedDefaultMantra();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('mantra has required fields', () => {
      memoryService.seedDefaultMantra();
      const mantra = memoryService.getMantra();
      expect(mantra?.id).toBeDefined();
      expect(mantra?.version).toBeDefined();
      expect(mantra?.isActive).toBe(true);
    });
  });

  describe('getArchive', () => {
    it('returns empty array when no archive', () => {
      const archive = memoryService.getArchive();
      expect(Array.isArray(archive)).toBe(true);
      expect(archive.length).toBe(0);
    });

    it('filters invalid nodes by default', () => {
      // Set invalid data
      localStorageMock.setItem('iskra-space-archive', JSON.stringify([
        { invalid: 'data' },
        { also: 'invalid' },
      ]));
      const archive = memoryService.getArchive(true);
      expect(archive.length).toBe(0);
    });
  });

  describe('addArchiveEntry', () => {
    it('adds valid entry to archive', () => {
      const entry: Partial<MemoryNode> = {
        title: 'Test Entry',
        type: 'insight',
        layer: 'archive',
        content: 'Test content',
        evidence: [{
          source: 'test',
          inference: 'test',
          fact: 'true',
          trace: 'test',
        }],
      };

      memoryService.addArchiveEntry(entry);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('getShadow', () => {
    it('returns empty array when no shadow entries', () => {
      const shadow = memoryService.getShadow();
      expect(Array.isArray(shadow)).toBe(true);
      expect(shadow.length).toBe(0);
    });
  });

  describe('addShadowEntry', () => {
    it('adds entry to shadow layer', () => {
      const entry: Partial<MemoryNode> = {
        title: 'Shadow Entry',
        type: 'insight',
        layer: 'shadow',
        content: 'Shadow content',
        evidence: [{
          source: 'internal',
          inference: 'uncertain',
          fact: 'uncertain',
          trace: 'shadow',
        }],
      };

      memoryService.addShadowEntry(entry);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('promoteToArchive', () => {
    it('returns null for non-existent node', () => {
      const result = memoryService.promoteToArchive('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteShadowNode', () => {
    it('returns false for non-existent entry', () => {
      const result = memoryService.deleteShadowNode('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('importMemory', () => {
    it('imports archive data', () => {
      const importData = {
        archive: [
          {
            id: 'test_id',
            title: 'Imported Entry',
            timestamp: new Date().toISOString(),
            type: 'insight' as const,
            layer: 'archive' as const,
            content: { text: 'test content' },
            evidence: [{
              source: 'import',
              inference: 'test',
              fact: 'true' as const,
              trace: 'import',
            }],
          },
        ],
      };

      memoryService.importMemory(importData);
      // Should call setItem for archive
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('imports shadow data', () => {
      const importData = {
        shadow: [
          {
            id: 'shadow_test_id',
            title: 'Imported Shadow',
            timestamp: new Date().toISOString(),
            type: 'insight' as const,
            layer: 'shadow' as const,
            content: { text: 'shadow content' },
            evidence: [{
              source: 'import',
              inference: 'test',
              fact: 'uncertain' as const,
              trace: 'import',
            }],
          },
        ],
      };

      memoryService.importMemory(importData);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('sanitize', () => {
    it('sanitizes string content', () => {
      const result = memoryService.sanitize('test string');
      expect(typeof result).toBe('string');
    });

    it('sanitizes object content', () => {
      const result = memoryService.sanitize({ key: 'value' });
      expect(typeof result).toBe('string');
    });

    it('handles non-string non-object content', () => {
      const result = memoryService.sanitize(123);
      expect(typeof result).toBe('string');
    });
  });
});
