import { describe, expect, beforeEach, it, vi } from 'vitest';
import { hydrateMetricsState } from '../metricsHydration';
import { IskraMetrics } from '../../types';

const baseMetrics: IskraMetrics = {
  rhythm: 70,
  trust: 0.75,
  clarity: 0.7,
  pain: 0.1,
  drift: 0.15,
  chaos: 0.2,
  echo: 0.45,
  silence_mass: 0.12,
  mirror_sync: 0.5,
  interrupt: 0,
  ctxSwitch: 0,
};

const snapshotPayload = {
  version: '1.0.0',
  savedAt: new Date('2024-01-01').toISOString(),
  metrics: {
    ...baseMetrics,
    rhythm: 82,
    trust: 0.92,
  },
  phase: 'REALIZATION',
};

describe('hydrateMetricsState', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      length: 0,
    } as Storage;
  });

  it('returns the stored snapshot without reseeding when present', () => {
    store['iskra-metrics-snapshot'] = JSON.stringify(snapshotPayload);

    const result = hydrateMetricsState(baseMetrics, 'CLARITY');

    expect(result.seeded).toBe(false);
    expect(result.state.phase).toBe('REALIZATION');
    expect(result.state.metrics.trust).toBeCloseTo(snapshotPayload.metrics.trust);
    expect(result.state.metrics.mirror_sync).toBeGreaterThan(0);
  });

  it('seeds defaults when no snapshot exists and persists them', () => {
    const result = hydrateMetricsState(baseMetrics, 'CLARITY');

    expect(result.seeded).toBe(true);
    expect(store['iskra-metrics-snapshot']).toBeTruthy();
    const persisted = JSON.parse(store['iskra-metrics-snapshot']);
    expect(persisted.phase).toBe('CLARITY');
    expect(persisted.metrics.rhythm).toBe(baseMetrics.rhythm);
  });

  it('recovers by reseeding when snapshot payload is corrupted', () => {
    store['iskra-metrics-snapshot'] = 'not-json';

    const result = hydrateMetricsState(baseMetrics, 'CLARITY');

    expect(result.seeded).toBe(true);
    expect(result.state.phase).toBe('CLARITY');
    expect(result.state.metrics.rhythm).toBe(baseMetrics.rhythm);
  });
});
