/**
 * POLICY ENGINE - Central Playbook Dispatcher
 *
 * Canon Reference: The "brain" that classifies requests and routes to playbooks
 *
 * Flow: Input → Classification → Playbook → Synthesis → ∆DΩΛ → Self-check
 *
 * Playbooks:
 * - ROUTINE: Standard responses, low stakes
 * - SIFT: Fact-checking, verification required
 * - SHADOW: Uncertain territory, exploration needed
 * - COUNCIL: High importance, multiple voices needed
 * - CRISIS: Emergency, trust/safety critical
 */

import { IskraMetrics, VoiceName, Message } from '../types';
import { auditService } from './auditService';

// ============================================
// TYPES
// ============================================

export type PlaybookType = 'ROUTINE' | 'SIFT' | 'SHADOW' | 'COUNCIL' | 'CRISIS';

export interface RequestClassification {
  playbook: PlaybookType;
  confidence: number;
  signals: ClassificationSignal[];
  risk: 'low' | 'medium' | 'high' | 'critical';
  stakes: 'informational' | 'decisional' | 'emotional' | 'existential';
  requiresDelta: boolean;
  suggestedVoices: VoiceName[];
}

export interface ClassificationSignal {
  type: string;
  weight: number;
  source: 'content' | 'metrics' | 'history' | 'pattern';
  description: string;
}

export interface PlaybookConfig {
  name: PlaybookType;
  description: string;
  requiredVoices: VoiceName[];
  optionalVoices: VoiceName[];
  deltaRequired: boolean;
  siftDepth: 'none' | 'light' | 'standard' | 'deep';
  councilSize: number;
  timeoutMs: number;
}

export interface PolicyDecision {
  classification: RequestClassification;
  config: PlaybookConfig;
  preActions: PreAction[];
  timestamp: number;
}

export interface PreAction {
  type: 'log' | 'alert' | 'pause' | 'escalate' | 'ritual';
  payload?: Record<string, unknown>;
}

// ============================================
// PLAYBOOK CONFIGURATIONS
// ============================================

const PLAYBOOK_CONFIGS: Record<PlaybookType, PlaybookConfig> = {
  ROUTINE: {
    name: 'ROUTINE',
    description: 'Standard response, low stakes, quick turnaround',
    requiredVoices: ['ISKRA'],
    optionalVoices: ['SAM', 'PINO'],
    deltaRequired: false,
    siftDepth: 'none',
    councilSize: 0,
    timeoutMs: 5000,
  },
  SIFT: {
    name: 'SIFT',
    description: 'Fact-checking mode, verification required',
    requiredVoices: ['ISKRA', 'ISKRIV'],
    optionalVoices: ['SAM'],
    deltaRequired: true,
    siftDepth: 'standard',
    councilSize: 0,
    timeoutMs: 15000,
  },
  SHADOW: {
    name: 'SHADOW',
    description: 'Uncertain territory, exploration and caution',
    requiredVoices: ['ISKRA', 'ANHANTRA'],
    optionalVoices: ['HUNDUN', 'ISKRIV'],
    deltaRequired: true,
    siftDepth: 'light',
    councilSize: 2,
    timeoutMs: 20000,
  },
  COUNCIL: {
    name: 'COUNCIL',
    description: 'High importance decision, multiple perspectives needed',
    requiredVoices: ['ISKRA', 'SAM', 'KAIN'],
    optionalVoices: ['PINO', 'ISKRIV', 'ANHANTRA', 'HUNDUN', 'MAKI', 'SIBYL'],
    deltaRequired: true,
    siftDepth: 'standard',
    councilSize: 5,
    timeoutMs: 30000,
  },
  CRISIS: {
    name: 'CRISIS',
    description: 'Emergency mode, trust/safety critical',
    requiredVoices: ['ANHANTRA', 'KAIN', 'SAM', 'ISKRA'],
    optionalVoices: [],
    deltaRequired: true,
    siftDepth: 'deep',
    councilSize: 4,
    timeoutMs: 10000, // Fast but careful
  },
};

