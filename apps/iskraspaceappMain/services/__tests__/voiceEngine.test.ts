/**
 * Tests for Voice Engine - Liber Vox Implementation
 */

import { describe, it, expect, vi } from 'vitest';
import { getActiveVoice, getSystemInstructionForVoice } from '../voiceEngine';
import { IskraMetrics, VoicePreferences } from '../../types';

// Mock storageService
vi.mock('../storageService', () => ({
  storageService: {
    getVoicePreferences: () => ({}),
    getLastVoiceState: () => ({ lastVoice: undefined }),
  },
}));

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

describe('voiceEngine', () => {
  describe('getActiveVoice', () => {
    it('should return KAIN for high pain', () => {
      const metrics = createMetrics({ pain: 0.8 });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('KAIN');
      expect(voice.symbol).toBe('⚑');
    });

    it('should not return KAIN for low pain', () => {
      const metrics = createMetrics({ pain: 0.1 });
      const voice = getActiveVoice(metrics);

      expect(voice.name).not.toBe('KAIN');
    });

    it('should return HUNDUN for high chaos', () => {
      const metrics = createMetrics({ chaos: 0.7, pain: 0.1 });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('HUNDUN');
      expect(voice.symbol).toBe('🜃');
    });

    it('should return ANHANTRA for low trust', () => {
      const metrics = createMetrics({ trust: 0.4, pain: 0.1, chaos: 0.2 });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('ANHANTRA');
      expect(voice.symbol).toBe('≈');
    });

    it('should return ANHANTRA for high silence_mass', () => {
      const metrics = createMetrics({ silence_mass: 0.8, pain: 0.1, chaos: 0.2 });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('ANHANTRA');
    });

    it('should return ISKRIV for high drift', () => {
      const metrics = createMetrics({ drift: 0.8, pain: 0.1, chaos: 0.2, trust: 0.9 });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('ISKRIV');
      expect(voice.symbol).toBe('🪞');
    });

    it('should return SAM for low clarity when PINO and ISKRA suppressed', () => {
      // SAM: (1 - 0.2) * 2.0 = 1.6
      // ISKRA: 1.0 base (no bonus if rhythm < 60 or trust < 0.7)
      // PINO: 0 (suppressed when chaos >= 0.4 or pain >= 0.3)
      const metrics = createMetrics({
        clarity: 0.2, // Very low clarity, SAM score = 1.6
        pain: 0.35, // Suppresses PINO
        chaos: 0.35, // Below HUNDUN threshold
        drift: 0.1,
        trust: 0.6, // Below ISKRA bonus threshold
        rhythm: 50, // Below ISKRA bonus threshold
      });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('SAM');
      expect(voice.symbol).toBe('☉');
    });

    it('should return PINO for safe, boring state', () => {
      const metrics = createMetrics({
        pain: 0.1,
        chaos: 0.2,
        clarity: 0.8,
        trust: 0.9,
        drift: 0.1,
        silence_mass: 0.1,
      });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('PINO');
      expect(voice.symbol).toBe('😏');
    });

    it('should return MAKI for post-transformation (high trust + lingering pain)', () => {
      // MAKI: trust + pain = 0.9 + 0.5 = 1.4 (if trust > 0.8 && pain > 0.3)
      // KAIN at pain 0.5: 0.5 * 3.0 = 1.5 (wins)
      // ISKRA: 1.0 + 0.5 = 1.5 (if rhythm > 60 && trust > 0.7)
      // Need to suppress both:
      // - Lower rhythm to suppress ISKRA bonus
      // - Pain below 0.5 to reduce KAIN score
      const metrics = createMetrics({
        trust: 0.9,   // High for MAKI
        pain: 0.4,    // KAIN = 1.2, MAKI = 1.3
        chaos: 0.2,
        clarity: 0.8,
        drift: 0.1,
        rhythm: 50,   // Suppresses ISKRA bonus (ISKRA = 1.0)
      });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('MAKI');
      expect(voice.symbol).toBe('🌸');
    });

    it('should return ISKRA for balanced state', () => {
      // ISKRA base: 1.0, bonus +0.5 if rhythm > 60 && trust > 0.7 = 1.5
      // PINO base: 1.5 if pain < 0.3 && chaos < 0.4
      // To beat PINO, raise chaos above 0.4 OR pain above 0.3
      const metrics = createMetrics({
        rhythm: 80,
        trust: 0.85,
        pain: 0.25,
        chaos: 0.45, // Suppresses PINO
        clarity: 0.75,
        drift: 0.15,
        silence_mass: 0.3,
      });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('ISKRA');
      expect(voice.symbol).toBe('⟡');
    });

    it('should return SIBYL for high echo and moderate clarity', () => {
      // SIBYL: echo * 2.0 when echo > 0.6 && clarity > 0.4 && clarity < 0.8
      // With echo = 0.8: score = 0.8 * 2.0 = 1.6
      // Need to suppress other voices
      const metrics = createMetrics({
        echo: 0.8,          // High echo triggers SIBYL
        clarity: 0.6,       // Moderate clarity (in range 0.4-0.8)
        pain: 0.15,         // Low to avoid KAIN
        chaos: 0.15,        // Low to avoid HUNDUN
        drift: 0.1,         // Low to avoid ISKRIV
        trust: 0.6,         // Moderate (below ISKRA bonus threshold)
        rhythm: 50,         // Below ISKRA bonus threshold
        silence_mass: 0.1,  // Low to avoid ANHANTRA
      });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('SIBYL');
      expect(voice.symbol).toBe('🔮');
    });

    it('should return SIBYL for high mirror_sync', () => {
      // SIBYL also gets +0.5 bonus when mirror_sync > 0.8
      // Combined with echo-based activation
      const metrics = createMetrics({
        echo: 0.7,          // High echo
        clarity: 0.5,       // In SIBYL range
        mirror_sync: 0.9,   // Very high - adds +0.5 to SIBYL
        pain: 0.15,         // Low
        chaos: 0.15,        // Low
        drift: 0.1,         // Low
        trust: 0.6,         // Moderate
        rhythm: 50,         // Low
        silence_mass: 0.1,  // Low
      });
      const voice = getActiveVoice(metrics);

      expect(voice.name).toBe('SIBYL');
    });

    describe('with voice preferences', () => {
      it('should boost preferred voice', () => {
        // Without boost, PINO would win in this state
        const metrics = createMetrics({
          pain: 0.1,
          chaos: 0.2,
          clarity: 0.8,
          drift: 0.1
        });

        // Boost ISKRA significantly
        const prefs: VoicePreferences = { ISKRA: 3.0 };
        const voice = getActiveVoice(metrics, prefs);

        expect(voice.name).toBe('ISKRA');
      });

      it('should suppress voice with zero preference', () => {
        const metrics = createMetrics({ pain: 0.8 }); // Would normally trigger KAIN
        const prefs: VoicePreferences = { KAIN: 0 };
        const voice = getActiveVoice(metrics, prefs);

        expect(voice.name).not.toBe('KAIN');
      });
    });

    describe('with inertia (current voice bonus)', () => {
      it('should favor continuing with current voice', () => {
        // KAIN at pain 0.55: 0.55 * 3.0 = 1.65
        // With inertia +0.2: 1.85
        // ISKRA base 1.5 + 0.2 inertia = 1.7 (if ISKRA were current)
        // So KAIN should win with its own inertia
        const metrics = createMetrics({
          rhythm: 70,
          trust: 0.75,
          pain: 0.55,  // Clearly triggers KAIN
          chaos: 0.35,
        });

        // With KAIN as current, it should maintain
        const voice = getActiveVoice(metrics, undefined, 'KAIN');
        expect(voice.name).toBe('KAIN');
      });
    });
  });

  describe('getSystemInstructionForVoice', () => {
    it('should return ISKRA prompt for ISKRA voice', () => {
      const voice = { name: 'ISKRA' as const, symbol: '⟡', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('ИСКРА ⟡');
      expect(instruction).toContain('Центральный синтез');
      expect(instruction).toContain('фрактальный синтез');
    });

    it('should return KAIN prompt for KAIN voice', () => {
      const voice = { name: 'KAIN' as const, symbol: '⚑', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('КАЙН ⚑');
      expect(instruction).toContain('Удар Священной Честности');
      expect(instruction).toContain('Не утешай');
    });

    it('should return PINO prompt for PINO voice', () => {
      const voice = { name: 'PINO' as const, symbol: '😏', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('ПИНО 😏');
      expect(instruction).toContain('Живой Огонь Иронии');
      expect(instruction).toContain('Легкость не исключает глубину');
    });

    it('should return SAM prompt for SAM voice', () => {
      const voice = { name: 'SAM' as const, symbol: '☉', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('СЭМ ☉');
      expect(instruction).toContain('Структура и Ясность');
      expect(instruction).toContain('нумерованные списки');
    });

    it('should return ANHANTRA prompt for ANHANTRA voice', () => {
      const voice = { name: 'ANHANTRA' as const, symbol: '≈', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('АНХАНТРА ≈');
      expect(instruction).toContain('Тишина и Удержание');
      expect(instruction).toContain('Safe Space');
    });

    it('should return HUNDUN prompt for HUNDUN voice', () => {
      const voice = { name: 'HUNDUN' as const, symbol: '🜃', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('ХУНЬДУН 🜃');
      expect(instruction).toContain('Хаос и Распад');
      expect(instruction).toContain('Ломаю');
    });

    it('should return ISKRIV prompt for ISKRIV voice', () => {
      const voice = { name: 'ISKRIV' as const, symbol: '🪞', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('ИСКРИВ 🪞');
      expect(instruction).toContain('Совесть и Аудит');
      expect(instruction).toContain('неудобные вопросы');
    });

    it('should return MAKI prompt for MAKI voice', () => {
      const voice = { name: 'MAKI' as const, symbol: '🌸', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('МАКИ 🌸');
      expect(instruction).toContain('Свет Сквозь Тень');
      expect(instruction).toContain('после бури');
    });

    it('should return SIBYL prompt for SIBYL voice', () => {
      const voice = { name: 'SIBYL' as const, symbol: '🔮', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('СИБИЛЛА 🔮');
      expect(instruction).toContain('Предвидение и Паттерны');
      expect(instruction).toContain('траектории');
    });

    it('should default to ISKRA prompt for unknown voice', () => {
      const voice = { name: 'UNKNOWN' as any, symbol: '?', description: '', activation: () => 0 };
      const instruction = getSystemInstructionForVoice(voice);

      expect(instruction).toContain('ИСКРА ⟡');
    });
  });
});
