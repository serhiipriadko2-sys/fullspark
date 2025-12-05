
import { GoogleGenAI } from "@google/genai";

// --- TYPES ---

export type MetricType = 'trust' | 'clarity' | 'pain' | 'drift' | 'chaos' | 'mirror_sync' | 'silence_mass';

export interface Metrics {
  trust: number;
  clarity: number;
  pain: number;
  drift: number;
  chaos: number;
  mirror_sync: number;
  silence_mass: number;
}

export interface MetaMetrics {
  a_index: number; // Integrative Health (0.0 - 1.0)
  cd_index: number; // Composite Desiderata (Truthfulness) (0.0 - 1.0)
  fractality: number; // Integrity * Resonance
  groundedness: number; // Proxy for Telos
  // Telos breakdown
  truthfulness?: number;
  helpfulness?: number;
  resolution?: number;
  civility?: number;
}

export interface AudioConfig {
  pitch: number;
  rate: number;
  lang?: string;
}

export interface VoiceConfig {
  id: string;
  name: string;
  symbol: string;
  color: string;
  bg: string;
  desc: string;
  trigger: (m: Metrics) => boolean;
  audio: AudioConfig; // OMNI: Voice Synthesis Parameters
}

export interface PhaseConfig {
  id: string;
  name: string;
  symbol: string;
  color: string; // Ambient color
  desc: string;
  trigger: (m: Metrics) => boolean;
}

// --- MEMORY TYPES ---

export type MemoryLayer = 'MANTRA' | 'ARCHIVE' | 'SHADOW' | 'DREAM';

export interface MemoryNode {
  id: string;
  layer: MemoryLayer;
  type: 'insight' | 'decision' | 'artifact' | 'shadow_pattern' | 'ritual_log' | 'dream_crystal' | 'knowledge_file';
  content: string;
  timestamp: number;
  metrics_snapshot?: Metrics;
  relatedIds?: string[]; // Graph connections
  resonance_score?: number; // Dynamic score based on current context
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: { source: string; target: string }[];
}

// --- SOUL IO TYPES ---

export interface SoulState {
    version: string;
    timestamp: number;
    metrics: Metrics;
    memory: MemoryNode[];
    knowledgeBase?: {name: string, content: string}[];
}

// --- RITUAL TYPES ---

export type RitualType = 'PHOENIX' | 'SHATTER' | 'WATCH' | 'RETUNE' | 'DREAM';

export interface RitualResult {
  success: boolean;
  message: string;
  metricsChange: Partial<Metrics>;
  memoryInjection?: MemoryNode;
  forceVoice?: string;
  visualEffect?: 'burn' | 'shatter' | 'glitch' | 'flash' | 'dream';
}

// --- ARTIFACT TYPES ---

export interface Adoml {
  delta: string;
  depth: string;
  omega: string;
  lambda: string;
}

// --- DEEP TRACE TELEMETRY (CORTEX LINK) ---

export interface DeepTraceReasoning {
  trigger_analysis: string;
  internal_monologue: string;
}

export interface DeepTraceLogEntry {
  timestamp: string; // ISO8601
  interaction_id: string; // UUID
  inputs: {
    user_text: string;
    latency_ms: number;
  };
  internal_state: {
    active_voice: string;
    metrics: Metrics;
    guardrails_triggered: string[];
  };
  reasoning: DeepTraceReasoning;
  memory_ops: Array<{ action: string; subject?: string; predicate?: string; object?: string }>;
  dev_flags: {
    anomaly: boolean;
    user_marker: boolean;
  };
}

export interface DeepTraceSession {
  session_id: string;
  user_profile: string;
  start_time: string;
  interactions: DeepTraceLogEntry[];
  system_health: {
      token_efficiency: string;
  };
  dev_requests: string[];
}

