-- pgvector IVFFlat index DDL (template)
-- Source guidance: ivfflat 'lists' and 'probes': choose lists by #vectors; probes increases recall but adds latency.
-- Table schema as above.

-- You must ANALYZE after creating IVFFlat
CREATE INDEX IF NOT EXISTS embeddings_ivfflat_l2
ON embeddings
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100); -- heuristic start; refine by N/1000 (<1M) or sqrt(N) (>=1M)

ANALYZE embeddings;

-- Query-time probes (session-level)
-- SET ivfflat.probes = 10; -- try sqrt(lists) as a heuristic
