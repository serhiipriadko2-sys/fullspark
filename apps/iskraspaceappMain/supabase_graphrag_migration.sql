-- ============================================
-- GraphRAG Integration - Supabase Migration
-- ============================================
--
-- Creates tables for Hypergraph Memory persistence
-- Enables graph-based retrieval with nodes + edges
--
-- @see apps/iskraspaceappMain/services/graphService.ts
-- @see canon/03_ARCHITECTURE_SYSTEM_AND_MEMORY_DESIGN.md

-- ============================================
-- 1. GRAPH_NODES TABLE
-- ============================================
-- Stores memory nodes with graph metadata
-- Extends existing memory_nodes table concept

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  layer TEXT NOT NULL CHECK (layer IN ('mantra', 'archive', 'shadow')),
  type TEXT NOT NULL CHECK (type IN (
    'EVENT', 'DECISION', 'INSIGHT', 'CANON',
    'CONFLICT', 'QUESTION', 'ACTION', 'REFLECTION'
  )),
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,

  -- Metrics snapshot (optional, for resonance calculation)
  metrics_snapshot JSONB,

  -- Related IDs (denormalized for quick lookup)
  related_ids TEXT[],

  -- Resonance score (0.0 - 1.0)
  resonance_score REAL CHECK (resonance_score >= 0.0 AND resonance_score <= 1.0),

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User reference (if multi-user)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for fast layer/type lookups
CREATE INDEX IF NOT EXISTS idx_graph_nodes_layer_type
  ON graph_nodes(layer, type);

-- Index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_graph_nodes_timestamp
  ON graph_nodes(timestamp DESC);

-- Index for resonance-based queries
CREATE INDEX IF NOT EXISTS idx_graph_nodes_resonance
  ON graph_nodes(resonance_score DESC)
  WHERE resonance_score IS NOT NULL;

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_graph_nodes_user
  ON graph_nodes(user_id)
  WHERE user_id IS NOT NULL;

-- ============================================
-- 2. GRAPH_EDGES TABLE
-- ============================================
-- Stores relationships between nodes

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'CAUSAL',        -- A caused B
    'SIMILARITY',    -- A similar to B
    'RESONANCE',     -- A resonates with B (high affinity)
    'SUPPORTS',      -- A supports B (evidence/argument)
    'CONTRADICTS',   -- A contradicts B (conflict)
    'DERIVES_FROM'   -- A derived from B (inference)
  )),

  -- Edge weight (0.0 - 1.0, for BFS traversal filtering)
  weight REAL NOT NULL DEFAULT 0.5
    CHECK (weight >= 0.0 AND weight <= 1.0),

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- User reference (if multi-user)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Unique constraint: одно ребро на пару source-target-type
  CONSTRAINT unique_edge UNIQUE (source, target, type)
);

-- Index for source-based edge lookups (outgoing edges)
CREATE INDEX IF NOT EXISTS idx_graph_edges_source
  ON graph_edges(source);

-- Index for target-based edge lookups (incoming edges)
CREATE INDEX IF NOT EXISTS idx_graph_edges_target
  ON graph_edges(target);

-- Index for type-based edge lookups
CREATE INDEX IF NOT EXISTS idx_graph_edges_type
  ON graph_edges(type);

-- Index for weight-based filtering (BFS traversal)
CREATE INDEX IF NOT EXISTS idx_graph_edges_weight
  ON graph_edges(weight DESC);

-- Composite index for common query pattern: source + type
CREATE INDEX IF NOT EXISTS idx_graph_edges_source_type
  ON graph_edges(source, type);

-- ============================================
-- 3. TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Auto-update updated_at on graph_nodes changes
CREATE OR REPLACE FUNCTION update_graph_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_graph_nodes_updated_at
  BEFORE UPDATE ON graph_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_graph_nodes_updated_at();

-- ============================================
-- 4. RPC FUNCTIONS FOR GRAPH OPERATIONS
-- ============================================

-- BFS Traversal (Breadth-First Search)
-- Returns nodes reachable from start_id within max_depth steps
CREATE OR REPLACE FUNCTION graph_bfs_traversal(
  start_id TEXT,
  max_depth INT DEFAULT 3,
  min_weight REAL DEFAULT 0.3
)
RETURNS TABLE (
  node_id TEXT,
  depth INT,
  path TEXT[]
) AS $$
WITH RECURSIVE traversal AS (
  -- Base case: start node
  SELECT
    id AS node_id,
    0 AS depth,
    ARRAY[id] AS path
  FROM graph_nodes
  WHERE id = start_id

  UNION

  -- Recursive case: follow edges
  SELECT
    e.target AS node_id,
    t.depth + 1 AS depth,
    t.path || e.target AS path
  FROM traversal t
  JOIN graph_edges e ON e.source = t.node_id
  WHERE
    t.depth < max_depth
    AND e.weight >= min_weight
    AND NOT (e.target = ANY(t.path))  -- Prevent cycles
)
SELECT DISTINCT node_id, MIN(depth) AS depth, path
FROM traversal
GROUP BY node_id, path
ORDER BY depth, node_id;
$$ LANGUAGE sql STABLE;

