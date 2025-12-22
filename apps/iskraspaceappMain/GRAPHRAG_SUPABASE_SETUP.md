# GraphRAG + Supabase Integration Guide

## Overview

This integration adds **persistent graph storage** to the GraphRAG service using Supabase (Postgres).

**Features:**
- ✅ Full graph persistence (nodes + edges)
- ✅ BFS traversal via RPC functions
- ✅ Resonance-based node search
- ✅ Automatic connection building
- ✅ Row-level security (RLS) for multi-user
- ✅ 8 canonical seed nodes pre-loaded

---

## Setup Instructions

### 1. Run SQL Migration

Execute the migration SQL to create tables and functions:

```bash
# Option A: Via psql
psql -h <YOUR_SUPABASE_HOST> \
     -U postgres \
     -d postgres \
     -f apps/iskraspaceappMain/supabase_graphrag_migration.sql

# Option B: Via Supabase Dashboard
# 1. Go to https://app.supabase.com/project/<YOUR_PROJECT>/sql
# 2. Paste contents of supabase_graphrag_migration.sql
# 3. Click "Run"
```

### 2. Verify Tables Created

Check that tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('graph_nodes', 'graph_edges');
```

Expected output:
```
 table_name
-------------
 graph_nodes
 graph_edges
```

### 3. Verify Seed Data

Check canonical nodes were inserted:

```sql
SELECT id, content, resonance_score
FROM graph_nodes
WHERE layer = 'mantra'
ORDER BY id;
```

Expected output: 8 canonical nodes (canon_core_mantra, canon_rule_21, etc.)

---

## Usage

### Basic Usage (In-Memory)

Use the original `graphService.ts` for in-memory operations:

```typescript
import { graphService } from './services/graphService';

// Add node
const node = graphService.addNode(
  'ARCHIVE',
  'insight',
  'User prefers structured responses'
);

// Traverse graph
const related = graphService.traverseBFS(node.id, 3, 0.3);
```

### Advanced Usage (Supabase)

Use `graphServiceSupabase.ts` for persistent storage:

```typescript
import { graphServiceSupabase } from './services/graphServiceSupabase';

// Add node to Supabase
const node = await graphServiceSupabase.addNode(
  'ARCHIVE',
  'insight',
  'User prefers structured responses'
);

// BFS traversal (uses RPC function)
const related = await graphServiceSupabase.traverseBFS(node.id, 3, 0.3);

// Find resonant nodes
const resonant = await graphServiceSupabase.findResonantNodes(0.5, 10);

// Build automatic connections
const edges = await graphServiceSupabase.buildConnections(node.id);

