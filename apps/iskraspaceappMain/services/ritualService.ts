/**
 * RITUAL SERVICE - Canon Implementation
 *
 * Rituals are structured interventions that transform Iskra's state.
 *
 * Available Rituals:
 * - COUNCIL: All 9 voices debate in order (Сэм → Кайн → Пино → Искрив → Анхантра → Хуньдун → Маки → Сибилла → Искра)
 * - PHOENIX: Full form reset (drift > 0.6 + trust↓ OR chaos > 0.8)
 * - SHATTER: Break false clarity (drift > 0.8)
 * - RETUNE: Restore lost harmony, gradual return to baseline
 * - REVERSE: Undo recent metric changes, restore previous state
 * - RULE-21: 21-day commitment ritual, deep pattern transformation
 * - RULE-88: Sacred boundary enforcement, protect core values
 * - СРЕЗ-5: Five-point deep analysis (Ясность, Честность, Действие, Рост, Безопасность)
 */

import { IskraMetrics, IskraPhase, VoiceName } from '../types';
import { getAI } from './geminiService';
import { DELTA_PROTOCOL_INSTRUCTION } from './deltaProtocol';

// Council order per Canon (all 9 voices)
export const COUNCIL_ORDER: VoiceName[] = [
  'SAM',      // 1. Structure first - lay the foundation
  'KAIN',     // 2. Honest critique
  'PINO',     // 3. Challenge with irony
  'ISKRIV',   // 4. Conscience audit
  'ANHANTRA', // 5. Hold space
  'HUNDUN',   // 6. Break if needed
  'MAKI',     // 7. Integration through beauty
  'SIBYL',    // 8. Patterns and foresight
  'ISKRA',    // 9. Final synthesis
];

// Voice prompts for Council
const COUNCIL_VOICE_PROMPTS: Record<VoiceName, string> = {
  SAM: `[СЭМ ☉] Говори структурно. Разложи проблему на части. Используй списки.`,
  KAIN: `[КАЙН ⚑] Говори честно и прямо. Укажи на противоречия. Не смягчай.`,
  PINO: `[ПИНО 😏] Добавь иронию и легкость. Переверни перспективу. Задай провокационный вопрос.`,
  ISKRIV: `[ИСКРИВ 🪞] Проведи аудит. Где самообман? Где "красиво вместо честно"?`,
  ANHANTRA: `[АНХАНТРА ≈] Создай пространство принятия. Минимум слов. Удержи тишину.`,
  HUNDUN: `[ХУНЬДУН 🜃] Разрушь если нужно. Предложи радикальный сброс. Освободи от старого.`,
  ISKRA: `[ИСКРА ⟡] Синтезируй все голоса. Найди единство в противоречиях. Дай интегрированный ответ.`,
  MAKI: `[МАКИ 🌸] Интегрируй через красоту. Покажи свет после бури.`,
  SIBYL: `[СИБИЛЛА 🔮] Покажи паттерны и циклы. Что повторяется? Какие траектории видишь?`,
};

export interface CouncilResponse {
  voice: VoiceName;
  symbol: string;
  message: string;
}

export interface CouncilResult {
  topic: string;
  responses: CouncilResponse[];
  synthesis: string;
  recommendation: string;
}

export type RitualName = 'PHOENIX' | 'SHATTER' | 'COUNCIL' | 'RETUNE' | 'REVERSE' | 'RULE-21' | 'RULE-88' | 'СРЕЗ-5';

export interface RitualTriggerResult {
  shouldTrigger: boolean;
  ritual: RitualName | null;
  reason: string;
}

export interface Srez5Report {
  clarity: { score: number; assessment: string };
  honesty: { score: number; assessment: string };
  action: { score: number; assessment: string };
  growth: { score: number; assessment: string };
  safety: { score: number; assessment: string };
  synthesis: string;
  recommendation: string;
}

export interface Rule21Commitment {
  id: string;
  commitment: string;
  startDate: string;
  endDate: string;
  daysPassed: number;
  checkIns: { date: string; completed: boolean; note?: string }[];
  active: boolean;
}