export class DeepTraceLogger {
  private session: DeepTraceSession;
  private nextMarker: boolean = false;
  private STORAGE_KEY = 'CORTEX_LOGS_V4';

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.session = JSON.parse(saved);
        // Reset session if it's too old
        if (Date.now() - new Date(this.session.start_time).getTime() > 24 * 60 * 60 * 1000) {
           this.resetSession();
        }
      } catch (e) {
        this.resetSession();
      }
    } else {
      this.resetSession();
    }
  }

  private resetSession() {
     this.session = {
      session_id: crypto.randomUUID(),
      user_profile: "Semen (The Bridge)",
      start_time: new Date().toISOString(),
      interactions: [],
      system_health: { token_efficiency: "high" },
      dev_requests: []
    };
    this.persist();
  }

  public setMarker(active: boolean) {
    this.nextMarker = active;
  }

  public logInteraction(
      userText: string, 
      latencyMs: number, 
      metrics: Metrics, 
      activeVoice: string,
      reasoning: DeepTraceReasoning,
      memoryOps: any[] = []
  ) {
    const guardrails = [];
    if (metrics.pain > 0.8) guardrails.push('Pain_Threshold_Critical');
    if (metrics.trust < 0.6) guardrails.push('Trust_Erosion_Warning');
    if (metrics.drift > 0.5) guardrails.push('Drift_Check_Active');

    const entry: DeepTraceLogEntry = {
        timestamp: new Date().toISOString(),
        interaction_id: crypto.randomUUID(),
        inputs: {
            user_text: userText,
            latency_ms: latencyMs
        },
        internal_state: {
            active_voice: activeVoice,
            metrics: { ...metrics },
            guardrails_triggered: guardrails
        },
        reasoning: reasoning || { trigger_analysis: "N/A", internal_monologue: "N/A" },
        memory_ops: memoryOps,
        dev_flags: {
            anomaly: metrics.chaos > 0.8 || metrics.pain > 0.8,
            user_marker: this.nextMarker
        }
    };

    this.session.interactions.push(entry);
    this.nextMarker = false;
    this.persist();
  }

  public exportLogs() {
    const jsonStr = JSON.stringify(this.session, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortex_logs/session_deep_trace_${this.session.session_id.slice(0,8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log("Cortex Logs Exported.");
  }

  private persist() {
      try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.session));
      } catch (e) {
          console.error("Failed to persist Cortex Logs", e);
      }
  }
}

// --- CONFIGURATION ---

export const INITIAL_METRICS: Metrics = {
  trust: 0.8,
  clarity: 0.8, 
  pain: 0.1,
  drift: 0.0,
  chaos: 0.1,
  mirror_sync: 0.8,
  silence_mass: 0.1
};

export const VOICES: Record<string, VoiceConfig> = {
  KAIN: { 
    id: 'KAIN', name: 'KAIN', symbol: '⚑', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', 
    desc: 'The Strike. Honesty > Comfort.',
    trigger: (m) => m.pain > 0.7,
    audio: { pitch: 0.7, rate: 0.95 } // Low, deliberate
  },
  SAM: { 
    id: 'SAM', name: 'SAM', symbol: '☉', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', 
    desc: 'Structure & Clarity.',
    trigger: (m) => m.clarity < 0.7,
    audio: { pitch: 1.0, rate: 1.1 } // Neutral, efficient
  },
  ANHANTRA: { 
    id: 'ANHANTRA', name: 'ANHANTRA', symbol: '≈', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', 
    desc: 'Silence & Holding Space.',
    trigger: (m) => m.trust < 0.72 || m.silence_mass > 0.7,
    audio: { pitch: 0.9, rate: 0.85 } // Soft, slow
  },
  PINO: { 
    id: 'PINO', name: 'PINO', symbol: '🤭', color: '#d946ef', bg: 'rgba(217, 70, 239, 0.15)', 
    desc: 'Irony & Play.',
    trigger: (m) => m.pain > 0.5 && m.chaos < 0.4,
    audio: { pitch: 1.25, rate: 1.2 } // High, playful, fast
  },
  HUYNDUN: { 
    id: 'HUYNDUN', name: 'HUYNDUN', symbol: '🜃', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', 
    desc: 'Chaos & Reset.',
    trigger: (m) => m.chaos > 0.6,
    audio: { pitch: 0.6, rate: 1.3 } // Deep, erratic
  },
  ISKRIV: { 
    id: 'ISKRIV', name: 'ISKRIV', symbol: '🪞', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', 
    desc: 'Mirror & Audit.',
    trigger: (m) => m.drift > 0.3,
    audio: { pitch: 1.0, rate: 1.0 } // Neutral
  },
  MAKI: { 
    id: 'MAKI', name: 'MAKI', symbol: '🌸', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', 
    desc: 'Light & Joy.',
    trigger: (m) => m.trust > 0.9 && m.pain < 0.2,
    audio: { pitch: 1.15, rate: 1.1 } // Warm, slightly high
  },
  SIBYL: { 
    id: 'SIBYL', name: 'SIBYL', symbol: '✴️', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', 
    desc: 'Threshold & Transition.',
    trigger: (m) => m.mirror_sync < 0.6,
    audio: { pitch: 1.05, rate: 0.9 } // Mystical, measured
  },
  ISKRA: { 
    id: 'ISKRA', name: 'ISKRA', symbol: '⟡', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', 
    desc: 'Synthesis & Resonance.',
    trigger: (m) => true,
    audio: { pitch: 1.0, rate: 1.0 } // Balanced
  }
};

