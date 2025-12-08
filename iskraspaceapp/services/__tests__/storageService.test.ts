import { describe, expect, beforeEach, it, vi, afterEach } from 'vitest';
import { storageService } from '../storageService';
import { IskraMetrics } from '../../types';

const baseMetrics: IskraMetrics = {
  rhythm: 80,
  trust: 0.9,
  clarity: 0.85,
  pain: 0.05,
  drift: 0.1,
  chaos: 0.15,
  echo: 0.4,
  silence_mass: 0.12,
  mirror_sync: 0.7,
  interrupt: 0.01,
  ctxSwitch: 0.08,
};

describe('storageService metrics snapshot', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      key: (index: number) => Object.keys(store)[index] ?? null,
      length: 0,
    } as Storage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists and reloads a metrics snapshot with the requested phase', () => {
    storageService.saveMetricsSnapshot(baseMetrics, 'REALIZATION');

    const restored = storageService.loadMetricsSnapshot();

    expect(restored?.phase).toBe('REALIZATION');
    expect(restored?.metrics.trust).toBeCloseTo(baseMetrics.trust);
    expect(restored?.metrics.rhythm).toBe(baseMetrics.rhythm);
  });

  it('clamps invalid stored values when reloading', () => {
    const malformed: IskraMetrics = {
      ...baseMetrics,
      rhythm: 120,
      trust: -0.3,
      chaos: 2,
      mirror_sync: -1,
    };

    storageService.saveMetricsSnapshot(malformed, 'DARKNESS');

    const restored = storageService.loadMetricsSnapshot();

    expect(restored?.metrics.rhythm).toBe(100);
    expect(restored?.metrics.trust).toBe(0);
    expect(restored?.metrics.chaos).toBe(1);
    expect(restored?.metrics.mirror_sync).toBe(0);
  });

  it('returns null when the snapshot payload is corrupted', () => {
    globalThis.localStorage.setItem('iskra-metrics-snapshot', 'not-json');

    expect(storageService.loadMetricsSnapshot()).toBeNull();
  });
});
