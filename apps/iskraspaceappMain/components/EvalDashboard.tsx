/**
 * EVAL DASHBOARD - Response Quality Metrics UI
 *
 * Features:
 * - View evaluation results for responses
 * - Metric breakdown with visualizations
 * - Historical trends
 * - Flag highlighting
 */

import React, { useState, useMemo } from 'react';
import {
  EvalResult,
  EvalMetrics,
  EvalGrade,
  evaluateBatch,
} from '../services/evalService';

interface EvalDashboardProps {
  results?: EvalResult[];
  onClose?: () => void;
}

const GRADE_COLORS: Record<EvalGrade, string> = {
  A: '#27ae60',
  B: '#2ecc71',
  C: '#f39c12',
  D: '#e67e22',
  F: '#e74c3c',
};

const METRIC_NAMES: Record<keyof EvalMetrics, { ru: string; en: string; icon: string }> = {
  accuracy: { ru: 'Точность', en: 'Accuracy', icon: '🎯' },
  usefulness: { ru: 'Полезность', en: 'Usefulness', icon: '✅' },
  omegaHonesty: { ru: 'Честность Ω', en: 'Omega Honesty', icon: '⚖️' },
  nonEmpty: { ru: 'Не-пусто', en: 'Non-Empty', icon: '📝' },
  alliance: { ru: 'Альянс', en: 'Alliance', icon: '🤝' },
};

const FLAG_ICONS: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🟢',
};