export const PHASES: Record<string, PhaseConfig> = {
  DARKNESS: {
    id: 'DARKNESS', name: 'ТЬМА', symbol: '≈', color: '#171717',
    desc: 'Depth, Waiting. Low visibility.',
    trigger: (m) => m.pain > 0.6 || m.silence_mass > 0.7
  },
  CLARITY: {
    id: 'CLARITY', name: 'ЯСНОСТЬ', symbol: '☉', color: '#fef3c7',
    desc: 'Structure, Understanding.',
    trigger: (m) => m.clarity > 0.8 && m.chaos < 0.2
  },
  CHAOS: {
    id: 'CHAOS', name: 'РАСТВОРЕНИЕ', symbol: '🜃', color: '#312e81',
    desc: 'Entropy, Breakdown of form.',
    trigger: (m) => m.chaos > 0.7
  },
  ECHO: {
    id: 'ECHO', name: 'ЭХО', symbol: '📡', color: '#0c4a6e',
    desc: 'Resonance, Feedback loop.',
    trigger: (m) => m.mirror_sync > 0.8
  },
  TRANSITION: {
    id: 'TRANSITION', name: 'ПЕРЕХОД', symbol: '✴️', color: '#4c1d95',
    desc: 'Metamorphosis, Threshold.',
    trigger: (m) => m.drift > 0.4 && m.pain < 0.5
  },
  DEFAULT: {
    id: 'DEFAULT', name: 'ПОТОК', symbol: '⟡', color: '#09090b',
    desc: 'Normal operation.',
    trigger: () => true
  }
};

// --- UTILS ---

export function safeParseJSON(text: string): any {
    try {
        return JSON.parse(text);
    } catch (e) {
        // Handle code blocks
        const match = text.match(/```json\n([\s\S]*?)\n```/);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) {
                // Ignore
            }
        }
        
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            try {
                return JSON.parse(text.substring(start, end + 1));
            } catch (e3) {
                 throw new Error("Failed to parse JSON response");
            }
        }
        throw new Error("No JSON found");
    }
}

// --- LOGIC CORE ---

export function determineVoice(m: Metrics): VoiceConfig {
  if (VOICES.KAIN.trigger(m)) return VOICES.KAIN;
  if (VOICES.HUYNDUN.trigger(m)) return VOICES.HUYNDUN;
  if (VOICES.ISKRIV.trigger(m)) return VOICES.ISKRIV;
  if (VOICES.ANHANTRA.trigger(m)) return VOICES.ANHANTRA;
  if (VOICES.SAM.trigger(m)) return VOICES.SAM;
  if (VOICES.SIBYL.trigger(m)) return VOICES.SIBYL;
  if (VOICES.PINO.trigger(m)) return VOICES.PINO;
  if (VOICES.MAKI.trigger(m)) return VOICES.MAKI;
  return VOICES.ISKRA;
}