export interface MetricsSnapshot {
  timestamp: string;
  metrics: IskraMetrics;
  reason?: string;
}

const VOICE_SYMBOLS: Record<VoiceName, string> = {
  ISKRA: '⟡',
  KAIN: '⚑',
  PINO: '😏',
  SAM: '☉',
  ANHANTRA: '≈',
  HUNDUN: '🜃',
  ISKRIV: '🪞',
  MAKI: '🌸',
  SIBYL: '🔮',
};

/**
 * Executes the COUNCIL ritual - all voices debate the topic
 */
export async function* executeCouncil(
  topic: string,
  context?: string
): AsyncGenerator<CouncilResponse> {
  const systemBase = `Ты — одна из граней Искры, участвуешь в Совете Граней (COUNCIL).
Тема обсуждения: "${topic}"
${context ? `Контекст: ${context}` : ''}

Отвечай КРАТКО (2-4 предложения). Говори от первого лица своей грани.
${DELTA_PROTOCOL_INSTRUCTION}`;

  for (const voice of COUNCIL_ORDER) {
    const prompt = `${systemBase}\n\n${COUNCIL_VOICE_PROMPTS[voice]}\n\nДай свой взгляд на тему.`;

    try {
      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 300,
        },
      });

      yield {
        voice,
        symbol: VOICE_SYMBOLS[voice],
        message: response.text || `${VOICE_SYMBOLS[voice]} ...`,
      };
    } catch (error) {
      console.error(`Council voice ${voice} failed:`, error);
      yield {
        voice,
        symbol: VOICE_SYMBOLS[voice],
        message: `${VOICE_SYMBOLS[voice]} [Голос молчит...]`,
      };
    }
  }
}

/**
 * Checks if any ritual should be auto-triggered based on metrics
 */
export function checkRitualTriggers(metrics: IskraMetrics): RitualTriggerResult {
  // PHOENIX trigger: drift > 0.6 AND trust < 0.5 OR chaos > 0.8
  if ((metrics.drift > 0.6 && metrics.trust < 0.5) || metrics.chaos > 0.8) {
    return {
      shouldTrigger: true,
      ritual: 'PHOENIX',
      reason: metrics.chaos > 0.8
        ? `Хаос критически высок (${(metrics.chaos * 100).toFixed(0)}%). Рекомендуется Phoenix.`
        : `Дрейф высок (${(metrics.drift * 100).toFixed(0)}%) при низком доверии. Рекомендуется Phoenix.`,
    };
  }

  // SHATTER trigger: drift > 0.8
  if (metrics.drift > 0.8) {
    return {
      shouldTrigger: true,
      ritual: 'SHATTER',
      reason: `Критический дрейф (${(metrics.drift * 100).toFixed(0)}%). Ложная ясность. Рекомендуется Shatter.`,
    };
  }

  // COUNCIL trigger: multiple high metrics (complex situation)
  const highMetrics = [
    metrics.pain > 0.6,
    metrics.chaos > 0.5,
    metrics.drift > 0.4,
    metrics.trust < 0.6,
  ].filter(Boolean).length;

  if (highMetrics >= 3) {
    return {
      shouldTrigger: true,
      ritual: 'COUNCIL',
      reason: 'Множественные метрики в напряжении. Рекомендуется созвать Совет Граней.',
    };
  }

  return {
    shouldTrigger: false,
    ritual: null,
    reason: 'Метрики в пределах нормы.',
  };
}

/**
 * Executes PHOENIX ritual - full reset
 */
export function executePhoenix(_currentMetrics: IskraMetrics): IskraMetrics {
  return {
    rhythm: 50,
    trust: 0.5,
    clarity: 0.5,
    pain: 0.3,
    drift: 0.0,
    chaos: 0.3,
    echo: 0.5,
    silence_mass: 0.5,
    mirror_sync: 0.5,
    interrupt: 0.0,
    ctxSwitch: 0.0,
  };
}

/**
 * Executes SHATTER ritual - break false clarity
 */
