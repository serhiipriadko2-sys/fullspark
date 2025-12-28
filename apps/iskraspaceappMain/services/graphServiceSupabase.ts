/**
 * GraphRAG Service - Supabase Integration
 *
 * Extends in-memory graphService with Supabase persistence
 * Uses graph_nodes and graph_edges tables from migration
 *
 * @see services/graphService.ts (in-memory implementation)
 * @see supabase_graphrag_migration.sql (database schema)
 */

import { supabase as supabaseClient } from './supabaseClient';
import type { IskraMetrics } from '../types';
import type {
  MemoryLayer,
  MemoryNodeType,
  EdgeType,
  MemoryNode,
  MemoryEdge
} from './graphService';

// --- TYPES ---

interface GraphNodeRow {
  id: string;
  layer: string;
  type: string;
  content: string;
  timestamp: number;
  metrics_snapshot?: any;
  related_ids?: string[];
  resonance_score?: number;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface GraphEdgeRow {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  metadata?: any;
  created_at?: string;
  user_id?: string;
}

// --- SERVICE ---

class GraphServiceSupabase {
  /**
   * Add node to Supabase
   */
  public async addNode(
    layer: MemoryLayer,
    type: MemoryNodeType,
    content: string,
    metrics?: IskraMetrics,
    id?: string
  ): Promise<MemoryNode> {
    const nodeId = id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate resonance score if metrics provided
    const resonance_score = metrics
      ? this.calculateResonance(metrics)
      : undefined;

    const node: GraphNodeRow = {
      id: nodeId,
      layer: layer.toLowerCase(),
      type: type.toLowerCase(),
      content,
      timestamp: Date.now(),
      metrics_snapshot: metrics,
      resonance_score,
      metadata: {}
    };

    const { data, error } = await supabaseClient
      .from('graph_nodes')
      .insert(node)
      .select()
      .single();

    if (error) {
      console.error('Failed to insert graph node:', error);
      throw new Error(`GraphService: Failed to add node - ${error.message}`);
    }

    return this.rowToNode(data);
  }

  /**
   * Add edge to Supabase
   */
  public async addEdge(
    source: string,
    target: string,
    type: EdgeType,
    weight: number = 0.5
  ): Promise<MemoryEdge> {
    const edgeId = `edge_${source}_${target}_${type}`;

    const edge: GraphEdgeRow = {
      id: edgeId,
      source,
      target,
      type,
      weight,
      metadata: {}
    };

    const { data, error } = await supabaseClient
      .from('graph_edges')
      .insert(edge)
      .select()
      .single();

    if (error) {
      // If unique constraint violation, update existing edge
      if (error.code === '23505') {
        const { data: updated, error: updateError } = await supabaseClient
          .from('graph_edges')
          .update({ weight })
          .eq('source', source)
          .eq('target', target)
          .eq('type', type)
          .select()
          .single();

        if (updateError) {
          throw new Error(`GraphService: Failed to update edge - ${updateError.message}`);
        }

        return this.rowToEdge(updated);
      }

      throw new Error(`GraphService: Failed to add edge - ${error.message}`);
    }

    return this.rowToEdge(data);
  }

  /**
   * BFS Traversal using Supabase RPC function
   */
  public async traverseBFS(
    startId: string,
    maxDepth: number = 3,
    minWeight: number = 0.3
  ): Promise<MemoryNode[]> {
    const { data, error } = await supabaseClient
      .rpc('graph_bfs_traversal', {
        start_id: startId,
        max_depth: maxDepth,
        min_weight: minWeight
      });

    if (error) {
      console.error('BFS traversal failed:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get full node data for each node_id
    const nodeIds = data.map((row: any) => row.node_id);
    const { data: nodes, error: nodesError } = await supabaseClient
      .from('graph_nodes')
      .select('*')
      .in('id', nodeIds);

    if (nodesError) {
      console.error('Failed to fetch nodes:', nodesError);
      return [];
    }

    return nodes.map(this.rowToNode);
  }

  /**
   * Find resonant nodes using Supabase RPC function
   */
  public async findResonantNodes(
    minResonance: number = 0.3,
    limit: number = 10
  ): Promise<MemoryNode[]> {
    const { data, error } = await supabaseClient
      .rpc('graph_find_resonant', {
        min_resonance: minResonance,
        limit_count: limit
      });

    if (error) {
      console.error('Find resonant nodes failed:', error);
      return [];
    }

    return (data || []).map(this.rowToNode);
  }

  /**
   * Get node with all its edges
   */
  public async getNodeWithEdges(nodeId: string): Promise<{
    node: MemoryNode | null;
    outgoing: MemoryEdge[];
    incoming: MemoryEdge[];
  }> {
    const { data, error } = await supabaseClient
      .rpc('graph_get_node_with_edges', {
        node_id: nodeId
      });

    if (error) {
      console.error('Get node with edges failed:', error);
      return { node: null, outgoing: [], incoming: [] };
    }

    if (!data || !data.node) {
      return { node: null, outgoing: [], incoming: [] };
    }

    return {
      node: this.rowToNode(data.node),
      outgoing: (data.outgoing_edges || []).map(this.rowToEdge),
      incoming: (data.incoming_edges || []).map(this.rowToEdge)
    };
  }

  /**
   * Get all nodes by layer
   */
  public async getNodesByLayer(layer: MemoryLayer): Promise<MemoryNode[]> {
    const { data, error } = await supabaseClient
      .from('graph_nodes')
      .select('*')
      .eq('layer', layer.toLowerCase())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Get nodes by layer failed:', error);
      return [];
    }

    return (data || []).map(this.rowToNode);
  }

  /**
   * Get all nodes by type
   */
  public async getNodesByType(type: MemoryNodeType): Promise<MemoryNode[]> {
    const { data, error } = await supabaseClient
      .from('graph_nodes')
      .select('*')
      .eq('type', type.toLowerCase())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Get nodes by type failed:', error);
      return [];
    }

    return (data || []).map(this.rowToNode);
  }

