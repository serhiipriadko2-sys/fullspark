/**
 * GLOSSARY VIEW - Canon Terms and Semantic Search UI
 *
 * Features:
 * - Search across all Canon terminology
 * - Filter by category
 * - View related terms
 * - Contextual tooltips
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  glossaryService,
  searchTerms,
  getTermsByCategory,
  getRelatedTerms,
  getCategories,
  GlossaryTerm,
  TermCategory,
  SearchResult,
} from '../services/glossaryService';

interface GlossaryViewProps {
  onClose?: () => void;
  onTermSelect?: (term: GlossaryTerm) => void;
}

const CATEGORY_ICONS: Record<TermCategory, string> = {
  voice: '🎭',
  metric: '📊',
  phase: '🌙',
  ritual: '🔥',
  protocol: '📜',
  memory: '🧠',
  concept: '💡',
  principle: '⚖️',
};

const CATEGORY_COLORS: Record<TermCategory, string> = {
  voice: '#9b59b6',
  metric: '#3498db',
  phase: '#1abc9c',
  ritual: '#e74c3c',
  protocol: '#f39c12',
  memory: '#2ecc71',
  concept: '#95a5a6',
  principle: '#e67e22',
};

const GlossaryView: React.FC<GlossaryViewProps> = ({ onClose, onTermSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TermCategory | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [showRelated, setShowRelated] = useState(false);

  const categories = useMemo(() => getCategories(), []);

  const filteredTerms = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTerms(searchQuery, {
        category: selectedCategory || undefined,
        limit: 50,
        fuzzy: true,
      });
    }

    if (selectedCategory) {
      return getTermsByCategory(selectedCategory).map(term => ({
        term,
        score: 1,
        matchedIn: [] as ('term' | 'definition' | 'tags')[],
      }));
    }

    return glossaryService.getAllTerms().map(term => ({
      term,
      score: 1,
      matchedIn: [] as ('term' | 'definition' | 'tags')[],
    }));
  }, [searchQuery, selectedCategory]);

  const relatedTerms = useMemo(() => {
    if (!selectedTerm) return [];
    return getRelatedTerms(selectedTerm.id);
  }, [selectedTerm]);

  const handleTermClick = useCallback((term: GlossaryTerm) => {
    setSelectedTerm(term);
    setShowRelated(true);
    onTermSelect?.(term);
  }, [onTermSelect]);

  const handleRelatedClick = useCallback((term: GlossaryTerm) => {
    setSelectedTerm(term);
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📚 Глоссарий Канона</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Поиск терминов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={styles.clearButton}>
            ✕
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div style={styles.categoryContainer}>
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            ...styles.categoryButton,
            ...(selectedCategory === null ? styles.categoryButtonActive : {}),
          }}
        >
          Все ({glossaryService.getAllTerms().length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              ...styles.categoryButton,
              ...(selectedCategory === cat.id ? styles.categoryButtonActive : {}),
              borderColor: CATEGORY_COLORS[cat.id],
            }}
          >
            {CATEGORY_ICONS[cat.id]} {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Terms List */}
        <div style={styles.termsList}>
          {filteredTerms.length === 0 ? (
            <div style={styles.noResults}>
              Ничего не найдено. Попробуйте другой запрос.
            </div>
          ) : (
            filteredTerms.map(({ term, score }) => (
              <div
                key={term.id}
                onClick={() => handleTermClick(term)}
                style={{
                  ...styles.termCard,
                  ...(selectedTerm?.id === term.id ? styles.termCardSelected : {}),
                  borderLeftColor: CATEGORY_COLORS[term.category],
                }}
              >
                <div style={styles.termHeader}>
                  {term.symbol && <span style={styles.termSymbol}>{term.symbol}</span>}
                  <span style={styles.termName}>{term.termRu}</span>
                  <span style={styles.termNameEn}>({term.term})</span>
                </div>
                <div style={styles.termCategory}>
                  {CATEGORY_ICONS[term.category]} {term.category}
                </div>
                <div style={styles.termDefinition}>
                  {term.definitionRu.substring(0, 100)}
                  {term.definitionRu.length > 100 ? '...' : ''}
                </div>
                {term.tags && term.tags.length > 0 && (
                  <div style={styles.termTags}>
                    {term.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={styles.tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedTerm && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <span style={styles.detailSymbol}>{selectedTerm.symbol || '◉'}</span>
              <div>
                <h3 style={styles.detailTitle}>{selectedTerm.termRu}</h3>
                <span style={styles.detailSubtitle}>{selectedTerm.term}</span>
              </div>
            </div>

            <div style={styles.detailCategory}>
              <span
                style={{
                  ...styles.categoryBadge,
                  backgroundColor: CATEGORY_COLORS[selectedTerm.category],
                }}
              >
                {CATEGORY_ICONS[selectedTerm.category]} {selectedTerm.category}
              </span>
            </div>

            <div style={styles.detailSection}>
              <h4 style={styles.sectionTitle}>Определение</h4>
              <p style={styles.sectionContent}>{selectedTerm.definitionRu}</p>
              <p style={styles.sectionContentEn}>{selectedTerm.definition}</p>
            </div>

            {selectedTerm.examples && selectedTerm.examples.length > 0 && (
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>Примеры</h4>
                {selectedTerm.examples.map((ex, i) => (
                  <p key={i} style={styles.example}>"{ex}"</p>
                ))}
              </div>
            )}

            {relatedTerms.length > 0 && (
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>Связанные термины</h4>
                <div style={styles.relatedContainer}>
                  {relatedTerms.map(related => (
                    <button
                      key={related.id}
                      onClick={() => handleRelatedClick(related)}
                      style={styles.relatedButton}
                    >
                      {related.symbol} {related.termRu}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedTerm.tags && selectedTerm.tags.length > 0 && (
              <div style={styles.detailSection}>
                <h4 style={styles.sectionTitle}>Теги</h4>
                <div style={styles.termTags}>
                  {selectedTerm.tags.map(tag => (
                    <span
                      key={tag}
                      style={styles.tag}
                      onClick={() => setSearchQuery(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  searchContainer: {
    position: 'relative',
    padding: '12px 20px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 16px',
    backgroundColor: '#252540',
    border: '1px solid #444',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
  },
  clearButton: {
    position: 'absolute',
    right: '32px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
  },
  categoryContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '0 20px 12px',
  },
  categoryButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #555',
    borderRadius: '16px',
    color: '#ccc',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryButtonActive: {
    backgroundColor: '#333',
    color: '#fff',
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  termsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 20px 20px',
  },
  noResults: {
    textAlign: 'center',
    color: '#888',
    padding: '40px',
  },
  termCard: {
    padding: '12px 16px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    transition: 'all 0.2s',
  },
  termCardSelected: {
    backgroundColor: '#303050',
  },
  termHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  termSymbol: {
    fontSize: '1.2rem',
  },
  termName: {
    fontWeight: 600,
    color: '#fff',
  },
  termNameEn: {
    color: '#888',
    fontSize: '0.9rem',
  },
  termCategory: {
    fontSize: '0.75rem',
    color: '#888',
    marginBottom: '8px',
  },
  termDefinition: {
    fontSize: '0.9rem',
    color: '#aaa',
    lineHeight: 1.4,
  },
  termTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  tag: {
    padding: '2px 8px',
    backgroundColor: '#333',
    borderRadius: '12px',
    fontSize: '0.75rem',
    color: '#aaa',
    cursor: 'pointer',
  },
  detailPanel: {
    width: '350px',
    borderLeft: '1px solid #333',
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#202035',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  detailSymbol: {
    fontSize: '2.5rem',
  },
  detailTitle: {
    margin: 0,
    fontSize: '1.3rem',
    color: '#fff',
  },
  detailSubtitle: {
    color: '#888',
    fontSize: '0.9rem',
  },
  detailCategory: {
    marginBottom: '16px',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: '#fff',
  },
  detailSection: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: '0.9rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionContent: {
    margin: 0,
    lineHeight: 1.5,
    color: '#e0e0e0',
  },
  sectionContentEn: {
    margin: '8px 0 0',
    lineHeight: 1.5,
    color: '#888',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  example: {
    margin: '4px 0',
    padding: '8px 12px',
    backgroundColor: '#2a2a45',
    borderRadius: '6px',
    fontStyle: 'italic',
    color: '#bbb',
  },
  relatedContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  relatedButton: {
    padding: '6px 12px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '16px',
    color: '#ccc',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};

export default GlossaryView;