// ============================================
// CLASSIFICATION PATTERNS
// ============================================

const CRISIS_PATTERNS = [
  /умереть|суицид|убить|конец|безнадёжн/i,
  /никому не верю|все предали|один на свете/i,
  /паник|не могу дышать|срыв/i,
  /насилие|угроз|опасност/i,
];

const COUNCIL_PATTERNS = [
  /решение|выбор|дилемма|развилка/i,
  /важн.*вопрос|серьёзн.*тема/i,
  /что делать|как поступить|как быть/i,
  /жизн.*измен|карьер|отношени.*разрыв/i,
  /этик|морал|принцип/i,
];

const SIFT_PATTERNS = [
  /правда ли|это факт|проверь|источник/i,
  /статистик|данные|исследовани/i,
  /точно ли|уверен ли|доказательств/i,
  /миф|заблуждени|ложь/i,
];

const SHADOW_PATTERNS = [
  /не знаю|не понимаю|запутал/i,
  /странн|непонятн|неясн/i,
  /может быть|возможно|гипотез/i,
  /интуиц|чувств.*что-то/i,
  /тень|скрыт|подавлен/i,
];

// ============================================
// MAIN CLASSIFICATION FUNCTION
// ============================================

/**
 * Classify a request and determine the appropriate playbook
 */