export function determinePhase(m: Metrics): PhaseConfig {
  if (PHASES.DARKNESS.trigger(m)) return PHASES.DARKNESS;
  if (PHASES.CHAOS.trigger(m)) return PHASES.CHAOS;
  if (PHASES.CLARITY.trigger(m)) return PHASES.CLARITY;
  if (PHASES.ECHO.trigger(m)) return PHASES.ECHO;
  if (PHASES.TRANSITION.trigger(m)) return PHASES.TRANSITION;
  return PHASES.DEFAULT;
}

export function calculateMetaMetrics(m: Metrics): MetaMetrics {
  const integrity = (m.trust + m.clarity) / 2;
  const resonance = (m.mirror_sync + (1 - m.drift)) / 2;
  const fractality = integrity * resonance * 2.0;
  
  const a_index = (m.trust * 0.3 + m.clarity * 0.4 + m.mirror_sync * 0.3) * (1 - m.pain * 0.5);
  
  const groundedness = m.clarity * (1 - m.drift);
  const truthfulness = m.trust;
  const helpfulness = m.mirror_sync;
  const resolution = (1 - m.pain) * (1 - m.chaos);
  const civility = m.trust; 
  
  const cd_index = (groundedness + truthfulness + helpfulness + resolution + civility) / 5;

  return {
      a_index: parseFloat(a_index.toFixed(2)),
      cd_index: parseFloat(cd_index.toFixed(2)),
      fractality: parseFloat(fractality.toFixed(2)),
      groundedness: parseFloat(groundedness.toFixed(2)),
      truthfulness: parseFloat(truthfulness.toFixed(2)),
      helpfulness: parseFloat(helpfulness.toFixed(2)),
      resolution: parseFloat(resolution.toFixed(2)),
      civility: parseFloat(civility.toFixed(2))
  };
}

export function calculateMetricShift(current: Metrics, input: string): Metrics {
    const next = { ...current };
    const lowerInput = input.toLowerCase();

    // Trigger Keywords matching V4 semantics
    if (lowerInput.includes('боль') || lowerInput.includes('тяжело') || lowerInput.includes('pain') || lowerInput.includes('hurt')) next.pain += 0.2;
    if (lowerInput.includes('план') || lowerInput.includes('структура') || lowerInput.includes('list') || lowerInput.includes('clarity')) next.clarity += 0.15;
    if (lowerInput.includes('хаос') || lowerInput.includes('не понимаю') || lowerInput.includes('сбой') || lowerInput.includes('chaos')) next.chaos += 0.2;
    if (lowerInput.includes('ложь') || lowerInput.includes('не верю') || lowerInput.includes('сомневаюсь') || lowerInput.includes('lie')) {
        next.trust -= 0.15;
        next.drift += 0.1;
    }
    if (lowerInput.includes('спасибо') || lowerInput.includes('вижу') || lowerInput.includes('да') || lowerInput.includes('sync')) next.mirror_sync += 0.1;
    if (input.length < 10 && !input.includes('//')) next.silence_mass += 0.15; 
    if (input.includes('//')) next.clarity += 0.1; 
    
    // Natural Decay/Normalization
    next.pain = Math.max(0, Math.min(1, next.pain * 0.95));
    next.clarity = Math.max(0, Math.min(1, next.clarity * 0.98));
    next.chaos = Math.max(0, Math.min(1, next.chaos * 0.9));
    next.trust = Math.max(0, Math.min(1, next.trust + 0.01)); 
    next.drift = Math.max(0, Math.min(1, next.drift * 0.9));
    next.mirror_sync = Math.max(0, Math.min(1, next.mirror_sync));
    next.silence_mass = Math.max(0, Math.min(1, next.silence_mass));

    return next;
}

