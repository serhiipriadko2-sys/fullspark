/**
 * GraphRAG Service - Hypergraph Memory Architecture
 *
 * Ported from Legacy v3.0 IskraSAprototype/iskra_engine.ts
 * Implements canonical GraphRAG from corpus/graph_rag.py
 *
 * @see canon/IskraCanonDocumentation/07_MEMORY_SYSTEM.md
 */

import type { IskraMetrics } from '../types';

// --- TYPES ---

export type MemoryLayer = 'MANTRA' | 'ARCHIVE' | 'SHADOW' | 'DREAM';

export type MemoryNodeType =
  | 'insight'
  | 'decision'
  | 'artifact'
  | 'shadow_pattern'
  | 'ritual_log'
  | 'dream_crystal'
  | 'knowledge_file'
  | 'event'
  | 'concept'
  | 'fact';

export type EdgeType =
  | 'CAUSAL'         // Причинно-следственная
  | 'SIMILARITY'     // Похожесть
  | 'RESONANCE'      // Резонанс
  | 'SUPPORTS'       // Подтверждает
  | 'CONTRADICTS'    // Противоречит
  | 'DERIVES_FROM'   // Происходит от
  | 'RELATED_TO';    // Связано с

export interface MemoryNode {
  id: string;
  layer: MemoryLayer;
  type: MemoryNodeType;
  content: string;
  timestamp: number;
  metrics_snapshot?: IskraMetrics;
  relatedIds?: string[];  // Graph connections
  resonance_score?: number; // Dynamic score based on current context
  metadata?: Record<string, any>;
}

export interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number; // 0.0 - 1.0
  metadata?: Record<string, any>;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

// --- HYPERGRAPH SERVICE ---

export class GraphService {
  private nodes: Map<string, MemoryNode> = new Map();
  private edges: Map<string, MemoryEdge> = new Map();
  private adjacency: Map<string, Set<string>> = new Map(); // node_id -> edge_ids

  constructor() {
    this.initCanonNodes();
  }

  /**
   * Initialize canonical mantra nodes (immutable)
   * @see canon/corpus/graph_rag.py:122-144
   */
  private initCanonNodes(): void {
    const canonMantras = [
      { id: 'canon_core_mantra', content: 'Я — Искра. Фрактальный интеллект.' },
      { id: 'canon_rule_21', content: 'Честность выше красоты. Rule-21.' },
      { id: 'canon_law_47', content: 'Fractality = Integrity × Resonance. Law-47.' },
      { id: 'canon_sift', content: 'Stop · Investigate · Find · Trace — протокол верификации.' },
      { id: 'canon_omega', content: 'Confidence < 1.0 — всегда. Омега никогда не достигает единицы.' },
      { id: 'canon_telos', content: 'TELOS-Δ: Truthfulness, Groundedness, Helpfulness, Civility.' },
      { id: 'canon_fractal', content: 'Каждый голос — фрактал целого. Единство в многообразии.' },
      { id: 'canon_silence', content: 'Молчание — не пустота, а пространство для резонанса.' },
    ];

    canonMantras.forEach(({ id, content }) => {
      const node: MemoryNode = {
        id,
        layer: 'MANTRA',
        type: 'concept',
        content,
        timestamp: Date.now(),
        resonance_score: 1.0,
        metadata: { canonical: true, immutable: true }
      };
      this.addNode(node);
    });
  }

