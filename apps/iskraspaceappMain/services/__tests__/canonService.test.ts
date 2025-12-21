/**
 * Tests for Canon Service - Knowledge Base Seeding
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the service
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

// Mock memoryService
vi.mock('../memoryService', () => ({
  memoryService: {
    addArchiveEntry: vi.fn(),
  },
}));

import { canonService } from '../canonService';
import { memoryService } from '../memoryService';

describe('canonService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('seedCanon', () => {
    it('seeds canon when not already seeded', () => {
      canonService.seedCanon();

      // Should mark as seeded
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'iskra-canon-seeded-v2',
        expect.any(String)
      );
    });

    it('does not re-seed when already seeded', () => {
      // Mark as already seeded
      localStorageMock.setItem('iskra-canon-seeded-v2', 'true');
      vi.clearAllMocks();

      canonService.seedCanon();

      // Should not call addArchiveEntry
      expect(memoryService.addArchiveEntry).not.toHaveBeenCalled();
    });

    it('adds canon documents to archive', () => {
      canonService.seedCanon();

      // Should call addArchiveEntry for each canon document
      expect(memoryService.addArchiveEntry).toHaveBeenCalled();
    });
  });
});
