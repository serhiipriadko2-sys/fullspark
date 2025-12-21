/**
 * Configuration for the Delta Rhythm Index calculation.
 * This object centralizes all weights, penalty factors, and smoothing parameters,
 * making the rhythm calculation data-driven and easily calibratable.
 */
export const deltaConfig = {
  version: '1.1.0-rag',
  
  // Weights for core metrics in the base score calculation.
  weights: [0.35, 0.25, 0.15, 0.12, 0.13] as const, // [trust, clarity, 1-pain, 1-drift, 1-chaos]
  
  // Penalty configuration for turbulence and instability.
  penalty: {
    max: 0.40,      // Maximum possible penalty.
    gChaos: 0.5,    // Multiplier for chaos gradient (sudden increase).
    gDrift: 0.3,    // Multiplier for drift gradient.
    interrupt: 0.1, // Multiplier for interruption metric.
    context: 0.1,   // Multiplier for context switch metric.
  },

  // Exponential Moving Average (EMA) smoothing parameters.
  ema: {
    alpha: 0.35, // Smoothing factor for the final rhythm score.
    beta: 0.30,  // Smoothing factor for chaos and drift EMAs.
  }
};
