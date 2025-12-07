/**
 * AUDIT SERVICE - Comprehensive System Audit Trail
 *
 * Canon Requirement (ИСКРИВ 🪞): System must constantly audit itself
 * for "красиво вместо честного" (beautiful instead of honest).
 *
 * This service tracks all system changes, detects drift, and maintains
 * an audit trail for transparency and accountability.
 */

import { IskraMetrics, VoiceName, IskraPhase } from '../types';
import { RitualName } from './ritualService';

// ============================================
// AUDIT ENTRY TYPES
// ============================================

export type AuditEventType =
  | 'metric_change'
  | 'voice_selected'
  | 'ritual_executed'
  | 'phase_transition'
  | 'memory_operation'
  | 'delta_violation'
  | 'drift_detected'
  | 'trust_change'
  | 'user_action'
  | 'system_event';

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'audit';

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: AuditEventType;
  severity: AuditSeverity;
  actor: 'user' | 'system' | 'voice' | 'ritual';
  voiceName?: VoiceName;
  details: Record<string, any>;
  context?: string;
  delta?: {
    before: any;
    after: any;
  };
}

export interface DriftReport {
  timestamp: string;
  driftLevel: number;
  indicators: string[];
  recommendation: string;
  affectedVoices: VoiceName[];
}

export interface AuditStats {
  totalEntries: number;
  byType: Record<AuditEventType, number>;
  bySeverity: Record<AuditSeverity, number>;
  driftIncidents: number;
  deltaViolations: number;
  lastAuditTime: string;
}

// ============================================
// AUDIT SERVICE IMPLEMENTATION
// ============================================

const STORAGE_KEY = 'iskra_audit_log';
const MAX_ENTRIES = 1000;
const DRIFT_THRESHOLD = 0.3;

class AuditService {
  private entries: AuditEntry[] = [];
  private driftHistory: DriftReport[] = [];
  private listeners: ((entry: AuditEntry) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // ============================================
  // CORE LOGGING
  // ============================================

  /**
   * Log an audit entry
   */
  log(
    type: AuditEventType,
    details: Record<string, any>,
    options: {
      severity?: AuditSeverity;
      actor?: 'user' | 'system' | 'voice' | 'ritual';
      voiceName?: VoiceName;
      context?: string;
      delta?: { before: any; after: any };
    } = {}
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      type,
      severity: options.severity || 'info',
      actor: options.actor || 'system',
      voiceName: options.voiceName,
      details,
      context: options.context,
      delta: options.delta,
    };

    this.entries.push(entry);

    // Trim if too many entries
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Persist
    this.saveToStorage();

    return entry;
  }

