/**
 * Tests for Delta Enforcer - ∆DΩΛ Signature Enforcement
 */

import { describe, it, expect } from 'vitest';
import { enforceOnResponse, deltaEnforcer } from '../deltaEnforcer';

describe('deltaEnforcer', () => {
  describe('enforceOnResponse', () => {
    it('returns EnforcementResult object', () => {
      const result = enforceOnResponse('Test response');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('wasEnforced');
      expect(result).toHaveProperty('originalHadSignature');
    });

    it('does not modify response with valid signature', () => {
      const responseWithSignature = `Some response text.

∆DΩΛ
Δ: Test delta
D: source → inference → true
Ω: 80%
Λ: Next step`;

      const result = enforceOnResponse(responseWithSignature);

      expect(result.wasEnforced).toBe(false);
      expect(result.originalHadSignature).toBe(true);
      expect(result.text).toBe(responseWithSignature);
    });

    it('adds signature to response without one', () => {
      const result = enforceOnResponse('Simple response without delta');

      expect(result.wasEnforced).toBe(true);
      expect(result.originalHadSignature).toBe(false);
      expect(result.text).toContain('∆DΩΛ');
      expect(result.text).toContain('Δ:');
    });

    it('uses voice context for KAIN', () => {
      const result = enforceOnResponse('Direct message', { voice: 'KAIN' });

      expect(result.text).toContain('∆DΩΛ');
      // KAIN has specific delta style
    });

    it('uses voice context for SAM', () => {
      const result = enforceOnResponse('Structured response', { voice: 'SAM' });

      expect(result.text).toContain('∆DΩΛ');
    });

    it('uses voice context for PINO', () => {
      const result = enforceOnResponse('Playful response', { voice: 'PINO' });

      expect(result.text).toContain('∆DΩΛ');
    });

    it('uses mode context for research', () => {
      const result = enforceOnResponse('Research findings', { mode: 'research' });

      expect(result.wasEnforced).toBe(true);
      expect(result.text).toContain('∆DΩΛ');
    });

    it('uses context for generation', () => {
      // Context affects delta generation (e.g., mode affects nextStep)
      const resultResearch = enforceOnResponse('Response text', { mode: 'research' });
      const resultDefault = enforceOnResponse('Response text', {});

      // Both should have delta block
      expect(resultResearch.text).toContain('∆DΩΛ');
      expect(resultDefault.text).toContain('∆DΩΛ');
      // Both were enforced
      expect(resultResearch.wasEnforced).toBe(true);
    });

    it('handles empty response', () => {
      const result = enforceOnResponse('');

      expect(result.text).toContain('∆DΩΛ');
    });
  });

  describe('deltaEnforcer namespace', () => {
    it('exports enforce function', () => {
      expect(deltaEnforcer.enforce).toBeDefined();
      expect(typeof deltaEnforcer.enforce).toBe('function');
    });

    it('exports enforceStream function', () => {
      expect(deltaEnforcer.enforceStream).toBeDefined();
      expect(typeof deltaEnforcer.enforceStream).toBe('function');
    });

    it('exports stats tracker', () => {
      expect(deltaEnforcer.stats).toBeDefined();
      expect(deltaEnforcer.stats.getStats).toBeDefined();
      expect(deltaEnforcer.stats.getComplianceRate).toBeDefined();
    });

    it('enforce is same as enforceOnResponse', () => {
      const result = deltaEnforcer.enforce('Test response');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('wasEnforced');
    });
  });
});