  /**
   * Search nodes by content (full-text search)
   */
  public async searchNodes(query: string, limit: number = 10): Promise<MemoryNode[]> {
    const { data, error } = await supabaseClient
      .from('graph_nodes')
      .select('*')
      .textSearch('content', query, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit);

    if (error) {
      console.error('Search nodes failed:', error);
      return [];
    }

    return (data || []).map(this.rowToNode);
  }

  /**
   * Delete node and all its edges
   */
  public async deleteNode(nodeId: string): Promise<void> {
    // Edges will be deleted automatically due to CASCADE
    const { error } = await supabaseClient
      .from('graph_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) {
      console.error('Delete node failed:', error);
      throw new Error(`GraphService: Failed to delete node - ${error.message}`);
    }
  }

  /**
   * Update node resonance score
   */
  public async updateNodeResonance(
    nodeId: string,
    metrics: IskraMetrics
  ): Promise<void> {
    const resonance_score = this.calculateResonance(metrics);

    const { error } = await supabaseClient
      .from('graph_nodes')
      .update({
        resonance_score,
        metrics_snapshot: metrics
      })
      .eq('id', nodeId);

    if (error) {
      console.error('Update node resonance failed:', error);
      throw new Error(`GraphService: Failed to update resonance - ${error.message}`);
    }
  }

  /**
   * Build automatic connections for a node
   * Finds similar nodes and creates edges
   */
  public async buildConnections(nodeId: string): Promise<MemoryEdge[]> {
    // Get the node
    const { data: node, error: nodeError } = await supabaseClient
      .from('graph_nodes')
      .select('*')
      .eq('id', nodeId)
      .single();

    if (nodeError || !node) {
      console.error('Failed to fetch node for building connections:', nodeError);
      return [];
    }

    // Find similar nodes (same layer or type)
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('graph_nodes')
      .select('*')
      .or(`layer.eq.${node.layer},type.eq.${node.type}`)
      .neq('id', nodeId)
      .limit(20);

    if (candidatesError || !candidates) {
      console.error('Failed to find candidate nodes:', candidatesError);
      return [];
    }

    const edges: MemoryEdge[] = [];

    for (const candidate of candidates) {
      // Calculate similarity (simple: based on layer/type match)
      let edgeType: EdgeType;
      let weight = 0.3;

      if (candidate.layer === node.layer && candidate.type === node.type) {
        edgeType = 'SIMILARITY';
        weight = 0.6;
      } else if (candidate.layer === node.layer) {
        edgeType = 'RELATED_TO';
        weight = 0.4;
      } else {
        continue; // Skip dissimilar nodes
      }

      // Check for resonance boost
      if (
        node.resonance_score &&
        candidate.resonance_score &&
        Math.abs(node.resonance_score - candidate.resonance_score) < 0.2
      ) {
        edgeType = 'RESONANCE';
        weight = 0.7;
      }

      try {
        const edge = await this.addEdge(nodeId, candidate.id, edgeType, weight);
        edges.push(edge);
      } catch (err) {
        // Ignore errors (likely duplicate edges)
        console.warn(`Failed to create edge ${nodeId} -> ${candidate.id}:`, err);
      }
    }

    return edges;
  }

  /**
   * Get graph statistics
   */
  public async getStats(): Promise<{
    totalNodes: number;
    totalEdges: number;
    nodesByLayer: Record<string, number>;
    nodesByType: Record<string, number>;
  }> {
    const { data: nodes, error: nodesError } = await supabaseClient
      .from('graph_nodes')
      .select('id, layer, type');

    const { data: edges, error: edgesError } = await supabaseClient
      .from('graph_edges')
      .select('id');

    if (nodesError || edgesError) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        nodesByLayer: {},
        nodesByType: {}
      };
    }

    const nodesByLayer: Record<string, number> = {};
    const nodesByType: Record<string, number> = {};

    (nodes || []).forEach((node: { id: string; layer: string; type: string }) => {
      nodesByLayer[node.layer] = (nodesByLayer[node.layer] || 0) + 1;
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });

    return {
      totalNodes: nodes?.length || 0,
      totalEdges: edges?.length || 0,
      nodesByLayer,
      nodesByType
    };
  }

  // --- HELPER METHODS ---

  /**
   * Calculate resonance score from metrics
   * Resonance = (mirror_sync + (1 - drift)) / 2
   */
  private calculateResonance(metrics: IskraMetrics): number {
    const resonance = (metrics.mirror_sync + (1 - metrics.drift)) / 2;
    return parseFloat(resonance.toFixed(2));
  }

  /**
   * Convert database row to MemoryNode
   */
  private rowToNode(row: GraphNodeRow): MemoryNode {
    return {
      id: row.id,
      layer: row.layer.toUpperCase() as MemoryLayer,
      type: row.type as MemoryNodeType,
      content: row.content,
      timestamp: row.timestamp,
      metrics_snapshot: row.metrics_snapshot,
      relatedIds: row.related_ids,
      resonance_score: row.resonance_score,
      metadata: row.metadata || {}
    };
  }

  /**
   * Convert database row to MemoryEdge
   */
  private rowToEdge(row: GraphEdgeRow): MemoryEdge {
    return {
      id: row.id,
      source: row.source,
      target: row.target,
      type: row.type as EdgeType,
      weight: row.weight,
      metadata: row.metadata || {}
    };
  }
}

export const graphServiceSupabase = new GraphServiceSupabase();
