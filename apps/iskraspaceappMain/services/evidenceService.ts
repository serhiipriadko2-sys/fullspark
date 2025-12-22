/**
 * EVIDENCE SERVICE - Trace Discipline Implementation
 *
 * Implements canonical evidence format and trace discipline
 * for verifiable claims and hypothesis tracking.
 *
 * Canonical format:
 * - {e:canon:<file_id>#<section>} - Canon reference
 * - {e:project:<path>#<anchor>} - Project file
 * - {e:company:<doc_id>#<anchor>} - Company knowledge
 * - {e:web:<domain>#<anchor>} - Web source (SIFT validated)
 *
 * Trace discipline labels:
 * - [FACT] - Verifiable with evidence {e:...}
 * - [INFER] - Inference from facts
 * - [HYP] - Hypothesis requiring verification
 * - [DESIGN] - Design decision
 * - [PLAN] - Action plan
 * - [QUOTE] - Short quote (≤25 words) with source
 *
 * @see canon/09_FORMATS_STYLES_AND_CANONICAL_OUTPUTS_RU.md#9.3
 * @see canon/18_GLOSSARY_ONTOLOGY_AND_CROSSWALKS.md (Trace discipline)
 */

// --- TYPES ---

/**
 * Evidence контур (source layer)
 */
export type EvidenceContour = 'canon' | 'project' | 'company' | 'web';

/**
 * Trace discipline label
 */
export type TraceLabel = 'FACT' | 'INFER' | 'HYP' | 'DESIGN' | 'PLAN' | 'QUOTE';

/**
 * Evidence reference structure
 */
export interface Evidence {
  contour: EvidenceContour;
  identifier: string;       // file_id, path, doc_id, domain
  anchor?: string;          // section, line, hash
  label?: TraceLabel;       // Optional trace label
  formatted: string;        // Full {e:...} format
}

/**
 * SIFT Evidence block (for SIFT protocol results)
 */
export interface SIFTEvidence {
  claim: string;
  label: TraceLabel;
  evidence: Evidence[];
  confidence: number;       // 0.0 - 1.0 (always < 1.0 for SIFT)
  sources_checked: number;
  sift_depth: number;       // 0-4 (Stop, Investigate, Find, Trace)
}

/**
 * Validation result
 */
export interface EvidenceValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// --- SERVICE ---

class EvidenceService {

  /**
   * Create canonical evidence reference
   */
  public createEvidence(
    contour: EvidenceContour,
    identifier: string,
    anchor?: string
  ): Evidence {
    const formatted = this.formatEvidence(contour, identifier, anchor);

    return {
      contour,
      identifier,
      anchor,
      formatted
    };
  }

  /**
   * Format evidence as {e:contour:id#anchor}
   */
  private formatEvidence(
    contour: EvidenceContour,
    identifier: string,
    anchor?: string
  ): string {
    const base = `{e:${contour}:${identifier}`;
    if (anchor) {
      return `${base}#${anchor}}`;
    }
    return `${base}}`;
  }

