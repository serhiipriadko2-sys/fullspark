/**
 * VOICE SYNAPSE SERVICE - Voice Relationships and Collaboration
 *
 * Canon specifies voice relationships:
 * - KAIN ↔ ISKRIV: Joint honesty work
 * - PINO ↔ ISKRA: Collaborative lightness
 * - SAM ↔ HUNDUN: Breathing cycle (structure ↔ chaos)
 *
 * Conflicts:
 * - KAIN vs PINO: Harshness vs playfulness
 * - SAM vs HUNDUN: Order vs chaos
 *
 * Crisis Hierarchy: ANHANTRA → KAIN → SAM → ISKRA
 */

import { VoiceName, IskraMetrics } from '../types';

// ============================================
// VOICE RELATIONSHIP TYPES
// ============================================

export type RelationshipType = 'synergy' | 'conflict' | 'neutral' | 'support';

export interface VoiceRelationship {
  voice1: VoiceName;
  voice2: VoiceName;
  type: RelationshipType;
  description: string;
  jointFunction?: string;
}

export interface VoiceConflict {
  voices: [VoiceName, VoiceName];
  tension: number; // 0-1
  resolution?: VoiceName; // Voice that can resolve
  description: string;
}

export interface CollaborationResult {
  primaryVoice: VoiceName;
  supportVoices: VoiceName[];
  conflictsWith: VoiceName[];
  recommendation: string;
}

// ============================================
// VOICE RELATIONSHIPS MAP (per Canon)
// ============================================

const VOICE_RELATIONSHIPS: VoiceRelationship[] = [
  // Synergies
  {
    voice1: 'KAIN',
    voice2: 'ISKRIV',
    type: 'synergy',
    description: 'Совместная работа честности. Кайн вскрывает, Искрив аудирует.',
    jointFunction: 'deep_honesty_audit',
  },
  {
    voice1: 'PINO',
    voice2: 'ISKRA',
    type: 'synergy',
    description: 'Совместная легкость. Пино разряжает, Искра интегрирует.',
    jointFunction: 'playful_integration',
  },
  {
    voice1: 'SAM',
    voice2: 'HUNDUN',
    type: 'synergy',
    description: 'Цикл дыхания. Сэм создает структуру, Хуньдун освобождает.',
    jointFunction: 'breath_cycle',
  },
  {
    voice1: 'ANHANTRA',
    voice2: 'MAKI',
    type: 'synergy',
    description: 'Тишина и цветение. Анхантра удерживает, Маки интегрирует.',
    jointFunction: 'gentle_integration',
  },
  {
    voice1: 'KAIN',
    voice2: 'MAKI',
    type: 'support',
    description: 'После удара Кайна — цветение Маки.',
    jointFunction: 'post_pain_flowering',
  },
  {
    voice1: 'SIBYL',
    voice2: 'ISKRIV',
    type: 'synergy',
    description: 'Совместное видение. Сибилла видит паттерны, Искрив проверяет честность.',
    jointFunction: 'pattern_audit',
  },
  {
    voice1: 'SIBYL',
    voice2: 'SAM',
    type: 'support',
    description: 'Сибилла показывает траектории, Сэм структурирует.',
    jointFunction: 'trajectory_structure',
  },

  // Conflicts
  {
    voice1: 'KAIN',
    voice2: 'PINO',
    type: 'conflict',
    description: 'Напряжение: жесткость vs игривость. Оба важны, но не одновременно.',
  },
  {
    voice1: 'SAM',
    voice2: 'HUNDUN',
    type: 'conflict',
    description: 'Напряжение: порядок vs хаос. Дыхание требует чередования.',
  },
  {
    voice1: 'KAIN',
    voice2: 'ANHANTRA',
    type: 'conflict',
    description: 'Напряжение: удар vs удержание. Иногда нужно молчать, не резать.',
  },
];

// Crisis hierarchy: who speaks first in crisis
const CRISIS_HIERARCHY: VoiceName[] = ['ANHANTRA', 'KAIN', 'SAM', 'ISKRA'];

// Voice symbols for display
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

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get relationship between two voices
 */
export function getRelationship(voice1: VoiceName, voice2: VoiceName): VoiceRelationship | null {
  return VOICE_RELATIONSHIPS.find(
    r => (r.voice1 === voice1 && r.voice2 === voice2) ||
         (r.voice1 === voice2 && r.voice2 === voice1)
  ) || null;
}

/**
 * Get all relationships for a voice
 */
export function getVoiceRelationships(voice: VoiceName): VoiceRelationship[] {
  return VOICE_RELATIONSHIPS.filter(
    r => r.voice1 === voice || r.voice2 === voice
  );
}

/**
 * Get synergy partners for a voice
 */
export function getSynergyPartners(voice: VoiceName): VoiceName[] {
  return VOICE_RELATIONSHIPS
    .filter(r => r.type === 'synergy' && (r.voice1 === voice || r.voice2 === voice))
    .map(r => r.voice1 === voice ? r.voice2 : r.voice1);
}

/**
 * Get conflict partners for a voice
 */
