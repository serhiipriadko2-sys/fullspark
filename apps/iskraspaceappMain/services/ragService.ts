/**
 * RAG SERVICE - Retrieval Augmented Generation
 *
 * Canon Requirement: All knowledge rooted in project files and memory.
 * This service integrates memory search into AI responses.
 *
 * Features:
 * - Search memory before generating responses
 * - Include relevant context in prompts
 * - Add source attribution to responses
 * - Respect SIFT blocks when citing
 */

import { searchService } from './searchService';
import { memoryService } from './memoryService';
import { Evidence, MemoryNode, Message, SIFTBlock } from '../types';

// ============================================
// TYPES
// ============================================

/**
 * Source Priority Levels (A > B > C > D)
 * @see canon/IskraCanonDocumentation/10_RAG_SOURCES_and_SIFT.md
 */
export type SourcePriority = 'A_CANON' | 'B_PROJECT' | 'C_COMPANY' | 'D_WEB';

/**
 * Conflict between sources
 */
export interface SourceConflict {
  claim: string;
  sources: Array<{
    source_id: string;
    position: string;
    priority: SourcePriority;
    confidence: number;
  }>;
  resolution?: string;
}

export interface RAGContext {
  query: string;
  relevantMemories: MemoryHit[];
  contextBlock: string;
  sources: Source[];
  conflictTable?: SourceConflict[]; // NEW: Conflicts table for SIFT
  sourcePriority?: SourcePriority;  // NEW: Highest priority source used
}

export interface MemoryHit {
  id: string;
  title?: string;
  content: string;
  type: string;
  layer?: string;
  score: number;
  tags?: string[];
  sift?: SIFTBlock;
}

export interface Source {
  id: string;
  title: string;
  type: string;
  confidence: number;
}

export interface RAGEnhancedMessage extends Message {
  ragContext?: RAGContext;
  sources?: Source[];
}

// ============================================
// CONFIGURATION
// ============================================

