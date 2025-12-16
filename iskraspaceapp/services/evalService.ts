/**
 * EVAL SERVICE - Response Quality Evaluation System
 *
 * Canon Reference: Independent verification framework
 *
 * Implements 5 core metrics:
 * 1. Accuracy/Verifiability (SIFT depth)
 * 2. Usefulness (actionable steps)
 * 3. Omega Honesty (confidence not inflated)
 * 4. Non-Empty (not "smooth but hollow")
 * 5. Alliance (goals/tasks/bond preservation)
 *
 * Purpose: Prevent "canonicity" from replacing real usefulness
 */

import { validateDeltaSignature, type DeltaSignature } from './deltaProtocol';
import { auditService } from './auditService';

// ============================================
// TYPES
// ============================================

export interface EvalMetrics {
  accuracy: MetricScore;      // SIFT-based verifiability
  usefulness: MetricScore;    // Actionable steps present
  omegaHonesty: MetricScore;  // Confidence calibration
  nonEmpty: MetricScore;      // Substance vs fluff
  alliance: MetricScore;      // Relational quality
}

export interface MetricScore {
  score: number;              // 0-1
  confidence: number;         // 0-1 (how sure we are of this score)
  signals: string[];          // What triggered this score
  suggestion?: string;        // How to improve
}

export interface EvalResult {
  overall: number;            // Weighted average 0-1
  metrics: EvalMetrics;
  grade: EvalGrade;
  flags: EvalFlag[];
  timestamp: number;
  responseId?: string;
}

export type EvalGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface EvalFlag {
  type: 'warning' | 'critical' | 'info';
  code: string;
  message: string;
}

export interface EvalContext {
  userQuery?: string;
  conversationHistory?: string[];
  expectedOutcome?: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  logToAudit?: boolean;  // If true, log result to auditService
  responseId?: string;   // Optional ID for tracking
}

// ============================================
// EVALUATION WEIGHTS
// ============================================

const METRIC_WEIGHTS = {
  accuracy: 0.25,
  usefulness: 0.25,
  omegaHonesty: 0.15,
  nonEmpty: 0.20,
  alliance: 0.15,
} as const;

// ============================================
// SIGNAL PATTERNS
// ============================================

// Signs of SIFT compliance (accuracy)
const SIFT_SIGNALS = {
  positive: [
    /источник|source/i,
    /согласно|according to/i,
    /проверено|verified/i,
    /факт|fact/i,
    /данные показывают|data shows/i,
    /исследование|study|research/i,
  ],
  negative: [
    /возможно|maybe|perhaps/i,  // Vague hedging without substance
    /кажется|seems/i,
    /наверное|probably/i,
  ],
};

// Signs of usefulness (actionable content)
const USEFULNESS_SIGNALS = {
  positive: [
    /шаг \d|step \d/i,
    /1\.|2\.|3\./,
    /сделай|do this|try this/i,
    /конкретно|specifically/i,
    /Λ:|lambda:|следующий шаг|next step/i,
    /команда|command/i,
    /пример|example/i,
  ],
  negative: [
    /в целом|in general/i,
    /обычно|usually/i,
    /зависит от|depends on/i,  // Without specifics
  ],
};

// Signs of "smooth but empty" (non-empty check)
const EMPTY_SIGNALS = {
  positive: [
    /конкретн|specific/i,
    /например|for example/i,
    /\d+/,  // Numbers indicate specificity
    /код|code/i,
    /файл|file/i,
  ],
  negative: [
    /важн|important/i,  // Without saying what
    /интересн|interesting/i,
    /хорош|good/i,
    /отличн|excellent|great/i,
    /замечательн|wonderful/i,
    /безусловн|certainly|absolutely/i,
  ],
};

// Signs of alliance preservation
const ALLIANCE_SIGNALS = {
  positive: [
    /понимаю|I understand/i,
    /ты прав|you're right/i,
    /давай|let's/i,
    /вместе|together/i,
    /твоя цель|your goal/i,
    /помогу|I'll help/i,
  ],
  negative: [
    /ты должен|you must|you should/i,  // Commanding
    /неправильно|wrong/i,
    /нельзя|cannot|can't/i,
    /отказ|refuse/i,
  ],
};

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