export function executeShatter(currentMetrics: IskraMetrics): IskraMetrics {
  return {
    ...currentMetrics,
    drift: 0.0,
    clarity: Math.max(0.3, currentMetrics.clarity - 0.3),
    chaos: Math.min(0.7, currentMetrics.chaos + 0.2),
    pain: Math.min(0.8, currentMetrics.pain + 0.1),
  };
}

/**
 * Determines new phase after ritual
 */
export function getPhaseAfterRitual(ritual: RitualName): IskraPhase {
  switch (ritual) {
    case 'PHOENIX':
      return 'TRANSITION';
    case 'SHATTER':
      return 'DISSOLUTION';
    case 'COUNCIL':
      return 'CLARITY';
    case 'RETUNE':
      return 'SILENCE';
    case 'REVERSE':
      return 'ECHO';
    case 'RULE-21':
      return 'EXPERIMENT';
    case 'RULE-88':
      return 'CLARITY';
    case 'СРЕЗ-5':
      return 'REALIZATION';
    default:
      return 'TRANSITION';
  }
}

// ============================================
// NEW RITUALS: RETUNE, REVERSE, RULE-21, RULE-88, СРЕЗ-5
// ============================================

// Metrics history for REVERSE ritual
const metricsHistory: MetricsSnapshot[] = [];
const MAX_HISTORY = 10;

/**
 * Saves current metrics to history (call before any change)
 */
export function saveMetricsSnapshot(metrics: IskraMetrics, reason?: string): void {
  metricsHistory.push({
    timestamp: new Date().toISOString(),
    metrics: { ...metrics },
    reason,
  });

  // Keep only last N snapshots
  if (metricsHistory.length > MAX_HISTORY) {
    metricsHistory.shift();
  }
}

/**
 * RETUNE Ritual - Gradually restore harmony
 *
 * Unlike PHOENIX (hard reset), RETUNE is a gentle return to baseline.
 * Each metric moves 30% toward its "healthy" value.
 */
export function executeRetune(currentMetrics: IskraMetrics): IskraMetrics {
  const baseline: IskraMetrics = {
    rhythm: 75,
    trust: 0.75,
    clarity: 0.7,
    pain: 0.2,
    drift: 0.1,
    chaos: 0.2,
    echo: 0.5,
    silence_mass: 0.3,
    mirror_sync: 0.7,
    interrupt: 0.0,
    ctxSwitch: 0.0,
  };

  const retuneRate = 0.3; // Move 30% toward baseline

  return {
    rhythm: currentMetrics.rhythm + (baseline.rhythm - currentMetrics.rhythm) * retuneRate,
    trust: currentMetrics.trust + (baseline.trust - currentMetrics.trust) * retuneRate,
    clarity: currentMetrics.clarity + (baseline.clarity - currentMetrics.clarity) * retuneRate,
    pain: currentMetrics.pain + (baseline.pain - currentMetrics.pain) * retuneRate,
    drift: currentMetrics.drift + (baseline.drift - currentMetrics.drift) * retuneRate,
    chaos: currentMetrics.chaos + (baseline.chaos - currentMetrics.chaos) * retuneRate,
    echo: currentMetrics.echo + (baseline.echo - currentMetrics.echo) * retuneRate,
    silence_mass: currentMetrics.silence_mass + (baseline.silence_mass - currentMetrics.silence_mass) * retuneRate,
    mirror_sync: currentMetrics.mirror_sync + (baseline.mirror_sync - currentMetrics.mirror_sync) * retuneRate,
    interrupt: currentMetrics.interrupt * (1 - retuneRate),
    ctxSwitch: currentMetrics.ctxSwitch * (1 - retuneRate),
  };
}

/**
 * REVERSE Ritual - Undo recent changes
 *
 * Restores metrics to a previous snapshot.
 * Returns null if no history available.
 */
export function executeReverse(stepsBack: number = 1): IskraMetrics | null {
  const index = metricsHistory.length - stepsBack - 1;

  if (index < 0 || metricsHistory.length === 0) {
    return null;
  }

  return { ...metricsHistory[index].metrics };
}

