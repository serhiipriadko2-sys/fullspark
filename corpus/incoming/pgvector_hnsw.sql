-- pgvector HNSW index DDL (template)
-- Source guidance: pgvector docs (m, ef_construction) and ef_search runtime parameter.
-- Table schema
CREATE TABLE IF NOT EXISTS embeddings (
  id BIGSERIAL PRIMARY KEY,
  doc_path TEXT NOT NULL,
  chunk_idx INT NOT NULL,
  embedding VECTOR(1536) -- set to your embedding dimension
);

-- HNSW index
CREATE INDEX IF NOT EXISTS embeddings_hnsw_l2
ON embeddings
USING hnsw (embedding vector_l2_ops)
WITH (m = 16, ef_construction = 64);

-- Runtime search tuning (session-level)
-- SET hnsw.ef_search = 40; -- increase if you need to search more neighbors