const RAG_CONFIG = {
  maxMemories: 5,        // Max memories to include in context
  minScore: 0.2,         // Minimum relevance score
  maxContextLength: 2000, // Max characters for context block
  includeMantra: true,   // Always include relevant Mantra
  includeSift: true,     // Include SIFT blocks when available
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Build RAG context for a user query
 */
export async function buildRAGContext(
  query: string,
  options: {
    maxMemories?: number;
    minScore?: number;
    layers?: ('mantra' | 'archive' | 'shadow')[];
  } = {}
): Promise<RAGContext> {
  const maxMemories = options.maxMemories || RAG_CONFIG.maxMemories;
  const minScore = options.minScore || RAG_CONFIG.minScore;

  // Search for relevant memories
  const searchResults = await searchService.searchHybrid(query, {
    layer: options.layers,
  });

  // Filter by score and limit
  const relevantResults = searchResults
    .filter(r => r.score >= minScore)
    .slice(0, maxMemories);

  // Convert to MemoryHit format
  const relevantMemories: MemoryHit[] = relevantResults.map(r => ({
    id: r.id,
    title: r.title,
    content: r.snippet,
    type: r.type,
    layer: r.layer,
    score: r.score,
    tags: r.meta?.tags,
  }));

  // Always check Mantra for core principles
  if (RAG_CONFIG.includeMantra) {
    const mantra = memoryService.getMantra();
    // MantraNode is single entity, not array - check if relevant
    if (mantra && mantra.isActive) {
      const queryWords = query.toLowerCase().split(/\s+/);
      const mantraText = mantra.text.toLowerCase();
      const isRelevant = queryWords.some(w => mantraText.includes(w));

      if (isRelevant && !relevantMemories.some(rm => rm.id === mantra.id)) {
        relevantMemories.unshift({
          id: mantra.id,
          title: 'Mantra Core',
          content: mantra.text.substring(0, 200),
          type: 'mantra',
          layer: 'mantra',
          score: 1.0, // Mantra always highest priority
          tags: [],
        });
      }
    }
  }

  // Build context block for prompt
  const contextBlock = buildContextBlock(relevantMemories);

  // Extract sources for attribution
  const sources: Source[] = relevantMemories.map(m => ({
    id: m.id,
    title: m.title || 'Без названия',
    type: m.type,
    confidence: m.score,
  }));

  // SIFT: Detect conflicts between sources
  const conflictTable = detectConflicts(relevantMemories);

  // SIFT: Determine highest source priority
  const sourcePriority = getHighestSourcePriority(relevantMemories);

  return {
    query,
    relevantMemories,
    contextBlock,
    sources,
    conflictTable,      // NEW: SIFT conflict table
    sourcePriority,     // NEW: Source priority
  };
}

/**
 * Detect conflicts between sources
 * @see canon/IskraCanonDocumentation/10_RAG_SOURCES_and_SIFT.md
 */
function detectConflicts(memories: MemoryHit[]): SourceConflict[] {
  if (memories.length < 2) return [];

  const conflicts: SourceConflict[] = [];

  // Simple conflict detection: противоположные claims
  const contradictionPatterns = [
    { positive: /да|правда|верно|корректно|true/gi, negative: /нет|ложь|неверно|false/gi },
    { positive: /можно|разрешено|допустимо/gi, negative: /нельзя|запрещено|недопустимо/gi },
    { positive: /есть|существует|имеется/gi, negative: /нет|отсутствует|не имеется/gi },
  ];

  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const mem1 = memories[i];
      const mem2 = memories[j];

      for (const pattern of contradictionPatterns) {
        const hasPositive1 = pattern.positive.test(mem1.content);
        const hasNegative1 = pattern.negative.test(mem1.content);
        const hasPositive2 = pattern.positive.test(mem2.content);
        const hasNegative2 = pattern.negative.test(mem2.content);

        if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
          conflicts.push({
            claim: 'Противоречие в данных',
            sources: [
              {
                source_id: mem1.id,
                position: mem1.content.substring(0, 100),
                priority: getSourcePriority(mem1),
                confidence: mem1.score
              },
              {
                source_id: mem2.id,
                position: mem2.content.substring(0, 100),
                priority: getSourcePriority(mem2),
                confidence: mem2.score
              }
            ],
            resolution: `Приоритет: ${getSourcePriority(mem1)} vs ${getSourcePriority(mem2)}`
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Determine source priority (A > B > C > D)
 * @see canon/IskraCanonDocumentation/10_RAG_SOURCES_and_SIFT.md
 */
function getSourcePriority(memory: MemoryHit): SourcePriority {
  // A: Canon (mantra layer or canon files)
  if (memory.layer === 'mantra' || memory.type === 'canon') {
    return 'A_CANON';
  }

  // B: Project (archive layer)
  if (memory.layer === 'archive' || memory.type === 'project') {
    return 'B_PROJECT';
  }

  // C: Company knowledge
  if (memory.type === 'company' || memory.type === 'knowledge_file') {
    return 'C_COMPANY';
  }

  // D: Web (shadow layer or external)
  return 'D_WEB';
}

/**
 * Get highest priority among all memories
 */
function getHighestSourcePriority(memories: MemoryHit[]): SourcePriority {
  const priorities = memories.map(getSourcePriority);

  // Priority order: A > B > C > D
  if (priorities.includes('A_CANON')) return 'A_CANON';
  if (priorities.includes('B_PROJECT')) return 'B_PROJECT';
  if (priorities.includes('C_COMPANY')) return 'C_COMPANY';
  return 'D_WEB';
}

/**
 * Build context block for system prompt
 */
function buildContextBlock(memories: MemoryHit[]): string {
  if (memories.length === 0) {
    return '';
  }

  let block = `\n[КОНТЕКСТ ИЗ ПАМЯТИ]\n`;
  block += `Найдено ${memories.length} релевантных записей:\n\n`;

  let currentLength = block.length;

  for (const memory of memories) {
    const memoryBlock = formatMemoryHit(memory);

    if (currentLength + memoryBlock.length > RAG_CONFIG.maxContextLength) {
      block += `\n... (ещё ${memories.length - memories.indexOf(memory)} записей опущено)\n`;
      break;
    }

    block += memoryBlock;
    currentLength += memoryBlock.length;
  }

  block += `\n[КОНЕЦ КОНТЕКСТА]\n`;
  block += `Используй эту информацию для более точного ответа. При цитировании укажи источник.\n`;

  return block;
}

/**
 * Format a single memory hit for context
 */
function formatMemoryHit(memory: MemoryHit): string {
  const layerIcon = getLayerIcon(memory.layer);
  const score = (memory.score * 100).toFixed(0);

  let formatted = `${layerIcon} [${memory.type.toUpperCase()}] ${memory.title || 'Без названия'} (релевантность: ${score}%)\n`;
  formatted += `   ${memory.content}\n`;

  if (memory.tags && memory.tags.length > 0) {
    formatted += `   Теги: ${memory.tags.join(', ')}\n`;
  }

  formatted += `\n`;

  return formatted;
}

/**
 * Get icon for memory layer
 */
function getLayerIcon(layer?: string): string {
  switch (layer) {
    case 'mantra':
      return '⚡'; // Core truths
    case 'archive':
      return '📚'; // Verified knowledge
    case 'shadow':
      return '🌑'; // Uncertain/raw
    default:
      return '📝';
  }
}

/**
 * Enhance a message with RAG context
 */
export async function enhanceMessageWithRAG(
  userMessage: string,
  history: Message[] = []
): Promise<{ contextBlock: string; sources: Source[] }> {
  // Build query from user message + recent history context
  const recentContext = history
    .slice(-3)
    .map(m => m.text)
    .join(' ');

  const query = `${userMessage} ${recentContext}`.substring(0, 500);

  const ragContext = await buildRAGContext(query);

  return {
    contextBlock: ragContext.contextBlock,
    sources: ragContext.sources,
  };
}

/**
 * Generate source attribution block for response
 */
export function generateSourceAttribution(sources: Source[]): string {
  if (sources.length === 0) {
    return '';
  }

  let block = `\n---\n📚 Источники:\n`;

  for (const source of sources) {
    const confidence = (source.confidence * 100).toFixed(0);
    block += `- ${source.title} [${source.type}] (${confidence}%)\n`;
  }

  return block;
}

/**
 * Create SIFT evidence from RAG source
 */
export function createSIFTFromSource(source: Source, inference: string): SIFTBlock {
  return {
    source: `memory:${source.id}`,
    inference,
    fact: source.confidence > 0.7 ? 'true' : 'uncertain',
    trace: `RAG retrieval, score: ${source.confidence.toFixed(2)}`,
  };
}

/**
 * Search and format for display (simpler version for UI)
 */
export async function searchForDisplay(
  query: string,
  limit: number = 5
): Promise<{
  results: { title: string; snippet: string; type: string; score: number }[];
  totalFound: number;
}> {
  const searchResults = await searchService.searchHybrid(query);

  return {
    results: searchResults.slice(0, limit).map(r => ({
      title: r.title || 'Без названия',
      snippet: r.snippet,
      type: r.type,
      score: r.score,
    })),
    totalFound: searchResults.length,
  };
}

/**
 * Get context summary for a topic (useful for research)
 */
export async function getTopicSummary(topic: string): Promise<{
  hasContext: boolean;
  memoriesFound: number;
  layers: string[];
  topSources: string[];
  contextStrength: 'strong' | 'moderate' | 'weak' | 'none';
}> {
  const ragContext = await buildRAGContext(topic, { maxMemories: 10 });

  const layers = [...new Set(ragContext.relevantMemories.map(m => m.layer).filter(Boolean))];
  const avgScore = ragContext.relevantMemories.reduce((sum, m) => sum + m.score, 0) /
    (ragContext.relevantMemories.length || 1);

  let contextStrength: 'strong' | 'moderate' | 'weak' | 'none' = 'none';
  if (ragContext.relevantMemories.length >= 3 && avgScore > 0.5) {
    contextStrength = 'strong';
  } else if (ragContext.relevantMemories.length >= 1 && avgScore > 0.3) {
    contextStrength = 'moderate';
  } else if (ragContext.relevantMemories.length > 0) {
    contextStrength = 'weak';
  }

  return {
    hasContext: ragContext.relevantMemories.length > 0,
    memoriesFound: ragContext.relevantMemories.length,
    layers: layers as string[],
    topSources: ragContext.sources.slice(0, 3).map(s => s.title),
    contextStrength,
  };
}

// ============================================
// EXPORT
// ============================================

export const ragService = {
  buildRAGContext,
  enhanceMessageWithRAG,
  generateSourceAttribution,
  createSIFTFromSource,
  searchForDisplay,
  getTopicSummary,
  config: RAG_CONFIG,
};