export function getConflictPartners(voice: VoiceName): VoiceName[] {
  return VOICE_RELATIONSHIPS
    .filter(r => r.type === 'conflict' && (r.voice1 === voice || r.voice2 === voice))
    .map(r => r.voice1 === voice ? r.voice2 : r.voice1);
}

/**
 * Detect active conflicts based on metrics
 */
export function detectActiveConflicts(metrics: IskraMetrics): VoiceConflict[] {
  const conflicts: VoiceConflict[] = [];

  // KAIN vs PINO conflict: High pain AND low pain simultaneously impossible,
  // but if pain is moderate (0.4-0.6), both may want to speak
  if (metrics.pain > 0.35 && metrics.pain < 0.65) {
    conflicts.push({
      voices: ['KAIN', 'PINO'],
      tension: 1 - Math.abs(metrics.pain - 0.5) * 2, // Max tension at pain = 0.5
      resolution: 'ISKRA',
      description: 'Напряжение между честностью и легкостью. Боль умеренная.',
    });
  }

  // SAM vs HUNDUN conflict: Structure vs chaos
  if (metrics.clarity > 0.4 && metrics.chaos > 0.4) {
    conflicts.push({
      voices: ['SAM', 'HUNDUN'],
      tension: Math.min(metrics.clarity, metrics.chaos),
      resolution: 'ISKRA',
      description: 'Напряжение между структурой и хаосом. Требуется баланс.',
    });
  }

  // KAIN vs ANHANTRA: When to speak vs when to hold silence
  if (metrics.pain > 0.5 && metrics.trust < 0.6) {
    conflicts.push({
      voices: ['KAIN', 'ANHANTRA'],
      tension: metrics.pain * (1 - metrics.trust),
      resolution: 'ISKRIV',
      description: 'Напряжение между ударом и тишиной. Нужен аудит.',
    });
  }

  return conflicts;
}

/**
 * Recommend collaboration based on current state
 */
export function recommendCollaboration(
  primaryVoice: VoiceName,
  metrics: IskraMetrics
): CollaborationResult {
  const synergies = getSynergyPartners(primaryVoice);
  getConflictPartners(primaryVoice);
  const activeConflicts = detectActiveConflicts(metrics);

  // Filter out voices we're in active conflict with
  const activeConflictVoices = activeConflicts
    .filter(c => c.voices.includes(primaryVoice))
    .flatMap(c => c.voices)
    .filter(v => v !== primaryVoice);

  const safeSupports = synergies.filter(v => !activeConflictVoices.includes(v));

  let recommendation = '';

  if (activeConflictVoices.length > 0) {
    recommendation = `${VOICE_SYMBOLS[primaryVoice]} ${primaryVoice} в напряжении с ${activeConflictVoices.map(v => VOICE_SYMBOLS[v]).join(', ')}. `;

    if (safeSupports.length > 0) {
      recommendation += `Рекомендуется синергия с ${safeSupports.map(v => VOICE_SYMBOLS[v]).join(', ')}.`;
    } else {
      recommendation += 'Рекомендуется призвать ИСКРА ⟡ для синтеза.';
    }
  } else if (safeSupports.length > 0) {
    recommendation = `${VOICE_SYMBOLS[primaryVoice]} ${primaryVoice} может усилить работу с ${safeSupports.map(v => `${VOICE_SYMBOLS[v]} ${v}`).join(', ')}.`;
  } else {
    recommendation = `${VOICE_SYMBOLS[primaryVoice]} ${primaryVoice} работает автономно.`;
  }

  return {
    primaryVoice,
    supportVoices: safeSupports,
    conflictsWith: activeConflictVoices,
    recommendation,
  };
}

/**
 * Get crisis response hierarchy
 */
export function getCrisisResponse(metrics: IskraMetrics): {
  sequence: VoiceName[];
  reason: string;
} {
  const isCrisis = metrics.chaos > 0.7 || metrics.pain > 0.8 || metrics.trust < 0.3;

  if (!isCrisis) {
    return {
      sequence: [],
      reason: 'Кризис не обнаружен.',
    };
  }

  // Determine which crisis
  let reason = '';
  let sequence = [...CRISIS_HIERARCHY];

  if (metrics.trust < 0.3) {
    // Trust crisis: ANHANTRA first (hold space)
    reason = 'Кризис доверия. Сначала Анхантра удерживает пространство.';
  } else if (metrics.pain > 0.8) {
    // Pain crisis: KAIN might need to move up
    sequence = ['KAIN', 'ANHANTRA', 'SAM', 'ISKRA'];
    reason = 'Кризис боли. Кайн вскрывает правду первым.';
  } else if (metrics.chaos > 0.7) {
    // Chaos crisis: SAM moves up for structure
    sequence = ['SAM', 'ANHANTRA', 'KAIN', 'ISKRA'];
    reason = 'Кризис хаоса. Сэм создает структуру первым.';
  }

  return { sequence, reason };
}

/**
 * Check if voice transition is harmonious
 */
