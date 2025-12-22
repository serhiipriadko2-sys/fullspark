/**
 * Graph Service Unit Tests
 *
 * Tests in-memory Hypergraph Memory implementation
 * @see services/graphService.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { graphService } from '../../services/graphService';
import type { IskraMetrics } from '../../types';

describe('GraphService', () => {
  const mockMetrics: IskraMetrics = {
    trust: 0.8,
    pain: 0.2,
    chaos: 0.3,
    drift: 0.1,
    clarity: 0.9,
    echo: 0.0,
    silence_mass: 0.1,
    mirror_sync: 0.85,
    joy: 0.7,
    energy: 0.8,
    rhythm: 0.75,
    ctxSwitch: 0.2
  };

  beforeEach(() => {
    // Clear graph before each test
    graphService['nodes'].clear();
    graphService['edges'].clear();
  });

  describe('addNode', () => {
    it('should add node to graph', () => {
      const node = graphService.addNode(
        'ARCHIVE',
        'insight',
        'Test insight',
        mockMetrics
      );

      expect(node.id).toBeTruthy();
      expect(node.layer).toBe('ARCHIVE');
      expect(node.type).toBe('insight');
      expect(node.content).toBe('Test insight');
      expect(node.timestamp).toBeTruthy();
    });

    it('should calculate resonance score', () => {
      const node = graphService.addNode(
        'ARCHIVE',
        'insight',
        'Test',
        mockMetrics
      );

      expect(node.resonance_score).toBeDefined();
      expect(node.resonance_score).toBeGreaterThan(0);
      expect(node.resonance_score).toBeLessThanOrEqual(1);
    });

    it('should use custom ID if provided', () => {
      const node = graphService.addNode(
        'ARCHIVE',
        'insight',
        'Test',
        mockMetrics,
        'custom_id'
      );

      expect(node.id).toBe('custom_id');
    });
  });

  describe('addEdge', () => {
    it('should create edge between nodes', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Node 1');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Node 2');

      const edge = graphService.addEdge(node1.id, node2.id, 'SIMILARITY', 0.7);

      expect(edge.source).toBe(node1.id);
      expect(edge.target).toBe(node2.id);
      expect(edge.type).toBe('SIMILARITY');
      expect(edge.weight).toBe(0.7);
    });

    it('should update relatedIds on both nodes', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Node 1');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Node 2');

      graphService.addEdge(node1.id, node2.id, 'SIMILARITY');

      expect(node1.relatedIds).toContain(node2.id);
      expect(node2.relatedIds).toContain(node1.id);
    });
  });

  describe('getNode', () => {
    it('should retrieve existing node', () => {
      const added = graphService.addNode('ARCHIVE', 'insight', 'Test');
      const retrieved = graphService.getNode(added.id);

      expect(retrieved).toEqual(added);
    });

    it('should return null for non-existent node', () => {
      const retrieved = graphService.getNode('non_existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('traverseBFS', () => {
    it('should find nodes within depth=1', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Center');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Neighbor 1');
      const node3 = graphService.addNode('ARCHIVE', 'insight', 'Neighbor 2');
      const node4 = graphService.addNode('ARCHIVE', 'insight', 'Distant');

      graphService.addEdge(node1.id, node2.id, 'SIMILARITY', 0.8);
      graphService.addEdge(node1.id, node3.id, 'SIMILARITY', 0.7);
      graphService.addEdge(node2.id, node4.id, 'SIMILARITY', 0.6);

      const nodes = graphService.traverseBFS(node1.id, 1);

      expect(nodes).toHaveLength(3); // node1 + 2 neighbors
      expect(nodes.map(n => n.id)).toContain(node1.id);
      expect(nodes.map(n => n.id)).toContain(node2.id);
      expect(nodes.map(n => n.id)).toContain(node3.id);
      expect(nodes.map(n => n.id)).not.toContain(node4.id);
    });

    it('should find nodes within depth=2', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Center');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Neighbor');
      const node3 = graphService.addNode('ARCHIVE', 'insight', 'Distant');

      graphService.addEdge(node1.id, node2.id, 'SIMILARITY', 0.8);
      graphService.addEdge(node2.id, node3.id, 'SIMILARITY', 0.7);

      const nodes = graphService.traverseBFS(node1.id, 2);

      expect(nodes).toHaveLength(3); // All nodes
      expect(nodes.map(n => n.id)).toContain(node3.id);
    });

    it('should filter by minResonance', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Center');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Low resonance');
      const node3 = graphService.addNode('ARCHIVE', 'insight', 'High resonance', mockMetrics);

      graphService.addEdge(node1.id, node2.id, 'SIMILARITY', 0.8);
      graphService.addEdge(node1.id, node3.id, 'SIMILARITY', 0.8);

      // Filter out low resonance nodes
      const nodes = graphService.traverseBFS(node1.id, 1, 0.5);

      expect(nodes.map(n => n.id)).toContain(node3.id);
      // node2 has no resonance_score (undefined), should be filtered
    });

    it('should filter by edge weight', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Center');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Weak link');
      const node3 = graphService.addNode('ARCHIVE', 'insight', 'Strong link');

      graphService.addEdge(node1.id, node2.id, 'SIMILARITY', 0.2); // Weak
      graphService.addEdge(node1.id, node3.id, 'SIMILARITY', 0.8); // Strong

      const nodes = graphService.traverseBFS(node1.id, 1, 0.3);

      expect(nodes.map(n => n.id)).toContain(node3.id);
      expect(nodes.map(n => n.id)).not.toContain(node2.id);
    });
  });

  describe('findResonantNodes', () => {
    it('should find nodes with high resonance', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Low', {
        ...mockMetrics,
        mirror_sync: 0.3,
        drift: 0.6
      });
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'High', {
        ...mockMetrics,
        mirror_sync: 0.9,
        drift: 0.1
      });
      const node3 = graphService.addNode('ARCHIVE', 'insight', 'Medium', {
        ...mockMetrics,
        mirror_sync: 0.6,
        drift: 0.3
      });

      const resonant = graphService.findResonantNodes(0.5);

      expect(resonant.length).toBeGreaterThan(0);
      expect(resonant.map(n => n.id)).toContain(node2.id);
      expect(resonant.map(n => n.id)).not.toContain(node1.id);
    });

    it('should sort by resonance score descending', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Med', {
        ...mockMetrics,
        mirror_sync: 0.6,
        drift: 0.3
      });
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'High', {
        ...mockMetrics,
        mirror_sync: 0.9,
        drift: 0.1
      });

      const resonant = graphService.findResonantNodes(0.3);

      expect(resonant[0].id).toBe(node2.id);
      expect(resonant[1].id).toBe(node1.id);
    });
  });

  describe('buildConnections', () => {
    it('should create connections to similar nodes', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Test 1', mockMetrics);
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Test 2', mockMetrics);
      const node3 = graphService.addNode('SHADOW', 'event', 'Different', mockMetrics);

      const edges = graphService.buildConnections(node1.id);

      expect(edges.length).toBeGreaterThan(0);
      // Should connect to node2 (same layer + type)
      expect(edges.some(e => e.target === node2.id)).toBe(true);
    });

    it('should create SIMILARITY edges for same layer+type', () => {
      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Test 1');
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Test 2');

      const edges = graphService.buildConnections(node1.id);

      const edge = edges.find(e => e.target === node2.id);
      expect(edge?.type).toBe('SIMILARITY');
    });

    it('should create RESONANCE edges for similar resonance scores', () => {
      const sharedMetrics = {
        ...mockMetrics,
        mirror_sync: 0.85,
        drift: 0.1
      };

      const node1 = graphService.addNode('ARCHIVE', 'insight', 'Test 1', sharedMetrics);
      const node2 = graphService.addNode('ARCHIVE', 'insight', 'Test 2', sharedMetrics);

      const edges = graphService.buildConnections(node1.id);

      const edge = edges.find(e => e.target === node2.id);
      expect(edge?.type).toBe('RESONANCE');
      expect(edge?.weight).toBeGreaterThan(0.5);
    });
  });

  describe('getNodesByLayer', () => {
    it('should retrieve nodes from specific layer', () => {
      graphService.addNode('MANTRA', 'insight', 'Canon 1');
      graphService.addNode('MANTRA', 'insight', 'Canon 2');
      graphService.addNode('ARCHIVE', 'insight', 'Archive 1');

      const mantraNodes = graphService.getNodesByLayer('MANTRA');

      expect(mantraNodes).toHaveLength(2);
      mantraNodes.forEach(node => {
        expect(node.layer).toBe('MANTRA');
      });
    });
  });

  describe('getNodesByType', () => {
    it('should retrieve nodes of specific type', () => {
      graphService.addNode('ARCHIVE', 'insight', 'Insight 1');
      graphService.addNode('ARCHIVE', 'insight', 'Insight 2');
      graphService.addNode('ARCHIVE', 'decision', 'Decision 1');

      const insights = graphService.getNodesByType('insight');

      expect(insights).toHaveLength(2);
      insights.forEach(node => {
        expect(node.type).toBe('insight');
      });
    });
  });

  describe('Canonical nodes initialization', () => {
    it('should initialize with 8 canonical nodes', () => {
      // GraphService auto-initializes canonical nodes
      const mantraNodes = graphService.getNodesByLayer('MANTRA');

      expect(mantraNodes.length).toBeGreaterThanOrEqual(8);

      // Check for key canonical nodes
      const ids = mantraNodes.map(n => n.id);
      expect(ids).toContain('canon_core_mantra');
      expect(ids).toContain('canon_rule_21');
      expect(ids).toContain('canon_law_47');
      expect(ids).toContain('canon_sift_protocol');
    });

    it('canonical nodes should have resonance = 1.0', () => {
      const canonNode = graphService.getNode('canon_core_mantra');

      expect(canonNode).toBeTruthy();
      expect(canonNode?.resonance_score).toBe(1.0);
    });
  });
});
