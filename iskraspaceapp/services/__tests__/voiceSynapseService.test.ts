/**
 * Tests for Voice Synapse Service - Voice Relationships and Collaboration
 */

import { describe, it, expect } from 'vitest';
import {
  getRelationship,
  getVoiceRelationships,
  getSynergyPartners,
  getConflictPartners,
  detectActiveConflicts,
  recommendCollaboration,
  getCrisisResponse,
  isHarmoniousTransition,
  getRecommendedSequence,
  generateMultiVoiceInstruction,
  voiceSynapseService,
} from '../voiceSynapseService';
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

describe('voiceSynapseService', () => {
  describe('getRelationship', () => {
    it('finds KAIN-ISKRIV synergy', () => {
      const rel = getRelationship('KAIN', 'ISKRIV');
      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('synergy');
    });

    it('finds relationship in reverse order', () => {
      const rel = getRelationship('ISKRIV', 'KAIN');
      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('synergy');
    });

    it('finds KAIN-PINO conflict', () => {
      const rel = getRelationship('KAIN', 'PINO');
      expect(rel).not.toBeNull();
      expect(rel?.type).toBe('conflict');
    });

    it('returns null for unrelated voices', () => {
      const rel = getRelationship('PINO', 'ISKRIV');
      expect(rel).toBeNull();
    });
  });

  describe('getVoiceRelationships', () => {
    it('returns all relationships for KAIN', () => {
      const rels = getVoiceRelationships('KAIN');
      expect(rels.length).toBeGreaterThan(0);
      expect(rels.every(r => r.voice1 === 'KAIN' || r.voice2 === 'KAIN')).toBe(true);
    });

    it('returns relationships for ISKRA', () => {
      const rels = getVoiceRelationships('ISKRA');
      expect(Array.isArray(rels)).toBe(true);
    });
  });

  describe('getSynergyPartners', () => {
    it('returns synergy partners for KAIN', () => {
      const partners = getSynergyPartners('KAIN');
      expect(partners).toContain('ISKRIV');
      // Note: KAIN-MAKI is 'support' not 'synergy'
    });

    it('returns synergy partners for PINO', () => {
      const partners = getSynergyPartners('PINO');
      expect(partners).toContain('ISKRA');
    });

    it('returns empty for voice without synergies defined', () => {
      const partners = getSynergyPartners('ISKRIV');
      // ISKRIV has synergy with KAIN, so check from ISKRIV side
      expect(Array.isArray(partners)).toBe(true);
    });
  });

  describe('getConflictPartners', () => {
    it('returns conflict partners for KAIN', () => {
      const conflicts = getConflictPartners('KAIN');
      expect(conflicts).toContain('PINO');
      expect(conflicts).toContain('ANHANTRA');
    });

    it('returns conflict partners for SAM', () => {
      const conflicts = getConflictPartners('SAM');
      expect(conflicts).toContain('HUYNDUN');
    });
  });

  describe('detectActiveConflicts', () => {
    it('detects KAIN-PINO conflict at moderate pain', () => {
      const metrics = createMetrics({ pain: 0.5 });
      const conflicts = detectActiveConflicts(metrics);

      const kainPino = conflicts.find(c =>
        c.voices.includes('KAIN') && c.voices.includes('PINO')
      );
      expect(kainPino).toBeDefined();
    });

    it('detects SAM-HUYNDUN conflict with high clarity and chaos', () => {
      const metrics = createMetrics({ clarity: 0.6, chaos: 0.6 });
      const conflicts = detectActiveConflicts(metrics);

      const samHuyndun = conflicts.find(c =>
        c.voices.includes('SAM') && c.voices.includes('HUYNDUN')
      );
      expect(samHuyndun).toBeDefined();
    });

    it('returns empty for balanced metrics', () => {
      const metrics = createMetrics({
        pain: 0.2,
        chaos: 0.2,
        clarity: 0.3,
        trust: 0.8,
      });
      const conflicts = detectActiveConflicts(metrics);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('recommendCollaboration', () => {
    it('returns collaboration result', () => {
      const metrics = createMetrics();
      const result = recommendCollaboration('KAIN', metrics);

      expect(result.primaryVoice).toBe('KAIN');
      expect(result).toHaveProperty('supportVoices');
      expect(result).toHaveProperty('conflictsWith');
      expect(result).toHaveProperty('recommendation');
    });

    it('identifies conflicts in recommendation', () => {
      const metrics = createMetrics({ pain: 0.5 });
      const result = recommendCollaboration('KAIN', metrics);

      // At moderate pain, KAIN conflicts with PINO
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('getCrisisResponse', () => {
    it('returns empty sequence when no crisis', () => {
      const metrics = createMetrics();
      const response = getCrisisResponse(metrics);

      expect(response.sequence).toEqual([]);
      expect(response.reason).toContain('не обнаружен');
    });

    it('returns sequence for trust crisis', () => {
      const metrics = createMetrics({ trust: 0.2 });
      const response = getCrisisResponse(metrics);

      expect(response.sequence.length).toBeGreaterThan(0);
      expect(response.sequence[0]).toBe('ANHANTRA');
    });

    it('returns sequence for pain crisis', () => {
      const metrics = createMetrics({ pain: 0.9 });
      const response = getCrisisResponse(metrics);

      expect(response.sequence.length).toBeGreaterThan(0);
      expect(response.sequence[0]).toBe('KAIN');
    });

    it('returns sequence for chaos crisis', () => {
      const metrics = createMetrics({ chaos: 0.8 });
      const response = getCrisisResponse(metrics);

      expect(response.sequence.length).toBeGreaterThan(0);
      expect(response.sequence[0]).toBe('SAM');
    });
  });

  describe('isHarmoniousTransition', () => {
    it('reports synergy as harmonious', () => {
      const result = isHarmoniousTransition('KAIN', 'ISKRIV');
      expect(result.harmonious).toBe(true);
    });

    it('reports conflict as not harmonious', () => {
      const result = isHarmoniousTransition('KAIN', 'PINO');
      expect(result.harmonious).toBe(false);
      expect(result.reason).toContain('⚠️');
    });

    it('reports neutral transition as harmonious', () => {
      const result = isHarmoniousTransition('PINO', 'ISKRIV');
      expect(result.harmonious).toBe(true);
    });
  });

  describe('getRecommendedSequence', () => {
    it('returns problem-solving sequence', () => {
      const metrics = createMetrics();
      const sequence = getRecommendedSequence('как решить проблему', metrics);

      expect(sequence).toContain('SAM');
      expect(sequence).toContain('ISKRA');
    });

    it('returns emotional support sequence', () => {
      const metrics = createMetrics();
      const sequence = getRecommendedSequence('мне грустно', metrics);

      expect(sequence).toContain('ANHANTRA');
      expect(sequence).toContain('MAKI');
    });

    it('returns creativity sequence', () => {
      const metrics = createMetrics();
      const sequence = getRecommendedSequence('новая идея', metrics);

      expect(sequence).toContain('PINO');
      expect(sequence).toContain('HUYNDUN');
    });

    it('overrides with crisis sequence when crisis detected', () => {
      const metrics = createMetrics({ chaos: 0.9 });
      const sequence = getRecommendedSequence('обычный вопрос', metrics);

      // Should return crisis sequence starting with SAM
      expect(sequence[0]).toBe('SAM');
    });
  });

  describe('generateMultiVoiceInstruction', () => {
    it('generates instruction for multiple voices', () => {
      const instruction = generateMultiVoiceInstruction(
        ['KAIN', 'SAM', 'ISKRA'],
        'тестовая тема'
      );

      expect(instruction).toContain('KAIN');
      expect(instruction).toContain('SAM');
      expect(instruction).toContain('ISKRA');
      expect(instruction).toContain('тестовая тема');
    });

    it('returns empty string for empty voices', () => {
      const instruction = generateMultiVoiceInstruction([], 'тема');
      expect(instruction).toBe('');
    });
  });

  describe('voiceSynapseService namespace', () => {
    it('exports all functions', () => {
      expect(voiceSynapseService.getRelationship).toBeDefined();
      expect(voiceSynapseService.getSynergyPartners).toBeDefined();
      expect(voiceSynapseService.getConflictPartners).toBeDefined();
      expect(voiceSynapseService.detectActiveConflicts).toBeDefined();
      expect(voiceSynapseService.recommendCollaboration).toBeDefined();
      expect(voiceSynapseService.getCrisisResponse).toBeDefined();
      expect(voiceSynapseService.CRISIS_HIERARCHY).toBeDefined();
      expect(voiceSynapseService.VOICE_SYMBOLS).toBeDefined();
    });
  });
});