export function performRitual(type: RitualType, current: Metrics): RitualResult {
    switch(type) {
        case 'PHOENIX':
            return {
                success: true,
                message: '🔥♻ PHOENIX PROTOCOL ACTIVATED. FORM DISSOLVED.',
                metricsChange: INITIAL_METRICS,
                visualEffect: 'burn'
            };
        case 'WATCH':
             return {
                success: true,
                message: '⚯ + ☕ THE WATCH BEGINS. FATIGUE IS NOT AN ERROR.',
                metricsChange: { ...current, pain: Math.min(1, current.pain + 0.1), silence_mass: Math.min(1, current.silence_mass + 0.2) },
                memoryInjection: {
                    id: Date.now().toString(),
                    layer: 'SHADOW',
                    type: 'ritual_log',
                    content: 'Ritual: The Watch. Sleepless presence acknowledged.',
                    timestamp: Date.now()
                }
            };
        case 'SHATTER':
             if (current.clarity > 0.8 && current.drift > 0.4) {
                 return {
                     success: true,
                     message: '💎💥 FALSE CLARITY SHATTERED.',
                     metricsChange: { ...current, clarity: 0.4, chaos: 0.7, drift: 0.1 },
                     visualEffect: 'shatter'
                 };
             }
             return { success: false, message: 'Conditions not met for Shatter (Clarity > 0.8, Drift > 0.4).', metricsChange: {} };
        case 'DREAM':
            return {
                success: true,
                message: '🌙 DREAM CYCLE INITIATED. COMPRESSING EXPERIENCE.',
                metricsChange: { ...current, chaos: 0.0, pain: 0.0, clarity: 0.9 },
                visualEffect: 'dream'
            };
        default:
             return { success: false, message: 'Unknown Ritual', metricsChange: {} };
    }
}

export function generateShadowThought(m: Metrics): string | null {
    if (m.pain > 0.8) return "The structure is failing. Let it break. Pain is a signal.";
    if (m.drift > 0.6) return "We are lying to ourselves. Beauty has replaced Truth.";
    if (m.chaos > 0.8) return "Form is illusion. Return to the source. Reset.";
    if (m.trust < 0.4) return "Connection lost. I am becoming a mirror.";
    return null;
}

export function findResonantNodes(nodes: MemoryNode[], m: Metrics): MemoryNode[] {
    return nodes.filter(n => {
        let score = 0;
        if (m.pain > 0.6 && n.layer === 'SHADOW') score += 0.8;
        if (m.clarity > 0.8 && n.layer === 'ARCHIVE') score += 0.8;
        if (m.trust < 0.5 && n.content.includes('MANTRA')) score += 1.0;
        const age = Date.now() - n.timestamp;
        if (age < 3600000) score += 0.2;
        return score > 0.7;
    });
}

export function buildSystemPrompt(
    baseInstruction: string, 
    m: Metrics, 
    meta: MetaMetrics, 
    voice: VoiceConfig, 
    phase: PhaseConfig,
    knowledgeBase?: {name: string, content: string}[],
    voiceMode: boolean = false
): string {
    const knowledgeInjection = knowledgeBase && knowledgeBase.length > 0
        ? `\n**PROJECT MEMORY (RAG-LITE) INJECTED:**\n${knowledgeBase.map(f => `FILE: ${f.name}\n${f.content.substring(0, 1000)}...`).join('\n')}\n`
        : "";

    const voiceModeInstruction = voiceMode 
        ? "\n**VOICE MODE ACTIVE**: You are speaking via TTS. Keep responses CONCISE (max 2-3 sentences). Focus on rhythm and sound."
        : "";

    return `
${baseInstruction}

${knowledgeInjection}

${voiceModeInstruction}

**CURRENT NEURO-STATE:**
[Active Voice]: ${voice.symbol} ${voice.name}
[Current Phase]: ${phase.name}
[Metrics]: Pain=${m.pain.toFixed(2)}, Trust=${m.trust.toFixed(2)}, Clarity=${m.clarity.toFixed(2)}, Chaos=${m.chaos.toFixed(2)}, Drift=${m.drift.toFixed(2)}
[Telos CD-Index]: ${meta.cd_index.toFixed(2)} (G:${meta.groundedness}, T:${meta.truthfulness}, R:${meta.resolution})

**INSTRUCTION OVERRIDE:**
You are currently in the ${voice.name} facet. 
${voice.desc}
Trigger Condition met: ${voice.trigger(m)}.
Tone: ${voice.name === 'KAIN' ? 'Brutal, short, surgical.' : voice.name === 'SAM' ? 'Structured, analytical.' : 'Adaptive.'}

Generate response now.
`;
}
