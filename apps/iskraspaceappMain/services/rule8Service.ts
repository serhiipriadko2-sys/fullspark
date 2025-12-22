/**
 * Rule-8 Context Updater
 *
 * Canonical requirement: Перед каждым ответом перечитать последние 100 сообщений
 * + проверить обновления файлов проекта + отслеживать висящие обязательства
 *
 * @see canon/IskraCanonDocumentation/21_DECISION_TREES_and_POLICIES.md:286-378
 * @see canon/IskraCanonDocumentation/10_RAG_SOURCES_and_SIFT.md
 */

import type { Message } from '../types';

// --- TYPES ---

export interface PendingCommitment {
  id: string;
  type: 'promise' | 'question' | 'decision' | 'action';
  content: string;
  mentioned_at: number; // timestamp
  resolved: boolean;
  related_message_ids: string[];
}

export interface KeyFact {
  id: string;
  type: 'decision' | 'question' | 'promise' | 'insight';
  content: string;
  timestamp: number;
  confidence: number; // 0-1
  sources: string[]; // message IDs
}

export interface FileChange {
  path: string;
  change_type: 'added' | 'modified' | 'deleted';
  timestamp: number;
}

export interface Rule8Context {
  recent_messages: Message[];
  pending_commitments: PendingCommitment[];
  key_facts: KeyFact[];
  file_changes: FileChange[];
  summary: string;
}

// --- SERVICE ---

export class Rule8Service {
  private commitments: Map<string, PendingCommitment> = new Map();
  private keyFacts: Map<string, KeyFact> = new Map();

  /**
   * Main Rule-8 entry point: Update context before response
   * @see canon 21_DECISION_TREES:299-378
   */
  updateContextBeforeResponse(
    conversationHistory: Message[],
    userFiles?: any[]
  ): Rule8Context {
    // 1. Анализ последних 100 сообщений
    const recentMessages = conversationHistory.slice(-100);

    // 2. Детекция изменений (новые темы, противоречия)
    this.detectChanges(recentMessages);

    // 3. Отслеживание висящих обязательств
    this.trackPendingCommitments(recentMessages);

    // 4. Извлечение ключевых фактов (решения/вопросы/обещания)
    this.extractKeyFacts(recentMessages);

    // 5. Проверка обновлений файлов
    const fileChanges = this.checkFileUpdates(userFiles);

    // 6. Создание сжатого контекста
    const summary = this.createPackedContext(recentMessages);

    return {
      recent_messages: recentMessages,
      pending_commitments: Array.from(this.commitments.values()).filter(c => !c.resolved),
      key_facts: Array.from(this.keyFacts.values()),
      file_changes: fileChanges,
      summary
    };
  }

  /**
   * Детекция изменений в разговоре
   */
  private detectChanges(messages: Message[]): void {
    // Detect topic shifts, contradictions
    const keywords = messages.map(m => this.extractKeywords(m.text));

    // Compare last 10 vs previous 10
    if (messages.length >= 20) {
      const recent = keywords.slice(-10);
      const previous = keywords.slice(-20, -10);

      const recentSet = new Set(recent.flat());
      const previousSet = new Set(previous.flat());

      const newTopics = [...recentSet].filter(k => !previousSet.has(k));
      if (newTopics.length > 5) {
        // Significant topic shift detected
        console.log('[Rule-8] Topic shift detected:', newTopics);
      }
    }
  }

  /**
   * Отслеживание висящих обязательств
   * @see canon 21_DECISION_TREES:303-308
   */
  private trackPendingCommitments(messages: Message[]): void {
    const promisePatterns = [
      /я (сделаю|напишу|создам|обещаю)/gi,
      /буду|будем|планирую/gi,
      /следующий шаг/gi,
      /нужно будет/gi
    ];

    const questionPatterns = [
      /\?$/,
      /как (думаешь|понимаешь)/gi,
      /что если/gi,
      /почему/gi
    ];

    messages.forEach((msg, idx) => {
      // Promises/commitments
      promisePatterns.forEach(pattern => {
        const matches = msg.text.match(pattern);
        if (matches && msg.role === 'model') {
          const id = `commit_${Date.now()}_${idx}`;
          this.commitments.set(id, {
            id,
            type: 'promise',
            content: msg.text,
            mentioned_at: Date.now(),
            resolved: false,
            related_message_ids: [String(idx)]
          });
        }
      });

      // Unresolved questions
      questionPatterns.forEach(pattern => {
        const matches = msg.text.match(pattern);
        if (matches && msg.role === 'user') {
          // Check if answered in next messages
          const answered = messages.slice(idx + 1, idx + 3).some(m => m.role === 'model');
          if (!answered) {
            const id = `question_${Date.now()}_${idx}`;
            this.commitments.set(id, {
              id,
              type: 'question',
              content: msg.text,
              mentioned_at: Date.now(),
              resolved: false,
              related_message_ids: [String(idx)]
            });
          }
        }
      });
    });
  }