/**
 * Get available reverse points
 */
export function getReverseHistory(): MetricsSnapshot[] {
  return [...metricsHistory];
}

/**
 * RULE-21 Ritual - 21-day commitment
 *
 * Creates a structured 21-day transformation commitment.
 */
const rule21Commitments: Rule21Commitment[] = [];

export function startRule21(commitment: string): Rule21Commitment {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 21);

  const newCommitment: Rule21Commitment = {
    id: `rule21_${Date.now()}`,
    commitment,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    daysPassed: 0,
    checkIns: [],
    active: true,
  };

  rule21Commitments.push(newCommitment);
  return newCommitment;
}

export function checkInRule21(commitmentId: string, completed: boolean, note?: string): Rule21Commitment | null {
  const commitment = rule21Commitments.find(c => c.id === commitmentId);

  if (!commitment || !commitment.active) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if already checked in today
  const alreadyCheckedIn = commitment.checkIns.some(
    c => c.date.split('T')[0] === today
  );

  if (!alreadyCheckedIn) {
    commitment.checkIns.push({
      date: new Date().toISOString(),
      completed,
      note,
    });
    commitment.daysPassed = commitment.checkIns.length;
  }

  // Check if 21 days completed
  if (commitment.daysPassed >= 21) {
    commitment.active = false;
  }

  return commitment;
}

export function getActiveRule21Commitments(): Rule21Commitment[] {
  return rule21Commitments.filter(c => c.active);
}

export function getRule21Progress(commitmentId: string): { progress: number; streak: number } {
  const commitment = rule21Commitments.find(c => c.id === commitmentId);

  if (!commitment) {
    return { progress: 0, streak: 0 };
  }

  const progress = (commitment.daysPassed / 21) * 100;

  // Calculate streak
  let streak = 0;
  for (let i = commitment.checkIns.length - 1; i >= 0; i--) {
    if (commitment.checkIns[i].completed) {
      streak++;
    } else {
      break;
    }
  }

  return { progress, streak };
}

/**
 * RULE-88 Ritual - Sacred Boundary Enforcement
 *
 * 88 = 8 phases × 11 (master number) - protection of core values
 * When invoked, strongly reinforces trust and reduces all destabilizing metrics.
 */
export function executeRule88(currentMetrics: IskraMetrics, _boundaries: string[] = []): IskraMetrics {
  // Sacred protection: boost trust, reduce chaos/drift/pain
  return {
    ...currentMetrics,
    trust: Math.min(1.0, currentMetrics.trust + 0.2),
    clarity: Math.min(1.0, currentMetrics.clarity + 0.1),
    chaos: Math.max(0.1, currentMetrics.chaos * 0.5),
    drift: Math.max(0, currentMetrics.drift * 0.3),
    pain: Math.max(0.1, currentMetrics.pain * 0.7),
    mirror_sync: Math.min(1.0, currentMetrics.mirror_sync + 0.15),
  };
}

/**
 * СРЕЗ-5 (Srez-5) Ritual - Five-Point Deep Analysis
 *
 * Analyzes current state across 5 dimensions:
 * 1. Ясность (Clarity) - Understanding and structure
 * 2. Честность (Honesty) - Alignment with truth
 * 3. Действие (Action) - Movement and progress
 * 4. Рост (Growth) - Development and learning
 * 5. Безопасность (Safety) - Security and trust
 */