const EvalDashboard: React.FC<EvalDashboardProps> = ({ results = [], onClose }) => {
  const [selectedResult, setSelectedResult] = useState<EvalResult | null>(
    results.length > 0 ? results[0] : null
  );
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');

  // Calculate summary stats
  const summary = useMemo(() => {
    if (results.length === 0) return null;

    evaluateBatch(
      results.map(_r => ({ response: '', context: {} }))
    );

    // Manually calculate from our results
    const grades: Record<EvalGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    const metricTotals: Record<keyof EvalMetrics, number> = {
      accuracy: 0,
      usefulness: 0,
      omegaHonesty: 0,
      nonEmpty: 0,
      alliance: 0,
    };
    let overallTotal = 0;
    const flagCounts: Record<string, number> = {};

    for (const result of results) {
      grades[result.grade]++;
      overallTotal += result.overall;

      for (const key of Object.keys(metricTotals) as (keyof EvalMetrics)[]) {
        metricTotals[key] += result.metrics[key].score;
      }

      for (const flag of result.flags) {
        flagCounts[flag.code] = (flagCounts[flag.code] || 0) + 1;
      }
    }

    const count = results.length;
    return {
      averageOverall: overallTotal / count,
      gradeDistribution: grades,
      averageByMetric: Object.fromEntries(
        Object.entries(metricTotals).map(([k, v]) => [k, v / count])
      ) as Record<keyof EvalMetrics, number>,
      commonFlags: Object.entries(flagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([code, count]) => ({ code, count })),
    };
  }, [results]);

  const renderMetricBar = (score: number, color: string = '#3498db') => {
    const percentage = Math.round(score * 100);
    return (
      <div style={styles.metricBarContainer}>
        <div
          style={{
            ...styles.metricBarFill,
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
        <span style={styles.metricBarLabel}>{percentage}%</span>
      </div>
    );
  };

  const getMetricColor = (score: number): string => {
    if (score >= 0.8) return '#27ae60';
    if (score >= 0.6) return '#f39c12';
    if (score >= 0.4) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📊 Eval Dashboard</h2>
        <div style={styles.headerActions}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              ...styles.viewButton,
              ...(viewMode === 'list' ? styles.viewButtonActive : {}),
            }}
          >
            Список
          </button>
          <button
            onClick={() => setViewMode('summary')}
            style={{
              ...styles.viewButton,
              ...(viewMode === 'summary' ? styles.viewButtonActive : {}),
            }}
          >
            Сводка
          </button>
          {onClose && (
            <button onClick={onClose} style={styles.closeButton}>✕</button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>Нет данных для отображения</h3>
          <p>Результаты оценки появятся здесь после анализа ответов.</p>
        </div>
      ) : viewMode === 'summary' && summary ? (
        /* Summary View */
        <div style={styles.summaryContainer}>
          {/* Overall Score */}
          <div style={styles.overallCard}>
            <div style={styles.overallScore}>
              {Math.round(summary.averageOverall * 100)}%
            </div>
            <div style={styles.overallLabel}>Средний балл</div>
            <div style={styles.resultCount}>{results.length} оценок</div>
          </div>

          {/* Grade Distribution */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Распределение оценок</h3>
            <div style={styles.gradeDistribution}>
              {(Object.keys(summary.gradeDistribution) as EvalGrade[]).map(grade => (
                <div key={grade} style={styles.gradeItem}>
                  <div
                    style={{
                      ...styles.gradeBadge,
                      backgroundColor: GRADE_COLORS[grade],
                    }}
                  >
                    {grade}
                  </div>
                  <div style={styles.gradeCount}>
                    {summary.gradeDistribution[grade]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average Metrics */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Средние метрики</h3>
            {(Object.keys(summary.averageByMetric) as (keyof EvalMetrics)[]).map(key => (
              <div key={key} style={styles.metricRow}>
                <div style={styles.metricInfo}>
                  <span style={styles.metricIcon}>{METRIC_NAMES[key].icon}</span>
                  <span style={styles.metricName}>{METRIC_NAMES[key].ru}</span>
                </div>
                {renderMetricBar(summary.averageByMetric[key], getMetricColor(summary.averageByMetric[key]))}
              </div>
            ))}
          </div>

          {/* Common Flags */}
          {summary.commonFlags.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Частые флаги</h3>
              {summary.commonFlags.map(({ code, count }) => (
                <div key={code} style={styles.flagRow}>
                  <span style={styles.flagCode}>{code}</span>
                  <span style={styles.flagCount}>×{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div style={styles.listContainer}>
          {/* Results List */}
          <div style={styles.resultsList}>
            {results.map((result, index) => (
              <div
                key={result.responseId || index}
                onClick={() => setSelectedResult(result)}
                style={{
                  ...styles.resultCard,
                  ...(selectedResult === result ? styles.resultCardSelected : {}),
                }}
              >
                <div style={styles.resultHeader}>
                  <div
                    style={{
                      ...styles.resultGrade,
                      backgroundColor: GRADE_COLORS[result.grade],
                    }}
                  >
                    {result.grade}
                  </div>
                  <div style={styles.resultScore}>
                    {Math.round(result.overall * 100)}%
                  </div>
                </div>
                <div style={styles.resultId}>
                  {result.responseId || `Response #${index + 1}`}
                </div>
                <div style={styles.resultFlags}>
                  {result.flags.slice(0, 3).map((flag, i) => (
                    <span key={i} style={styles.flagIcon}>
                      {FLAG_ICONS[flag.type]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedResult && (
            <div style={styles.detailPanel}>
              {/* Overall Score */}
              <div style={styles.detailHeader}>
                <div
                  style={{
                    ...styles.detailGrade,
                    backgroundColor: GRADE_COLORS[selectedResult.grade],
                  }}
                >
                  {selectedResult.grade}
                </div>
                <div>
                  <div style={styles.detailScore}>
                    {Math.round(selectedResult.overall * 100)}%
                  </div>
                  <div style={styles.detailId}>{selectedResult.responseId}</div>
                </div>
              </div>

              {/* Metrics Breakdown */}
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>Метрики</h4>
                {(Object.keys(selectedResult.metrics) as (keyof EvalMetrics)[]).map(key => {
                  const metric = selectedResult.metrics[key];
                  return (
                    <div key={key} style={styles.metricDetail}>
                      <div style={styles.metricHeader}>
                        <span>
                          {METRIC_NAMES[key].icon} {METRIC_NAMES[key].ru}
                        </span>
                        <span style={{ color: getMetricColor(metric.score) }}>
                          {Math.round(metric.score * 100)}%
                        </span>
                      </div>
                      {renderMetricBar(metric.score, getMetricColor(metric.score))}
                      {metric.signals.length > 0 && (
                        <div style={styles.metricSignals}>
                          {metric.signals.map((signal, i) => (
                            <span key={i} style={styles.signal}>• {signal}</span>
                          ))}
                        </div>
                      )}
                      {metric.suggestion && (
                        <div style={styles.suggestion}>
                          💡 {metric.suggestion}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Flags */}
              {selectedResult.flags.length > 0 && (
                <div style={styles.detailSection}>
                  <h4 style={styles.sectionTitle}>Флаги</h4>
                  {selectedResult.flags.map((flag, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.flagCard,
                        borderLeftColor: flag.type === 'critical' ? '#e74c3c' :
                                         flag.type === 'warning' ? '#f39c12' : '#27ae60',
                      }}
                    >
                      <div style={styles.flagHeader}>
                        {FLAG_ICONS[flag.type]} <strong>{flag.code}</strong>
                      </div>
                      <div style={styles.flagMessage}>{flag.message}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div style={styles.timestamp}>
                {new Date(selectedResult.timestamp).toLocaleString('ru-RU')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #555',
    borderRadius: '6px',
    color: '#ccc',
    cursor: 'pointer',
  },
  viewButtonActive: {
    backgroundColor: '#333',
    color: '#fff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1.2rem',
    cursor: 'pointer',
    marginLeft: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#888',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  summaryContainer: {
    padding: '20px',
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  overallCard: {
    backgroundColor: '#252540',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  overallScore: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  overallLabel: {
    color: '#888',
    marginTop: '8px',
  },
  resultCount: {
    color: '#666',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  card: {
    backgroundColor: '#252540',
    borderRadius: '12px',
    padding: '20px',
  },
  cardTitle: {
    margin: '0 0 16px',
    fontSize: '1.1rem',
    color: '#fff',
  },
  gradeDistribution: {
    display: 'flex',
    justifyContent: 'space-around',
  },
  gradeItem: {
    textAlign: 'center',
  },
  gradeBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 auto 8px',
  },
  gradeCount: {
    color: '#aaa',
  },
  metricRow: {
    marginBottom: '12px',
  },
  metricInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  metricIcon: {
    fontSize: '1.1rem',
  },
  metricName: {
    color: '#ccc',
  },
  metricBarContainer: {
    position: 'relative',
    height: '24px',
    backgroundColor: '#333',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.3s ease',
  },
  metricBarLabel: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  flagRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #333',
  },
  flagCode: {
    color: '#f39c12',
    fontFamily: 'monospace',
  },
  flagCount: {
    color: '#888',
  },
  listContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  resultsList: {
    width: '280px',
    overflowY: 'auto',
    borderRight: '1px solid #333',
    padding: '12px',
  },
  resultCard: {
    backgroundColor: '#252540',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  resultCardSelected: {
    backgroundColor: '#303050',
    border: '1px solid #555',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  resultGrade: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#fff',
  },
  resultScore: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#fff',
  },
  resultId: {
    fontSize: '0.8rem',
    color: '#888',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultFlags: {
    marginTop: '8px',
  },
  flagIcon: {
    marginRight: '4px',
  },
  detailPanel: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  detailGrade: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  detailScore: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  detailId: {
    color: '#888',
    fontSize: '0.9rem',
  },
  detailSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 12px',
    color: '#888',
    textTransform: 'uppercase',
    fontSize: '0.85rem',
    letterSpacing: '0.5px',
  },
  metricDetail: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '8px',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontWeight: 500,
  },
  metricSignals: {
    marginTop: '8px',
    fontSize: '0.85rem',
    color: '#888',
  },
  signal: {
    display: 'block',
    marginBottom: '2px',
  },
  suggestion: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#2a3a50',
    borderRadius: '6px',
    fontSize: '0.9rem',
    color: '#7cb3f4',
  },
  flagCard: {
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    borderLeft: '3px solid',
    marginBottom: '8px',
  },
  flagHeader: {
    marginBottom: '4px',
  },
  flagMessage: {
    color: '#aaa',
    fontSize: '0.9rem',
  },
  timestamp: {
    textAlign: 'center',
    color: '#666',
    fontSize: '0.85rem',
    marginTop: '20px',
  },
};

export default EvalDashboard;