  /**
   * Извлечение ключевых фактов (решения/вопросы/обещания)
   * @see canon 21_DECISION_TREES:310-315
   */
  private extractKeyFacts(messages: Message[]): void {
    const decisionPatterns = [
      /решил[аи]?|выбрал[аи]?|определил[аи]?/gi,
      /итак,|вывод:|результат:/gi,
      /буду делать|поступлю/gi
    ];

    const insightPatterns = [
      /понял[аи]?|осознал[аи]?|вижу что/gi,
      /оказывается|на самом деле/gi,
      /ключевое|главное|суть в том/gi
    ];

    messages.forEach((msg, idx) => {
      // Decisions
      decisionPatterns.forEach(pattern => {
        const matches = msg.text.match(pattern);
        if (matches) {
          const id = `decision_${Date.now()}_${idx}`;
          this.keyFacts.set(id, {
            id,
            type: 'decision',
            content: msg.text.substring(0, 200), // truncate
            timestamp: Date.now(),
            confidence: 0.8,
            sources: [String(idx)]
          });
        }
      });

      // Insights
      insightPatterns.forEach(pattern => {
        const matches = msg.text.match(pattern);
        if (matches) {
          const id = `insight_${Date.now()}_${idx}`;
          this.keyFacts.set(id, {
            id,
            type: 'insight',
            content: msg.text.substring(0, 200),
            timestamp: Date.now(),
            confidence: 0.7,
            sources: [String(idx)]
          });
        }
      });
    });
  }

  /**
   * Проверка обновлений файлов
   */
  private checkFileUpdates(userFiles?: any[]): FileChange[] {
    if (!userFiles || userFiles.length === 0) return [];

    // Mock implementation - in real app would track actual file changes
    return userFiles.map(file => ({
      path: file.name || 'unknown',
      change_type: 'modified' as const,
      timestamp: Date.now()
    }));
  }

  /**
   * Создание сжатого контекста для LLM
   */
  private createPackedContext(messages: Message[]): string {
    const summary = [];

    // Last user message
    const lastUser = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (lastUser) {
      summary.push(`LAST USER: ${lastUser.text.substring(0, 100)}`);
    }

    // Pending commitments
    const pending = Array.from(this.commitments.values()).filter(c => !c.resolved);
    if (pending.length > 0) {
      summary.push(`PENDING: ${pending.length} commitments (${pending.map(p => p.type).join(', ')})`);
    }

    // Key facts
    const facts = Array.from(this.keyFacts.values()).slice(-5); // last 5
    if (facts.length > 0) {
      summary.push(`KEY FACTS: ${facts.map(f => `[${f.type}] ${f.content.substring(0, 50)}`).join('; ')}`);
    }

    return summary.join(' | ');
  }

  /**
   * Extract keywords from text (simple version)
   */
  private extractKeywords(text: string): string[] {
    // Remove common words
    const stopWords = new Set(['и', 'в', 'на', 'с', 'по', 'для', 'что', 'как', 'это', 'the', 'a', 'an', 'to', 'of']);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // top 10 keywords
  }

  /**
   * Resolve commitment
   */
  resolveCommitment(id: string): void {
    const commitment = this.commitments.get(id);
    if (commitment) {
      commitment.resolved = true;
      this.commitments.set(id, commitment);
    }
  }

  /**
   * Get all pending commitments
   */
  getPendingCommitments(): PendingCommitment[] {
    return Array.from(this.commitments.values()).filter(c => !c.resolved);
  }

  /**
   * Clear old data (older than 24 hours)
   */
  cleanup(): void {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Clean old commitments
    Array.from(this.commitments.entries()).forEach(([id, c]) => {
      if (c.mentioned_at < dayAgo && c.resolved) {
        this.commitments.delete(id);
      }
    });

    // Clean old facts
    Array.from(this.keyFacts.entries()).forEach(([id, f]) => {
      if (f.timestamp < dayAgo) {
        this.keyFacts.delete(id);
      }
    });
  }
}

// Singleton instance
export const rule8Service = new Rule8Service();
