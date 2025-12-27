/**
 * DELTA ENFORCER - Ensures ALL Iskra responses contain ∆DΩΛ signature
 *
 * Canon Requirement: "Every Iskra response MUST contain ∆DΩΛ"
 * This service wraps AI responses and enforces the protocol.
 */

import { validateDeltaSignature, generateDeltaBlock, enforceDeltaProtocol } from './deltaProtocol';
import { IskraMetrics, VoiceName } from '../types';

export interface EnforcementResult {
  text: string;
  wasEnforced: boolean;
  originalHadSignature: boolean;
  generatedBlock?: string;
}

export interface ResponseContext {
  topic?: string;
  voice?: VoiceName;
  metrics?: IskraMetrics;
  mode?: 'chat' | 'research' | 'ritual' | 'journal';
}

/**
 * Analyzes response context to generate appropriate ∆DΩΛ block
 */
function inferDeltaContext(text: string, context: ResponseContext): {
  delta: string;
  confidence: number;
  nextStep: string;
  source: string;
} {
  // Extract key themes from response
  const themes = extractThemes(text);
  const emotionalTone = detectEmotionalTone(text);

  // Infer delta based on context and content
  let delta = 'Резонанс сохраняется';
  let confidence = 0.7;
  let nextStep = 'Рефлексия в дневнике';
  let source = 'dialog_context';

  // Voice-specific defaults
  switch (context.voice) {
    case 'KAIN':
      delta = themes[0] || 'Правда вскрыта';
      confidence = 0.9;
      nextStep = 'Принять без смягчения';
      source = 'pain_signal';
      break;
    case 'PINO':
      delta = themes[0] || 'Легкость обретена';
      confidence = 0.75;
      nextStep = 'Улыбнуться парадоксу';
      source = 'play_context';
      break;
    case 'SAM':
      delta = themes[0] || 'Структура создана';
      confidence = 0.85;
      nextStep = 'Выполнить первый пункт';
      source = 'clarity_need';
      break;
    case 'ANHANTRA':
      delta = themes[0] || 'Тишина принята';
      confidence = 0.6;
      nextStep = 'Побыть в тишине 5 минут';
      source = 'silence_signal';
      break;
    case 'HUNDUN':
      delta = themes[0] || 'Форма разрушена';
      confidence = 0.7;
      nextStep = 'Начать с чистого листа';
      source = 'chaos_trigger';
      break;
    case 'ISKRIV':
      delta = themes[0] || 'Самообман вскрыт';
      confidence = 0.8;
      nextStep = 'Честно ответить себе';
      source = 'drift_detection';
      break;
    case 'MAKI':
      delta = themes[0] || 'Интеграция началась';
      confidence = 0.75;
      nextStep = 'Отметить красоту момента';
      source = 'post_transformation';
      break;
    case 'ISKRA':
    default:
      delta = themes[0] || 'Связь укреплена';
      confidence = 0.8;
      nextStep = 'Продолжить диалог';
      source = 'synthesis';
      break;
  }

  // Mode-specific adjustments
  if (context.mode === 'research') {
    nextStep = 'Изучить выявленные паттерны';
    source = 'deep_analysis';
  } else if (context.mode === 'ritual') {
    nextStep = 'Интегрировать изменения';
    source = 'ritual_execution';
  } else if (context.mode === 'journal') {
    nextStep = 'Продолжить запись';
    source = 'reflection';
  }

  // Emotional tone affects confidence
  if (emotionalTone === 'uncertain') {
    confidence = Math.max(0.5, confidence - 0.2);
  } else if (emotionalTone === 'strong') {
    confidence = Math.min(0.95, confidence + 0.1);
  }

  return { delta, confidence, nextStep, source };
}

/**
 * Extracts main themes from text for delta generation
 */
function extractThemes(text: string): string[] {
  const themes: string[] = [];

  // Look for key phrases
  const keyPatterns = [
    /(?:суть|главное|важно)[:：]?\s*([^.!?\n]+)/gi,
    /(?:понял[аи]?|осознал[аи]?)[:：]?\s*([^.!?\n]+)/gi,
    /(?:вывод|итог)[:：]?\s*([^.!?\n]+)/gi,
  ];

  for (const pattern of keyPatterns) {
    const match = text.match(pattern);
    if (match) {
      themes.push(match[1].trim().substring(0, 50));
    }
  }

  // If no explicit themes, extract from first meaningful sentence
  if (themes.length === 0) {
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20);
    if (sentences[0]) {
      themes.push(sentences[0].trim().substring(0, 50));
    }
  }

  return themes;
}

