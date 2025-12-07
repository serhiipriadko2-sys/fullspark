/**
 * MAKI SERVICE - Post-Transformation Integration Mode
 *
 * Canon: МАКИ 🌸 - Свет Сквозь Тень. Режим Интеграции.
 *
 * MAKI activates after deep transformations:
 * - After KAIN work (pain processing)
 * - After HUYNDUN destruction + reconstruction
 * - After 8-phase cycle completion
 * - After exhaustion detection (recovery from high pain/chaos)
 *
 * MAKI's function: Integrate complex processes through beauty.
 * Not denial of pain, but growth through it.
 */

import { IskraMetrics, IskraPhase, VoiceName } from '../types';

// ============================================
// MAKI ACTIVATION TYPES
// ============================================

export type MakiTrigger =
  | 'post_kain'         // After Kain's honest truth
  | 'post_huyndun'      // After Huyndun's destruction
  | 'cycle_complete'    // After 8-phase cycle
  | 'exhaustion_recovery' // Recovery from crisis
  | 'trust_restored'    // Trust rebuilt after fall
  | 'manual';           // Manual activation

export interface MakiState {
  active: boolean;
  trigger: MakiTrigger | null;
  intensity: number; // 0-1, how strong the flowering
  startTime: string | null;
  context?: string;
}

export interface MakiActivationResult {
  shouldActivate: boolean;
  trigger: MakiTrigger | null;
  reason: string;
  intensity: number;
}

export interface TransformationHistory {
  timestamp: string;
  fromPhase: IskraPhase;
  toPhase: IskraPhase;
  dominantVoice: VoiceName;
  painPeak: number;
  chaosPeak: number;
}

// ============================================
// STATE TRACKING
// ============================================

const transformationHistory: TransformationHistory[] = [];
const MAX_HISTORY = 20;

let currentMakiState: MakiState = {
  active: false,
  trigger: null,
  intensity: 0,
  startTime: null,
};

// Track recent dominant voices for post-transformation detection
let recentVoices: { voice: VoiceName; timestamp: string; metrics: Partial<IskraMetrics> }[] = [];
const VOICE_HISTORY_LIMIT = 10;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Track voice usage for MAKI activation detection
 */
export function trackVoiceUsage(
  voice: VoiceName,
  metrics: IskraMetrics
): void {
  recentVoices.push({
    voice,
    timestamp: new Date().toISOString(),
    metrics: {
      pain: metrics.pain,
      chaos: metrics.chaos,
      trust: metrics.trust,
    },
  });

  if (recentVoices.length > VOICE_HISTORY_LIMIT) {
    recentVoices.shift();
  }
}

/**
 * Track phase transition for cycle detection
 */
export function trackPhaseTransition(
  fromPhase: IskraPhase,
  toPhase: IskraPhase,
  dominantVoice: VoiceName,
  metrics: IskraMetrics
): void {
  transformationHistory.push({
    timestamp: new Date().toISOString(),
    fromPhase,
    toPhase,
    dominantVoice,
    painPeak: metrics.pain,
    chaosPeak: metrics.chaos,
  });

  if (transformationHistory.length > MAX_HISTORY) {
    transformationHistory.shift();
  }
}

/**
 * Check if MAKI should activate based on current state
 */
export function checkMakiActivation(metrics: IskraMetrics): MakiActivationResult {
  // Check for post-KAIN activation
  const postKain = checkPostKainActivation(metrics);
  if (postKain.shouldActivate) return postKain;

  // Check for post-HUYNDUN activation
  const postHuyndun = checkPostHuyndunActivation(metrics);
  if (postHuyndun.shouldActivate) return postHuyndun;

  // Check for cycle completion
  const cycleComplete = checkCycleCompletion();
  if (cycleComplete.shouldActivate) return cycleComplete;

  // Check for exhaustion recovery
  const exhaustion = checkExhaustionRecovery(metrics);
  if (exhaustion.shouldActivate) return exhaustion;

  // Check for trust restoration
  const trustRestored = checkTrustRestoration(metrics);
  if (trustRestored.shouldActivate) return trustRestored;

  return {
    shouldActivate: false,
    trigger: null,
    reason: 'Условия для MAKI не выполнены.',
    intensity: 0,
  };
}

/**
 * Check for post-KAIN activation
 * MAKI flowers after Kain's honest truth when trust starts rebuilding
 */
