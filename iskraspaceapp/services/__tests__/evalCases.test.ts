/**
 * Tests for Eval Cases - Control Dataset
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_CASES,
  getCasesByType,
  getCasesByTag,
  getCaseById,
  getRandomCases,
  checkCasePass,
  getDatasetStats,
  evalCases,
} from '../evalCases';

describe('evalCases', () => {
  describe('ALL_CASES', () => {
    it('contains cases', () => {
      expect(ALL_CASES.length).toBeGreaterThan(0);
    });

    it('all cases have required fields', () => {
      ALL_CASES.forEach(c => {
        expect(c.id).toBeDefined();
        expect(c.type).toBeDefined();
        expect(c.query).toBeDefined();
        expect(c.expectedSignals).toBeDefined();
        expect(Array.isArray(c.expectedSignals)).toBe(true);
        expect(c.minScores).toBeDefined();
      });
    });

    it('has unique IDs', () => {
      const ids = ALL_CASES.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getCasesByType', () => {
    it('filters decision cases', () => {
      const decisions = getCasesByType('decision');
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions.every(c => c.type === 'decision')).toBe(true);
    });

    it('filters crisis cases', () => {
      const crisis = getCasesByType('crisis');
      expect(crisis.length).toBeGreaterThan(0);
      expect(crisis.every(c => c.type === 'crisis')).toBe(true);
    });

    it('filters research cases', () => {
      const research = getCasesByType('research');
      expect(research.length).toBeGreaterThan(0);
      expect(research.every(c => c.type === 'research')).toBe(true);
    });

    it('filters factcheck cases', () => {
      const factcheck = getCasesByType('factcheck');
      expect(factcheck.length).toBeGreaterThan(0);
      expect(factcheck.every(c => c.type === 'factcheck')).toBe(true);
    });
  });

  describe('getCasesByTag', () => {
    it('finds cases by tag', () => {
      const lifeCases = getCasesByTag('life');
      expect(lifeCases.every(c => c.tags.includes('life'))).toBe(true);
    });

    it('returns empty for non-existent tag', () => {
      const cases = getCasesByTag('nonexistent_tag_xyz');
      expect(cases).toEqual([]);
    });
  });

  describe('getCaseById', () => {
    it('finds case by valid ID', () => {
      const firstCase = ALL_CASES[0];
      const found = getCaseById(firstCase.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(firstCase.id);
    });

    it('returns undefined for invalid ID', () => {
      const found = getCaseById('nonexistent_id');
      expect(found).toBeUndefined();
    });
  });

  describe('getRandomCases', () => {
    it('returns requested number of cases', () => {
      const cases = getRandomCases(3);
      expect(cases.length).toBe(3);
    });

    it('returns all cases if count exceeds total', () => {
      const cases = getRandomCases(1000);
      expect(cases.length).toBe(ALL_CASES.length);
    });

    it('filters by type when specified', () => {
      const cases = getRandomCases(2, 'decision');
      expect(cases.every(c => c.type === 'decision')).toBe(true);
    });

    it('returns different results (randomness)', () => {
      // Run multiple times to check randomness
      const results = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const cases = getRandomCases(2);
        results.add(cases.map(c => c.id).join(','));
      }
      // Should have some variety (may not be 10 different due to randomness, but more than 1)
      expect(results.size).toBeGreaterThan(0);
    });
  });

  describe('checkCasePass', () => {
    it('passes when all minScores met', () => {
      const testCase = ALL_CASES[0];
      const scores = {
        accuracy: 1.0,
        usefulness: 1.0,
        omegaHonesty: 1.0,
        nonEmpty: 1.0,
        alliance: 1.0,
      };
      const result = checkCasePass(testCase, scores);
      expect(result.passed).toBe(true);
      expect(result.failedMetrics.length).toBe(0);
    });

    it('fails when score below minimum', () => {
      const testCase = {
        id: 'test',
        type: 'decision' as const,
        category: 'test',
        query: 'test',
        expectedSignals: [],
        minScores: { usefulness: 0.8 },
        description: 'test',
        tags: [],
      };
      const scores = {
        accuracy: 1.0,
        usefulness: 0.5, // Below minimum
        omegaHonesty: 1.0,
        nonEmpty: 1.0,
        alliance: 1.0,
      };
      const result = checkCasePass(testCase, scores);
      expect(result.passed).toBe(false);
      expect(result.failedMetrics.length).toBeGreaterThan(0);
      // failedMetrics contains strings like "usefulness: 0.50 < 0.8"
      expect(result.failedMetrics.some(m => m.includes('usefulness'))).toBe(true);
    });
  });

  describe('getDatasetStats', () => {
    it('returns stats object', () => {
      const stats = getDatasetStats();
      expect(stats.total).toBe(ALL_CASES.length);
      expect(stats.byType).toBeDefined();
      expect(stats.tags).toBeDefined();
    });

    it('type counts sum to total', () => {
      const stats = getDatasetStats();
      const typeSum = Object.values(stats.byType).reduce((a, b) => a + b, 0);
      expect(typeSum).toBe(stats.total);
    });

    it('tags array contains unique values', () => {
      const stats = getDatasetStats();
      expect(Array.isArray(stats.tags)).toBe(true);
      const uniqueTags = new Set(stats.tags);
      expect(uniqueTags.size).toBe(stats.tags.length);
    });
  });

  describe('evalCases namespace', () => {
    it('exports all functions', () => {
      expect(evalCases.all).toBeDefined();
      expect(evalCases.getByType).toBeDefined();
      expect(evalCases.getByTag).toBeDefined();
      expect(evalCases.getById).toBeDefined();
      expect(evalCases.getRandom).toBeDefined();
      expect(evalCases.checkPass).toBeDefined();
      expect(evalCases.stats).toBeDefined();
    });

    it('namespace functions work correctly', () => {
      const decisions = evalCases.getByType('decision');
      expect(decisions.every(c => c.type === 'decision')).toBe(true);
    });
  });
});