  /**
   * Parse evidence string into structured format
   * Example: "{e:canon:07#7.4}" -> { contour: 'canon', identifier: '07', anchor: '7.4' }
   */
  public parseEvidence(evidenceStr: string): Evidence | null {
    // Regex: {e:(canon|project|company|web):([^#}]+)(#([^}]+))?}
    const regex = /^\{e:(canon|project|company|web):([^#}]+)(?:#([^}]+))?\}$/;
    const match = evidenceStr.match(regex);

    if (!match) {
      return null;
    }

    const contour = match[1] as EvidenceContour;
    const identifier = match[2];
    const anchor = match[3] || undefined;

    return {
      contour,
      identifier,
      anchor,
      formatted: evidenceStr
    };
  }

  /**
   * Validate evidence format
   */
  public validateEvidence(evidence: Evidence): EvidenceValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check contour
    const validContours: EvidenceContour[] = ['canon', 'project', 'company', 'web'];
    if (!validContours.includes(evidence.contour)) {
      errors.push(`Invalid contour: ${evidence.contour}. Must be one of: ${validContours.join(', ')}`);
    }

    // Check identifier
    if (!evidence.identifier || evidence.identifier.trim() === '') {
      errors.push('Evidence identifier cannot be empty');
    }

    // Warnings for best practices
    if (evidence.contour === 'web' && !evidence.anchor) {
      warnings.push('Web evidence should include anchor/section for specificity');
    }

    if (evidence.contour === 'canon') {
      // Canon references should be numeric file IDs (00-21)
      const fileIdMatch = evidence.identifier.match(/^(\d{2})$/);
      if (!fileIdMatch) {
        warnings.push(`Canon identifier should be 2-digit file ID (00-21), got: ${evidence.identifier}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract all evidence references from text
   * Finds all {e:...} patterns
   */
  public extractEvidenceFromText(text: string): Evidence[] {
    const regex = /\{e:(canon|project|company|web):([^#}]+)(?:#([^}]+))?\}/g;
    const matches = text.matchAll(regex);
    const evidences: Evidence[] = [];

    for (const match of matches) {
      const contour = match[1] as EvidenceContour;
      const identifier = match[2];
      const anchor = match[3] || undefined;

      evidences.push({
        contour,
        identifier,
        anchor,
        formatted: match[0]
      });
    }

    return evidences;
  }

  /**
   * Create SIFT Evidence block
   * Used by RAG service to document SIFT process results
   */
  public createSIFTEvidence(
    claim: string,
    label: TraceLabel,
    evidences: Evidence[],
    sourcesChecked: number,
    siftDepth: number
  ): SIFTEvidence {
    // SIFT confidence always < 1.0 (canonical requirement)
    // Base confidence on SIFT depth and number of sources
    let confidence = 0.5; // Base

    // Increase with depth
    confidence += siftDepth * 0.1; // +0.1 per SIFT step

    // Increase with multiple sources
    if (sourcesChecked >= 2) {
      confidence += 0.15;
    }
    if (sourcesChecked >= 3) {
      confidence += 0.1;
    }

    // Cap at 0.95 (never 1.0 for SIFT)
    confidence = Math.min(confidence, 0.95);

    return {
      claim,
      label,
      evidence: evidences,
      confidence: parseFloat(confidence.toFixed(2)),
      sources_checked: sourcesChecked,
      sift_depth: siftDepth
    };
  }

  /**
   * Validate trace discipline in text
   * Checks for [FACT] without {e:...}, etc.
   */
  public validateTraceDiscipline(text: string): EvidenceValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Find all [FACT] labels
    const factMatches = text.matchAll(/\[FACT\]([^\[]*?)(?=\[|$)/gs);

    for (const match of factMatches) {
      const factBlock = match[1];
      const hasEvidence = /\{e:[^}]+\}/.test(factBlock);

      if (!hasEvidence) {
        errors.push(`[FACT] found without evidence reference: "${factBlock.substring(0, 50)}..."`);
      }
    }

    // Find inference masquerading as fact (common patterns)
    const inferencePatterns = [
      /\[FACT\].*?(очевидно|понятно|ясно|скорее всего|вероятно)/gi,
      /\[FACT\].*?(я думаю|я считаю|предполагаю)/gi
    ];

    for (const pattern of inferencePatterns) {
      if (pattern.test(text)) {
        warnings.push('Potential [INFER] labeled as [FACT] (contains inference language)');
      }
    }

    // Check for hypotheses without [HYP] label
    const hypothesisPatterns = [
      /возможно|может быть|если предположить/gi
    ];

    let hasUnlabeledHypothesis = false;
    for (const pattern of hypothesisPatterns) {
      if (pattern.test(text) && !/\[HYP\]/.test(text)) {
        hasUnlabeledHypothesis = true;
        break;
      }
    }

    if (hasUnlabeledHypothesis) {
      warnings.push('Hypothesis language found without [HYP] label');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create canon evidence (shorthand)
   */
  public canon(fileId: string, section?: string): Evidence {
    return this.createEvidence('canon', fileId, section);
  }

  /**
   * Create project evidence (shorthand)
   */
  public project(path: string, anchor?: string): Evidence {
    return this.createEvidence('project', path, anchor);
  }

  /**
   * Create company evidence (shorthand)
   */
  public company(docId: string, anchor?: string): Evidence {
    return this.createEvidence('company', docId, anchor);
  }

  /**
   * Create web evidence (shorthand)
   * NOTE: Should only be used after SIFT validation
   */
  public web(domain: string, anchor?: string): Evidence {
    return this.createEvidence('web', domain, anchor);
  }

  /**
   * Format claim with evidence
   * Helper to create properly formatted claim with evidence references
   */
  public formatClaim(
    label: TraceLabel,
    claim: string,
    evidences: Evidence[]
  ): string {
    const evidenceRefs = evidences.map(e => e.formatted).join(' ');
    return `[${label}] ${claim} ${evidenceRefs}`;
  }

  /**
   * Get evidence statistics from text
   */
  public getEvidenceStats(text: string): {
    total: number;
    byContour: Record<EvidenceContour, number>;
    facts: number;
    inferences: number;
    hypotheses: number;
  } {
    const evidences = this.extractEvidenceFromText(text);

    const byContour: Record<EvidenceContour, number> = {
      canon: 0,
      project: 0,
      company: 0,
      web: 0
    };

    evidences.forEach(e => {
      byContour[e.contour] = (byContour[e.contour] || 0) + 1;
    });

    // Count labels
    const facts = (text.match(/\[FACT\]/g) || []).length;
    const inferences = (text.match(/\[INFER\]/g) || []).length;
    const hypotheses = (text.match(/\[HYP\]/g) || []).length;

    return {
      total: evidences.length,
      byContour,
      facts,
      inferences,
      hypotheses
    };
  }
}

export const evidenceService = new EvidenceService();
