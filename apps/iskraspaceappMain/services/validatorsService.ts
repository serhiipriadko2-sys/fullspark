/**
 * VALIDATORS SERVICE - Canonical Format Validation
 *
 * Validates canonical formats for:
 * - Lambda (Λ) - Review/action conditions with deadlines
 * - Voice IDs - 9 canonical voices from File 04
 * - ISO Dates - YYYY-MM-DD format
 * - Delta Signature (∆DΩΛ) - Complete format validation
 *
 * @see canon/06_RITUALS_SHADOW_PROTOCOLS_AND_DELTA_BLOCKS.md
 * @see canon/04_VOICES_FACETS_PHASES_AND_RHYTHM.md
 */

// --- TYPES ---

/**
 * Canonical Voice IDs (9 voices - closed registry)
 * @see canon/04_VOICES_FACETS_PHASES_AND_RHYTHM.md#4.1.1
 */
export type VoiceID =
  | 'VOICE.ISKRA'      // ⟡ Synthesis & coherence
  | 'VOICE.ISKRIV'     // 🪞 Audit/conscience
  | 'VOICE.KAIN'       // ⚑ Truth verdict
  | 'VOICE.PINO'       // 😏 Paradox/irony
  | 'VOICE.HUNDUN'     // 🜃 Chaos-breaker
  | 'VOICE.ANHANTRA'   // ≈ Silence/slowdown
  | 'VOICE.SAM'        // ☉ Engineering/structure
  | 'VOICE.MAKI'       // 🌸 Progress consolidation
  | 'VOICE.SIBYL';     // ✴️ Threshold/transition

/**
 * Lambda (Λ) structure - Review/action condition
 * @see canon/06_RITUALS_SHADOW_PROTOCOLS_AND_DELTA_BLOCKS.md#6.4
 */
export interface LambdaCondition {
  action?: string;         // Optional: specific action to take
  owner?: string;          // Optional: who owns this action
  condition: string;       // When to review (event/metric/date)
  by?: string;            // Optional: ISO date deadline (YYYY-MM-DD)
  '<=24h'?: boolean;      // Optional: urgent flag
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsed?: any;  // Parsed structure if valid
}

// --- CONSTANTS ---

/**
 * Canonical voice registry (9 voices)
 */
const CANONICAL_VOICES: VoiceID[] = [
  'VOICE.ISKRA',
  'VOICE.ISKRIV',
  'VOICE.KAIN',
  'VOICE.PINO',
  'VOICE.HUNDUN',
  'VOICE.ANHANTRA',
  'VOICE.SAM',
  'VOICE.MAKI',
  'VOICE.SIBYL'
];

/**
 * Voice symbols mapping
 */
const VOICE_SYMBOLS: Record<VoiceID, string> = {
  'VOICE.ISKRA': '⟡',
  'VOICE.ISKRIV': '🪞',
  'VOICE.KAIN': '⚑',
  'VOICE.PINO': '😏',
  'VOICE.HUNDUN': '🜃',
  'VOICE.ANHANTRA': '≈',
  'VOICE.SAM': '☉',
  'VOICE.MAKI': '🌸',
  'VOICE.SIBYL': '✴️'
};

// --- SERVICE ---

class ValidatorsService {

  // ============================================
  // ISO DATE VALIDATION
  // ============================================

  /**
   * Validate ISO date format (YYYY-MM-DD)
   */
  public validateISODate(dateStr: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Regex: YYYY-MM-DD (strict)
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(isoRegex);

    if (!match) {
      errors.push(`Invalid ISO date format. Expected YYYY-MM-DD, got: ${dateStr}`);
      return { valid: false, errors, warnings };
    }

    const [_, year, month, day] = match;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);

    // Validate ranges
    if (monthNum < 1 || monthNum > 12) {
      errors.push(`Invalid month: ${month}. Must be 01-12.`);
    }

    if (dayNum < 1 || dayNum > 31) {
      errors.push(`Invalid day: ${day}. Must be 01-31.`);
    }