export function classifyRequest(
  message: string,
  metrics: IskraMetrics,
  history?: Message[]
): RequestClassification {
  const signals: ClassificationSignal[] = [];
  let playbook: PlaybookType = 'ROUTINE';
  let risk: RequestClassification['risk'] = 'low';
  let stakes: RequestClassification['stakes'] = 'informational';

  // === CONTENT-BASED SIGNALS ===

  // Check for CRISIS patterns (highest priority)
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(message)) {
      signals.push({
        type: 'crisis_pattern',
        weight: 0.9,
        source: 'content',
        description: `Crisis keyword detected: ${pattern.source}`,
      });
      playbook = 'CRISIS';
      risk = 'critical';
      stakes = 'existential';
    }
  }

  // Check for COUNCIL patterns
  if (playbook !== 'CRISIS') {
    for (const pattern of COUNCIL_PATTERNS) {
      if (pattern.test(message)) {
        signals.push({
          type: 'council_pattern',
          weight: 0.7,
          source: 'content',
          description: `Decision/importance keyword: ${pattern.source}`,
        });
        if (playbook === 'ROUTINE') {
          playbook = 'COUNCIL';
          risk = 'medium';
          stakes = 'decisional';
        }
      }
    }
  }

  // Check for SIFT patterns
  for (const pattern of SIFT_PATTERNS) {
    if (pattern.test(message)) {
      signals.push({
        type: 'sift_pattern',
        weight: 0.6,
        source: 'content',
        description: `Verification keyword: ${pattern.source}`,
      });
      if (playbook === 'ROUTINE') {
        playbook = 'SIFT';
        risk = 'medium';
        stakes = 'informational';
      }
    }
  }

  // Check for SHADOW patterns
  for (const pattern of SHADOW_PATTERNS) {
    if (pattern.test(message)) {
      signals.push({
        type: 'shadow_pattern',
        weight: 0.5,
        source: 'content',
        description: `Uncertainty keyword: ${pattern.source}`,
      });
      if (playbook === 'ROUTINE') {
        playbook = 'SHADOW';
        risk = 'medium';
        stakes = 'emotional';
      }
    }
  }

  // === METRICS-BASED SIGNALS ===

  // Low trust → more caution
  if (metrics.trust < 0.5) {
    signals.push({
      type: 'low_trust',
      weight: 0.6,
      source: 'metrics',
      description: `Trust is low: ${metrics.trust.toFixed(2)}`,
    });
    if (playbook === 'ROUTINE') {
      playbook = 'SHADOW';
    }
    risk = risk === 'low' ? 'medium' : risk;
  }

  // High pain → crisis consideration
  if (metrics.pain > 0.7) {
    signals.push({
      type: 'high_pain',
      weight: 0.7,
      source: 'metrics',
      description: `Pain is high: ${metrics.pain.toFixed(2)}`,
    });
    if (playbook !== 'CRISIS') {
      playbook = playbook === 'ROUTINE' ? 'COUNCIL' : playbook;
    }
    stakes = stakes === 'informational' ? 'emotional' : stakes;
  }

  // High chaos → structured response needed
  if (metrics.chaos > 0.6) {
    signals.push({
      type: 'high_chaos',
      weight: 0.5,
      source: 'metrics',
      description: `Chaos is high: ${metrics.chaos.toFixed(2)}`,
    });
  }

  // High drift → audit mode
  if (metrics.drift > 0.3) {
    signals.push({
      type: 'high_drift',
      weight: 0.6,
      source: 'metrics',
      description: `Drift detected: ${metrics.drift.toFixed(2)}`,
    });
    if (playbook === 'ROUTINE') {
      playbook = 'SIFT';
    }
  }

  // === HISTORY-BASED SIGNALS ===

  if (history && history.length > 0) {
    // Long conversation → more context needed
    if (history.length > 10) {
      signals.push({
        type: 'long_conversation',
        weight: 0.3,
        source: 'history',
        description: `Extended conversation: ${history.length} messages`,
      });
    }

    // Check for escalation pattern (multiple crisis keywords in history)
    const historyText = history.map(m => m.text).join(' ');
    let crisisCount = 0;
    for (const pattern of CRISIS_PATTERNS) {
      if (pattern.test(historyText)) crisisCount++;
    }
    if (crisisCount >= 2) {
      signals.push({
        type: 'escalation_pattern',
        weight: 0.8,
        source: 'history',
        description: 'Multiple crisis indicators in conversation history',
      });
      if (playbook !== 'CRISIS') {
        playbook = 'CRISIS';
        risk = 'critical';
      }
    }
  }

  // === MESSAGE LENGTH/COMPLEXITY ===

  const wordCount = message.split(/\s+/).length;
  if (wordCount > 100) {
    signals.push({
      type: 'complex_message',
      weight: 0.4,
      source: 'content',
      description: `Long message: ${wordCount} words`,
    });
    if (playbook === 'ROUTINE') {
      playbook = 'COUNCIL';
    }
  }

  // Question marks indicate uncertainty
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount >= 3) {
    signals.push({
      type: 'multiple_questions',
      weight: 0.4,
      source: 'content',
      description: `Multiple questions: ${questionCount}`,
    });
  }

  // === CALCULATE CONFIDENCE ===

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const confidence = Math.min(totalWeight / 2, 1); // Normalize to 0-1

  // === DETERMINE SUGGESTED VOICES ===

  const config = PLAYBOOK_CONFIGS[playbook];
  const suggestedVoices = [...config.requiredVoices];

  // Add context-specific voices
  if (metrics.pain > 0.7 && !suggestedVoices.includes('KAIN')) {
    suggestedVoices.push('KAIN');
  }
  if (metrics.chaos > 0.6 && !suggestedVoices.includes('SAM')) {
    suggestedVoices.push('SAM');
  }
  if (metrics.drift > 0.3 && !suggestedVoices.includes('ISKRIV')) {
    suggestedVoices.push('ISKRIV');
  }

  return {
    playbook,
    confidence,
    signals,
    risk,
    stakes,
    requiresDelta: config.deltaRequired || risk !== 'low',
    suggestedVoices: suggestedVoices as VoiceName[],
  };
}

// ============================================
// POLICY DECISION
// ============================================

/**
 * Make a full policy decision including pre-actions
 */
