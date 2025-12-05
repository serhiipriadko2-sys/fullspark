
import { IskraMetrics } from '../types';
import { deltaConfig } from '../config/deltaConfig';

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

/**
 * Calculates the ∆-rhythm index based on core metrics.
 * The formula provides a weighted aggregate of positive components,
 * applies a penalty for turbulence (sudden spikes in chaos/drift),
 * and uses EMA smoothing for a more stable output.
 */
export function calculateRhythmIndex(
    m: IskraMetrics, 
    prevRhythmPercent: number, 
    ema: { chaos: number; drift: number }
): number {
    const prev = prevRhythmPercent / 100.0;
    const { weights, penalty: penaltyConfig, ema: emaConfig } = deltaConfig;

    const positiveComponents = {
        trust: m.trust,
        clarity: m.clarity,
        anti_pain: 1 - m.pain,
        anti_drift: 1 - m.drift,
        anti_chaos: 1 - m.chaos
    };
    
    const [wTrust, wClarity, wPainInv, wDriftInv, wChaosInv] = weights;
    
    const baseScore = 
        wTrust * positiveComponents.trust +
        wClarity * positiveComponents.clarity +
        wPainInv * positiveComponents.anti_pain +
        wDriftInv * positiveComponents.anti_drift +
        wChaosInv * positiveComponents.anti_chaos;

    const chaosGradient = Math.max(0, m.chaos - ema.chaos);
    const driftGradient = Math.max(0, m.drift - ema.drift);
    
    const penaltyValue = 
        penaltyConfig.gChaos * chaosGradient + 
        penaltyConfig.gDrift * driftGradient + 
        penaltyConfig.interrupt * m.interrupt + 
        penaltyConfig.context * m.ctxSwitch;
    
    const penalty = Math.min(penaltyConfig.max, penaltyValue);
    
    const rawDelta = Math.min(1, Math.max(0, baseScore - penalty));
    
    const { alpha } = emaConfig; // Smoothing factor
    const smoothDelta = (1 - alpha) * prev + alpha * rawDelta;
    
    return Math.round(100 * smoothDelta);
}

/**
 * Calculates derived metrics based on the Canon formulas.
 * 
 * mirror_sync (Синхронизация зеркала): (clarity + trust) / 2 - drift
 * trust_seal (Печать доверия): trust * (1 - drift)
 * clarity_pain_index (Индекс ложной ясности): clarity - pain
 * fractality (Law-47): Integrity * Resonance
 */
export function calculateDerivedMetrics(m: IskraMetrics) {
    const mirror_sync = clamp((m.clarity + m.trust) / 2 - m.drift, 0, 1);
    const trust_seal = clamp(m.trust * (1 - m.drift), 0, 1);
    const clarity_pain_index = clamp(m.clarity - m.pain, -1, 1);

    // Law-47 Formulas
    // Integrity = Truth × Flow / Comfort (Simulated)
    // Since we don't have exact "Truth" or "Flow" metrics, we approximate:
    // Truth ~ Clarity, Flow ~ Rhythm/100, Comfort ~ (1-Pain)
    // This is a simplification for simulation purposes.
    const integrity = m.clarity * (m.rhythm / 100) / (1 - m.pain + 0.1); // +0.1 to avoid div by zero
    
    // Resonance = (ΔTrust × ΔPain) / Drift (Simplified as product of current states for snapshot)
    // Resonance ~ (Trust * Pain) / (Drift + 0.1)
    const resonance = (m.trust * m.pain) / (m.drift + 0.1);

    const fractality = integrity * resonance;

    return {
        mirror_sync,
        trust_seal,
        clarity_pain_index,
        fractality
    };
}
