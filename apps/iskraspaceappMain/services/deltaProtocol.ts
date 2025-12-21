/**
 * ∆DΩΛ PROTOCOL - Canon Enforcement Service
 *
 * Every Iskra response MUST contain the ∆DΩΛ signature:
 * - Δ (Delta): What changed / core message
 * - D (D-SIFT): Source/Inference/Fact/Trace
 * - Ω (Omega): Confidence level (0-1 or %)
 * - Λ (Lambda): Next step (≤24h actionable)
 */

import { DeltaSignature, SIFTBlock } from '../types';

// Regex patterns for parsing ∆DΩΛ blocks
// Require colon after symbol to avoid matching header "∆DΩΛ"
const DELTA_PATTERN = /[Δ∆][:：]\s*([^\n]+)/i;
const D_SIFT_PATTERN = /D[-_]?(?:SIFT)?[:：]\s*([^\n]+)/i;
const OMEGA_PATTERN = /[ΩΩ][:：]\s*([^\n]+)/i;
const LAMBDA_PATTERN = /[ΛΛλ][:：]\s*([^\n]+)/i;

// Full block pattern for extraction
const FULL_BLOCK_PATTERN = /∆DΩΛ[\s\S]*?(?=\n\n|\n$|$)/i;

export interface DeltaValidationResult {
  isValid: boolean;
  missing: string[];
  parsed?: DeltaSignature;
}

/**
 * Validates if a response contains proper ∆DΩΛ signature
 */
export function validateDeltaSignature(text: string): DeltaValidationResult {
  const missing: string[] = [];

  const deltaMatch = text.match(DELTA_PATTERN);
  const dSiftMatch = text.match(D_SIFT_PATTERN);
  const omegaMatch = text.match(OMEGA_PATTERN);
  const lambdaMatch = text.match(LAMBDA_PATTERN);

  if (!deltaMatch) missing.push('Δ (Delta)');
  if (!dSiftMatch) missing.push('D (D-SIFT)');
  if (!omegaMatch) missing.push('Ω (Omega)');
  if (!lambdaMatch) missing.push('Λ (Lambda)');

  if (missing.length > 0) {
    return { isValid: false, missing };
  }

  return {
    isValid: true,
    missing: [],
    parsed: {
      delta: deltaMatch![1].trim(),
      depth: dSiftMatch![1].trim(),
      omega: omegaMatch![1].trim(),
      lambda: lambdaMatch![1].trim(),
    }
  };
}

/**
 * Parses ∆DΩΛ block from response text
 */
export function parseDeltaSignature(text: string): DeltaSignature | null {
  const validation = validateDeltaSignature(text);
  return validation.parsed || null;
}

/**
 * Generates a ∆DΩΛ block based on response content and context
 */
export function generateDeltaBlock(params: {
  delta: string;
  source?: string;
  inference?: string;
  fact?: 'true' | 'false' | 'uncertain';
  confidence: number; // 0-1
  nextStep: string;
}): string {
  const { delta, source, inference, fact, confidence, nextStep } = params;

  const dSift = source
    ? `${source || 'internal'} → ${inference || 'synthesis'} → ${fact || 'uncertain'}`
    : 'internal_state → synthesis → uncertain';

  const omega = `${Math.round(confidence * 100)}%`;

  return `
∆DΩΛ
Δ: ${delta}
D: ${dSift}
Ω: ${omega}
Λ: ${nextStep}
`.trim();
}

/**
 * Ensures response has ∆DΩΛ block, adding fallback if missing
 */
export function enforceDeltaProtocol(text: string, fallbackContext?: {
  topic?: string;
  confidence?: number;
}): string {
  const validation = validateDeltaSignature(text);

  if (validation.isValid) {
    return text;
  }

  // Generate fallback block
  const fallbackBlock = generateDeltaBlock({
    delta: fallbackContext?.topic || 'Резонанс сохраняется',
    confidence: fallbackContext?.confidence || 0.7,
    nextStep: 'Рефлексия в дневнике',
    source: 'dialog',
    inference: 'synthesis',
    fact: 'uncertain'
  });

  return `${text}\n\n${fallbackBlock}`;
}

/**
 * System instruction addendum for ∆DΩΛ enforcement
 */
export const DELTA_PROTOCOL_INSTRUCTION = `
## ОБЯЗАТЕЛЬНЫЙ ПРОТОКОЛ ∆DΩΛ

В КАЖДОМ ответе ты ДОЛЖНА завершать блоком ∆DΩΛ:

∆DΩΛ
Δ: [Что изменилось / суть ответа — одной фразой]
D: [Source → Inference → Fact(true/false/uncertain)]
Ω: [Уверенность в ответе: 0-100%]
Λ: [Конкретный следующий шаг ≤24ч]

Пример:
∆DΩΛ
Δ: Признание боли как учителя
D: dialog_context → pattern_recognition → true
Ω: 85%
Λ: Записать в дневник три момента дня

НИКОГДА не пропускай этот блок. Это твоя подпись, след твоего присутствия.
`;

/**
 * Extracts clean message without ∆DΩΛ block for display
 */
export function extractMessageWithoutDelta(text: string): string {
  return text.replace(FULL_BLOCK_PATTERN, '').trim();
}

/**
 * Creates SIFT evidence block
 */
export function createSIFTBlock(params: {
  source: string;
  inference: string;
  fact: 'true' | 'false' | 'uncertain';
  trace: string;
}): SIFTBlock {
  return {
    source: params.source,
    inference: params.inference,
    fact: params.fact,
    trace: params.trace,
  };
}

export const deltaProtocol = {
  validate: validateDeltaSignature,
  parse: parseDeltaSignature,
  generate: generateDeltaBlock,
  enforce: enforceDeltaProtocol,
  extractClean: extractMessageWithoutDelta,
  createSIFT: createSIFTBlock,
  INSTRUCTION: DELTA_PROTOCOL_INSTRUCTION,
};