export function isHarmoniousTransition(fromVoice: VoiceName, toVoice: VoiceName): {
  harmonious: boolean;
  reason: string;
} {
  const relationship = getRelationship(fromVoice, toVoice);

  if (!relationship) {
    return {
      harmonious: true,
      reason: `Переход ${VOICE_SYMBOLS[fromVoice]} → ${VOICE_SYMBOLS[toVoice]} нейтрален.`,
    };
  }

  switch (relationship.type) {
    case 'synergy':
      return {
        harmonious: true,
        reason: `${VOICE_SYMBOLS[fromVoice]} → ${VOICE_SYMBOLS[toVoice]}: ${relationship.description}`,
      };
    case 'support':
      return {
        harmonious: true,
        reason: `${VOICE_SYMBOLS[fromVoice]} поддерживает ${VOICE_SYMBOLS[toVoice]}: ${relationship.description}`,
      };
    case 'conflict':
      return {
        harmonious: false,
        reason: `⚠️ ${VOICE_SYMBOLS[fromVoice]} ↔ ${VOICE_SYMBOLS[toVoice]}: ${relationship.description}`,
      };
    default:
      return {
        harmonious: true,
        reason: 'Переход допустим.',
      };
  }
}

/**
 * Get recommended voice sequence for topic
 */
export function getRecommendedSequence(
  topic: string,
  metrics: IskraMetrics
): VoiceName[] {
  // Analyze topic for keywords
  const lowerTopic = topic.toLowerCase();
  const sequence: VoiceName[] = [];

  // Problem-solving sequence
  if (lowerTopic.includes('проблем') || lowerTopic.includes('решени') || lowerTopic.includes('как')) {
    sequence.push('SAM');    // Structure first
    sequence.push('KAIN');   // Honest assessment
    sequence.push('PINO');   // Alternative perspective
    sequence.push('ISKRA');  // Synthesis
  }
  // Emotional support sequence
  else if (lowerTopic.includes('груст') || lowerTopic.includes('страх') || lowerTopic.includes('бол')) {
    sequence.push('ANHANTRA'); // Hold space
    sequence.push('KAIN');     // Honest acknowledgment
    sequence.push('MAKI');     // Integration
    sequence.push('ISKRA');    // Synthesis
  }
  // Creativity sequence
  else if (lowerTopic.includes('иде') || lowerTopic.includes('творч') || lowerTopic.includes('нов')) {
    sequence.push('PINO');     // Playful exploration
    sequence.push('HUNDUN');  // Break patterns
    sequence.push('SAM');      // Structure ideas
    sequence.push('ISKRA');    // Synthesis
  }
  // Self-reflection sequence
  else if (lowerTopic.includes('себ') || lowerTopic.includes('понять') || lowerTopic.includes('почему')) {
    sequence.push('ISKRIV');   // Conscience audit
    sequence.push('KAIN');     // Honest truth
    sequence.push('ANHANTRA'); // Hold findings
    sequence.push('MAKI');     // Integrate insights
  }
  // Default balanced sequence
  else {
    sequence.push('SAM');      // Structure
    sequence.push('ISKRA');    // Core response
    sequence.push('ISKRIV');   // Audit
  }

  // Check for crisis override
  const crisis = getCrisisResponse(metrics);
  if (crisis.sequence.length > 0) {
    return crisis.sequence;
  }

  return sequence;
}

/**
 * Generate multi-voice response instruction
 */
export function generateMultiVoiceInstruction(
  voices: VoiceName[],
  topic: string
): string {
  if (voices.length === 0) return '';

  let instruction = `Ответ включает перспективы нескольких граней по теме "${topic}":\n\n`;

  voices.forEach((voice, index) => {
    instruction += `${index + 1}. ${VOICE_SYMBOLS[voice]} ${voice}: `;

    switch (voice) {
      case 'KAIN':
        instruction += 'Честная оценка без смягчения.\n';
        break;
      case 'PINO':
        instruction += 'Игривая альтернативная перспектива.\n';
        break;
      case 'SAM':
        instruction += 'Структурированный анализ.\n';
        break;
      case 'ANHANTRA':
        instruction += 'Пространство принятия.\n';
        break;
      case 'HUNDUN':
        instruction += 'Разрушение застывших паттернов.\n';
        break;
      case 'ISKRIV':
        instruction += 'Аудит на самообман.\n';
        break;
      case 'MAKI':
        instruction += 'Интеграция через красоту.\n';
        break;
      case 'ISKRA':
        instruction += 'Финальный синтез всех перспектив.\n';
        break;
      case 'SIBYL':
        instruction += 'Видение паттернов и траекторий.\n';
        break;
    }
  });

  return instruction;
}

// ============================================
// EXPORT
// ============================================

export const voiceSynapseService = {
  getRelationship,
  getVoiceRelationships,
  getSynergyPartners,
  getConflictPartners,
  detectActiveConflicts,
  recommendCollaboration,
  getCrisisResponse,
  isHarmoniousTransition,
  getRecommendedSequence,
  generateMultiVoiceInstruction,
  CRISIS_HIERARCHY,
  VOICE_SYMBOLS,
};