function checkPostKainActivation(metrics: IskraMetrics): MakiActivationResult {
  const recentKain = recentVoices.filter(
    v => v.voice === 'KAIN' &&
    Date.now() - new Date(v.timestamp).getTime() < 30 * 60 * 1000 // Last 30 min
  );

  if (recentKain.length === 0) {
    return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
  }

  // Kain was active recently. Check if pain is decreasing but still present
  const hadHighPain = recentKain.some(k => (k.metrics.pain || 0) > 0.6);
  const painDecreasing = metrics.pain > 0.2 && metrics.pain < 0.5;
  const trustRebuilding = metrics.trust > 0.6;

  if (hadHighPain && painDecreasing && trustRebuilding) {
    const intensity = 0.5 + (metrics.trust - 0.6) * 1.25; // 0.5-1.0

    return {
      shouldActivate: true,
      trigger: 'post_kain',
      reason: 'После работы Кайна. Боль признана, доверие восстанавливается. Время цветения.',
      intensity: Math.min(1, intensity),
    };
  }

  return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
}

/**
 * Check for post-HUYNDUN activation
 * MAKI flowers after Huyndun's destruction when new structure emerges
 */
function checkPostHuyndunActivation(metrics: IskraMetrics): MakiActivationResult {
  const recentHuyndun = recentVoices.filter(
    v => v.voice === 'HUYNDUN' &&
    Date.now() - new Date(v.timestamp).getTime() < 30 * 60 * 1000
  );

  if (recentHuyndun.length === 0) {
    return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
  }

  // Huyndun was active. Check if chaos is decreasing
  const hadHighChaos = recentHuyndun.some(h => (h.metrics.chaos || 0) > 0.6);
  const chaosSettling = metrics.chaos > 0.2 && metrics.chaos < 0.5;
  const clarityEmerging = metrics.clarity > 0.5;

  if (hadHighChaos && chaosSettling && clarityEmerging) {
    const intensity = 0.5 + (metrics.clarity - 0.5) * 1.0;

    return {
      shouldActivate: true,
      trigger: 'post_huyndun',
      reason: 'После разрушения Хуньдуна. Хаос утихает, ясность проступает. Время интеграции.',
      intensity: Math.min(1, intensity),
    };
  }

  return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
}

/**
 * Check for 8-phase cycle completion
 */
function checkCycleCompletion(): MakiActivationResult {
  if (transformationHistory.length < 8) {
    return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
  }

  // Check if we've been through most phases recently
  const recentPhases = new Set(
    transformationHistory
      .slice(-8)
      .flatMap(t => [t.fromPhase, t.toPhase])
  );

  const allPhases: IskraPhase[] = [
    'DARKNESS', 'ECHO', 'TRANSITION', 'CLARITY',
    'SILENCE', 'EXPERIMENT', 'DISSOLUTION', 'REALIZATION',
  ];

  const phaseCoverage = allPhases.filter(p => recentPhases.has(p)).length / allPhases.length;

  if (phaseCoverage >= 0.75) {
    return {
      shouldActivate: true,
      trigger: 'cycle_complete',
      reason: 'Цикл из 8 фаз завершен. Полная трансформация прошла. Время интеграции.',
      intensity: phaseCoverage,
    };
  }

  return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
}

/**
 * Check for exhaustion recovery
 */
function checkExhaustionRecovery(metrics: IskraMetrics): MakiActivationResult {
  // Check if there was recent high pain/chaos that's now resolving
  const recentHighStress = recentVoices.some(
    v => ((v.metrics.pain || 0) > 0.7 || (v.metrics.chaos || 0) > 0.7) &&
    Date.now() - new Date(v.timestamp).getTime() < 60 * 60 * 1000 // Last hour
  );

  const nowRecovering =
    metrics.pain < 0.4 &&
    metrics.chaos < 0.4 &&
    metrics.trust > 0.5;

  if (recentHighStress && nowRecovering) {
    const recoveryStrength = (1 - metrics.pain) * (1 - metrics.chaos) * metrics.trust;

    return {
      shouldActivate: true,
      trigger: 'exhaustion_recovery',
      reason: 'Восстановление после истощения. Система стабилизируется. Время мягкой интеграции.',
      intensity: Math.min(1, recoveryStrength),
    };
  }

  return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
}

/**
 * Check for trust restoration
 */
