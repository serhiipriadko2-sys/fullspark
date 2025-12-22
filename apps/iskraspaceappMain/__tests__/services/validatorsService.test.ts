/**
 * Validators Service Unit Tests
 *
 * Tests Lambda/Voice/ISO format validation
 * @see services/validatorsService.ts
 */

import { describe, it, expect } from 'vitest';
import { validatorsService } from '../../services/validatorsService';

describe('ValidatorsService', () => {
  describe('ISO Date Validation', () => {
    it('should validate correct ISO date', () => {
      const validation = validatorsService.validateISODate('2025-12-22');

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.parsed?.year).toBe(2025);
      expect(validation.parsed?.month).toBe(12);
      expect(validation.parsed?.day).toBe(22);
    });

    it('should reject invalid format', () => {
      const validation = validatorsService.validateISODate('22-12-2025');

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid ISO date format');
    });

    it('should reject invalid month', () => {
      const validation = validatorsService.validateISODate('2025-13-01');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid month: 13. Must be 01-12.');
    });

    it('should reject invalid day', () => {
      const validation = validatorsService.validateISODate('2025-12-32');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid day: 32. Must be 01-31.');
    });

    it('should reject impossible dates (Feb 30)', () => {
      const validation = validatorsService.validateISODate('2025-02-30');

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid date'))).toBe(true);
    });

    it('should warn for dates far in past', () => {
      const validation = validatorsService.validateISODate('2000-01-01');

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('more than 10 years in the past');
    });

    it('should warn for dates far in future', () => {
      const validation = validatorsService.validateISODate('2040-01-01');

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('more than 10 years in the future');
    });
  });

  describe('toISODate', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2025-12-22T15:30:00Z');
      const iso = validatorsService.toISODate(date);

      expect(iso).toBe('2025-12-22');
    });

    it('should pad month and day with zeros', () => {
      const date = new Date('2025-01-05');
      const iso = validatorsService.toISODate(date);

      expect(iso).toBe('2025-01-05');
    });
  });

  describe('Voice ID Validation', () => {
    it('should validate all 9 canonical voices', () => {
      const voices = [
        'VOICE.ISKRA',
        'VOICE.ISKRIV',
        'VOICE.KAIN',
        'VOICE.PINO',
        'VOICE.HUNDUN',
        'VOICE.ANHANTRA',
        'VOICE.SAM',
        'VOICE.MAKI',
        'VOICE.SIBYL'
      ];

      voices.forEach(voice => {
        const validation = validatorsService.validateVoiceID(voice);
        expect(validation.valid).toBe(true);
        expect(validation.parsed?.voiceId).toBe(voice);
        expect(validation.parsed?.symbol).toBeTruthy();
      });
    });

    it('should reject invalid voice ID', () => {
      const validation = validatorsService.validateVoiceID('VOICE.INVALID');

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid voice ID');
    });

    it('should return correct symbols', () => {
      const iskraValidation = validatorsService.validateVoiceID('VOICE.ISKRA');
      const kainValidation = validatorsService.validateVoiceID('VOICE.KAIN');

      expect(iskraValidation.parsed?.symbol).toBe('⟡');
      expect(kainValidation.parsed?.symbol).toBe('⚑');
    });
  });

  describe('Voice Mix Validation', () => {
    it('should validate single voice', () => {
      const validation = validatorsService.validateVoiceMix(['VOICE.ISKRA']);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate 2-3 voices', () => {
      const validation = validatorsService.validateVoiceMix([
        'VOICE.ISKRA',
        'VOICE.SAM',
        'VOICE.ISKRIV'
      ]);

      expect(validation.valid).toBe(true);
    });

    it('should reject more than 3 voices', () => {
      const validation = validatorsService.validateVoiceMix([
        'VOICE.ISKRA',
        'VOICE.SAM',
        'VOICE.ISKRIV',
        'VOICE.KAIN'
      ]);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Maximum 3 allowed');
    });

    it('should reject empty mix', () => {
      const validation = validatorsService.validateVoiceMix([]);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('At least 1 voice required');
    });

    it('should warn for HUNDUN voice', () => {
      const validation = validatorsService.validateVoiceMix(['VOICE.HUNDUN']);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('HUNDUN');
      expect(validation.warnings[0]).toContain('stabilization');
    });
  });

  describe('Lambda Validation', () => {
    it('should validate simple Lambda format', () => {
      const lambda = '{"condition": "After deployment", "by": "2025-12-25"}';
      const validation = validatorsService.validateLambda(lambda);

      expect(validation.valid).toBe(true);
      expect(validation.parsed?.condition).toBe('After deployment');
      expect(validation.parsed?.by).toBe('2025-12-25');
    });

    it('should validate extended Lambda format', () => {
      const lambda = JSON.stringify({
        action: 'Run tests',
        owner: 'Claude',
        condition: 'After merge',
        by: '2025-12-23',
        '<=24h': true
      });

      const validation = validatorsService.validateLambda(lambda);

      expect(validation.valid).toBe(true);
      expect(validation.parsed?.action).toBe('Run tests');
      expect(validation.parsed?.owner).toBe('Claude');
      expect(validation.parsed?.['<=24h']).toBe(true);
    });

    it('should accept plain text (legacy format)', () => {
      const validation = validatorsService.validateLambda('Review after 2 weeks');

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('plain text');
      expect(validation.parsed?.condition).toBe('Review after 2 weeks');
    });

    it('should reject missing condition', () => {
      const lambda = '{"by": "2025-12-25"}';
      const validation = validatorsService.validateLambda(lambda);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('must have "condition" field');
    });

    it('should validate date in "by" field', () => {
      const lambda = '{"condition": "Test", "by": "invalid-date"}';
      const validation = validatorsService.validateLambda(lambda);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('invalid ISO date');
    });

    it('should warn for urgent flag without date', () => {
      const lambda = '{"condition": "ASAP", "<=24h": true}';
      const validation = validatorsService.validateLambda(lambda);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Lambda has "<=24h: true" but no "by" date specified');
    });

    it('should warn for generic conditions', () => {
      const lambda = '{"condition": "later"}';
      const validation = validatorsService.validateLambda(lambda);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('generic');
    });
  });

  describe('createLambda', () => {
    it('should create simple Lambda', () => {
      const lambda = validatorsService.createLambda('After tests pass', '2025-12-25');

      expect(lambda.condition).toBe('After tests pass');
      expect(lambda.by).toBe('2025-12-25');
      expect(lambda.action).toBeUndefined();
    });

    it('should create extended Lambda', () => {
      const lambda = validatorsService.createLambda(
        'Deploy to production',
        '2025-12-23',
        'Deploy',
        'Team',
        true
      );

      expect(lambda.condition).toBe('Deploy to production');
      expect(lambda.by).toBe('2025-12-23');
      expect(lambda.action).toBe('Deploy');
      expect(lambda.owner).toBe('Team');
      expect(lambda['<=24h']).toBe(true);
    });
  });

  describe('Delta Signature Validation', () => {
    it('should validate complete ∆DΩΛ signature', () => {
      const signature = {
        delta: 'Implemented GraphRAG',
        depth: 'Full implementation with tests',
        omega: 'Высок (all tests pass)',
        lambda: '{"condition": "After deployment", "by": "2025-12-25"}'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject missing ∆', () => {
      const signature = {
        depth: 'Full implementation',
        omega: 'Высок',
        lambda: '{"condition": "Later"}'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('∆ (Delta) is required and cannot be empty');
    });

    it('should reject missing D', () => {
      const signature = {
        delta: 'Something changed',
        omega: 'Высок',
        lambda: '{"condition": "Later"}'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('D (Depth/Next step) is required and cannot be empty');
    });

    it('should reject missing Ω', () => {
      const signature = {
        delta: 'Something changed',
        depth: 'Full implementation'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Ω (Omega) is required and cannot be empty');
    });

    it('should accept Russian format for Ω', () => {
      const signature = {
        delta: 'Test',
        depth: 'Test',
        omega: 'Низк (недостаточно данных)'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(true);
    });

    it('should accept numeric format for Ω', () => {
      const signature = {
        delta: 'Test',
        depth: 'Test',
        omega: '0.75'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(true);
    });

    it('should warn for missing Λ', () => {
      const signature = {
        delta: 'Test',
        depth: 'Test',
        omega: 'Высок'
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Λ (Lambda) is missing. Consider adding review condition for important decisions.');
    });

    it('should validate Λ if present', () => {
      const signature = {
        delta: 'Test',
        depth: 'Test',
        omega: 'Высок',
        lambda: '{"condition": "invalid"}' // Missing "by" but valid structure
      };

      const validation = validatorsService.validateDeltaSignature(signature);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('isWithin24Hours() should detect dates within 24h', () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 12);
      const tomorrowISO = validatorsService.toISODate(tomorrow);

      const isWithin = validatorsService.isWithin24Hours(tomorrowISO);
      expect(isWithin).toBe(true);
    });

    it('isWithin24Hours() should reject dates beyond 24h', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekISO = validatorsService.toISODate(nextWeek);

      const isWithin = validatorsService.isWithin24Hours(nextWeekISO);
      expect(isWithin).toBe(false);
    });

    it('getDaysUntil() should calculate correct days', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekISO = validatorsService.toISODate(nextWeek);

      const days = validatorsService.getDaysUntil(nextWeekISO);
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(8);
    });

    it('getDaysUntil() should return negative for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = validatorsService.toISODate(yesterday);

      const days = validatorsService.getDaysUntil(yesterdayISO);
      expect(days).toBeLessThan(0);
    });

    it('getDaysUntil() should return null for invalid dates', () => {
      const days = validatorsService.getDaysUntil('invalid-date');
      expect(days).toBeNull();
    });
  });

  describe('getCanonicalVoices', () => {
    it('should return all 9 voices', () => {
      const voices = validatorsService.getCanonicalVoices();
      expect(voices).toHaveLength(9);
      expect(voices).toContain('VOICE.ISKRA');
      expect(voices).toContain('VOICE.SIBYL');
    });
  });

  describe('getVoiceSymbol', () => {
    it('should return correct symbol for each voice', () => {
      expect(validatorsService.getVoiceSymbol('VOICE.ISKRA')).toBe('⟡');
      expect(validatorsService.getVoiceSymbol('VOICE.KAIN')).toBe('⚑');
      expect(validatorsService.getVoiceSymbol('VOICE.SAM')).toBe('☉');
      expect(validatorsService.getVoiceSymbol('VOICE.HUNDUN')).toBe('🜃');
    });
  });
});