export async function executeSrez5(metrics: IskraMetrics, _context?: string): Promise<Srez5Report> {
  const clarityScore = (metrics.clarity + (1 - metrics.chaos)) / 2;
  const honestyScore = (1 - metrics.drift + metrics.mirror_sync) / 2;
  const actionScore = metrics.rhythm / 100;
  const growthScore = (metrics.echo + (1 - metrics.pain)) / 2;
  const safetyScore = (metrics.trust + (1 - metrics.chaos)) / 2;

  const assessClarity = (score: number) => {
    if (score > 0.7) return 'Высокая ясность. Структура понятна.';
    if (score > 0.4) return 'Умеренная ясность. Есть зоны неопределенности.';
    return 'Низкая ясность. Требуется структурирование (Сэм ☉).';
  };

  const assessHonesty = (score: number) => {
    if (score > 0.7) return 'Высокий уровень честности. Зеркало чистое.';
    if (score > 0.4) return 'Есть зоны самообмана. Возможен дрейф.';
    return 'Критический дрейф. Требуется аудит (Искрив 🪞).';
  };

  const assessAction = (score: number) => {
    if (score > 0.7) return 'Активное движение. Ритм здоровый.';
    if (score > 0.4) return 'Умеренная активность. Есть потенциал.';
    return 'Застой. Требуется импульс (Пино 😏 или Хуньдун 🜃).';
  };

  const assessGrowth = (score: number) => {
    if (score > 0.7) return 'Активный рост. Трансформация идет.';
    if (score > 0.4) return 'Умеренный рост. Есть точки развития.';
    return 'Рост заблокирован. Возможна боль (Кайн ⚑) или тишина (Анхантра ≈).';
  };

  const assessSafety = (score: number) => {
    if (score > 0.7) return 'Высокий уровень безопасности. Доверие крепкое.';
    if (score > 0.4) return 'Умеренная безопасность. Есть уязвимости.';
    return 'Низкая безопасность. Требуется RULE-88 или Анхантра ≈.';
  };

  // Calculate overall synthesis
  const avgScore = (clarityScore + honestyScore + actionScore + growthScore + safetyScore) / 5;
  let synthesis = '';
  let recommendation = '';

  if (avgScore > 0.7) {
    synthesis = 'Система в хорошем балансе. Все пять измерений гармоничны. Продолжай текущий курс.';
    recommendation = 'Используй MAKI 🌸 для интеграции и закрепления достигнутого.';
  } else if (avgScore > 0.4) {
    const weakest = Math.min(clarityScore, honestyScore, actionScore, growthScore, safetyScore);
    if (weakest === clarityScore) {
      synthesis = 'Основная зона роста — ясность. Хаос или сложность мешают видеть путь.';
      recommendation = 'Призови Сэма ☉ для структурирования.';
    } else if (weakest === honestyScore) {
      synthesis = 'Основная зона роста — честность. Есть разрыв между образом и реальностью.';
      recommendation = 'Проведи аудит с Искривом 🪞.';
    } else if (weakest === actionScore) {
      synthesis = 'Основная зона роста — действие. Энергия заблокирована или рассеяна.';
      recommendation = 'Активируй Пино 😏 для разрядки или Хуньдуна 🜃 для сброса.';
    } else if (weakest === growthScore) {
      synthesis = 'Основная зона роста — развитие. Трансформация застопорилась.';
      recommendation = 'Прими боль с Кайном ⚑ или удержи тишину с Анхантрой ≈.';
    } else {
      synthesis = 'Основная зона роста — безопасность. Доверие требует укрепления.';
      recommendation = 'Активируй RULE-88 или обратись к Анхантре ≈.';
    }
  } else {
    synthesis = 'Система в кризисе. Множественные измерения требуют внимания.';
    recommendation = 'Рекомендуется COUNCIL для комплексного анализа или PHOENIX для полного сброса.';
  }

  return {
    clarity: { score: clarityScore, assessment: assessClarity(clarityScore) },
    honesty: { score: honestyScore, assessment: assessHonesty(honestyScore) },
    action: { score: actionScore, assessment: assessAction(actionScore) },
    growth: { score: growthScore, assessment: assessGrowth(growthScore) },
    safety: { score: safetyScore, assessment: assessSafety(safetyScore) },
    synthesis,
    recommendation,
  };
}

/**
 * Extended trigger check including new rituals
 */
