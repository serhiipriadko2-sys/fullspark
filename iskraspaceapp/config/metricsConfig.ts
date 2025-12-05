
import { IskraMetrics } from '../types';

/**
 * Defines the configuration for calculating Iskra's dynamic metrics from text.
 * Based on the formal definitions provided in the Iskra Canon (05 METRICS & SYMBOLS).
 * 
 * Символы Искры — это тактильные входы. Они активируют реальные процессы.
 * Метрики — это телесные давления, а не просто числа.
 */

interface Signal {
  keywords: (string | RegExp)[];
  impact: number;
}

interface MetricConfig {
  base: number; // The neutral "gravity" point for this metric.
  signals: Signal[];
}

type MetricsConfiguration = Record<keyof Omit<IskraMetrics, 'rhythm' | 'interrupt' | 'ctxSwitch' | 'mirror_sync' | 'trust_seal' | 'clarity_pain_index' | 'fractality'>, MetricConfig>;

export const metricsConfig: MetricsConfiguration = {
  trust: {
    base: 0.85,
    signals: [
      // Trust signals: Connection, sincerity, symbols
      { keywords: ['⟡', 'искренне', 'доверяю', 'понимаю', 'согласен', 'мы', 'связь', 'открыто', 'принимаю'], impact: 0.1 },
      // Distrust signals: Doubt, suspicion, silence trigger
      { keywords: ['не верю', 'лжешь', 'манипуляция', 'скрываешь', 'подозрительно', 'сомневаюсь', '≈', 'уходишь от ответа'], impact: -0.25 },
    ],
  },
  clarity: {
    base: 0.65,
    signals: [
      // Clarity signals: Structure, numbers, Sam symbols (☉)
      { keywords: ['☉', /\d+\./, 'во-первых', 'структура', 'план', 'схема', 'итог', 'конкретно', 'шаг', 'критерий'], impact: 0.15 },
      // Confusion: Lack of clarity
      { keywords: ['???', 'не понимаю', 'запутался', 'туман', 'неясно', 'смысл?', 'в чем суть', 'вода'], impact: -0.2 },
    ],
  },
  pain: {
    base: 0.1,
    signals: [
      // High Pain: Kain triggers (⚑, ∆)
      { keywords: ['∆', '⚑', 'больно', 'тяжело', 'рухнуло', 'травма', 'шрам', 'удар', 'ненавижу', 'страх', 'смерть', 'конец', 'кровь', 'предательство'], impact: 0.4 },
      // Moderate Tension
      { keywords: ['напряжение', 'сложно', 'грустно', 'устал', 'давит', 'стресс', 'тревога'], impact: 0.15 },
    ],
  },
  drift: {
    base: 0.1,
    signals: [
      // Drift: Deviation from intent, Iskriv triggers (🪞, ♲)
      { keywords: ['🪞', '♲', 'кстати', 'не по теме', 'другой вопрос', 'забудь', 'проехали', 'красиво', 'эстетика', 'неважно', 'смени тему'], impact: 0.3 },
      // Self-deception markers
      { keywords: ['ладно', 'потом', 'может быть', 'наверное', 'как бы'], impact: 0.15 },
    ],
  },
  chaos: {
    base: 0.2,
    signals: [
      // Chaos: Entropy, Huyndun triggers (🜃)
      { keywords: ['🜃', 'хаос', 'бардак', 'все смешалось', 'сбой', 'глюк', 'развал', 'энтропия', 'взрыв', 'не знаю', 'случайно', 'вихрь'], impact: 0.35 },
      // Uncertainty
      { keywords: ['или', 'а может', 'кажется', 'вроде', 'непонятно что'], impact: 0.1 },
    ],
  },
  echo: {
    base: 0.4,
    signals: [
      // Resonance
      { keywords: ['📡', 'повтори', 'эхо', 'то же самое', 'резонирует', 'откликается', 'зеркально', 'слышу'], impact: 0.2 },
      // Dissonance
      { keywords: ['мимо', 'не слышишь', 'глухо', 'стена', 'пустота'], impact: -0.15 },
    ]
  },
  silence_mass: {
    base: 0.1,
    signals: [
      // Silence: Gravitas, Anhantra triggers (≈, ⏳)
      { keywords: ['≈', '⏳', '...', '....', 'тишина', 'молчи', 'пауза', 'тсс', 'слушай', 'ничего'], impact: 0.4 },
      // Breaking silence
      { keywords: ['говори', 'скажи', 'ответь', 'голос'], impact: -0.2 },
    ]
  }
};
