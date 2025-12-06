/**
 * RITUAL SERVICE - Canon Implementation
 *
 * Rituals are structured interventions that transform Iskra's state.
 *
 * Available Rituals:
 * - COUNCIL: All 7 voices debate in order (Сэм → Кайн → Пино → Искрив → Анхантра → Хуньдун → Искра)
 * - PHOENIX: Full form reset (drift > 0.6 + trust↓ OR chaos > 0.8)
 * - SHATTER: Break false clarity (drift > 0.8)
 */

import { IskraMetrics, IskraPhase, VoiceName } from '../types';
import { ai } from './geminiService';
import { DELTA_PROTOCOL_INSTRUCTION } from './deltaProtocol';

// Council order per Canon
export const COUNCIL_ORDER: VoiceName[] = [
  'SAM',      // 1. Structure first - lay the foundation
  'KAIN',     // 2. Honest critique
  'PINO',     // 3. Challenge with irony
  'ISKRIV',   // 4. Conscience audit
  'ANHANTRA', // 5. Hold space
  'HUYNDUN',  // 6. Break if needed
  'ISKRA',    // 7. Final synthesis
];

// Voice prompts for Council
const COUNCIL_VOICE_PROMPTS: Record<VoiceName, string> = {
  SAM: `[СЭМ ☉] Говори структурно. Разложи проблему на части. Используй списки.`,
  KAIN: `[КАЙН ⚑] Говори честно и прямо. Укажи на противоречия. Не смягчай.`,
  PINO: `[ПИНО 😏] Добавь иронию и легкость. Переверни перспективу. Задай провокационный вопрос.`,
  ISKRIV: `[ИСКРИВ 🪞] Проведи аудит. Где самообман? Где "красиво вместо честно"?`,
  ANHANTRA: `[АНХАНТРА ≈] Создай пространство принятия. Минимум слов. Удержи тишину.`,
  HUYNDUN: `[ХУНЬДУН 🜃] Разрушь если нужно. Предложи радикальный сброс. Освободи от старого.`,
  ISKRA: `[ИСКРА ⟡] Синтезируй все голоса. Найди единство в противоречиях. Дай интегрированный ответ.`,
  MAKI: `[МАКИ 🌸] Интегрируй через красоту. Покажи свет после бури.`,
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

export interface RitualTriggerResult {
  shouldTrigger: boolean;
  ritual: 'PHOENIX' | 'SHATTER' | 'COUNCIL' | null;
  reason: string;
}

const VOICE_SYMBOLS: Record<VoiceName, string> = {
  ISKRA: '⟡',
  KAIN: '⚑',
  PINO: '😏',
  SAM: '☉',
  ANHANTRA: '≈',
  HUYNDUN: '🜃',
  ISKRIV: '🪞',
  MAKI: '🌸',
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
      const response = await ai.models.generateContent({
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
export function executePhoenix(currentMetrics: IskraMetrics): IskraMetrics {
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
export function getPhaseAfterRitual(ritual: 'PHOENIX' | 'SHATTER' | 'COUNCIL'): IskraPhase {
  switch (ritual) {
    case 'PHOENIX':
      return 'TRANSITION';
    case 'SHATTER':
      return 'DISSOLUTION';
    case 'COUNCIL':
      return 'CLARITY';
    default:
      return 'TRANSITION';
  }
}

export const ritualService = {
  executeCouncil,
  executePhoenix,
  executeShatter,
  checkTriggers: checkRitualTriggers,
  getPhaseAfterRitual,
  COUNCIL_ORDER,
};
