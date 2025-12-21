/**
 * Tests for Glossary Service - Canon Terms and Semantic Search
 */

import { describe, it, expect } from 'vitest';
import {
  searchTerms,
  getTermById,
  getTermsByCategory,
  getRelatedTerms,
  getCategories,
  getAllTerms,
} from '../glossaryService';

describe('glossaryService', () => {
  describe('searchTerms', () => {
    it('finds exact term match', () => {
      const results = searchTerms('ISKRA');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].term.term).toBe('ISKRA');
      expect(results[0].matchedIn).toContain('term');
    });

    it('finds Russian term match', () => {
      const results = searchTerms('ИСКРА');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].term.termRu).toBe('ИСКРА');
    });

    it('finds partial term match', () => {
      const results = searchTerms('KAI');
      expect(results.some(r => r.term.term === 'KAIN')).toBe(true);
    });

    it('finds by definition content', () => {
      const results = searchTerms('honesty');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.matchedIn.includes('definition'))).toBe(true);
    });

    it('finds by symbol', () => {
      const results = searchTerms('⟡');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].term.symbol).toBe('⟡');
    });

    it('filters by category', () => {
      const results = searchTerms('', { category: 'voice' });
      expect(results.every(r => r.term.category === 'voice')).toBe(true);
    });

    it('respects limit option', () => {
      const results = searchTerms('', { limit: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('returns empty for no match', () => {
      const results = searchTerms('xyznonexistent123');
      expect(results.length).toBe(0);
    });

    it('uses fuzzy matching', () => {
      const results = searchTerms('ISKR', { fuzzy: true }); // close to ISKRA
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getTermById', () => {
    it('returns term for valid ID', () => {
      const term = getTermById('voice_iskra');
      expect(term).not.toBeNull();
      expect(term?.term).toBe('ISKRA');
    });

    it('returns null for invalid ID', () => {
      const term = getTermById('nonexistent_id');
      expect(term).toBeNull();
    });
  });

  describe('getTermsByCategory', () => {
    it('returns all voices', () => {
      const voices = getTermsByCategory('voice');
      expect(voices.length).toBeGreaterThan(0);
      expect(voices.every(v => v.category === 'voice')).toBe(true);
    });

    it('returns all metrics', () => {
      const metrics = getTermsByCategory('metric');
      expect(metrics.every(m => m.category === 'metric')).toBe(true);
    });

    it('returns all phases', () => {
      const phases = getTermsByCategory('phase');
      expect(phases.every(p => p.category === 'phase')).toBe(true);
    });

    it('returns all protocols', () => {
      const protocols = getTermsByCategory('protocol');
      expect(protocols.length).toBeGreaterThan(0);
      expect(protocols.some(p => p.term === '∆DΩΛ' || p.term === 'SIFT')).toBe(true);
    });

    it('returns empty array for empty category', () => {
      const terms = getTermsByCategory('concept');
      expect(Array.isArray(terms)).toBe(true);
    });
  });

  describe('getRelatedTerms', () => {
    it('returns related terms for ISKRA', () => {
      const related = getRelatedTerms('voice_iskra');
      expect(related.length).toBeGreaterThan(0);
    });

    it('returns empty for term without relations', () => {
      const related = getRelatedTerms('nonexistent');
      expect(related).toEqual([]);
    });

    it('returns valid GlossaryTerm objects', () => {
      const related = getRelatedTerms('voice_kain');
      related.forEach(term => {
        expect(term).toHaveProperty('id');
        expect(term).toHaveProperty('term');
        expect(term).toHaveProperty('category');
      });
    });
  });

  describe('getCategories', () => {
    it('returns all categories with counts', () => {
      const categories = getCategories();
      expect(categories.length).toBeGreaterThan(0);

      categories.forEach(cat => {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('count');
        expect(typeof cat.count).toBe('number');
      });
    });

    it('includes voice category', () => {
      const categories = getCategories();
      const voiceCat = categories.find(c => c.id === 'voice');
      expect(voiceCat).toBeDefined();
      expect(voiceCat?.name).toBe('Голоса');
      expect(voiceCat?.count).toBeGreaterThan(0);
    });

    it('includes protocol category', () => {
      const categories = getCategories();
      const protocolCat = categories.find(c => c.id === 'protocol');
      expect(protocolCat).toBeDefined();
      expect(protocolCat?.name).toBe('Протоколы');
    });
  });

  describe('getAllTerms', () => {
    it('returns all glossary terms', () => {
      const terms = getAllTerms();
      expect(Array.isArray(terms)).toBe(true);
      expect(terms.length).toBeGreaterThan(10); // Should have many terms
    });

    it('returns terms with required fields', () => {
      const terms = getAllTerms();
      terms.forEach(term => {
        expect(term.id).toBeDefined();
        expect(term.term).toBeDefined();
        expect(term.termRu).toBeDefined();
        expect(term.category).toBeDefined();
        expect(term.definition).toBeDefined();
      });
    });
  });
});
