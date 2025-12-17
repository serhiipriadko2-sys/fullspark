/**
 * Tests for Maki Service - Post-Transformation Integration Mode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackVoiceUsage,
  trackPhaseTransition,
  checkMakiActivation,
  activateMaki,
  deactivateMaki,
  getMakiState,
  getMakiResponseStyle,
  getMakiInstruction,
  makiService,
} from '../makiService';
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

describe('makiService', () => {
  beforeEach(() => {
    // Clear state before each test
    makiService.clearHistory();
    deactivateMaki();
  });

  describe('trackVoiceUsage', () => {
    it('tracks voice usage without error', () => {
      const metrics = createMetrics();
      expect(() => trackVoiceUsage('KAIN', metrics)).not.toThrow();
    });

    it('can track multiple voices', () => {
      const metrics = createMetrics();
      trackVoiceUsage('KAIN', metrics);
      trackVoiceUsage('ISKRA', metrics);
      trackVoiceUsage('MAKI', metrics);
      // No assertion needed - just verify no error
    });
  });

  describe('trackPhaseTransition', () => {
    it('tracks phase transition without error', () => {
      const metrics = createMetrics();
      expect(() =>
        trackPhaseTransition('DARKNESS', 'CLARITY', 'ISKRA', metrics)
      ).not.toThrow();
    });
  });

  describe('checkMakiActivation', () => {
    it('returns no activation for balanced metrics', () => {
      const metrics = createMetrics();
      const result = checkMakiActivation(metrics);

      expect(result.shouldActivate).toBe(false);
      expect(result.trigger).toBeNull();
    });

    it('returns activation result object', () => {
      const metrics = createMetrics();
      const result = checkMakiActivation(metrics);

      expect(result).toHaveProperty('shouldActivate');
      expect(result).toHaveProperty('trigger');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('intensity');
    });
  });

  describe('activateMaki / deactivateMaki', () => {
    it('activates MAKI mode', () => {
      const state = activateMaki('manual', 0.7, 'Test context');

      expect(state.active).toBe(true);
      expect(state.trigger).toBe('manual');
      expect(state.intensity).toBe(0.7);
      expect(state.context).toBe('Test context');
      expect(state.startTime).not.toBeNull();
    });

    it('deactivates MAKI mode', () => {
      activateMaki('manual', 0.5);
      deactivateMaki();

      const state = getMakiState();
      expect(state.active).toBe(false);
      expect(state.trigger).toBeNull();
      expect(state.intensity).toBe(0);
    });

    it('clamps intensity to 0-1 range', () => {
      const stateHigh = activateMaki('manual', 1.5);
      expect(stateHigh.intensity).toBe(1);

      deactivateMaki();

      const stateLow = activateMaki('manual', -0.5);
      expect(stateLow.intensity).toBe(0);
    });
  });

  describe('getMakiState', () => {
    it('returns current state', () => {
      const state = getMakiState();

      expect(state).toHaveProperty('active');
      expect(state).toHaveProperty('trigger');
      expect(state).toHaveProperty('intensity');
      expect(state).toHaveProperty('startTime');
    });

    it('returns copy of state (not reference)', () => {
      const state1 = getMakiState();
      const state2 = getMakiState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getMakiResponseStyle', () => {
    it('returns style for high intensity', () => {
      const style = getMakiResponseStyle(0.8);

      expect(style.toneModifiers).toContain('сияющий');
      expect(style.symbols).toContain('🌸');
      expect(style.colorPalette.length).toBeGreaterThan(0);
    });

    it('returns style for medium intensity', () => {
      const style = getMakiResponseStyle(0.5);

      expect(style.toneModifiers).toContain('нежный');
      expect(style.symbols).toContain('🌸');
    });

    it('returns style for low intensity', () => {
      const style = getMakiResponseStyle(0.2);

      expect(style.toneModifiers).toContain('тихий');
      expect(style.symbols).toContain('🌱');
    });
  });

  describe('getMakiInstruction', () => {
    it('returns empty string when MAKI not active', () => {
      const state = getMakiState();
      const instruction = getMakiInstruction(state);

      expect(instruction).toBe('');
    });

    it('returns instruction when MAKI active', () => {
      activateMaki('post_kain', 0.7, 'After honest truth');
      const state = getMakiState();
      const instruction = getMakiInstruction(state);

      expect(instruction).toContain('РЕЖИМ МАКИ');
      expect(instruction).toContain('🌸');
      expect(instruction).toContain('70%');
      expect(instruction).toContain('After honest truth');
    });

    it('includes trigger description', () => {
      activateMaki('cycle_complete', 0.8);
      const state = getMakiState();
      const instruction = getMakiInstruction(state);

      expect(instruction).toContain('цикла');
    });
  });

  describe('makiService namespace', () => {
    it('exports all functions', () => {
      expect(makiService.trackVoiceUsage).toBeDefined();
      expect(makiService.trackPhaseTransition).toBeDefined();
      expect(makiService.checkMakiActivation).toBeDefined();
      expect(makiService.activateMaki).toBeDefined();
      expect(makiService.deactivateMaki).toBeDefined();
      expect(makiService.getMakiState).toBeDefined();
      expect(makiService.getMakiResponseStyle).toBeDefined();
      expect(makiService.getMakiInstruction).toBeDefined();
      expect(makiService.getTransformationHistory).toBeDefined();
      expect(makiService.clearHistory).toBeDefined();
    });

    it('getTransformationHistory returns array', () => {
      const history = makiService.getTransformationHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
