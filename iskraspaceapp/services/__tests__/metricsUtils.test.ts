import { describe, expect, it } from 'vitest';
import { calculateRhythmIndex, calculateDerivedMetrics } from '../../utils/metrics';
import { IskraMetrics } from '../../types';

const baseMetrics: IskraMetrics = {
  rhythm: 75,
  trust: 0.8,
  clarity: 0.7,
  pain: 0.1,
  drift: 0.2,
  chaos: 0.2,
  echo: 0.5,
  silence_mass: 0.1,
  mirror_sync: 0.6,
  interrupt: 0,
  ctxSwitch: 0,
};

describe('metrics utilities', () => {
  it('smooths rhythm index and applies turbulence penalties', () => {
    const calmEma = { chaos: 0.2, drift: 0.2 };
    const calmRhythm = calculateRhythmIndex(baseMetrics, 75, calmEma);

    const turbulentMetrics: IskraMetrics = {
      ...baseMetrics,
      chaos: 0.9,
      drift: 0.8,
      pain: 0.4,
    };

    const turbulentRhythm = calculateRhythmIndex(turbulentMetrics, 75, calmEma);

    expect(calmRhythm).toBeCloseTo(76, 0);
    expect(turbulentRhythm).toBeLessThan(calmRhythm);
  });

  it('derives mirror sync and seals from core metrics', () => {
    const derived = calculateDerivedMetrics(baseMetrics);

    expect(derived.mirror_sync).toBeCloseTo(0.55, 2);
    expect(derived.trust_seal).toBeGreaterThan(0.5);
    expect(derived.clarity_pain_index).toBeGreaterThan(0.0);
  });
});