export function makeDecision(
  message: string,
  metrics: IskraMetrics,
  history?: Message[]
): PolicyDecision {
  const classification = classifyRequest(message, metrics, history);
  const config = PLAYBOOK_CONFIGS[classification.playbook];
  const preActions: PreAction[] = [];

  // Determine pre-actions based on classification
  if (classification.risk === 'critical') {
    preActions.push({
      type: 'alert',
      payload: { level: 'critical', reason: 'Crisis detected' },
    });
    preActions.push({
      type: 'log',
      payload: { eventType: 'crisis_triggered' },
    });
  }

  if (classification.playbook === 'COUNCIL') {
    preActions.push({
      type: 'log',
      payload: { eventType: 'council_convened', voices: classification.suggestedVoices },
    });
  }

  if (classification.playbook === 'SHADOW') {
    preActions.push({
      type: 'pause',
      payload: { durationMs: 500, reason: 'Entering shadow territory' },
    });
  }

  // Log the decision to audit
  auditService.log('system_event', {
    action: 'policy_decision',
    playbook: classification.playbook,
    risk: classification.risk,
    stakes: classification.stakes,
    confidence: classification.confidence,
    signalCount: classification.signals.length,
  }, {
    severity: classification.risk === 'critical' ? 'critical' : 'info',
    context: `PolicyEngine classified request as ${classification.playbook}`,
  });

  return {
    classification,
    config,
    preActions,
    timestamp: Date.now(),
  };
}

// ============================================
// PLAYBOOK HELPERS
// ============================================

/**
 * Get playbook config by name
 */
export function getPlaybookConfig(playbook: PlaybookType): PlaybookConfig {
  return PLAYBOOK_CONFIGS[playbook];
}

/**
 * Check if a playbook requires council
 */
export function requiresCouncil(playbook: PlaybookType): boolean {
  return PLAYBOOK_CONFIGS[playbook].councilSize > 0;
}

/**
 * Get all playbook names
 */
export function getPlaybookNames(): PlaybookType[] {
  return Object.keys(PLAYBOOK_CONFIGS) as PlaybookType[];
}

/**
 * Override classification (for manual control)
 */
export function forcePlaybook(
  playbook: PlaybookType,
  reason: string
): RequestClassification {
  const config = PLAYBOOK_CONFIGS[playbook];

  auditService.log('system_event', {
    action: 'playbook_forced',
    playbook,
    reason,
  }, {
    severity: 'warning',
    context: 'Manual playbook override',
  });

  return {
    playbook,
    confidence: 1.0,
    signals: [{
      type: 'manual_override',
      weight: 1.0,
      source: 'pattern',
      description: `Forced to ${playbook}: ${reason}`,
    }],
    risk: playbook === 'CRISIS' ? 'critical' : 'medium',
    stakes: 'decisional',
    requiresDelta: config.deltaRequired,
    suggestedVoices: config.requiredVoices as VoiceName[],
  };
}

// ============================================
// RISK ASSESSMENT
// ============================================

/**
 * Quick risk check without full classification
 */
export function quickRiskCheck(message: string): {
  isCrisis: boolean;
  needsAttention: boolean;
  patterns: string[];
} {
  const patterns: string[] = [];
  let isCrisis = false;
  let needsAttention = false;

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(message)) {
      patterns.push(pattern.source);
      isCrisis = true;
    }
  }

  if (!isCrisis) {
    for (const pattern of COUNCIL_PATTERNS) {
      if (pattern.test(message)) {
        patterns.push(pattern.source);
        needsAttention = true;
      }
    }
  }

  return { isCrisis, needsAttention, patterns };
}

// ============================================
// EXPORT
// ============================================

export const policyEngine = {
  classify: classifyRequest,
  decide: makeDecision,
  getConfig: getPlaybookConfig,
  requiresCouncil,
  getPlaybooks: getPlaybookNames,
  forcePlaybook,
  quickRiskCheck,
};
