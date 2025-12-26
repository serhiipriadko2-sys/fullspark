-- pgvector index templates for 1536-d embeddings
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;

-- Example table
-- CREATE TABLE IF NOT EXISTS documents (
--   id BIGSERIAL PRIMARY KEY,
--   content TEXT,
--   embedding VECTOR(1536)
-- );

-- HNSW index (use for high-recall, interactive latency)
-- Adjust m and ef_construction per dataset size. Typical: m=16..32, ef_construction=64..200
CREATE INDEX IF NOT EXISTS idx_documents_hnsw
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 128);

-- Runtime search parameter: SET ivfflat.probes or hnsw.ef_search per session
-- Example: SET hnsw.ef_search = 64;

-- IVFFlat index (use for large corpora with tighter p95 latency control)
-- Choose lists ≈ 4*sqrt(N) as a starting point; tune with probes (1..16+)
CREATE INDEX IF NOT EXISTS idx_documents_ivfflat
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 4096);

-- Example session tuning:
-- SET ivfflat.probes = 8;   -- higher probes => higher recall, slower
-- SET hnsw.ef_search = 64;  -- higher => higher recall, slower

-- Benchmark harness idea (pseudocode):
-- For each k in (10, 20): measure recall@k vs brute-force baseline, record p50/p95 latency.