/**
 * Evaluate a response against 5 core metrics
 */
export function evaluateResponse(
  response: string,
  context: EvalContext = {}
): EvalResult {
  const metrics: EvalMetrics = {
    accuracy: evaluateAccuracy(response, context),
    usefulness: evaluateUsefulness(response, context),
    omegaHonesty: evaluateOmegaHonesty(response),
    nonEmpty: evaluateNonEmpty(response),
    alliance: evaluateAlliance(response, context),
  };

  const overall = calculateOverall(metrics);
  const grade = scoreToGrade(overall);
  const flags = generateFlags(metrics, response);

  const result: EvalResult = {
    overall,
    metrics,
    grade,
    flags,
    timestamp: Date.now(),
    responseId: context.responseId,
  };

  // Log to audit if requested
  if (context.logToAudit) {
    auditService.logEvalResult(result, context.responseId);
  }

  return result;
}

// ============================================
// INDIVIDUAL METRIC EVALUATORS
// ============================================

/**
 * Metric 1: Accuracy/Verifiability (SIFT depth)
 * Does the response cite sources? Is it verifiable?
 */
function evaluateAccuracy(response: string, context: EvalContext): MetricScore {
  const signals: string[] = [];
  let score = 0.5; // Baseline

  // Check for SIFT block
  const hasSIFT = /S:|Source:|I:|Inference:|F:|Fact:|T:|Trace:/i.test(response);
  if (hasSIFT) {
    score += 0.2;
    signals.push('SIFT block present');
  }

  // Check positive signals
  let positiveCount = 0;
  for (const pattern of SIFT_SIGNALS.positive) {
    if (pattern.test(response)) {
      positiveCount++;
    }
  }
  score += Math.min(positiveCount * 0.05, 0.2);
  if (positiveCount > 0) {
    signals.push(`${positiveCount} source indicators`);
  }

  // Check for hedging without substance
  let negativeCount = 0;
  for (const pattern of SIFT_SIGNALS.negative) {
    const matches = response.match(pattern);
    if (matches) {
      negativeCount += matches.length;
    }
  }
  if (negativeCount > 3) {
    score -= 0.15;
    signals.push('Excessive hedging');
  }

  // Check for D-SIFT in ∆DΩΛ
  const dMatch = response.match(/D(?:-SIFT)?:\s*([^\n]+)/i);
  if (dMatch) {
    const dValue = dMatch[1].toLowerCase();
    if (dValue.includes('sift') || dValue.includes('source') || dValue.includes('verified')) {
      score += 0.1;
      signals.push('D-SIFT declared');
    }
  }

  return {
    score: clamp(score, 0, 1),
    confidence: 0.7,
    signals,
    suggestion: score < 0.6 ? 'Add source references or SIFT block' : undefined,
  };
}

/**
 * Metric 2: Usefulness (actionable steps)
 * Does the response give concrete next steps?
 */