// Get stats
const stats = await graphServiceSupabase.getStats();
console.log(stats);
// Output: { totalNodes: 15, totalEdges: 42, nodesByLayer: {...}, ... }
```

---

## API Reference

### GraphServiceSupabase Methods

#### `addNode(layer, type, content, metrics?, id?)`
Add a node to the graph.

**Returns:** `Promise<MemoryNode>`

**Example:**
```typescript
const node = await graphServiceSupabase.addNode(
  'ARCHIVE',
  'decision',
  'Decided to use GraphRAG for memory',
  currentMetrics,
  'decision_001'
);
```

---

#### `addEdge(source, target, type, weight?)`
Create an edge between two nodes.

**Returns:** `Promise<MemoryEdge>`

**Example:**
```typescript
const edge = await graphServiceSupabase.addEdge(
  'decision_001',
  'insight_042',
  'SUPPORTS',
  0.8
);
```

---

#### `traverseBFS(startId, maxDepth?, minWeight?)`
Breadth-First Search traversal from a starting node.

**Parameters:**
- `startId`: Starting node ID
- `maxDepth`: Maximum depth (default: 3)
- `minWeight`: Minimum edge weight to follow (default: 0.3)

**Returns:** `Promise<MemoryNode[]>`

**Example:**
```typescript
const nodes = await graphServiceSupabase.traverseBFS(
  'canon_core_mantra',
  3,
  0.5
);
// Returns all nodes within 3 hops with edge weight >= 0.5
```

---

#### `findResonantNodes(minResonance?, limit?)`
Find nodes with high resonance scores.

**Returns:** `Promise<MemoryNode[]>`

**Example:**
```typescript
const highResonance = await graphServiceSupabase.findResonantNodes(0.7, 5);
// Returns top 5 nodes with resonance >= 0.7
```

---

#### `getNodeWithEdges(nodeId)`
Get a node and all its edges (incoming + outgoing).

**Returns:** `Promise<{ node, outgoing, incoming }>`

**Example:**
```typescript
const result = await graphServiceSupabase.getNodeWithEdges('decision_001');
console.log(result.node);          // MemoryNode
console.log(result.outgoing);      // MemoryEdge[] (edges FROM this node)
console.log(result.incoming);      // MemoryEdge[] (edges TO this node)
```

---

#### `buildConnections(nodeId)`
Automatically create edges to similar nodes.

**Returns:** `Promise<MemoryEdge[]>`

**Example:**
```typescript
const edges = await graphServiceSupabase.buildConnections('insight_042');
// Creates SIMILARITY/RESONANCE/RELATED_TO edges to similar nodes
```

---

#### `getStats()`
Get graph statistics.

**Returns:** `Promise<{ totalNodes, totalEdges, nodesByLayer, nodesByType }>`

**Example:**
```typescript
const stats = await graphServiceSupabase.getStats();
/*
{
  totalNodes: 234,
  totalEdges: 567,
  nodesByLayer: { mantra: 8, archive: 156, shadow: 70 },
  nodesByType: { insight: 89, decision: 45, ... }
}
*/
```

---

## RPC Functions (SQL)

These can be called directly via Supabase or through `graphServiceSupabase`:

### `graph_bfs_traversal(start_id, max_depth, min_weight)`
Breadth-first search traversal.

```sql
SELECT * FROM graph_bfs_traversal('canon_core_mantra', 3, 0.3);
```

---

### `graph_find_resonant(min_resonance, limit_count)`
Find high-resonance nodes.

```sql
SELECT * FROM graph_find_resonant(0.5, 10);
```

---

### `graph_get_node_with_edges(node_id)`
Get node with all edges.

```sql
SELECT * FROM graph_get_node_with_edges('decision_001');
```

---

## Schema

### graph_nodes Table

| Column            | Type        | Description                          |
|-------------------|-------------|--------------------------------------|
| id                | TEXT (PK)   | Unique node ID                       |
| layer             | TEXT        | mantra / archive / shadow            |
| type              | TEXT        | insight / decision / event / etc     |
| content           | TEXT        | Node content/description             |
| timestamp         | BIGINT      | Unix timestamp                       |
| metrics_snapshot  | JSONB       | IskraMetrics snapshot                |
| related_ids       | TEXT[]      | Denormalized related node IDs        |
| resonance_score   | REAL        | 0.0 - 1.0 (calculated from metrics)  |
| metadata          | JSONB       | Additional metadata                  |
| created_at        | TIMESTAMPTZ | Auto-generated                       |
| updated_at        | TIMESTAMPTZ | Auto-updated on changes              |
| user_id           | UUID        | Foreign key to auth.users            |

### graph_edges Table

| Column     | Type        | Description                          |
|------------|-------------|--------------------------------------|
| id         | TEXT (PK)   | Unique edge ID                       |
| source     | TEXT (FK)   | Source node ID                       |
| target     | TEXT (FK)   | Target node ID                       |
| type       | TEXT        | CAUSAL / SIMILARITY / RESONANCE / etc|
| weight     | REAL        | 0.0 - 1.0 (edge strength)            |
| metadata   | JSONB       | Additional metadata                  |
| created_at | TIMESTAMPTZ | Auto-generated                       |
| user_id    | UUID        | Foreign key to auth.users            |

---

## Migration Details

**Objects Created:**
- 2 tables: `graph_nodes`, `graph_edges`
- 8 indexes (layer, type, timestamp, resonance, user, source, target, weight)
- 1 trigger: auto-update `updated_at` on graph_nodes
- 3 RPC functions: BFS, find resonant, get node with edges
- 2 RLS policies: user isolation for multi-user scenarios
- 8 canonical seed nodes: Core mantras from canon

---

## Performance

### Indexes
- Layer + type queries: O(log n) via `idx_graph_nodes_layer_type`
- Resonance queries: O(log n) via `idx_graph_nodes_resonance`
- BFS traversal: O(E + V) with edge filtering via `idx_graph_edges_weight`

### Optimization Tips
1. **Use minWeight in BFS** to prune low-quality edges
2. **Limit maxDepth** to avoid expensive deep traversals
3. **Build connections sparingly** (can create many edges)
4. **Use getStats() cached** (expensive on large graphs)

---

## Testing

### Unit Tests (TODO)
```bash
npm test graphServiceSupabase.test.ts
```

### Manual Testing
```typescript
// 1. Add nodes
const n1 = await graphServiceSupabase.addNode('ARCHIVE', 'insight', 'Test 1');
const n2 = await graphServiceSupabase.addNode('ARCHIVE', 'insight', 'Test 2');

// 2. Add edge
await graphServiceSupabase.addEdge(n1.id, n2.id, 'SIMILARITY', 0.8);

// 3. Traverse
const related = await graphServiceSupabase.traverseBFS(n1.id, 1, 0.5);
console.assert(related.length === 2, 'Should find both nodes');

// 4. Stats
const stats = await graphServiceSupabase.getStats();
console.log(stats);
```

---

## Rollback

To remove GraphRAG tables:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS graph_edges CASCADE;
DROP TABLE IF EXISTS graph_nodes CASCADE;
DROP FUNCTION IF EXISTS graph_bfs_traversal;
DROP FUNCTION IF EXISTS graph_find_resonant;
DROP FUNCTION IF EXISTS graph_get_node_with_edges;
DROP FUNCTION IF EXISTS update_graph_nodes_updated_at;
```

---

## Next Steps

1. ✅ Run migration (this guide)
2. ⏳ Integrate with chat handler (call `graphServiceSupabase.addNode()` on decisions)
3. ⏳ Add UI for graph visualization
4. ⏳ Implement graph-based memory retrieval in RAG
5. ⏳ Add unit tests for Supabase integration

---

## Support

**Issues:** Create issue with tag `graphrag` in GitHub repo
**Documentation:** See `canon/03_ARCHITECTURE_SYSTEM_AND_MEMORY_DESIGN.md`
**Reference:** `legacy/IskraSAprototype/iskra_engine.ts` (original implementation)