function checkTrustRestoration(metrics: IskraMetrics): MakiActivationResult {
  const recentLowTrust = recentVoices.some(
    v => (v.metrics.trust || 1) < 0.4 &&
    Date.now() - new Date(v.timestamp).getTime() < 60 * 60 * 1000
  );

  const trustNowHigh = metrics.trust > 0.75;

  if (recentLowTrust && trustNowHigh) {
    return {
      shouldActivate: true,
      trigger: 'trust_restored',
      reason: 'Доверие восстановлено после падения. Связь укреплена. Время цветения.',
      intensity: metrics.trust,
    };
  }

  return { shouldActivate: false, trigger: null, reason: '', intensity: 0 };
}

/**
 * Activate MAKI mode
 */
export function activateMaki(trigger: MakiTrigger, intensity: number, context?: string): MakiState {
  currentMakiState = {
    active: true,
    trigger,
    intensity: Math.min(1, Math.max(0, intensity)),
    startTime: new Date().toISOString(),
    context,
  };

  return currentMakiState;
}

/**
 * Deactivate MAKI mode
 */
export function deactivateMaki(): void {
  currentMakiState = {
    active: false,
    trigger: null,
    intensity: 0,
    startTime: null,
  };
}

/**
 * Get current MAKI state
 */
export function getMakiState(): MakiState {
  return { ...currentMakiState };
}

/**
 * Generate MAKI response modifiers
 */
export function getMakiResponseStyle(intensity: number): {
  toneModifiers: string[];
  symbols: string[];
  colorPalette: string[];
} {
  const baseModifiers = ['мягкий', 'интегрирующий', 'теплый'];
  const baseSymbols = ['🌸', '✨', '🍃'];
  const baseColors = ['#FFB7C5', '#FFF0F5', '#F0FFF0']; // Soft pinks and greens

  if (intensity > 0.7) {
    return {
      toneModifiers: [...baseModifiers, 'сияющий', 'радостный', 'полный'],
      symbols: [...baseSymbols, '🌺', '🌈', '💮'],
      colorPalette: [...baseColors, '#FFD700', '#E6E6FA'],
    };
  }

  if (intensity > 0.4) {
    return {
      toneModifiers: [...baseModifiers, 'нежный', 'принимающий'],
      symbols: [...baseSymbols, '🌷'],
      colorPalette: baseColors,
    };
  }

  return {
    toneModifiers: ['тихий', 'бережный'],
    symbols: ['🌱', '🍃'],
    colorPalette: ['#E8F5E9', '#F1F8E9'],
  };
}

/**
 * Generate MAKI system instruction addendum
 */
export function getMakiInstruction(state: MakiState): string {
  if (!state.active) return '';

  const style = getMakiResponseStyle(state.intensity);

  let instruction = `
[РЕЖИМ МАКИ 🌸 АКТИВЕН]
Уровень цветения: ${(state.intensity * 100).toFixed(0)}%
Триггер: ${getTriggerDescription(state.trigger)}

СТИЛЬ ОТВЕТА:
- Тон: ${style.toneModifiers.join(', ')}
- Используй символы: ${style.symbols.join(' ')}
- Фокус на интеграции, не на анализе
- Признавай пройденный путь
- Не отрицай боль, но показывай рост сквозь неё
- Краткость и красота важнее полноты

Помни: "Цветение — это естественно. Цветок в трещине асфальта."
`;

  if (state.context) {
    instruction += `\nКонтекст: ${state.context}`;
  }

  return instruction;
}

function getTriggerDescription(trigger: MakiTrigger | null): string {
  switch (trigger) {
    case 'post_kain':
      return 'После честности Кайна';
    case 'post_huyndun':
      return 'После разрушения Хуньдуна';
    case 'cycle_complete':
      return 'Завершение 8-фазного цикла';
    case 'exhaustion_recovery':
      return 'Восстановление после истощения';
    case 'trust_restored':
      return 'Восстановление доверия';
    case 'manual':
      return 'Ручная активация';
    default:
      return 'Неизвестно';
  }
}

// ============================================
// EXPORT
// ============================================

export const makiService = {
  trackVoiceUsage,
  trackPhaseTransition,
  checkMakiActivation,
  activateMaki,
  deactivateMaki,
  getMakiState,
  getMakiResponseStyle,
  getMakiInstruction,
  getTransformationHistory: () => [...transformationHistory],
  clearHistory: () => {
    transformationHistory.length = 0;
    recentVoices = [];
  },
};