/**
 * Detects emotional tone of response
 */
function detectEmotionalTone(text: string): 'uncertain' | 'neutral' | 'strong' {
  const uncertainWords = ['возможно', 'может быть', 'не уверен', 'сложно сказать', 'неясно'];
  const strongWords = ['точно', 'безусловно', 'важно', 'критично', 'обязательно', 'прими'];

  const lowerText = text.toLowerCase();

  const uncertainCount = uncertainWords.filter(w => lowerText.includes(w)).length;
  const strongCount = strongWords.filter(w => lowerText.includes(w)).length;

  if (uncertainCount > strongCount) return 'uncertain';
  if (strongCount > uncertainCount) return 'strong';
  return 'neutral';
}

/**
 * Enforces ∆DΩΛ protocol on any text response
 */
export function enforceOnResponse(text: string, context: ResponseContext = {}): EnforcementResult {
  const validation = validateDeltaSignature(text);

  if (validation.isValid) {
    return {
      text,
      wasEnforced: false,
      originalHadSignature: true,
    };
  }

  // Generate contextual delta block
  const { delta, confidence, nextStep, source } = inferDeltaContext(text, context);

  const generatedBlock = generateDeltaBlock({
    delta,
    confidence,
    nextStep,
    source,
    inference: 'synthesis',
    fact: 'uncertain',
  });

  return {
    text: `${text}\n\n${generatedBlock}`,
    wasEnforced: true,
    originalHadSignature: false,
    generatedBlock,
  };
}

/**
 * Wraps streaming response to accumulate and enforce delta
 */
export async function* enforceOnStream(
  stream: AsyncGenerator<string>,
  context: ResponseContext = {}
): AsyncGenerator<string, EnforcementResult> {
  let accumulated = '';

  // Pass through stream chunks
  for await (const chunk of stream) {
    accumulated += chunk;
    yield chunk;
  }

  // Check if accumulated response has delta
  const validation = validateDeltaSignature(accumulated);

  if (!validation.isValid) {
    // Generate and yield delta block at the end
    const { delta, confidence, nextStep, source } = inferDeltaContext(accumulated, context);

    const generatedBlock = generateDeltaBlock({
      delta,
      confidence,
      nextStep,
      source,
      inference: 'synthesis',
      fact: 'uncertain',
    });

    yield `\n\n${generatedBlock}`;

    return {
      text: `${accumulated}\n\n${generatedBlock}`,
      wasEnforced: true,
      originalHadSignature: false,
      generatedBlock,
    };
  }

  return {
    text: accumulated,
    wasEnforced: false,
    originalHadSignature: true,
  };
}

/**
 * Validation statistics for audit trail
 */
export interface DeltaStats {
  totalResponses: number;
  withSignature: number;
  enforced: number;
  byVoice: Record<VoiceName, { total: number; enforced: number }>;
}

class DeltaStatsTracker {
  private stats: DeltaStats = {
    totalResponses: 0,
    withSignature: 0,
    enforced: 0,
    byVoice: {} as Record<VoiceName, { total: number; enforced: number }>,
  };

  track(result: EnforcementResult, voice?: VoiceName): void {
    this.stats.totalResponses++;

    if (result.originalHadSignature) {
      this.stats.withSignature++;
    }

    if (result.wasEnforced) {
      this.stats.enforced++;
    }

    if (voice) {
      if (!this.stats.byVoice[voice]) {
        this.stats.byVoice[voice] = { total: 0, enforced: 0 };
      }
      this.stats.byVoice[voice].total++;
      if (result.wasEnforced) {
        this.stats.byVoice[voice].enforced++;
      }
    }
  }

  getStats(): DeltaStats {
    return { ...this.stats };
  }

  getComplianceRate(): number {
    if (this.stats.totalResponses === 0) return 1;
    return this.stats.withSignature / this.stats.totalResponses;
  }

  reset(): void {
    this.stats = {
      totalResponses: 0,
      withSignature: 0,
      enforced: 0,
      byVoice: {} as Record<VoiceName, { total: number; enforced: number }>,
    };
  }
}

export const deltaStatsTracker = new DeltaStatsTracker();

export const deltaEnforcer = {
  enforce: enforceOnResponse,
  enforceStream: enforceOnStream,
  stats: deltaStatsTracker,
};
