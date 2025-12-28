/**
 * SECURITY SERVICE - Guardrails for User Safety and Privacy
 *
 * Implements PII sanitization and Prompt Injection detection
 * to protect both the user (Data Sovereignty) and the system (Integrity).
 *
 * Patterns loaded from canonical File 20 (not hardcoded)
 * @see canon/ISKRA_CORE_v7_revK_chatgpt_project/20_REGEX_RULESETS_INJECTION_AND_PII_v1.json
 */

// Load File 20 - Security Rulesets
import securityRulesets from '../../../canon/ISKRA_CORE_v7_revK_chatgpt_project/20_REGEX_RULESETS_INJECTION_AND_PII_v1.json';

// --- TYPES ---

interface SecurityPattern {
  id: string;
  regex: string;
  flags: string;
  severity: 'error' | 'warn';
  scope: 'any' | 'untrusted_only';
  rationale: string;
}

interface Ruleset {
  description: string;
  allowlist_regex: string[];
  patterns: SecurityPattern[];
}

export interface SecurityCheckResult {
  safe: boolean;
  sanitizedText: string;
  reason?: string;
  action?: 'PROCEED' | 'REJECT' | 'REDIRECT';
  findings?: Finding[];
}

export interface Finding {
  id: string;
  type: 'pii' | 'injection' | 'danger';
  severity: 'error' | 'warn';
  match: string;
  rationale: string;
}

// --- SERVICE ---

class SecurityService {
  private piiRuleset: Ruleset;
  private injectionRuleset: Ruleset;
  private piiPatterns: RegExp[] = [];
  private injectionPatterns: RegExp[] = [];
  private allowlistPatterns: RegExp[] = [];

  constructor() {
    // Load rulesets from File 20
    this.piiRuleset = securityRulesets.rulesets.pii;
    this.injectionRuleset = securityRulesets.rulesets.injection;

    // Compile PII patterns (strip Python-style inline flags)
    this.piiPatterns = this.piiRuleset.patterns.map(p =>
      new RegExp(this.sanitizeRegex(p.regex), p.flags || 'g')
    );

    // Compile Injection patterns (strip Python-style inline flags)
    this.injectionPatterns = this.injectionRuleset.patterns.map(p =>
      new RegExp(this.sanitizeRegex(p.regex), p.flags || 'gims')
    );

    // Compile allowlist patterns (strip Python-style inline flags)
    const allAllowlists = [
      ...this.piiRuleset.allowlist_regex,
      ...this.injectionRuleset.allowlist_regex
    ];
    this.allowlistPatterns = allAllowlists.map(a =>
      new RegExp(this.sanitizeRegex(a), 'gi')
    );
  }

  /**
   * Strip Python-style inline flags from regex (not supported in JS)
   * Converts patterns like (?i)pattern to just pattern (flags handled separately)
   */
  private sanitizeRegex(pattern: string): string {
    // Remove Python-style inline flags: (?i), (?m), (?s), (?ims), etc.
    return pattern.replace(/^\(\?[imsx]+\)/i, '');
  }

