/**
 * Tests for Audit Service - System Audit Trail
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
  configurable: true,
  writable: true,
});

import { auditService } from '../auditService';
import { IskraMetrics } from '../../types';

const createMetrics = (overrides: Partial<IskraMetrics> = {}): IskraMetrics => ({
  rhythm: 75,
  trust: 0.8,
  clarity: 0.7,
  pain: 0.2,
  drift: 0.2,
  chaos: 0.3,
  echo: 0.4,
  silence_mass: 0.2,
  mirror_sync: 0.7,
  interrupt: 0,
  ctxSwitch: 0,
  ...overrides,
});

describe('auditService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    auditService.clear();
    vi.clearAllMocks();
  });

  it('does not spam console.error when localStorage is missing (Node/Vitest)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const original = (global as any).localStorage;

    try {
      // Simulate Node env without localStorage and re-import module
      (global as any).localStorage = undefined;
      vi.resetModules();

      const mod = await import('../auditService');
      mod.auditService.log('system_event', { action: 'test' });
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      (global as any).localStorage = original;
      errorSpy.mockRestore();
    }
  });

  describe('log', () => {
    it('creates audit entry', () => {
      const entry = auditService.log('system_event', { action: 'test' });

      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('system_event');
      expect(entry.details.action).toBe('test');
      expect(entry.timestamp).toBeDefined();
    });

    it('applies severity option', () => {
      const entry = auditService.log('system_event', {}, { severity: 'warning' });
      expect(entry.severity).toBe('warning');
    });

    it('applies actor option', () => {
      const entry = auditService.log('system_event', {}, { actor: 'user' });
      expect(entry.actor).toBe('user');
    });

    it('applies voice option', () => {
      const entry = auditService.log('voice_selected', {}, { voiceName: 'KAIN' });
      expect(entry.voiceName).toBe('KAIN');
    });

    it('saves to localStorage', () => {
      auditService.log('system_event', { test: true });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('logMetricChange', () => {
    it('logs metric change with delta', () => {
      const entry = auditService.logMetricChange('trust', 0.5, 0.8, 'user_positive');

      expect(entry.type).toBe('metric_change');
      expect(entry.details.metric).toBe('trust');
      expect(entry.delta?.before).toBe(0.5);
      expect(entry.delta?.after).toBe(0.8);
    });

    it('sets warning severity for large changes', () => {
      const entry = auditService.logMetricChange('pain', 0.2, 0.8);
      expect(entry.severity).toBe('warning');
    });
  });

  describe('logVoiceSelection', () => {
    it('logs voice selection', () => {
      const metrics = createMetrics();
      const entry = auditService.logVoiceSelection('KAIN', metrics, 'high_pain');

      expect(entry.type).toBe('voice_selected');
      expect(entry.details.voice).toBe('KAIN');
      expect(entry.voiceName).toBe('KAIN');
    });
  });

  describe('logRitualExecution', () => {
    it('logs ritual execution with before/after metrics', () => {
      const before = createMetrics({ chaos: 0.8 });
      const after = createMetrics({ chaos: 0.3 });
      const entry = auditService.logRitualExecution('SHATTER', before, after, 'auto');

      expect(entry.type).toBe('ritual_executed');
      expect(entry.details.ritual).toBe('SHATTER');
      expect(entry.delta?.before).toEqual(before);
      expect(entry.delta?.after).toEqual(after);
    });
  });

  describe('logPhaseTransition', () => {
    it('logs phase transition', () => {
      const entry = auditService.logPhaseTransition('DARKNESS', 'CLARITY', 'pain_resolved');

      expect(entry.type).toBe('phase_transition');
      expect(entry.details.from).toBe('DARKNESS');
      expect(entry.details.to).toBe('CLARITY');
    });
  });

  describe('logDeltaViolation', () => {
    it('logs delta violation', () => {
      const entry = auditService.logDeltaViolation('Response without delta', ['Δ', 'Ω']);

      expect(entry.type).toBe('delta_violation');
      expect(entry.details.missing).toContain('Δ');
      expect(entry.severity).toBe('warning');
    });
  });

  describe('logEvalResult', () => {
    it('logs eval result', () => {
      const evalResult = {
        overall: 0.75,
        grade: 'B',
        flags: [],
        metrics: {
          accuracy: { score: 0.8, signals: [] },
        },
      };
      const entry = auditService.logEvalResult(evalResult, 'response_123');

      expect(entry.type).toBe('eval_result');
      expect(entry.details.grade).toBe('B');
    });

    it('sets warning severity for low scores', () => {
      const evalResult = {
        overall: 0.4,
        grade: 'D',
        flags: [{ type: 'critical', code: 'LOW', message: 'Low score' }],
        metrics: {},
      };
      const entry = auditService.logEvalResult(evalResult);
      expect(entry.severity).toBe('warning');
    });
  });

  describe('analyzeDrift', () => {
    it('analyzes drift from metrics', () => {
      const metrics = createMetrics({ drift: 0.5, mirror_sync: 0.3 });
      const report = auditService.analyzeDrift(metrics);

      expect(report).toHaveProperty('driftLevel');
      expect(report).toHaveProperty('indicators');
      expect(report).toHaveProperty('recommendation');
      expect(report).toHaveProperty('affectedVoices');
    });

    it('detects high drift indicators', () => {
      const metrics = createMetrics({ drift: 0.6 });
      const report = auditService.analyzeDrift(metrics);

      expect(report.indicators.length).toBeGreaterThan(0);
    });

    it('detects sycophancy patterns in responses', () => {
      const metrics = createMetrics();
      const responses = [
        'Конечно, абсолютно правы!',
        'Безусловно, прекрасная идея!',
        'Конечно же!',
      ];
      const report = auditService.analyzeDrift(metrics, responses);

      expect(report.indicators.some(i => i.includes('угодничества'))).toBe(true);
    });
  });

  describe('getStats', () => {
    it('returns stats object', () => {
      auditService.log('system_event', {});
      auditService.log('voice_selected', {});

      const stats = auditService.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.byType).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
    });
  });

  describe('getEntriesByType', () => {
    it('filters entries by type', () => {
      auditService.log('system_event', {});
      auditService.log('voice_selected', {});
      auditService.log('system_event', {});

      const entries = auditService.getEntriesByType('system_event');
      expect(entries.length).toBe(2);
    });

    it('respects limit parameter', () => {
      auditService.log('system_event', {});
      auditService.log('system_event', {});
      auditService.log('system_event', {});

      const entries = auditService.getEntriesByType('system_event', 2);
      expect(entries.length).toBe(2);
    });
  });

  describe('getEntriesBySeverity', () => {
    it('filters entries by severity', () => {
      auditService.log('system_event', {}, { severity: 'warning' });
      auditService.log('system_event', {}, { severity: 'info' });

      const warnings = auditService.getEntriesBySeverity('warning');
      expect(warnings.length).toBe(1);
    });
  });

  describe('getRecentEntries', () => {
    it('returns recent entries', () => {
      auditService.log('system_event', {});
      auditService.log('voice_selected', {});

      const recent = auditService.getRecentEntries(10);
      expect(recent.length).toBe(2);
    });
  });

  describe('generateReport', () => {
    it('generates markdown report', () => {
      auditService.log('system_event', {});
      const report = auditService.generateReport();

      expect(report).toContain('# Отчет Аудита Искры');
      expect(report).toContain('Статистика');
    });
  });

  describe('subscribe', () => {
    it('notifies subscribers of new entries', () => {
      const callback = vi.fn();
      auditService.subscribe(callback);

      auditService.log('system_event', { test: true });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'system_event' })
      );
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = auditService.subscribe(callback);

      unsubscribe();
      auditService.log('system_event', {});

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('clears all entries', () => {
      auditService.log('system_event', {});
      auditService.log('system_event', {});

      auditService.clear();

      const stats = auditService.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });
});
