/**
 * Evidence Service Unit Tests
 *
 * Tests canonical evidence format and trace discipline validation
 * @see services/evidenceService.ts
 */

import { describe, it, expect } from 'vitest';
import { evidenceService } from '../../services/evidenceService';

describe('EvidenceService', () => {
  describe('createEvidence', () => {
    it('should create canon evidence with section', () => {
      const evidence = evidenceService.createEvidence('canon', '07', '7.4');

      expect(evidence.contour).toBe('canon');
      expect(evidence.identifier).toBe('07');
      expect(evidence.anchor).toBe('7.4');
      expect(evidence.formatted).toBe('{e:canon:07#7.4}');
    });

    it('should create evidence without anchor', () => {
      const evidence = evidenceService.createEvidence('project', 'path/file.ts');

      expect(evidence.formatted).toBe('{e:project:path/file.ts}');
      expect(evidence.anchor).toBeUndefined();
    });

    it('should create web evidence', () => {
      const evidence = evidenceService.createEvidence('web', 'example.com', 'article');

      expect(evidence.contour).toBe('web');
      expect(evidence.formatted).toBe('{e:web:example.com#article}');
    });
  });

  describe('parseEvidence', () => {
    it('should parse valid canon evidence', () => {
      const evidence = evidenceService.parseEvidence('{e:canon:09#9.3}');

      expect(evidence).toBeTruthy();
      expect(evidence?.contour).toBe('canon');
      expect(evidence?.identifier).toBe('09');
      expect(evidence?.anchor).toBe('9.3');
    });

    it('should parse evidence without anchor', () => {
      const evidence = evidenceService.parseEvidence('{e:project:services/test.ts}');

      expect(evidence).toBeTruthy();
      expect(evidence?.contour).toBe('project');
      expect(evidence?.identifier).toBe('services/test.ts');
      expect(evidence?.anchor).toBeUndefined();
    });

    it('should return null for invalid format', () => {
      const evidence = evidenceService.parseEvidence('invalid-format');
      expect(evidence).toBeNull();
    });

    it('should return null for invalid contour', () => {
      const evidence = evidenceService.parseEvidence('{e:invalid:file}');
      expect(evidence).toBeNull();
    });
  });

  describe('validateEvidence', () => {
    it('should validate correct evidence', () => {
      const evidence = evidenceService.createEvidence('canon', '07', '7.4');
      const validation = evidenceService.validateEvidence(evidence);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid contour', () => {
      const evidence = {
        contour: 'invalid' as any,
        identifier: 'test',
        formatted: '{e:invalid:test}'
      };

      const validation = evidenceService.validateEvidence(evidence);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Invalid contour');
    });

    it('should detect empty identifier', () => {
      const evidence = {
        contour: 'canon' as any,
        identifier: '',
        formatted: '{e:canon:}'
      };

      const validation = evidenceService.validateEvidence(evidence);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Evidence identifier cannot be empty');
    });

    it('should warn for web evidence without anchor', () => {
      const evidence = evidenceService.createEvidence('web', 'example.com');
      const validation = evidenceService.validateEvidence(evidence);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Web evidence should include anchor');
    });
  });

  describe('extractEvidenceFromText', () => {
    it('should extract single evidence', () => {
      const text = 'This is a fact {e:canon:07#7.4} about security.';
      const evidences = evidenceService.extractEvidenceFromText(text);

      expect(evidences).toHaveLength(1);
      expect(evidences[0].formatted).toBe('{e:canon:07#7.4}');
    });

    it('should extract multiple evidences', () => {
      const text = 'Facts: {e:canon:07#7.4} and {e:project:test.ts#L42} and {e:web:example.com}';
      const evidences = evidenceService.extractEvidenceFromText(text);

      expect(evidences).toHaveLength(3);
      expect(evidences[0].contour).toBe('canon');
      expect(evidences[1].contour).toBe('project');
      expect(evidences[2].contour).toBe('web');
    });

    it('should return empty array if no evidence', () => {
      const text = 'No evidence here!';
      const evidences = evidenceService.extractEvidenceFromText(text);

      expect(evidences).toHaveLength(0);
    });
  });

  describe('createSIFTEvidence', () => {
    it('should create SIFT evidence with HYP label for 0 sources', () => {
      const evidence1 = evidenceService.createEvidence('canon', '07', '7.4');
      const sift = evidenceService.createSIFTEvidence(
        'Security patterns exist',
        'HYP',
        [],
        0,
        0
      );

      expect(sift.label).toBe('HYP');
      expect(sift.confidence).toBeLessThan(1.0);
      expect(sift.sources_checked).toBe(0);
      expect(sift.sift_depth).toBe(0);
    });

    it('should create SIFT evidence with INFER label for 1 source', () => {
      const evidence1 = evidenceService.createEvidence('canon', '07', '7.4');
      const sift = evidenceService.createSIFTEvidence(
        'Security patterns exist',
        'INFER',
        [evidence1],
        1,
        1
      );

      expect(sift.label).toBe('INFER');
      expect(sift.confidence).toBeGreaterThan(0.5);
      expect(sift.sources_checked).toBe(1);
    });

    it('should create SIFT evidence with FACT label for 2+ sources', () => {
      const evidence1 = evidenceService.createEvidence('canon', '07', '7.4');
      const evidence2 = evidenceService.createEvidence('project', 'security.ts');
      const sift = evidenceService.createSIFTEvidence(
        'Security patterns exist',
        'FACT',
        [evidence1, evidence2],
        2,
        2
      );

      expect(sift.label).toBe('FACT');
      expect(sift.confidence).toBeGreaterThan(0.6);
      expect(sift.confidence).toBeLessThan(1.0);
      expect(sift.sources_checked).toBe(2);
    });

    it('should never return confidence = 1.0 (SIFT requirement)', () => {
      const evidence1 = evidenceService.createEvidence('canon', '07', '7.4');
      const evidence2 = evidenceService.createEvidence('canon', '09', '9.3');
      const evidence3 = evidenceService.createEvidence('project', 'test.ts');
      const sift = evidenceService.createSIFTEvidence(
        'Heavily verified claim',
        'FACT',
        [evidence1, evidence2, evidence3],
        3,
        4
      );

      expect(sift.confidence).toBeLessThan(1.0);
      expect(sift.confidence).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('validateTraceDiscipline', () => {
    it('should pass for [FACT] with evidence', () => {
      const text = '[FACT] Security patterns exist {e:canon:07#7.4}';
      const validation = evidenceService.validateTraceDiscipline(text);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail for [FACT] without evidence', () => {
      const text = '[FACT] Security patterns exist';
      const validation = evidenceService.validateTraceDiscipline(text);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('[FACT] found without evidence');
    });

    it('should warn for inference language in [FACT]', () => {
      const text = '[FACT] Очевидно, что это так {e:canon:07}';
      const validation = evidenceService.validateTraceDiscipline(text);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('[INFER] labeled as [FACT]');
    });

    it('should warn for unlabeled hypothesis', () => {
      const text = 'Возможно, это правда, но нужно проверить.';
      const validation = evidenceService.validateTraceDiscipline(text);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Hypothesis language found without [HYP]');
    });
  });

  describe('formatClaim', () => {
    it('should format claim with evidence', () => {
      const evidence1 = evidenceService.createEvidence('canon', '07', '7.4');
      const evidence2 = evidenceService.createEvidence('project', 'test.ts');
      const formatted = evidenceService.formatClaim(
        'FACT',
        'Security patterns exist',
        [evidence1, evidence2]
      );

      expect(formatted).toContain('[FACT]');
      expect(formatted).toContain('Security patterns exist');
      expect(formatted).toContain('{e:canon:07#7.4}');
      expect(formatted).toContain('{e:project:test.ts}');
    });
  });

  describe('getEvidenceStats', () => {
    it('should count evidence by contour', () => {
      const text = `
        [FACT] Canon says {e:canon:07#7.4}
        [INFER] Based on project {e:project:test.ts}
        [HYP] Maybe web source {e:web:example.com}
      `;

      const stats = evidenceService.getEvidenceStats(text);

      expect(stats.total).toBe(3);
      expect(stats.byContour.canon).toBe(1);
      expect(stats.byContour.project).toBe(1);
      expect(stats.byContour.web).toBe(1);
      expect(stats.facts).toBe(1);
      expect(stats.inferences).toBe(1);
      expect(stats.hypotheses).toBe(1);
    });
  });

  describe('Shorthand methods', () => {
    it('canon() should create canon evidence', () => {
      const evidence = evidenceService.canon('07', '7.4');
      expect(evidence.formatted).toBe('{e:canon:07#7.4}');
    });

    it('project() should create project evidence', () => {
      const evidence = evidenceService.project('test.ts', 'L42');
      expect(evidence.formatted).toBe('{e:project:test.ts#L42}');
    });

    it('company() should create company evidence', () => {
      const evidence = evidenceService.company('doc123', 'section5');
      expect(evidence.formatted).toBe('{e:company:doc123#section5}');
    });

    it('web() should create web evidence', () => {
      const evidence = evidenceService.web('example.com', 'article');
      expect(evidence.formatted).toBe('{e:web:example.com#article}');
    });
  });
});