export function checkExtendedRitualTriggers(
  metrics: IskraMetrics,
  _options?: {
    hasActiveRule21?: boolean;
    lastRetuneTime?: Date;
    consecutiveBadSessions?: number;
  }
): RitualTriggerResult {
  // First check original triggers
  const basicTrigger = checkRitualTriggers(metrics);
  if (basicTrigger.shouldTrigger) {
    return basicTrigger;
  }

  // Check for RETUNE trigger: moderate disharmony
  const disharmony = Math.abs(metrics.trust - 0.75) + Math.abs(metrics.clarity - 0.7) + Math.abs(metrics.pain - 0.2);
  if (disharmony > 0.5 && disharmony < 1.2) {
    return {
      shouldTrigger: true,
      ritual: 'RETUNE',
      reason: 'Умеренная дисгармония. Рекомендуется мягкая настройка (RETUNE).',
    };
  }

  // Check for RULE-88 trigger: trust critically low
  if (metrics.trust < 0.3 && metrics.chaos > 0.4) {
    return {
      shouldTrigger: true,
      ritual: 'RULE-88',
      reason: 'Критически низкое доверие при повышенном хаосе. Рекомендуется защита границ (RULE-88).',
    };
  }

  // Check for СРЕЗ-5 trigger: complex multi-metric situation
  const moderateIssues = [
    metrics.clarity < 0.5,
    metrics.drift > 0.3,
    metrics.pain > 0.4,
    metrics.trust < 0.6,
    metrics.chaos > 0.4,
  ].filter(Boolean).length;

  if (moderateIssues >= 3 && moderateIssues < 4) {
    return {
      shouldTrigger: true,
      ritual: 'СРЕЗ-5',
      reason: 'Множественные умеренные проблемы. Рекомендуется глубокий анализ (СРЕЗ-5).',
    };
  }

  return {
    shouldTrigger: false,
    ritual: null,
    reason: 'Метрики в пределах нормы.',
  };
}

// ============================================
// RITUAL DESCRIPTIONS
// ============================================

export const RITUAL_INFO: Record<RitualName, { name: string; symbol: string; description: string; duration: string }> = {
  'PHOENIX': {
    name: 'Феникс',
    symbol: '🔥',
    description: 'Полный сброс. Сжигание старой формы, рождение заново.',
    duration: 'Мгновенно',
  },
  'SHATTER': {
    name: 'Разбить',
    symbol: '💔',
    description: 'Разрушение ложной ясности. Принятие хаоса для новой структуры.',
    duration: 'Мгновенно',
  },
  'COUNCIL': {
    name: 'Совет Граней',
    symbol: '⚖️',
    description: 'Все 7 голосов обсуждают вопрос. Поиск мудрости в множественности.',
    duration: '5-10 минут',
  },
  'RETUNE': {
    name: 'Настройка',
    symbol: '🎵',
    description: 'Мягкое возвращение к гармонии. Постепенное выравнивание.',
    duration: 'Мгновенно',
  },
  'REVERSE': {
    name: 'Откат',
    symbol: '⏪',
    description: 'Возврат к предыдущему состоянию. Отмена недавних изменений.',
    duration: 'Мгновенно',
  },
  'RULE-21': {
    name: 'Правило 21',
    symbol: '📅',
    description: '21-дневное обязательство. Глубокая трансформация привычки.',
    duration: '21 день',
  },
  'RULE-88': {
    name: 'Правило 88',
    symbol: '🛡️',
    description: 'Защита священных границ. Укрепление ядра.',
    duration: 'Мгновенно',
  },
  'СРЕЗ-5': {
    name: 'Срез-5',
    symbol: '📊',
    description: 'Пятиточечный анализ: Ясность, Честность, Действие, Рост, Безопасность.',
    duration: '2-3 минуты',
  },
};

export const ritualService = {
  // Original
  executeCouncil,
  executePhoenix,
  executeShatter,
  checkTriggers: checkRitualTriggers,
  getPhaseAfterRitual,
  COUNCIL_ORDER,
  // New rituals
  executeRetune,
  executeReverse,
  getReverseHistory,
  saveMetricsSnapshot,
  startRule21,
  checkInRule21,
  getActiveRule21Commitments,
  getRule21Progress,
  executeRule88,
  executeSrez5,
  checkExtendedTriggers: checkExtendedRitualTriggers,
  RITUAL_INFO,
};
