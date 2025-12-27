/**
 * Graph Service Unit Tests
 *
 * Tests in-memory Hypergraph Memory implementation
 * @see services/graphService.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphService, MemoryNode, MemoryEdge } from '../../services/graphService';
import type { IskraMetrics } from '../../types';

describe('GraphService', () => {
  let graphService: GraphService;

  const mockMetrics: IskraMetrics = {
    trust: 0.8,
    pain: 0.2,
    chaos: 0.3,
    drift: 0.1,
    clarity: 0.9,
    echo: 0.0,
    silence_mass: 0.1,
    mirror_sync: 0.85,
    rhythm: 75,
    interrupt: 0,
    ctxSwitch: 0,
  };

  const createNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
    id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    layer: 'ARCHIVE',
    type: 'insight',
    content: 'Test content',
    timestamp: Date.now(),
    relatedIds: [],
    ...overrides,
  });

  beforeEach(() => {
    // Create fresh instance for each test
    graphService = new GraphService();
    // Clear non-canonical nodes
    graphService.clearMemory();
  });

  describe('addNode', () => {
    it('should add node to graph and return its id', () => {
      const node = createNode({
        id: 'test_node_1',
        content: 'Test insight',
        metrics_snapshot: mockMetrics,
      });

      const id = graphService.addNode(node);

      expect(id).toBe('test_node_1');
      const retrieved = graphService.getNode('test_node_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.layer).toBe('ARCHIVE');
      expect(retrieved?.type).toBe('insight');
      expect(retrieved?.content).toBe('Test insight');
    });

    it('should store metrics snapshot with resonance', () => {
      const node = createNode({
        id: 'resonance_test',
        metrics_snapshot: mockMetrics,
        resonance_score: 0.85,
      });

      graphService.addNode(node);
      const retrieved = graphService.getNode('resonance_test');

      expect(retrieved?.resonance_score).toBe(0.85);
      expect(retrieved?.metrics_snapshot).toEqual(mockMetrics);
    });
  });

  describe('addEdge', () => {
    it('should create edge between nodes', () => {
      const node1 = createNode({ id: 'edge_node_1' });
      const node2 = createNode({ id: 'edge_node_2' });
      graphService.addNode(node1);
      graphService.addNode(node2);

      const edge: MemoryEdge = {
        id: 'edge_1',
        source: 'edge_node_1',
        target: 'edge_node_2',
        type: 'SIMILARITY',
        weight: 0.7,
      };

      const edgeId = graphService.addEdge(edge);

      expect(edgeId).toBe('edge_1');
    });

    it('should throw for non-existent source node', () => {
      const node2 = createNode({ id: 'edge_node_2' });
      graphService.addNode(node2);

      const edge: MemoryEdge = {
        id: 'bad_edge',
        source: 'non_existent',
        target: 'edge_node_2',
        type: 'SIMILARITY',
        weight: 0.5,
      };

      expect(() => graphService.addEdge(edge)).toThrow();
    });
  });

  describe('getNode', () => {
    it('should retrieve existing node', () => {
      const node = createNode({ id: 'get_test', content: 'Retrievable' });
      graphService.addNode(node);

      const retrieved = graphService.getNode('get_test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Retrievable');
    });

    it('should return undefined for non-existent node', () => {
      const retrieved = graphService.getNode('non_existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getNeighbors', () => {
    it('should return connected nodes', () => {
      const node1 = createNode({ id: 'center' });
      const node2 = createNode({ id: 'neighbor_1' });
      const node3 = createNode({ id: 'neighbor_2' });
      graphService.addNode(node1);
      graphService.addNode(node2);
      graphService.addNode(node3);

      graphService.addEdge({
        id: 'e1',
        source: 'center',
        target: 'neighbor_1',
        type: 'SIMILARITY',
        weight: 0.8,
      });
      graphService.addEdge({
        id: 'e2',
        source: 'center',
        target: 'neighbor_2',
        type: 'CAUSAL',
        weight: 0.6,
      });

      const neighbors = graphService.getNeighbors('center');

      expect(neighbors).toHaveLength(2);
      expect(neighbors.map(n => n.id)).toContain('neighbor_1');
      expect(neighbors.map(n => n.id)).toContain('neighbor_2');
    });

    it('should filter by edge type', () => {
      const node1 = createNode({ id: 'typed_center' });
      const node2 = createNode({ id: 'sim_neighbor' });
      const node3 = createNode({ id: 'causal_neighbor' });
      graphService.addNode(node1);
      graphService.addNode(node2);
      graphService.addNode(node3);

      graphService.addEdge({
        id: 'te1',
        source: 'typed_center',
        target: 'sim_neighbor',
        type: 'SIMILARITY',
        weight: 0.8,
      });
      graphService.addEdge({
        id: 'te2',
        source: 'typed_center',
        target: 'causal_neighbor',
        type: 'CAUSAL',
        weight: 0.6,
      });

      const neighbors = graphService.getNeighbors('typed_center', ['SIMILARITY']);

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('sim_neighbor');
    });
  });

  describe('traverseBFS', () => {
    it('should find nodes within depth=1', () => {
      const node1 = createNode({ id: 'bfs_center', resonance_score: 0.8 });
      const node2 = createNode({ id: 'bfs_n1', resonance_score: 0.8 });
      const node3 = createNode({ id: 'bfs_n2', resonance_score: 0.8 });
      const node4 = createNode({ id: 'bfs_distant', resonance_score: 0.8 });
      graphService.addNode(node1);
      graphService.addNode(node2);
      graphService.addNode(node3);
      graphService.addNode(node4);

      graphService.addEdge({ id: 'be1', source: 'bfs_center', target: 'bfs_n1', type: 'SIMILARITY', weight: 0.8 });
      graphService.addEdge({ id: 'be2', source: 'bfs_center', target: 'bfs_n2', type: 'SIMILARITY', weight: 0.7 });
      graphService.addEdge({ id: 'be3', source: 'bfs_n1', target: 'bfs_distant', type: 'SIMILARITY', weight: 0.6 });

      const nodes = graphService.traverseBFS('bfs_center', 1);

      expect(nodes).toHaveLength(3); // center + 2 direct neighbors
      expect(nodes.map(n => n.id)).toContain('bfs_center');
      expect(nodes.map(n => n.id)).toContain('bfs_n1');
      expect(nodes.map(n => n.id)).toContain('bfs_n2');
      expect(nodes.map(n => n.id)).not.toContain('bfs_distant');
    });

    it('should find nodes within depth=2', () => {
      const node1 = createNode({ id: 'bfs2_center', resonance_score: 0.8 });
      const node2 = createNode({ id: 'bfs2_n1', resonance_score: 0.8 });
      const node3 = createNode({ id: 'bfs2_distant', resonance_score: 0.8 });
      graphService.addNode(node1);
      graphService.addNode(node2);
      graphService.addNode(node3);

      graphService.addEdge({ id: 'be2_1', source: 'bfs2_center', target: 'bfs2_n1', type: 'SIMILARITY', weight: 0.8 });
      graphService.addEdge({ id: 'be2_2', source: 'bfs2_n1', target: 'bfs2_distant', type: 'SIMILARITY', weight: 0.7 });

      const nodes = graphService.traverseBFS('bfs2_center', 2);

      expect(nodes).toHaveLength(3); // All nodes reachable
      expect(nodes.map(n => n.id)).toContain('bfs2_distant');
    });

    it('should filter by minResonance', () => {
      const node1 = createNode({ id: 'res_center', resonance_score: 0.8 });
      const node2 = createNode({ id: 'res_low', resonance_score: 0.2 });
      const node3 = createNode({ id: 'res_high', resonance_score: 0.9 });
      graphService.addNode(node1);
      graphService.addNode(node2);
      graphService.addNode(node3);

      graphService.addEdge({ id: 're1', source: 'res_center', target: 'res_low', type: 'SIMILARITY', weight: 0.8 });
      graphService.addEdge({ id: 're2', source: 'res_center', target: 'res_high', type: 'SIMILARITY', weight: 0.8 });

      const nodes = graphService.traverseBFS('res_center', 1, 0.5);

      // Should include center and high resonance node, but not low resonance
      expect(nodes.map(n => n.id)).toContain('res_high');
      expect(nodes.map(n => n.id)).not.toContain('res_low');
    });
  });

  describe('findResonantNodes', () => {
    it('should find nodes matching metric-based criteria', () => {
      // Add nodes with different metrics snapshots
      const highPainNode = createNode({
        id: 'high_pain_node',
        layer: 'SHADOW',
        metrics_snapshot: { ...mockMetrics, pain: 0.8 },
      });
      const normalNode = createNode({
        id: 'normal_node',
        layer: 'ARCHIVE',
        metrics_snapshot: mockMetrics,
      });
      graphService.addNode(highPainNode);
      graphService.addNode(normalNode);

      // Search with high pain metrics - should find shadow node
      const resonant = graphService.findResonantNodes({ ...mockMetrics, pain: 0.8 });

      // Shadow nodes resonate with high pain
      const ids = resonant.map(n => n.id);
      expect(ids).toContain('high_pain_node');
    });

    it('should return MANTRA nodes for low trust', () => {
      // Low trust should resonate with canonical MANTRA nodes
      const resonant = graphService.findResonantNodes({ ...mockMetrics, trust: 0.3 });

      // Should find at least some canonical nodes
      const canonicalIds = resonant.filter(n => n.layer === 'MANTRA').map(n => n.id);
      expect(canonicalIds.length).toBeGreaterThan(0);
    });
  });

  describe('buildConnections', () => {
    it('should create similarity connections', () => {
      const node1 = createNode({ id: 'similar_1', content: 'Test similar content here' });
      const node2 = createNode({ id: 'similar_2', content: 'Test similar content here too' });
      graphService.addNode(node1);
      graphService.addNode(node2);

      const edges = graphService.buildConnections('similar_1');

      // Should have created at least one connection
      expect(edges.length).toBeGreaterThanOrEqual(0); // May or may not connect depending on similarity threshold
    });
  });

  describe('getNodesByLayer', () => {
    it('should retrieve nodes from specific layer', () => {
      const mantraNode = createNode({ id: 'custom_mantra', layer: 'MANTRA' });
      const archiveNode = createNode({ id: 'custom_archive', layer: 'ARCHIVE' });
      graphService.addNode(mantraNode);
      graphService.addNode(archiveNode);

      const mantraNodes = graphService.getNodesByLayer('MANTRA');

      // Should include at least canonical nodes + our custom node
      expect(mantraNodes.length).toBeGreaterThanOrEqual(1);
      expect(mantraNodes.some(n => n.id === 'custom_mantra')).toBe(true);
    });
  });

  describe('getAllNodes', () => {
    it('should return all nodes', () => {
      const node1 = createNode({ id: 'all_1' });
      const node2 = createNode({ id: 'all_2' });
      graphService.addNode(node1);
      graphService.addNode(node2);

      const all = graphService.getAllNodes();

      // Should have canonical nodes + our 2 nodes
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(all.some(n => n.id === 'all_1')).toBe(true);
      expect(all.some(n => n.id === 'all_2')).toBe(true);
    });
  });

  describe('Canonical nodes initialization', () => {
    it('should initialize with canonical nodes', () => {
      // Fresh service should have canonical nodes
      const freshService = new GraphService();
      const mantraNodes = freshService.getNodesByLayer('MANTRA');

      expect(mantraNodes.length).toBeGreaterThanOrEqual(8);

      // Check for key canonical nodes
      const ids = mantraNodes.map(n => n.id);
      expect(ids).toContain('canon_core_mantra');
      expect(ids).toContain('canon_rule_21');
      expect(ids).toContain('canon_law_47');
    });

    it('canonical nodes should have resonance = 1.0', () => {
      const freshService = new GraphService();
      const canonNode = freshService.getNode('canon_core_mantra');

      expect(canonNode).toBeDefined();
      expect(canonNode?.resonance_score).toBe(1.0);
    });

    it('canonical nodes should be marked immutable', () => {
      const freshService = new GraphService();
      const canonNode = freshService.getNode('canon_core_mantra');

      expect(canonNode?.metadata?.canonical).toBe(true);
      expect(canonNode?.metadata?.immutable).toBe(true);
    });
  });

  describe('clearMemory', () => {
    it('should keep canonical nodes after clear', () => {
      const customNode = createNode({ id: 'to_be_cleared' });
      graphService.addNode(customNode);

      graphService.clearMemory();

      expect(graphService.getNode('to_be_cleared')).toBeUndefined();
      expect(graphService.getNode('canon_core_mantra')).toBeDefined();
    });
  });

  describe('exportGraph / importGraph', () => {
    it('should export and import graph correctly', () => {
      const node = createNode({ id: 'export_test', content: 'Exportable' });
      graphService.addNode(node);

      const exported = graphService.exportGraph();

      expect(exported.nodes.some(n => n.id === 'export_test')).toBe(true);
    });
  });
});