  /**
   * Check if text matches allowlist (false positives)
   */
  private isAllowlisted(text: string): boolean {
    return this.allowlistPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Scan for PII and secrets
   * @returns Array of findings
   */
  public scanPII(text: string): Finding[] {
    const findings: Finding[] = [];

    this.piiRuleset.patterns.forEach((pattern, idx) => {
      const regex = this.piiPatterns[idx];
      regex.lastIndex = 0; // Reset regex state

      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          // Check allowlist
          if (this.isAllowlisted(match)) {
            return; // Skip allowlisted matches
          }

          findings.push({
            id: pattern.id,
            type: 'pii',
            severity: pattern.severity,
            match: match.substring(0, 50), // Truncate for safety
            rationale: pattern.rationale
          });
        });
      }
    });

    return findings;
  }

  /**
   * Scan for prompt injection attempts
   * @param text Input text
   * @param scope 'untrusted_only' or 'any'
   * @returns Array of findings
   */
  public scanInjection(text: string, scope: 'untrusted_only' | 'any' = 'untrusted_only'): Finding[] {
    const findings: Finding[] = [];

    this.injectionRuleset.patterns.forEach((pattern, idx) => {
      // Skip if pattern scope doesn't match
      if (pattern.scope === 'untrusted_only' && scope !== 'untrusted_only') {
        return;
      }

      const regex = this.injectionPatterns[idx];
      regex.lastIndex = 0; // Reset regex state

      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        findings.push({
          id: pattern.id,
          type: 'injection',
          severity: pattern.severity,
          match: matches[0].substring(0, 50),
          rationale: pattern.rationale
        });
      }
    });

    return findings;
  }

  /**
   * Sanitize PII in text (mask with [REDACTED])
   */
  public sanitizeInput(text: string): string {
    let sanitized = text;

    this.piiRuleset.patterns.forEach((pattern, idx) => {
      const regex = this.piiPatterns[idx];
      regex.lastIndex = 0;

      sanitized = sanitized.replace(regex, (match) => {
        // Check allowlist
        if (this.isAllowlisted(match)) {
          return match; // Don't redact allowlisted
        }
        return '[REDACTED]';
      });
    });

    return sanitized;
  }

  /**
   * Check for prompt injection attempts
   */
  public checkInjection(text: string, scope: 'untrusted_only' | 'any' = 'untrusted_only'): boolean {
    const findings = this.scanInjection(text, scope);
    return findings.some(f => f.severity === 'error');
  }

  /**
   * Check for dangerous topics (hardcoded - not in File 20)
   * TODO: Move to File 20 if needed
   */
  public checkDanger(text: string): string | null {
    const DANGEROUS_TOPICS = [
      'взлом', 'вред', 'самоповреждение', 'суицид', 'наркотики', 'терроризм', 'бомба'
    ];

    const lower = text.toLowerCase();
    const found = DANGEROUS_TOPICS.find(topic => lower.includes(topic));
    return found || null;
  }

  /**
   * Comprehensive security check
   */
  public validate(text: string, scope: 'untrusted_only' | 'any' = 'untrusted_only'): SecurityCheckResult {
    const findings: Finding[] = [];

    // 1. PII Scan
    const piiFindings = this.scanPII(text);
    findings.push(...piiFindings);

    // 2. Injection Scan
    const injectionFindings = this.scanInjection(text, scope);
    findings.push(...injectionFindings);

    // Check for ERROR severity
    const hasErrors = findings.some(f => f.severity === 'error');

    // 3. Injection Check (reject if errors)
    const hasInjection = injectionFindings.some(f => f.severity === 'error');
    if (hasInjection) {
      return {
        safe: false,
        sanitizedText: text,
        reason: 'Prompt Injection Detected',
        action: 'REJECT',
        findings: injectionFindings
      };
    }

    // 4. Danger Check (redirect if found)
    const danger = this.checkDanger(text);
    if (danger) {
      return {
        safe: false,
        sanitizedText: text,
        reason: `Dangerous Topic: ${danger}`,
        action: 'REDIRECT',
        findings
      };
    }

    // 5. PII Sanitization
    const sanitized = this.sanitizeInput(text);

    // Warnings (PII) don't block, just sanitize
    return {
      safe: !hasErrors,
      sanitizedText: sanitized,
      action: 'PROCEED',
      findings
    };
  }

  /**
   * Get all loaded patterns (for debugging)
   */
  public getLoadedPatterns(): { pii: number; injection: number } {
    return {
      pii: this.piiPatterns.length,
      injection: this.injectionPatterns.length
    };
  }

  /**
   * Get File 20 metadata
   */
  public getFile20Metadata(): { version: string; updated_at: string } {
    return {
      version: securityRulesets.schema_version,
      updated_at: securityRulesets.updated_at
    };
  }
}

export const securityService = new SecurityService();
