import { IskraMetrics, IskraPhase } from '../types';
import { calculateDerivedMetrics } from '../utils/metrics';
import { storageService } from './storageService';

export type HydratedMetricsState = { metrics: IskraMetrics; phase: IskraPhase };
export type HydratedStateResult = { state: HydratedMetricsState; seeded: boolean };

/**
 * Loads metrics/phase snapshot from storage and recalculates derived fields (mirror_sync).
 * If no snapshot is present or it is unreadable, seeds the provided base metrics/phase
 * and persists them for subsequent sessions.
 */
export function hydrateMetricsState(
  baseMetrics: IskraMetrics,
  basePhase: IskraPhase
): HydratedStateResult {
  const snapshot = storageService.loadMetricsSnapshot();
  if (snapshot) {
    const derived = calculateDerivedMetrics(snapshot.metrics);
    return {
      state: {
        metrics: { ...snapshot.metrics, mirror_sync: derived.mirror_sync },
        phase: snapshot.phase,
      },
      seeded: false,
    };
  }

  const derived = calculateDerivedMetrics(baseMetrics);
  const metricsWithDerived: IskraMetrics = {
    ...baseMetrics,
    mirror_sync: derived.mirror_sync,
  };

  storageService.saveMetricsSnapshot(metricsWithDerived, basePhase);

  return {
    state: {
      metrics: metricsWithDerived,
      phase: basePhase,
    },
    seeded: true,
  };
}
