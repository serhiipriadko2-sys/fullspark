/**
 * Tests for Storage Service - localStorage Wrapper
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Mock window.location.reload
Object.defineProperty(global, 'window', {
  value: {
    location: {
      reload: vi.fn(),
    },
  },
});

import { storageService } from '../storageService';

describe('storageService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Onboarding', () => {
    it('isOnboardingComplete returns false initially', () => {
      const complete = storageService.isOnboardingComplete();
      expect(complete).toBe(false);
    });

    it('completeOnboarding marks as complete', () => {
      storageService.completeOnboarding('TestUser');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Tutorial', () => {
    it('hasSeenTutorial returns false initially', () => {
      expect(storageService.hasSeenTutorial()).toBe(false);
    });

    it('completeTutorial marks tutorial as seen', () => {
      storageService.completeTutorial();
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Voice State', () => {
    it('getLastVoiceState returns object with mode', () => {
      const state = storageService.getLastVoiceState();
      expect(state).toHaveProperty('mode');
    });

    it('saveLastVoiceState persists state', () => {
      storageService.saveLastVoiceState('AUTO', 'ISKRA');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Voice Preferences', () => {
    it('getVoicePreferences returns object', () => {
      const prefs = storageService.getVoicePreferences();
      expect(typeof prefs).toBe('object');
    });
  });

  describe('Export Data', () => {
    it('exportAllData returns JSON string', () => {
      const data = storageService.exportAllData();
      expect(typeof data).toBe('string');
      // Should be valid JSON
      expect(() => JSON.parse(data)).not.toThrow();
    });
  });

  describe('Import Data', () => {
    it('throws on invalid JSON', () => {
      expect(() => {
        storageService.importAllData('not valid json');
      }).toThrow();
    });
  });

  describe('clearAllData', () => {
    it('clears localStorage', () => {
      storageService.clearAllData();
      expect(localStorageMock.clear).toHaveBeenCalled();
    });
  });
});
