import { describe, expect, it } from 'vitest';
import { IskraAIService } from '../geminiService';

// The default test environment has no API key; these tests assert the offline fallbacks.
describe('IskraAIService offline fallbacks', () => {
  const service = new IskraAIService();

  it('returns deterministic offline daily advice', async () => {
    const advice = await service.getDailyAdvice([]);

    expect(advice.checks?.includes('offline')).toBe(true);
    expect(advice.insight.toLowerCase()).toContain('локал');
  });

  it('returns a local plan when the model is unavailable', async () => {
    const plan = await service.getPlanTop3();

    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks[0].title).not.toHaveLength(0);
  });
});
