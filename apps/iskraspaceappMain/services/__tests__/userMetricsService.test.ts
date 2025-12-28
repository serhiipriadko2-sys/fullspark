/**
 * Tests for User Metrics Service - User Daily Metrics Calculation
 *
 * Tests the UserDailyMetrics calculation which forms the user's ∆-Ритм.
 * These are USER metrics (not IskraMetrics which are AI internal state).
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
    // Helper for tests
    _getStore: () => store,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock storageService for journal entries and habits
vi.mock('../storageService', () => ({
  storageService: {
    getJournalEntries: vi.fn(() => []),
    getHabits: vi.fn(() => []),
  },
}));

import { userMetricsService } from '../userMetricsService';
import { storageService } from '../storageService';

describe('userMetricsService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset mock return values to defaults
    vi.mocked(storageService.getJournalEntries).mockReturnValue([]);
    vi.mocked(storageService.getHabits).mockReturnValue([]);
  });

  describe('getUserDailyMetrics', () => {
    it('returns all 5 metric components', () => {
      const metrics = userMetricsService.getUserDailyMetrics();

      expect(metrics).toHaveProperty('focus');
      expect(metrics).toHaveProperty('sleep');
      expect(metrics).toHaveProperty('energy');
      expect(metrics).toHaveProperty('habits');
      expect(metrics).toHaveProperty('deltaScore');
    });

    it('all metrics are in 0-100 range', () => {
      const metrics = userMetricsService.getUserDailyMetrics();

      expect(metrics.focus).toBeGreaterThanOrEqual(0);
      expect(metrics.focus).toBeLessThanOrEqual(100);
      expect(metrics.sleep).toBeGreaterThanOrEqual(0);
      expect(metrics.sleep).toBeLessThanOrEqual(100);
      expect(metrics.energy).toBeGreaterThanOrEqual(0);
      expect(metrics.energy).toBeLessThanOrEqual(100);
      expect(metrics.habits).toBeGreaterThanOrEqual(0);
      expect(metrics.habits).toBeLessThanOrEqual(100);
      expect(metrics.deltaScore).toBeGreaterThanOrEqual(0);
      expect(metrics.deltaScore).toBeLessThanOrEqual(100);
    });

    it('returns default values when no data exists', () => {
      const metrics = userMetricsService.getUserDailyMetrics();

      // Focus: 0 (no focus sessions today)
      expect(metrics.focus).toBe(0);
      // Sleep: 70 (neutral default)
      expect(metrics.sleep).toBe(70);
      // Energy: 60 (neutral default from journal)
      expect(metrics.energy).toBe(60);
      // Habits: 75 (neutral default when no habits)
      expect(metrics.habits).toBe(75);
    });
  });

  describe('Focus Score', () => {
    it('starts at 0 for new day', () => {
      const score = userMetricsService.getFocusScore();
      expect(score).toBe(0);
    });

    it('addFocusMinutes accumulates correctly', () => {
      userMetricsService.addFocusMinutes(30);
      expect(userMetricsService.getFocusScore()).toBe(33); // 30/90 * 100 ≈ 33

      userMetricsService.addFocusMinutes(30);
      expect(userMetricsService.getFocusScore()).toBe(67); // 60/90 * 100 ≈ 67
    });

    it('caps at 100% after 90 minutes', () => {
      userMetricsService.addFocusMinutes(120);
      expect(userMetricsService.getFocusScore()).toBe(100);
    });

    it('resets on new day', () => {
      // Add minutes for "yesterday"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      localStorageMock.setItem('iskra_focus_date', yesterdayStr);
      localStorageMock.setItem('iskra_focus_minutes_today', '60');

      // Getting score today should reset
      const score = userMetricsService.getFocusScore();
      expect(score).toBe(0);
    });
  });

  describe('Sleep Score', () => {
    it('returns default 70 when no data', () => {
      const score = userMetricsService.getSleepScore();
      expect(score).toBe(70);
    });

    it('setSleepScore persists value', () => {
      userMetricsService.setSleepScore(85);
      expect(userMetricsService.getSleepScore()).toBe(85);
    });

    it('clamps values to 0-100 range', () => {
      userMetricsService.setSleepScore(150);
      expect(userMetricsService.getSleepScore()).toBe(100);

      userMetricsService.setSleepScore(-20);
      expect(userMetricsService.getSleepScore()).toBe(0);
    });

    it('resets to default on new day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      localStorageMock.setItem('iskra_sleep_date', yesterdayStr);
      localStorageMock.setItem('iskra_sleep_score', '90');

      const score = userMetricsService.getSleepScore();
      expect(score).toBe(70); // Default for new day
    });
  });

  describe('Energy Score', () => {
    it('returns default 60 when no journal entries', () => {
      const score = userMetricsService.getEnergyScore();
      expect(score).toBe(60);
    });

    it('reads energy from latest journal entry today', () => {
      const today = new Date().toISOString().split('T')[0];
      const mockEntry = {
        id: '1',
        timestamp: `${today}T10:00:00.000Z`,
        text: 'Test entry',
        prompt: { question: 'Q', why: 'W' },
        userMetrics: { mood: 80, energy: 75 },
      };

      vi.mocked(storageService.getJournalEntries).mockReturnValue([mockEntry]);

      const score = userMetricsService.getEnergyScore();
      expect(score).toBe(75);
    });

    it('uses most recent entry if multiple today', () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = [
        {
          id: '1',
          timestamp: `${today}T08:00:00.000Z`,
          text: 'Morning entry',
          prompt: { question: 'Q', why: 'W' },
          userMetrics: { mood: 60, energy: 50 },
        },
        {
          id: '2',
          timestamp: `${today}T14:00:00.000Z`,
          text: 'Afternoon entry',
          prompt: { question: 'Q', why: 'W' },
          userMetrics: { mood: 80, energy: 85 },
        },
      ];

      vi.mocked(storageService.getJournalEntries).mockReturnValue(entries);

      const score = userMetricsService.getEnergyScore();
      expect(score).toBe(85); // From later entry
    });

    it('ignores entries without userMetrics', () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = [
        {
          id: '1',
          timestamp: `${today}T10:00:00.000Z`,
          text: 'Entry without metrics',
          prompt: { question: 'Q', why: 'W' },
          // No userMetrics
        },
      ];

      vi.mocked(storageService.getJournalEntries).mockReturnValue(entries);

      const score = userMetricsService.getEnergyScore();
      expect(score).toBe(60); // Default
    });
  });

  describe('Habits Score', () => {
    it('returns default 75 when no habits defined', () => {
      vi.mocked(storageService.getHabits).mockReturnValue([]);
      const score = userMetricsService.getHabitsScore();
      expect(score).toBe(75);
    });

    it('calculates percentage of completed habits', () => {
      const habits = [
        { id: '1', title: 'Meditation', streak: 5, completedToday: true, ritualTag: 'BALANCE' as const },
        { id: '2', title: 'Exercise', streak: 3, completedToday: true, ritualTag: 'FIRE' as const },
        { id: '3', title: 'Reading', streak: 10, completedToday: false, ritualTag: 'WATER' as const },
        { id: '4', title: 'Journaling', streak: 2, completedToday: false, ritualTag: 'DELTA' as const },
      ];

      vi.mocked(storageService.getHabits).mockReturnValue(habits);

      const score = userMetricsService.getHabitsScore();
      expect(score).toBe(50); // 2/4 = 50%
    });

    it('returns 100 when all habits completed', () => {
      const habits = [
        { id: '1', title: 'Habit 1', streak: 1, completedToday: true, ritualTag: 'FIRE' as const },
        { id: '2', title: 'Habit 2', streak: 1, completedToday: true, ritualTag: 'WATER' as const },
      ];

      vi.mocked(storageService.getHabits).mockReturnValue(habits);

      const score = userMetricsService.getHabitsScore();
      expect(score).toBe(100);
    });

    it('returns 0 when no habits completed', () => {
      const habits = [
        { id: '1', title: 'Habit 1', streak: 0, completedToday: false, ritualTag: 'FIRE' as const },
        { id: '2', title: 'Habit 2', streak: 0, completedToday: false, ritualTag: 'WATER' as const },
      ];

      vi.mocked(storageService.getHabits).mockReturnValue(habits);

      const score = userMetricsService.getHabitsScore();
      expect(score).toBe(0);
    });
  });

  describe('Delta Score Calculation', () => {
    it('calculates weighted average correctly', () => {
      // Set up explicit known values
      userMetricsService.addFocusMinutes(45); // 50% = 50
      userMetricsService.setSleepScore(80);   // 80

      const today = new Date().toISOString().split('T')[0];
      vi.mocked(storageService.getJournalEntries).mockReturnValue([{
        id: '1',
        timestamp: `${today}T10:00:00.000Z`,
        text: 'Test',
        prompt: { question: 'Q', why: 'W' },
        userMetrics: { mood: 70, energy: 70 },
      }]);

      vi.mocked(storageService.getHabits).mockReturnValue([
        { id: '1', title: 'H1', streak: 1, completedToday: true, ritualTag: 'FIRE' as const },
        { id: '2', title: 'H2', streak: 1, completedToday: true, ritualTag: 'FIRE' as const },
      ]); // 100% habits

      // deltaScore = 50*0.25 + 80*0.30 + 70*0.20 + 100*0.25
      // = 12.5 + 24 + 14 + 25 = 75.5 ≈ 76

      const metrics = userMetricsService.getUserDailyMetrics();
      expect(metrics.deltaScore).toBe(76);
    });

    it('weights sleep highest at 30%', () => {
      // Perfect sleep, explicit mocks for all sources
      userMetricsService.setSleepScore(100);
      vi.mocked(storageService.getHabits).mockReturnValue([]);
      vi.mocked(storageService.getJournalEntries).mockReturnValue([]);

      const metrics = userMetricsService.getUserDailyMetrics();

      // deltaScore = 0*0.25 + 100*0.30 + 60*0.20 + 75*0.25
      // = 0 + 30 + 12 + 18.75 = 60.75 ≈ 61
      expect(metrics.deltaScore).toBe(61);
    });

    it('reaches 100 when all metrics are 100', () => {
      // Focus: 90 minutes = 100%
      userMetricsService.addFocusMinutes(90);

      // Sleep: 100
      userMetricsService.setSleepScore(100);

      // Energy: 100 from journal
      const today = new Date().toISOString().split('T')[0];
      vi.mocked(storageService.getJournalEntries).mockReturnValue([{
        id: '1',
        timestamp: `${today}T10:00:00.000Z`,
        text: 'Test',
        prompt: { question: 'Q', why: 'W' },
        userMetrics: { mood: 100, energy: 100 },
      }]);

      // Habits: all completed
      vi.mocked(storageService.getHabits).mockReturnValue([
        { id: '1', title: 'H1', streak: 1, completedToday: true, ritualTag: 'FIRE' as const },
      ]);

      const metrics = userMetricsService.getUserDailyMetrics();
      expect(metrics.deltaScore).toBe(100);
    });
  });

  describe('Metrics Separation', () => {
    it('UserDailyMetrics structure is distinct from IskraMetrics', () => {
      const metrics = userMetricsService.getUserDailyMetrics();

      // UserDailyMetrics has these 5 properties
      expect(Object.keys(metrics).sort()).toEqual([
        'deltaScore', 'energy', 'focus', 'habits', 'sleep'
      ]);

      // Should NOT have IskraMetrics properties
      expect(metrics).not.toHaveProperty('trust');
      expect(metrics).not.toHaveProperty('clarity');
      expect(metrics).not.toHaveProperty('pain');
      expect(metrics).not.toHaveProperty('drift');
      expect(metrics).not.toHaveProperty('chaos');
      expect(metrics).not.toHaveProperty('rhythm');
    });
  });
});