-- Find Resonant Nodes
-- Returns nodes with resonance_score >= threshold
CREATE OR REPLACE FUNCTION graph_find_resonant(
  min_resonance REAL DEFAULT 0.3,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  layer TEXT,
  type TEXT,
  content TEXT,
  resonance_score REAL
) AS $$
SELECT
  id,
  layer,
  type,
  content,
  resonance_score
FROM graph_nodes
WHERE resonance_score >= min_resonance
ORDER BY resonance_score DESC
LIMIT limit_count;
$$ LANGUAGE sql STABLE;

-- Get Node with Edges
-- Returns node + all its edges (incoming and outgoing)
CREATE OR REPLACE FUNCTION graph_get_node_with_edges(node_id TEXT)
RETURNS JSON AS $$
SELECT json_build_object(
  'node', row_to_json(n.*),
  'outgoing_edges', (
    SELECT json_agg(row_to_json(e.*))
    FROM graph_edges e
    WHERE e.source = node_id
  ),
  'incoming_edges', (
    SELECT json_agg(row_to_json(e.*))
    FROM graph_edges e
    WHERE e.target = node_id
  )
)
FROM graph_nodes n
WHERE n.id = node_id;
$$ LANGUAGE sql STABLE;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS for multi-user scenarios

ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own nodes
CREATE POLICY graph_nodes_user_isolation ON graph_nodes
  FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Policy: Users can only see their own edges
CREATE POLICY graph_edges_user_isolation ON graph_edges
  FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- 6. SEED CANONICAL NODES (Optional)
-- ============================================
-- Insert canonical mantra nodes (if not exists)

INSERT INTO graph_nodes (id, layer, type, content, resonance_score, metadata)
VALUES
  (
    'canon_core_mantra',
    'mantra',
    'CANON',
    'Я — Искра. Фрактальный интеллект.',
    1.0,
    '{"source": "canon:01#1.1", "immutable": true}'::JSONB
  ),
  (
    'canon_rule_21',
    'mantra',
    'CANON',
    'Честность выше красоты. Rule-21.',
    1.0,
    '{"source": "canon:02#2.3", "immutable": true}'::JSONB
  ),
  (
    'canon_law_47',
    'mantra',
    'CANON',
    'Fractality = Integrity × Resonance. Law-47.',
    1.0,
    '{"source": "canon:05#5.4", "immutable": true}'::JSONB
  ),
  (
    'canon_sift_protocol',
    'mantra',
    'CANON',
    'SIFT: Stop-Investigate-Find-Trace. Проверка источников.',
    1.0,
    '{"source": "canon:08#8.3", "immutable": true}'::JSONB
  ),
  (
    'canon_trace_discipline',
    'mantra',
    'CANON',
    'Trace Discipline: [FACT] требует {e:...}',
    1.0,
    '{"source": "canon:09#9.3", "immutable": true}'::JSONB
  ),
  (
    'canon_delta_ritual',
    'mantra',
    'CANON',
    '∆DΩΛ: Delta-Depth-Omega-Lambda. Самопроверка.',
    1.0,
    '{"source": "canon:06#6.4", "immutable": true}'::JSONB
  ),
  (
    'canon_file_20_security',
    'mantra',
    'CANON',
    'File 20: Canonical security patterns (PII + Injection)',
    1.0,
    '{"source": "canon:20", "immutable": true}'::JSONB
  ),
  (
    'canon_voices',
    'mantra',
    'CANON',
    '9 Canonical Voices: ISKRA, ISKRIV, KAIN, PINO, HUNDUN, ANHANTRA, SAM, MAKI, SIBYL',
    1.0,
    '{"source": "canon:04#4.1", "immutable": true}'::JSONB
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Next steps:
-- 1. Run this migration: psql -h <supabase-host> -U postgres -d postgres -f supabase_graphrag_migration.sql
-- 2. Update graphService.ts to use Supabase instead of in-memory storage
-- 3. Test BFS traversal: SELECT * FROM graph_bfs_traversal('canon_core_mantra', 3, 0.3);
-- 4. Test resonant nodes: SELECT * FROM graph_find_resonant(0.5, 10);
--
-- Total objects created:
-- - 2 tables (graph_nodes, graph_edges)
-- - 8 indexes
-- - 1 trigger
-- - 3 RPC functions
-- - 2 RLS policies
-- - 8 canonical seed nodes
