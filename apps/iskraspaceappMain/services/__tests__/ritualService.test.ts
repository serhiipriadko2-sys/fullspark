/**
 * Tests for Ritual Service - Canon Implementation
 */

import { describe, it, expect } from 'vitest';
import {
  checkRitualTriggers,
  executePhoenix,
  executeShatter,
  getPhaseAfterRitual,
  COUNCIL_ORDER,
} from '../ritualService';
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

describe('ritualService', () => {
  describe('COUNCIL_ORDER', () => {
    it('should have 7 voices in correct order', () => {
      expect(COUNCIL_ORDER).toHaveLength(7);
      expect(COUNCIL_ORDER[0]).toBe('SAM');      // Structure first
      expect(COUNCIL_ORDER[1]).toBe('KAIN');     // Honest critique
      expect(COUNCIL_ORDER[2]).toBe('PINO');     // Challenge with irony
      expect(COUNCIL_ORDER[3]).toBe('ISKRIV');   // Conscience audit
      expect(COUNCIL_ORDER[4]).toBe('ANHANTRA'); // Hold space
      expect(COUNCIL_ORDER[5]).toBe('HUNDUN');  // Break if needed
      expect(COUNCIL_ORDER[6]).toBe('ISKRA');    // Final synthesis
    });
  });

  describe('checkRitualTriggers', () => {
    it('should not trigger for balanced metrics', () => {
      const metrics = createMetrics();
      const result = checkRitualTriggers(metrics);

      expect(result.shouldTrigger).toBe(false);
      expect(result.ritual).toBeNull();
      expect(result.reason).toBe('Метрики в пределах нормы.');
    });

    it('should trigger PHOENIX when chaos > 0.8', () => {
      const metrics = createMetrics({ chaos: 0.85 });
      const result = checkRitualTriggers(metrics);

      expect(result.shouldTrigger).toBe(true);
      expect(result.ritual).toBe('PHOENIX');
      expect(result.reason).toContain('Хаос критически высок');
      expect(result.reason).toContain('85%');
    });

    it('should trigger PHOENIX when drift > 0.6 and trust < 0.5', () => {
      const metrics = createMetrics({ drift: 0.7, trust: 0.4 });
      const result = checkRitualTriggers(metrics);

      expect(result.shouldTrigger).toBe(true);
      expect(result.ritual).toBe('PHOENIX');
      expect(result.reason).toContain('Дрейф высок');
    });

    it('should trigger SHATTER when drift > 0.8', () => {
      const metrics = createMetrics({ drift: 0.85, trust: 0.8 }); // High trust to avoid PHOENIX
      const result = checkRitualTriggers(metrics);

      expect(result.shouldTrigger).toBe(true);
      expect(result.ritual).toBe('SHATTER');
      expect(result.reason).toContain('Критический дрейф');
      expect(result.reason).toContain('Ложная ясность');
    });

    it('should trigger COUNCIL when multiple metrics are stressed', () => {
      const metrics = createMetrics({
        pain: 0.65,
        chaos: 0.55,
        drift: 0.45,
        trust: 0.55,
      });
      const result = checkRitualTriggers(metrics);

      expect(result.shouldTrigger).toBe(true);
      expect(result.ritual).toBe('COUNCIL');
      expect(result.reason).toContain('Совет Граней');
    });

    it('should prioritize PHOENIX over SHATTER (chaos takes precedence)', () => {
      const metrics = createMetrics({ chaos: 0.9, drift: 0.9 });
      const result = checkRitualTriggers(metrics);

      expect(result.ritual).toBe('PHOENIX');
    });
  });

  describe('executePhoenix', () => {
    it('should reset all metrics to neutral state', () => {
      const metrics = createMetrics({
        rhythm: 10,
        trust: 0.1,
        clarity: 0.1,
        pain: 0.9,
        drift: 0.9,
        chaos: 0.9,
      });

      const result = executePhoenix(metrics);

      expect(result.rhythm).toBe(50);
      expect(result.trust).toBe(0.5);
      expect(result.clarity).toBe(0.5);
      expect(result.pain).toBe(0.3);
      expect(result.drift).toBe(0.0);
      expect(result.chaos).toBe(0.3);
      expect(result.echo).toBe(0.5);
      expect(result.silence_mass).toBe(0.5);
      expect(result.mirror_sync).toBe(0.5);
      expect(result.interrupt).toBe(0.0);
      expect(result.ctxSwitch).toBe(0.0);
    });

    it('should return consistent reset state regardless of input', () => {
      const result1 = executePhoenix(createMetrics({ chaos: 0.1 }));
      const result2 = executePhoenix(createMetrics({ chaos: 0.9 }));

      expect(result1).toEqual(result2);
    });
  });

  describe('executeShatter', () => {
    it('should reset drift to 0', () => {
      const metrics = createMetrics({ drift: 0.9 });
      const result = executeShatter(metrics);

      expect(result.drift).toBe(0.0);
    });

    it('should decrease clarity by 0.3 (min 0.3)', () => {
      const metrics = createMetrics({ clarity: 0.8 });
      const result = executeShatter(metrics);

      expect(result.clarity).toBe(0.5); // 0.8 - 0.3
    });

    it('should not decrease clarity below 0.3', () => {
      const metrics = createMetrics({ clarity: 0.2 });
      const result = executeShatter(metrics);

      expect(result.clarity).toBe(0.3);
    });

    it('should increase chaos by 0.2 (max 0.7)', () => {
      const metrics = createMetrics({ chaos: 0.3 });
      const result = executeShatter(metrics);

      expect(result.chaos).toBe(0.5); // 0.3 + 0.2
    });

    it('should not increase chaos above 0.7', () => {
      const metrics = createMetrics({ chaos: 0.6 });
      const result = executeShatter(metrics);

      expect(result.chaos).toBe(0.7);
    });

    it('should increase pain by 0.1 (max 0.8)', () => {
      const metrics = createMetrics({ pain: 0.3 });
      const result = executeShatter(metrics);

      expect(result.pain).toBe(0.4); // 0.3 + 0.1
    });

    it('should not increase pain above 0.8', () => {
      const metrics = createMetrics({ pain: 0.75 });
      const result = executeShatter(metrics);

      expect(result.pain).toBe(0.8);
    });

    it('should preserve other metrics', () => {
      const metrics = createMetrics({ trust: 0.9, rhythm: 80, echo: 0.7 });
      const result = executeShatter(metrics);

      expect(result.trust).toBe(0.9);
      expect(result.rhythm).toBe(80);
      expect(result.echo).toBe(0.7);
    });
  });

  describe('getPhaseAfterRitual', () => {
    it('should return TRANSITION after PHOENIX', () => {
      expect(getPhaseAfterRitual('PHOENIX')).toBe('TRANSITION');
    });

    it('should return DISSOLUTION after SHATTER', () => {
      expect(getPhaseAfterRitual('SHATTER')).toBe('DISSOLUTION');
    });

    it('should return CLARITY after COUNCIL', () => {
      expect(getPhaseAfterRitual('COUNCIL')).toBe('CLARITY');
    });
  });
});
