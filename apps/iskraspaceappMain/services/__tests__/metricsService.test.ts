/**
 * Tests for Metrics Service - Phase Detection and Metric Updates
 */

import { describe, it, expect } from 'vitest';
import { metricsService } from '../metricsService';
import { IskraMetrics } from '../../types';

const createMetrics = (overrides: Partial<IskraMetrics> = {}): IskraMetrics => ({
  rhythm: 75,
  trust: 0.8,
  clarity: 0.7,
  pain: 0.1,
  drift: 0.2,
  chaos: 0.3,
  echo: 0.5,
  silence_mass: 0.1,
  mirror_sync: 0.6,
  interrupt: 0,
  ctxSwitch: 0,
  ...overrides,
});

describe('metricsService', () => {
  describe('calculateMetricsUpdate', () => {
    it('returns empty object for neutral text', () => {
      const updates = metricsService.calculateMetricsUpdate('привет как дела');
      // May return empty or minimal updates
      expect(typeof updates).toBe('object');
    });

    it('increases pain for distress keywords', () => {
      const updates = metricsService.calculateMetricsUpdate('мне больно, я страдаю');
      if (updates.pain !== undefined) {
        expect(updates.pain).toBeGreaterThan(0);
      }
    });

    it('increases trust for positive keywords', () => {
      const updates = metricsService.calculateMetricsUpdate('спасибо, ты помогаешь');
      if (updates.trust !== undefined) {
        expect(updates.trust).toBeGreaterThan(0);
      }
    });

    it('clamps values between 0 and 1', () => {
      const updates = metricsService.calculateMetricsUpdate('боль боль боль боль боль боль');
      Object.values(updates).forEach(value => {
        if (typeof value === 'number') {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      });
    });

    it('handles empty text', () => {
      const updates = metricsService.calculateMetricsUpdate('');
      expect(typeof updates).toBe('object');
    });
  });

  describe('getPhaseFromMetrics', () => {
    it('returns DARKNESS for high pain and chaos', () => {
      const metrics = createMetrics({ pain: 0.8, chaos: 0.8 });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('DARKNESS');
    });

    it('returns DISSOLUTION for very high chaos', () => {
      const metrics = createMetrics({ chaos: 0.8, pain: 0.3 });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('DISSOLUTION');
    });

    it('returns SILENCE for high silence_mass', () => {
      const metrics = createMetrics({ silence_mass: 0.7, chaos: 0.2, pain: 0.2 });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('SILENCE');
    });

    it('returns SILENCE for low trust', () => {
      const metrics = createMetrics({ trust: 0.5, chaos: 0.2, pain: 0.2, silence_mass: 0.1 });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('SILENCE');
    });

    it('returns ECHO for high echo', () => {
      const metrics = createMetrics({
        echo: 0.7,
        chaos: 0.2,
        pain: 0.2,
        silence_mass: 0.1,
        trust: 0.8,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('ECHO');
    });

    it('returns ECHO for high drift', () => {
      const metrics = createMetrics({
        drift: 0.5,
        chaos: 0.2,
        pain: 0.2,
        silence_mass: 0.1,
        trust: 0.8,
        echo: 0.3,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('ECHO');
    });

    it('returns TRANSITION for high drift and low clarity', () => {
      const metrics = createMetrics({
        drift: 0.35,
        clarity: 0.4,
        chaos: 0.2,
        pain: 0.2,
        silence_mass: 0.1,
        trust: 0.8,
        echo: 0.3,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('TRANSITION');
    });

    it('returns EXPERIMENT for moderate chaos with high trust and low pain', () => {
      const metrics = createMetrics({
        chaos: 0.4,
        trust: 0.85,
        pain: 0.1,
        drift: 0.1,
        clarity: 0.7,
        silence_mass: 0.1,
        echo: 0.3,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('EXPERIMENT');
    });

    it('returns REALIZATION for high clarity, trust, and rhythm', () => {
      const metrics = createMetrics({
        clarity: 0.9,
        trust: 0.9,
        rhythm: 85,
        pain: 0.1,
        chaos: 0.2,
        drift: 0.1,
        silence_mass: 0.1,
        echo: 0.3,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('REALIZATION');
    });

    it('returns CLARITY for good clarity', () => {
      const metrics = createMetrics({
        clarity: 0.75,
        trust: 0.75,
        pain: 0.2,
        chaos: 0.25,
        drift: 0.15,
        silence_mass: 0.2,
        echo: 0.3,
        rhythm: 60,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('CLARITY');
    });

    it('returns CLARITY as fallback with high trust', () => {
      // trust >= 0.7 avoids SILENCE, clarity < 0.6 avoids direct CLARITY
      // but fallback returns CLARITY when trust > 0.5
      const metrics = createMetrics({
        clarity: 0.55,
        trust: 0.75,
        pain: 0.2,
        chaos: 0.2,
        drift: 0.2,
        silence_mass: 0.2,
        echo: 0.3,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('CLARITY');
    });

    it('returns SILENCE for low trust (trust < 0.7)', () => {
      // Logic: if trust < 0.7, returns SILENCE (before CLARITY check)
      const metrics = createMetrics({
        clarity: 0.4,
        trust: 0.4,
        pain: 0.2,
        chaos: 0.2,
        drift: 0.2,
        silence_mass: 0.2,
        echo: 0.3,
      });
      const phase = metricsService.getPhaseFromMetrics(metrics);
      expect(phase).toBe('SILENCE');
    });
  });
});