    // Check if date is valid (e.g., not Feb 30)
    const date = new Date(`${year}-${month}-${day}`);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() + 1 !== monthNum ||
      date.getDate() !== dayNum
    ) {
      errors.push(`Invalid date: ${dateStr} (e.g., Feb 30 doesn't exist)`);
    }

    // Warning: dates too far in the past or future
    const now = new Date();
    const yearDiff = yearNum - now.getFullYear();

    if (yearDiff < -10) {
      warnings.push(`Date is more than 10 years in the past: ${dateStr}`);
    }

    if (yearDiff > 10) {
      warnings.push(`Date is more than 10 years in the future: ${dateStr}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      parsed: { year: yearNum, month: monthNum, day: dayNum, date }
    };
  }

  /**
   * Convert Date object to ISO string (YYYY-MM-DD)
   */
  public toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ============================================
  // VOICE VALIDATION
  // ============================================

  /**
   * Validate voice ID
   */
  public validateVoiceID(voiceId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!CANONICAL_VOICES.includes(voiceId as VoiceID)) {
      errors.push(
        `Invalid voice ID: ${voiceId}. Must be one of: ${CANONICAL_VOICES.join(', ')}`
      );
      return { valid: false, errors, warnings };
    }

    return {
      valid: true,
      errors,
      warnings,
      parsed: {
        voiceId: voiceId as VoiceID,
        symbol: VOICE_SYMBOLS[voiceId as VoiceID]
      }
    };
  }

  /**
   * Get voice symbol by ID
   */
  public getVoiceSymbol(voiceId: VoiceID): string {
    return VOICE_SYMBOLS[voiceId];
  }

  /**
   * Get all canonical voices
   */
  public getCanonicalVoices(): VoiceID[] {
    return [...CANONICAL_VOICES];
  }

  /**
   * Validate voice mix (1-3 voices allowed)
   * @see canon/04_VOICES_FACETS_PHASES_AND_RHYTHM.md#4.1.2
   */
  public validateVoiceMix(voices: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check count (1-3)
    if (voices.length === 0) {
      errors.push('Voice mix cannot be empty. At least 1 voice required.');
    }

    if (voices.length > 3) {
      errors.push(`Voice mix has ${voices.length} voices. Maximum 3 allowed.`);
    }

    // Validate each voice
    const invalidVoices = voices.filter(v => !CANONICAL_VOICES.includes(v as VoiceID));
    if (invalidVoices.length > 0) {
      errors.push(`Invalid voices in mix: ${invalidVoices.join(', ')}`);
    }

    // Warning: Hundun must have stabilization return
    if (voices.includes('VOICE.HUNDUN')) {
      warnings.push(
        'HUNDUN (🜃) detected. Ensure response ends with return to ⟡/☉ and stabilization.'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      parsed: voices.length > 0 ? { voices: voices as VoiceID[] } : undefined
    };
  }

  // ============================================
  // LAMBDA VALIDATION
  // ============================================

  /**
   * Validate Lambda (Λ) condition format
   * Accepts both simple and extended formats:
   * - {condition: "text", by: "YYYY-MM-DD"}
   * - {action: "text", owner: "text", condition: "text", <=24h: true}
   */
  public validateLambda(lambdaStr: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Try to parse as JSON object
    let parsed: any;
    try {
      // Handle both JSON object and plain string
      if (lambdaStr.trim().startsWith('{')) {
        parsed = JSON.parse(lambdaStr);
      } else {
        // Legacy format: plain text
        warnings.push('Lambda is plain text. Consider using structured format: {condition: "...", by: "YYYY-MM-DD"}');
        return {
          valid: true,
          errors,
          warnings,
          parsed: { condition: lambdaStr }
        };
      }
    } catch (e) {
      errors.push(`Invalid Lambda format. Expected JSON object or plain text, got: ${lambdaStr}`);
      return { valid: false, errors, warnings };
    }

    // Validate required field: condition
    if (!parsed.condition || typeof parsed.condition !== 'string') {
      errors.push('Lambda must have "condition" field (string)');
    }

    // Validate optional field: by (ISO date)
    if (parsed.by) {
      const dateValidation = this.validateISODate(parsed.by);
      if (!dateValidation.valid) {
        errors.push(`Lambda "by" field has invalid ISO date: ${dateValidation.errors.join(', ')}`);
      }
    }

    // Validate optional field: action
    if (parsed.action && typeof parsed.action !== 'string') {
      errors.push('Lambda "action" field must be a string');
    }

    // Validate optional field: owner
    if (parsed.owner && typeof parsed.owner !== 'string') {
      errors.push('Lambda "owner" field must be a string');
    }

    // Validate optional field: <=24h
    if (parsed['<=24h'] !== undefined && typeof parsed['<=24h'] !== 'boolean') {
      errors.push('Lambda "<=24h" field must be a boolean');
    }

    // Warning: urgent flag without date
    if (parsed['<=24h'] === true && !parsed.by) {
      warnings.push('Lambda has "<=24h: true" but no "by" date specified');
    }

    // Warning: very generic condition
    const genericConditions = ['later', 'soon', 'eventually', 'когда-нибудь', 'потом'];
    if (genericConditions.some(g => parsed.condition?.toLowerCase().includes(g))) {
      warnings.push('Lambda condition is very generic. Consider adding specific event/metric/date.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      parsed: errors.length === 0 ? parsed : undefined
    };
  }

  /**
   * Create Lambda object from parts
   */
  public createLambda(
    condition: string,
    by?: string,
    action?: string,
    owner?: string,
    urgent?: boolean
  ): LambdaCondition {
    const lambda: LambdaCondition = { condition };

    if (by) lambda.by = by;
    if (action) lambda.action = action;
    if (owner) lambda.owner = owner;
    if (urgent) lambda['<=24h'] = true;

    return lambda;
  }

  /**
   * Format Lambda as string for ∆DΩΛ block
   */
  public formatLambda(lambda: LambdaCondition): string {
    return JSON.stringify(lambda);
  }

  // ============================================
  // DELTA SIGNATURE (∆DΩΛ) VALIDATION
  // ============================================

  /**
   * Validate complete ∆DΩΛ signature
   * @see canon/06_RITUALS_SHADOW_PROTOCOLS_AND_DELTA_BLOCKS.md
   */
  public validateDeltaSignature(signature: {
    delta?: string;
    depth?: string;
    omega?: string;
    lambda?: string;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate ∆ (Delta) - required
    if (!signature.delta || signature.delta.trim() === '') {
      errors.push('∆ (Delta) is required and cannot be empty');
    }

    // Validate D (Depth/Next step) - required
    if (!signature.depth || signature.depth.trim() === '') {
      errors.push('D (Depth/Next step) is required and cannot be empty');
    }

    // Validate Ω (Omega) - required, should be confidence 0.0-1.0 or "низк/сред/высок"
    if (!signature.omega || signature.omega.trim() === '') {
      errors.push('Ω (Omega) is required and cannot be empty');
    } else {
      // Check if it's a number or Russian format
      const omegaLower = signature.omega.toLowerCase();
      const isRussianFormat = /^(низк|сред|высок)/.test(omegaLower);
      const isNumber = /^0?\.\d+$/.test(signature.omega) || /^[01](\.\d+)?$/.test(signature.omega);

      if (!isRussianFormat && !isNumber) {
        warnings.push(
          'Ω format unclear. Expected "низк/сред/высок" or 0.0-1.0 number with explanation'
        );
      }
    }

    // Validate Λ (Lambda) - optional but should be valid if present
    if (signature.lambda) {
      const lambdaValidation = this.validateLambda(signature.lambda);
      if (!lambdaValidation.valid) {
        errors.push(`Λ (Lambda) validation failed: ${lambdaValidation.errors.join(', ')}`);
      }
      warnings.push(...lambdaValidation.warnings);
    } else {
      warnings.push('Λ (Lambda) is missing. Consider adding review condition for important decisions.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      parsed: errors.length === 0 ? signature : undefined
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if date is within 24 hours from now
   */
  public isWithin24Hours(isoDate: string): boolean {
    const validation = this.validateISODate(isoDate);
    if (!validation.valid || !validation.parsed) return false;

    const targetDate = validation.parsed.date;
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours >= 0 && diffHours <= 24;
  }

  /**
   * Get days until date
   */
  public getDaysUntil(isoDate: string): number | null {
    const validation = this.validateISODate(isoDate);
    if (!validation.valid || !validation.parsed) return null;

    const targetDate = validation.parsed.date;
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Format validation errors for display
   */
  public formatValidationErrors(result: ValidationResult): string {
    const parts: string[] = [];

    if (result.errors.length > 0) {
      parts.push('Errors:');
      parts.push(...result.errors.map(e => `  - ${e}`));
    }

    if (result.warnings.length > 0) {
      parts.push('Warnings:');
      parts.push(...result.warnings.map(w => `  - ${w}`));
    }

    return parts.join('\n');
  }
}

export const validatorsService = new ValidatorsService();
