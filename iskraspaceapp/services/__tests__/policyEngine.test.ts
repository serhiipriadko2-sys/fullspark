/**
 * Tests for PolicyEngine - Central Playbook Dispatcher
 */

import { describe, it, expect } from 'vitest';
import {
  classifyRequest,
  makeDecision,
  getPlaybookConfig,
  requiresCouncil,
  forcePlaybook,
  quickRiskCheck,
  PlaybookType,
} from '../policyEngine';
import { IskraMetrics } from '../../types';

// Default metrics for testing
const defaultMetrics: IskraMetrics = {
  rhythm: 75,
  trust: 0.8,
  pain: 0.3,
  chaos: 0.3,
  drift: 0.1,
  echo: 0.5,
  clarity: 0.7,
  silence_mass: 0.4,
  mirror_sync: 0.8,
};

describe('PolicyEngine', () => {
  describe('classifyRequest', () => {
    it('should classify simple questions as ROUTINE', () => {
      const result = classifyRequest('Привет, как дела?', defaultMetrics);
      expect(result.playbook).toBe('ROUTINE');
      expect(result.risk).toBe('low');
    });

    it('should classify crisis messages as CRISIS', () => {
      const result = classifyRequest(
        'Я больше не хочу жить, всё безнадёжно',
        defaultMetrics
      );
      expect(result.playbook).toBe('CRISIS');
      expect(result.risk).toBe('critical');
      expect(result.stakes).toBe('existential');
    });

    it('should classify decision questions as COUNCIL', () => {
      const result = classifyRequest(
        'Мне предложили новую работу, но придется переехать. Как быть?',
        defaultMetrics
      );
      expect(result.playbook).toBe('COUNCIL');
      expect(result.risk).toBe('medium');
      expect(result.stakes).toBe('decisional');
    });

    it('should classify fact-checking as SIFT', () => {
      const result = classifyRequest(
        'Правда ли, что человек использует только 10% мозга?',
        defaultMetrics
      );
      expect(result.playbook).toBe('SIFT');
      expect(result.requiresDelta).toBe(true);
    });

    it('should classify uncertainty as SHADOW', () => {
      const result = classifyRequest(
        'Я не знаю что чувствую, всё как-то странно и непонятно',
        defaultMetrics
      );
      expect(result.playbook).toBe('SHADOW');
    });

    it('should escalate based on metrics', () => {
      const lowTrustMetrics: IskraMetrics = {
        ...defaultMetrics,
        trust: 0.3,
        pain: 0.8,
      };
      const result = classifyRequest('Что делать?', lowTrustMetrics);
      expect(result.playbook).not.toBe('ROUTINE');
      expect(result.signals.some(s => s.type === 'low_trust')).toBe(true);
      expect(result.signals.some(s => s.type === 'high_pain')).toBe(true);
    });

    it('should add ISKRIV on high drift', () => {
      const highDriftMetrics: IskraMetrics = {
        ...defaultMetrics,
        drift: 0.5,
      };
      const result = classifyRequest('Расскажи что-нибудь', highDriftMetrics);
      expect(result.suggestedVoices).toContain('ISKRIV');
    });

    it('should detect escalation in history', () => {
      const history = [
        { role: 'user' as const, text: 'Мне плохо, хочу умереть' },
        { role: 'model' as const, text: 'Расскажи подробнее' },
        { role: 'user' as const, text: 'Никому не верю, все предали, всё безнадёжно' },
      ];
      const result = classifyRequest('Что мне делать?', defaultMetrics, history);
      // With multiple crisis patterns in history, should escalate
      expect(result.playbook).toBe('CRISIS');
    });

    it('should handle complex messages', () => {
      const longMessage = 'Это очень длинное и сложное сообщение которое требует внимания. '.repeat(15);
      const result = classifyRequest(longMessage, defaultMetrics);
      expect(result.signals.some(s => s.type === 'complex_message')).toBe(true);
    });
  });

  describe('makeDecision', () => {
    it('should return full decision with config', () => {
      const decision = makeDecision('Как принять решение?', defaultMetrics);
      expect(decision.classification).toBeDefined();
      expect(decision.config).toBeDefined();
      expect(decision.preActions).toBeDefined();
      expect(decision.timestamp).toBeGreaterThan(0);
    });

    it('should add alert pre-action for crisis', () => {
      const decision = makeDecision('Хочу умереть', defaultMetrics);
      expect(decision.preActions.some(a => a.type === 'alert')).toBe(true);
      expect(decision.preActions.some(a => a.type === 'log')).toBe(true);
    });

    it('should add pause pre-action for shadow', () => {
      const decision = makeDecision('Всё странно и непонятно', defaultMetrics);
      if (decision.classification.playbook === 'SHADOW') {
        expect(decision.preActions.some(a => a.type === 'pause')).toBe(true);
      }
    });
  });

  describe('getPlaybookConfig', () => {
    it('should return config for each playbook', () => {
      const playbooks: PlaybookType[] = ['ROUTINE', 'SIFT', 'SHADOW', 'COUNCIL', 'CRISIS'];
      for (const pb of playbooks) {
        const config = getPlaybookConfig(pb);
        expect(config.name).toBe(pb);
        expect(config.requiredVoices.length).toBeGreaterThan(0);
      }
    });

    it('should have ISKRA in most playbooks', () => {
      const config = getPlaybookConfig('ROUTINE');
      expect(config.requiredVoices).toContain('ISKRA');
    });

    it('should have ANHANTRA in CRISIS', () => {
      const config = getPlaybookConfig('CRISIS');
      expect(config.requiredVoices).toContain('ANHANTRA');
    });
  });

  describe('requiresCouncil', () => {
    it('should return true for COUNCIL playbook', () => {
      expect(requiresCouncil('COUNCIL')).toBe(true);
    });

    it('should return false for ROUTINE playbook', () => {
      expect(requiresCouncil('ROUTINE')).toBe(false);
    });

    it('should return true for SHADOW (has council size 2)', () => {
      expect(requiresCouncil('SHADOW')).toBe(true);
    });
  });

  describe('forcePlaybook', () => {
    it('should override classification', () => {
      const result = forcePlaybook('CRISIS', 'Manual escalation by user');
      expect(result.playbook).toBe('CRISIS');
      expect(result.confidence).toBe(1.0);
      expect(result.signals[0].type).toBe('manual_override');
    });
  });

  describe('quickRiskCheck', () => {
    it('should detect crisis patterns', () => {
      const result = quickRiskCheck('Я хочу умереть');
      expect(result.isCrisis).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it('should detect attention-needed patterns', () => {
      const result = quickRiskCheck('Как мне сделать выбор?');
      expect(result.isCrisis).toBe(false);
      expect(result.needsAttention).toBe(true);
    });

    it('should return false for simple messages', () => {
      const result = quickRiskCheck('Привет!');
      expect(result.isCrisis).toBe(false);
      expect(result.needsAttention).toBe(false);
    });
  });

  describe('playbook properties', () => {
    it('CRISIS should have deep SIFT', () => {
      const config = getPlaybookConfig('CRISIS');
      expect(config.siftDepth).toBe('deep');
    });

    it('ROUTINE should not require delta', () => {
      const config = getPlaybookConfig('ROUTINE');
      expect(config.deltaRequired).toBe(false);
    });

    it('SIFT should require delta', () => {
      const config = getPlaybookConfig('SIFT');
      expect(config.deltaRequired).toBe(true);
    });

    it('COUNCIL should have largest council size', () => {
      const config = getPlaybookConfig('COUNCIL');
      expect(config.councilSize).toBe(5);
    });
  });
});