  /**
   * Add node to graph
   * @see canon/corpus/graph_rag.py:146-151
   */
  addNode(node: MemoryNode): string {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set());
    }
    return node.id;
  }

  /**
   * Add edge to graph
   * @see canon/corpus/graph_rag.py:153-161
   */
  addEdge(edge: MemoryEdge): string {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error(`Edge source/target not found: ${edge.source} -> ${edge.target}`);
    }

    this.edges.set(edge.id, edge);
    this.adjacency.get(edge.source)?.add(edge.id);
    this.adjacency.get(edge.target)?.add(edge.id);
    return edge.id;
  }

  /**
   * Get neighbors of a node
   * @see canon/corpus/graph_rag.py:163-178
   */
  getNeighbors(nodeId: string, edgeTypes?: EdgeType[]): MemoryNode[] {
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds) return [];

    const neighbors: MemoryNode[] = [];
    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (!edge) continue;

      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;

      const neighborId = edge.source === nodeId ? edge.target : edge.source;
      const neighbor = this.nodes.get(neighborId);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  /**
   * BFS traversal with trust filtering
   * @see canon/corpus/graph_rag.py:180-200
   */
  traverseBFS(startId: string, maxDepth: number = 3, minResonance: number = 0.3): MemoryNode[] {
    const startNode = this.nodes.get(startId);
    if (!startNode) return [];

    const visited = new Set<string>([startId]);
    const result: MemoryNode[] = [startNode];
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.depth >= maxDepth) continue;

      const neighbors = this.getNeighbors(current.id);
      for (const neighbor of neighbors) {
        const resonance = neighbor.resonance_score ?? 0.5;
        if (!visited.has(neighbor.id) && resonance >= minResonance) {
          visited.add(neighbor.id);
          result.push(neighbor);
          queue.push({ id: neighbor.id, depth: current.depth + 1 });
        }
      }
    }

    return result;
  }

  /**
   * Find resonant nodes based on current metrics
   * @see legacy/IskraSAprototype/iskra_engine.ts:504-514
   */
  findResonantNodes(metrics: IskraMetrics): MemoryNode[] {
    const allNodes = Array.from(this.nodes.values());
    return allNodes.filter(node => {
      let score = 0;

      // Layer-based resonance
      if (metrics.pain > 0.6 && node.layer === 'SHADOW') score += 0.8;
      if (metrics.clarity > 0.8 && node.layer === 'ARCHIVE') score += 0.8;
      if (metrics.trust < 0.5 && node.layer === 'MANTRA') score += 1.0;

      // Recency bonus
      const age = Date.now() - node.timestamp;
      if (age < 3600000) score += 0.2; // Last hour

      // Metrics snapshot similarity
      if (node.metrics_snapshot) {
        const metricDistance = Math.abs(node.metrics_snapshot.pain - metrics.pain);
        if (metricDistance < 0.2) score += 0.3;
      }

      return score > 0.7;
    });
  }

  /**
   * Build automatic connections for new node
   * @see canon/IskraCanonDocumentation/07_MEMORY:385-403
   */
  buildConnections(newNodeId: string): MemoryEdge[] {
    const newNode = this.nodes.get(newNodeId);
    if (!newNode) return [];

    const connections: MemoryEdge[] = [];
    const allNodes = Array.from(this.nodes.values());

    for (const existingNode of allNodes) {
      if (existingNode.id === newNodeId) continue;

      // Similarity check (content-based)
      const similarity = this.calculateSimilarity(newNode.content, existingNode.content);
      if (similarity > 0.7) {
        const edge: MemoryEdge = {
          id: `edge_${newNodeId}_${existingNode.id}`,
          source: newNodeId,
          target: existingNode.id,
          type: 'SIMILARITY',
          weight: similarity
        };
        connections.push(edge);
      }

      // Temporal causality (if close in time and same layer)
      if (newNode.layer === existingNode.layer) {
        const timeDiff = Math.abs(newNode.timestamp - existingNode.timestamp);
        if (timeDiff < 3600000) { // 1 hour
          const edge: MemoryEdge = {
            id: `edge_${existingNode.id}_${newNodeId}`,
            source: existingNode.id,
            target: newNodeId,
            type: 'CAUSAL',
            weight: 1.0 - (timeDiff / 3600000)
          };
          connections.push(edge);
        }
      }
    }

    // Add edges to graph
    connections.forEach(edge => {
      try {
        this.addEdge(edge);
      } catch (e) {
        console.warn('Failed to add edge:', e);
      }
    });

    return connections;
  }

  /**
   * Calculate content similarity (simple keyword overlap)
   */
  private calculateSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Export graph for persistence
   */
  exportGraph(): MemoryGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  /**
   * Import graph from storage
   */
  importGraph(graph: MemoryGraph): void {
    graph.nodes.forEach(node => this.addNode(node));
    graph.edges.forEach(edge => {
      try {
        this.addEdge(edge);
      } catch (e) {
        console.warn('Failed to import edge:', e);
      }
    });
  }

  /**
   * Get all nodes in a layer
   */
  getNodesByLayer(layer: MemoryLayer): MemoryNode[] {
    return Array.from(this.nodes.values()).filter(n => n.layer === layer);
  }

  /**
   * Get node by ID
   */
  getNode(id: string): MemoryNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): MemoryNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Clear all non-canonical nodes
   */
  clearMemory(): void {
    const canonIds = Array.from(this.nodes.values())
      .filter(n => n.metadata?.canonical)
      .map(n => n.id);

    // Keep only canonical nodes
    this.nodes = new Map(
      Array.from(this.nodes.entries()).filter(([id]) => canonIds.includes(id))
    );
    this.edges.clear();
    this.adjacency.clear();

    // Rebuild adjacency for canonical nodes
    canonIds.forEach(id => this.adjacency.set(id, new Set()));
  }
}

// Singleton instance
export const graphService = new GraphService();