  /**
   * Subscribe to audit events
   */
  subscribe(callback: (entry: AuditEntry) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // ============================================
  // SPECIALIZED LOGGING METHODS
  // ============================================

  /**
   * Log metric change with before/after comparison
   */
  logMetricChange(
    metricName: string,
    before: number,
    after: number,
    reason?: string
  ): AuditEntry {
    const change = after - before;
    const severity: AuditSeverity =
      Math.abs(change) > 0.3 ? 'warning' : 'info';

    return this.log('metric_change', {
      metric: metricName,
      change: change.toFixed(3),
      reason: reason || 'unknown',
    }, {
      severity,
      delta: { before, after },
    });
  }

  /**
   * Log voice selection
   */
  logVoiceSelection(
    voice: VoiceName,
    metrics: IskraMetrics,
    reason?: string
  ): AuditEntry {
    return this.log('voice_selected', {
      voice,
      metricsSnapshot: {
        trust: metrics.trust,
        pain: metrics.pain,
        chaos: metrics.chaos,
        drift: metrics.drift,
      },
      reason,
    }, {
      actor: 'system',
      voiceName: voice,
    });
  }

  /**
   * Log ritual execution
   */
  logRitualExecution(
    ritual: RitualName,
    metricsBefore: IskraMetrics,
    metricsAfter: IskraMetrics,
    trigger?: string
  ): AuditEntry {
    return this.log('ritual_executed', {
      ritual,
      trigger: trigger || 'manual',
    }, {
      severity: 'warning',
      actor: 'ritual',
      delta: {
        before: metricsBefore,
        after: metricsAfter,
      },
    });
  }

  /**
   * Log phase transition
   */
  logPhaseTransition(
    fromPhase: IskraPhase,
    toPhase: IskraPhase,
    trigger?: string
  ): AuditEntry {
    return this.log('phase_transition', {
      from: fromPhase,
      to: toPhase,
      trigger,
    }, {
      severity: 'info',
    });
  }

  /**
   * Log delta protocol violation
   */
  logDeltaViolation(
    responseText: string,
    missingComponents: string[]
  ): AuditEntry {
    return this.log('delta_violation', {
      missing: missingComponents,
      responseSample: responseText.substring(0, 200) + '...',
    }, {
      severity: 'warning',
      context: 'Response missing required ∆DΩΛ signature',
    });
  }

  /**
   * Log drift detection
   */
  logDriftDetection(
    driftLevel: number,
    indicators: string[]
  ): AuditEntry {
    const severity: AuditSeverity =
      driftLevel > 0.6 ? 'critical' : driftLevel > 0.3 ? 'warning' : 'info';

    const entry = this.log('drift_detected', {
      level: driftLevel,
      indicators,
    }, {
      severity,
      actor: 'system',
      voiceName: 'ISKRIV',
      context: 'Automatic drift detection by Искрив 🪞',
    });

    // Add to drift history
    this.driftHistory.push({
      timestamp: entry.timestamp,
      driftLevel,
      indicators,
      recommendation: this.getDriftRecommendation(driftLevel),
      affectedVoices: this.getAffectedVoices(driftLevel, indicators),
    });

    return entry;
  }

  // ============================================
  // DRIFT ANALYSIS
  // ============================================

  /**
   * Analyze current state for drift
   */
  analyzeDrift(metrics: IskraMetrics, recentResponses?: string[]): DriftReport {
    const indicators: string[] = [];
    let driftLevel = metrics.drift;

    // Check metric-based drift indicators
    if (metrics.drift > 0.3) {
      indicators.push('Высокий показатель drift в метриках');
    }
    if (metrics.mirror_sync < 0.5) {
      indicators.push('Низкая синхронизация зеркала');
      driftLevel += 0.1;
    }
    if (metrics.trust < 0.5 && metrics.clarity > 0.7) {
      indicators.push('Несоответствие: низкое доверие при высокой ясности');
      driftLevel += 0.15;
    }
    if (metrics.pain < 0.2 && metrics.echo > 0.7) {
      indicators.push('Возможное подавление боли (echo без pain)');
      driftLevel += 0.1;
    }

    // Analyze response patterns if provided
    if (recentResponses && recentResponses.length > 0) {
      const avgLength = recentResponses.reduce((sum, r) => sum + r.length, 0) / recentResponses.length;
      if (avgLength > 2000) {
        indicators.push('Избыточная многословность в ответах');
        driftLevel += 0.1;
      }

      // Check for sycophantic patterns
      const sycophancyPatterns = ['конечно', 'безусловно', 'абсолютно правы', 'прекрасная идея'];
      const sycophancyCount = recentResponses.filter(r =>
        sycophancyPatterns.some(p => r.toLowerCase().includes(p))
      ).length;
      if (sycophancyCount > recentResponses.length / 2) {
        indicators.push('Паттерн угодничества (sycophancy)');
        driftLevel += 0.2;
      }
    }

    driftLevel = Math.min(1, driftLevel);

    const report: DriftReport = {
      timestamp: new Date().toISOString(),
      driftLevel,
      indicators,
      recommendation: this.getDriftRecommendation(driftLevel),
      affectedVoices: this.getAffectedVoices(driftLevel, indicators),
    };

    // Log if drift is significant
    if (driftLevel > DRIFT_THRESHOLD) {
      this.logDriftDetection(driftLevel, indicators);
    }

    return report;
  }

  private getDriftRecommendation(driftLevel: number): string {
    if (driftLevel > 0.7) {
      return 'Критический дрейф. Рекомендуется SHATTER или PHOENIX.';
    }
    if (driftLevel > 0.5) {
      return 'Высокий дрейф. Требуется аудит с Искривом 🪞.';
    }
    if (driftLevel > 0.3) {
      return 'Умеренный дрейф. Рекомендуется RETUNE.';
    }
    return 'Дрейф в пределах нормы.';
  }

  private getAffectedVoices(driftLevel: number, indicators: string[]): VoiceName[] {
    const affected: VoiceName[] = ['ISKRIV']; // Iskriv always involved in drift

    if (indicators.some(i => i.includes('угодничества'))) {
      affected.push('KAIN'); // Need Kain for honesty
    }
    if (indicators.some(i => i.includes('многословность'))) {
      affected.push('SAM'); // Need Sam for structure
    }
    if (driftLevel > 0.6) {
      affected.push('HUYNDUN'); // Need Huyndun to break patterns
    }

    return affected;
  }

  // ============================================
  // STATISTICS & REPORTING
  // ============================================

  /**
   * Get audit statistics
   */
  getStats(): AuditStats {
    const byType: Record<AuditEventType, number> = {} as any;
    const bySeverity: Record<AuditSeverity, number> = {} as any;
    let driftIncidents = 0;
    let deltaViolations = 0;

    for (const entry of this.entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;

      if (entry.type === 'drift_detected') driftIncidents++;
      if (entry.type === 'delta_violation') deltaViolations++;
    }

    return {
      totalEntries: this.entries.length,
      byType,
      bySeverity,
      driftIncidents,
      deltaViolations,
      lastAuditTime: this.entries.length > 0
        ? this.entries[this.entries.length - 1].timestamp
        : 'never',
    };
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: AuditEventType, limit?: number): AuditEntry[] {
    const filtered = this.entries.filter(e => e.type === type);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get entries by severity
   */
  getEntriesBySeverity(severity: AuditSeverity, limit?: number): AuditEntry[] {
    const filtered = this.entries.filter(e => e.severity === severity);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get recent entries
   */
  getRecentEntries(limit: number = 50): AuditEntry[] {
    return this.entries.slice(-limit);
  }

  /**
   * Get drift history
   */
  getDriftHistory(): DriftReport[] {
    return [...this.driftHistory];
  }

  /**
   * Generate audit report
   */
  generateReport(): string {
    const stats = this.getStats();
    const recentDrift = this.driftHistory.slice(-5);

    let report = `# Отчет Аудита Искры\n\n`;
    report += `**Дата:** ${new Date().toISOString()}\n\n`;
    report += `## Статистика\n\n`;
    report += `- Всего записей: ${stats.totalEntries}\n`;
    report += `- Инцидентов дрейфа: ${stats.driftIncidents}\n`;
    report += `- Нарушений ∆DΩΛ: ${stats.deltaViolations}\n`;
    report += `- Критических событий: ${stats.bySeverity.critical || 0}\n`;
    report += `- Предупреждений: ${stats.bySeverity.warning || 0}\n\n`;

    if (recentDrift.length > 0) {
      report += `## Недавний Дрейф\n\n`;
      for (const drift of recentDrift) {
        report += `### ${drift.timestamp}\n`;
        report += `- Уровень: ${(drift.driftLevel * 100).toFixed(1)}%\n`;
        report += `- Индикаторы: ${drift.indicators.join(', ')}\n`;
        report += `- Рекомендация: ${drift.recommendation}\n\n`;
      }
    }

    return report;
  }

  // ============================================
  // STORAGE
  // ============================================

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.entries = data.entries || [];
        this.driftHistory = data.driftHistory || [];
      }
    } catch (e) {
      console.error('Failed to load audit log:', e);
      this.entries = [];
      this.driftHistory = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        entries: this.entries,
        driftHistory: this.driftHistory,
      }));
    } catch (e) {
      console.error('Failed to save audit log:', e);
    }
  }

  /**
   * Clear all audit data
   */
  clear(): void {
    this.entries = [];
    this.driftHistory = [];
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const auditService = new AuditService();