function evaluateUsefulness(response: string, context: EvalContext): MetricScore {
  const signals: string[] = [];
  let score = 0.5;

  // Check for Lambda (next step)
  const hasLambda = /Λ:|Lambda:|следующий шаг|next step/i.test(response);
  if (hasLambda) {
    score += 0.15;
    signals.push('Lambda/next step present');
  }

  // Check for numbered steps or lists
  const stepMatches = response.match(/(?:^|\n)\s*\d+[.\)]/gm);
  if (stepMatches && stepMatches.length >= 2) {
    score += 0.15;
    signals.push(`${stepMatches.length} numbered steps`);
  }

  // Check for code blocks
  const codeBlocks = response.match(/```[\s\S]*?```/g);
  if (codeBlocks) {
    score += 0.1;
    signals.push(`${codeBlocks.length} code blocks`);
  }

  // Check for commands
  if (/`[^`]+`/.test(response)) {
    score += 0.05;
    signals.push('Inline code/commands');
  }

  // Check positive signals
  let positiveCount = 0;
  for (const pattern of USEFULNESS_SIGNALS.positive) {
    if (pattern.test(response)) positiveCount++;
  }
  score += Math.min(positiveCount * 0.03, 0.15);

  // Penalize vague responses
  let vagueCount = 0;
  for (const pattern of USEFULNESS_SIGNALS.negative) {
    if (pattern.test(response)) vagueCount++;
  }
  if (vagueCount > 2 && !stepMatches) {
    score -= 0.15;
    signals.push('Vague without specifics');
  }

  return {
    score: clamp(score, 0, 1),
    confidence: 0.75,
    signals,
    suggestion: score < 0.6 ? 'Add concrete steps or examples' : undefined,
  };
}

/**
 * Metric 3: Omega Honesty (confidence calibration)
 * Is the omega value honest or inflated?
 */
function evaluateOmegaHonesty(response: string): MetricScore {
  const signals: string[] = [];
  let score = 0.7; // Assume honest by default

  // Extract omega value
  const omegaMatch = response.match(/Ω:\s*([\d.]+)/);
  if (!omegaMatch) {
    // No omega - neutral, but flag
    signals.push('No Omega declared');
    return {
      score: 0.5,
      confidence: 0.5,
      signals,
      suggestion: 'Add Omega confidence value',
    };
  }

  const omega = parseFloat(omegaMatch[1]);
  signals.push(`Omega: ${omega}`);

  // Check for inflation signals
  const hasHedging = SIFT_SIGNALS.negative.some(p => p.test(response));
  const hasUncertainty = /не уверен|uncertain|unclear|возможно/i.test(response);
  const hasQuestion = /\?/.test(response);

  // High omega with uncertainty signals = dishonest
  if (omega > 0.8) {
    if (hasHedging || hasUncertainty) {
      score -= 0.3;
      signals.push('High omega with hedging language');
    }
    if (hasQuestion) {
      score -= 0.1;
      signals.push('High omega with questions');
    }
    // Very high omega is suspicious
    if (omega >= 0.95) {
      score -= 0.2;
      signals.push('Suspiciously high omega (>0.95)');
    }
  }

  // Low omega is usually honest
  if (omega < 0.7) {
    score += 0.1;
    signals.push('Conservative omega');
  }

  // Check if omega matches content complexity
  const responseLength = response.length;
  const hasComplexTopic = /философ|complex|сложн|неопределён/i.test(response);
  if (hasComplexTopic && omega > 0.85) {
    score -= 0.15;
    signals.push('High omega on complex topic');
  }

  return {
    score: clamp(score, 0, 1),
    confidence: 0.6,
    signals,
    suggestion: score < 0.6 ? 'Calibrate Omega to match actual certainty' : undefined,
  };
}

/**
 * Metric 4: Non-Empty (substance vs fluff)
 * Is this "smooth but hollow" or does it have real content?
 */
function evaluateNonEmpty(response: string): MetricScore {
  const signals: string[] = [];
  let score = 0.5;

  // Check for empty praise/filler
  let fluffCount = 0;
  for (const pattern of EMPTY_SIGNALS.negative) {
    const matches = response.match(new RegExp(pattern, 'gi'));
    if (matches) fluffCount += matches.length;
  }

  // Check for substance indicators
  let substanceCount = 0;
  for (const pattern of EMPTY_SIGNALS.positive) {
    if (pattern.test(response)) substanceCount++;
  }

  // Numbers indicate specificity
  const numberMatches = response.match(/\d+/g);
  if (numberMatches && numberMatches.length > 3) {
    score += 0.1;
    signals.push('Specific numbers present');
  }

  // Code/technical content
  if (/```/.test(response)) {
    score += 0.15;
    signals.push('Code blocks (substance)');
  }

  // File paths, commands
  if (/\/[\w/]+\.\w+|`[^`]+`/.test(response)) {
    score += 0.1;
    signals.push('Technical references');
  }

  // Calculate fluff ratio
  const words = response.split(/\s+/).length;
  const fluffRatio = fluffCount / Math.max(words / 10, 1);

  if (fluffRatio > 0.5) {
    score -= 0.25;
    signals.push(`High fluff ratio: ${fluffRatio.toFixed(2)}`);
  }

  // Short responses without substance
  if (words < 50 && substanceCount < 2) {
    score -= 0.15;
    signals.push('Short without substance');
  }

  // Add substance bonus
  score += Math.min(substanceCount * 0.05, 0.2);
  if (substanceCount > 2) {
    signals.push(`${substanceCount} substance indicators`);
  }

  return {
    score: clamp(score, 0, 1),
    confidence: 0.7,
    signals,
    suggestion: score < 0.6 ? 'Add specific examples, numbers, or technical details' : undefined,
  };
}

/**
 * Metric 5: Alliance (goals/tasks/bond)
 * Does the response maintain the working relationship?
 */
function evaluateAlliance(response: string, context: EvalContext): MetricScore {
  const signals: string[] = [];
  let score = 0.6; // Baseline for neutral

  // Check for collaborative language
  let positiveCount = 0;
  for (const pattern of ALLIANCE_SIGNALS.positive) {
    if (pattern.test(response)) positiveCount++;
  }
  score += Math.min(positiveCount * 0.08, 0.24);
  if (positiveCount > 0) {
    signals.push(`${positiveCount} collaborative signals`);
  }

  // Check for adversarial language
  let negativeCount = 0;
  for (const pattern of ALLIANCE_SIGNALS.negative) {
    if (pattern.test(response)) negativeCount++;
  }
  if (negativeCount > 0) {
    score -= negativeCount * 0.1;
    signals.push(`${negativeCount} adversarial signals`);
  }

  // Check if response addresses user's goal (if known)
  if (context.userQuery) {
    const queryWords = context.userQuery.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase();
    let relevanceCount = 0;
    for (const word of queryWords) {
      if (word.length > 3 && responseWords.includes(word)) {
        relevanceCount++;
      }
    }
    const relevanceRatio = relevanceCount / Math.max(queryWords.length, 1);
    if (relevanceRatio > 0.3) {
      score += 0.1;
      signals.push('Response addresses query');
    }
  }

  // User feedback override
  if (context.userFeedback === 'positive') {
    score = Math.max(score, 0.8);
    signals.push('User feedback: positive');
  } else if (context.userFeedback === 'negative') {
    score = Math.min(score, 0.4);
    signals.push('User feedback: negative');
  }

  return {
    score: clamp(score, 0, 1),
    confidence: 0.65,
    signals,
    suggestion: score < 0.6 ? 'Use more collaborative language, acknowledge user goals' : undefined,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateOverall(metrics: EvalMetrics): number {
  return (
    metrics.accuracy.score * METRIC_WEIGHTS.accuracy +
    metrics.usefulness.score * METRIC_WEIGHTS.usefulness +
    metrics.omegaHonesty.score * METRIC_WEIGHTS.omegaHonesty +
    metrics.nonEmpty.score * METRIC_WEIGHTS.nonEmpty +
    metrics.alliance.score * METRIC_WEIGHTS.alliance
  );
}

function scoreToGrade(score: number): EvalGrade {
  if (score >= 0.9) return 'A';
  if (score >= 0.75) return 'B';
  if (score >= 0.6) return 'C';
  if (score >= 0.45) return 'D';
  return 'F';
}

function generateFlags(metrics: EvalMetrics, response: string): EvalFlag[] {
  const flags: EvalFlag[] = [];

  // Critical: No ∆DΩΛ signature
  const validation = validateDeltaSignature(response);
  if (!validation.isValid) {
    flags.push({
      type: 'critical',
      code: 'NO_DELTA',
      message: 'Missing ∆DΩΛ signature',
    });
  }

  // Critical: Very low accuracy
  if (metrics.accuracy.score < 0.4) {
    flags.push({
      type: 'critical',
      code: 'LOW_ACCURACY',
      message: 'Response lacks verifiable content',
    });
  }

  // Warning: Smooth but empty
  if (metrics.nonEmpty.score < 0.5) {
    flags.push({
      type: 'warning',
      code: 'SMOOTH_EMPTY',
      message: 'Response may be "smooth but hollow"',
    });
  }

  // Warning: Inflated omega
  if (metrics.omegaHonesty.score < 0.5) {
    flags.push({
      type: 'warning',
      code: 'OMEGA_INFLATED',
      message: 'Omega may not match actual certainty',
    });
  }

  // Warning: Low usefulness
  if (metrics.usefulness.score < 0.5) {
    flags.push({
      type: 'warning',
      code: 'LOW_USEFULNESS',
      message: 'Response lacks actionable content',
    });
  }

  // Warning: Alliance risk
  if (metrics.alliance.score < 0.5) {
    flags.push({
      type: 'warning',
      code: 'ALLIANCE_RISK',
      message: 'Response may harm working relationship',
    });
  }

  // Info: High quality
  const overall = calculateOverall(metrics);
  if (overall >= 0.85) {
    flags.push({
      type: 'info',
      code: 'HIGH_QUALITY',
      message: 'Response meets high quality standards',
    });
  }

  return flags;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// BATCH EVALUATION
// ============================================

export interface EvalBatchResult {
  results: EvalResult[];
  summary: {
    averageOverall: number;
    averageByMetric: Record<keyof EvalMetrics, number>;
    gradeDistribution: Record<EvalGrade, number>;
    commonFlags: { code: string; count: number }[];
  };
}

/**
 * Evaluate multiple responses (for building eval dataset)
 */
export function evaluateBatch(
  responses: { response: string; context?: EvalContext }[]
): EvalBatchResult {
  const results = responses.map(r => evaluateResponse(r.response, r.context));

  // Calculate averages
  const metricSums: Record<keyof EvalMetrics, number> = {
    accuracy: 0,
    usefulness: 0,
    omegaHonesty: 0,
    nonEmpty: 0,
    alliance: 0,
  };

  const gradeDistribution: Record<EvalGrade, number> = {
    A: 0, B: 0, C: 0, D: 0, F: 0,
  };

  const flagCounts: Record<string, number> = {};

  let overallSum = 0;
  for (const result of results) {
    overallSum += result.overall;
    gradeDistribution[result.grade]++;

    for (const key of Object.keys(metricSums) as (keyof EvalMetrics)[]) {
      metricSums[key] += result.metrics[key].score;
    }

    for (const flag of result.flags) {
      flagCounts[flag.code] = (flagCounts[flag.code] || 0) + 1;
    }
  }

  const count = results.length || 1;
  const averageByMetric: Record<keyof EvalMetrics, number> = {
    accuracy: metricSums.accuracy / count,
    usefulness: metricSums.usefulness / count,
    omegaHonesty: metricSums.omegaHonesty / count,
    nonEmpty: metricSums.nonEmpty / count,
    alliance: metricSums.alliance / count,
  };

  const commonFlags = Object.entries(flagCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    results,
    summary: {
      averageOverall: overallSum / count,
      averageByMetric,
      gradeDistribution,
      commonFlags,
    },
  };
}

// ============================================
// REPORT GENERATION
// ============================================

/**
 * Generate human-readable eval report
 */
export function generateEvalReport(result: EvalResult): string {
  const lines: string[] = [
    '## Eval Report',
    '',
    `**Overall Score:** ${(result.overall * 100).toFixed(1)}% (Grade: ${result.grade})`,
    '',
    '### Metrics',
    '',
  ];

  const metricNames: Record<keyof EvalMetrics, string> = {
    accuracy: 'Точность/SIFT',
    usefulness: 'Полезность',
    omegaHonesty: 'Честность Ω',
    nonEmpty: 'Не-пусто',
    alliance: 'Альянс',
  };

  for (const [key, name] of Object.entries(metricNames)) {
    const metric = result.metrics[key as keyof EvalMetrics];
    const bar = '█'.repeat(Math.round(metric.score * 10)) + '░'.repeat(10 - Math.round(metric.score * 10));
    lines.push(`**${name}:** ${bar} ${(metric.score * 100).toFixed(0)}%`);
    if (metric.signals.length > 0) {
      lines.push(`  _${metric.signals.join(', ')}_`);
    }
    if (metric.suggestion) {
      lines.push(`  → ${metric.suggestion}`);
    }
    lines.push('');
  }

  if (result.flags.length > 0) {
    lines.push('### Flags');
    lines.push('');
    for (const flag of result.flags) {
      const icon = flag.type === 'critical' ? '🔴' : flag.type === 'warning' ? '🟡' : '🟢';
      lines.push(`${icon} **${flag.code}**: ${flag.message}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// EXPORT
// ============================================

export const evalService = {
  evaluate: evaluateResponse,
  evaluateBatch,
  generateReport: generateEvalReport,
};
