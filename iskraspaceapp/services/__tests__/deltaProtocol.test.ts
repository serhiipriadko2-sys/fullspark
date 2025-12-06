/**
 * Tests for ∆DΩΛ Protocol Service
 */

import { describe, it, expect } from 'vitest';
import {
  validateDeltaSignature,
  parseDeltaSignature,
  generateDeltaBlock,
  enforceDeltaProtocol,
  extractMessageWithoutDelta,
  createSIFTBlock,
} from '../deltaProtocol';

describe('deltaProtocol', () => {
  describe('validateDeltaSignature', () => {
    it('should return valid for complete ∆DΩΛ block', () => {
      const text = `Some response text.

∆DΩΛ
Δ: Признание боли как учителя
D: dialog_context → pattern_recognition → true
Ω: 85%
Λ: Записать в дневник три момента дня`;

      const result = validateDeltaSignature(text);
      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.parsed).toBeDefined();
      expect(result.parsed?.delta).toBe('Признание боли как учителя');
    });

    it('should return invalid for missing Delta', () => {
      const text = `Some text
D: source → inference → true
Ω: 80%
Λ: Next step`;

      const result = validateDeltaSignature(text);
      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('Δ (Delta)');
    });

    it('should return invalid for empty text', () => {
      const result = validateDeltaSignature('');
      expect(result.isValid).toBe(false);
      expect(result.missing.length).toBe(4);
    });

    it('should handle various Delta formats with colon', () => {
      // All formats require colon after symbol per Canon
      const formats = [
        'Δ: Some delta',
        '∆: Some delta',
        'Δ：Some delta', // Full-width colon
      ];

      formats.forEach(format => {
        const text = `${format}\nD: s → i → f\nΩ: 50%\nΛ: step`;
        const result = validateDeltaSignature(text);
        expect(result.parsed?.delta).toBeDefined();
      });
    });
  });

  describe('parseDeltaSignature', () => {
    it('should parse complete signature', () => {
      const text = `
∆DΩΛ
Δ: Test delta
D: source → inference → true
Ω: 90%
Λ: Action item`;

      const parsed = parseDeltaSignature(text);
      expect(parsed).not.toBeNull();
      expect(parsed?.delta).toBe('Test delta');
      expect(parsed?.depth).toBe('source → inference → true');
      expect(parsed?.omega).toBe('90%');
      expect(parsed?.lambda).toBe('Action item');
    });

    it('should return null for invalid text', () => {
      const parsed = parseDeltaSignature('No delta here');
      expect(parsed).toBeNull();
    });
  });

  describe('generateDeltaBlock', () => {
    it('should generate proper ∆DΩΛ block', () => {
      const block = generateDeltaBlock({
        delta: 'Test message',
        source: 'test_source',
        inference: 'test_inference',
        fact: 'true',
        confidence: 0.85,
        nextStep: 'Do something'
      });

      expect(block).toContain('∆DΩΛ');
      expect(block).toContain('Δ: Test message');
      expect(block).toContain('85%');
      expect(block).toContain('Λ: Do something');
    });

    it('should use default SIFT when source not provided', () => {
      const block = generateDeltaBlock({
        delta: 'Test',
        confidence: 0.5,
        nextStep: 'Step'
      });

      expect(block).toContain('internal_state');
    });
  });

  describe('enforceDeltaProtocol', () => {
    it('should not modify text with valid signature', () => {
      const text = `Response with valid signature.
Δ: Valid delta
D: source → inference → true
Ω: 80%
Λ: step`;

      const result = enforceDeltaProtocol(text);
      expect(result).toBe(text);
    });

    it('should add fallback block to text without signature', () => {
      const text = 'Simple response without delta.';
      const result = enforceDeltaProtocol(text);

      expect(result).toContain(text);
      expect(result).toContain('∆DΩΛ');
      expect(result).toContain('Δ:');
    });

    it('should use provided context for fallback', () => {
      const text = 'Response';
      const result = enforceDeltaProtocol(text, {
        topic: 'Custom topic',
        confidence: 0.95
      });

      expect(result).toContain('Custom topic');
      expect(result).toContain('95%');
    });
  });

  describe('extractMessageWithoutDelta', () => {
    it('should remove ∆DΩΛ block', () => {
      const text = `Main message here.

∆DΩΛ
Δ: Delta
D: Depth
Ω: 100%
Λ: Lambda`;

      const clean = extractMessageWithoutDelta(text);
      expect(clean).toBe('Main message here.');
    });

    it('should return unchanged text if no delta block', () => {
      const text = 'Simple text';
      expect(extractMessageWithoutDelta(text)).toBe(text);
    });
  });

  describe('createSIFTBlock', () => {
    it('should create valid SIFT block', () => {
      const sift = createSIFTBlock({
        source: 'test source',
        inference: 'test inference',
        fact: 'true',
        trace: 'test trace'
      });

      expect(sift.source).toBe('test source');
      expect(sift.inference).toBe('test inference');
      expect(sift.fact).toBe('true');
      expect(sift.trace).toBe('test trace');
    });
  });
});
