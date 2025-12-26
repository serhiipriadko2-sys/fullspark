#!/usr/bin/env python3
import os, time, csv, json, math, re
from pathlib import Path
import psycopg2
from sentence_transformers import SentenceTransformer

K = int(os.environ.get("K","10"))
MANIFEST_DIR = Path(os.environ.get("MANIFEST_DIR","/mnt/data/ISKRA_MINI_EVAL/manifest"))
EMB_MODEL = os.environ.get("EMB_MODEL","sentence-transformers/all-MiniLM-L6-v2")

HNSW_M = [16, 32]
HNSW_EFC = [64, 128]
HNSW_EFS = [32, 64, 128]

def estimate_lists(n): return max(10, int(math.sqrt(n)))
def probes_for_lists(l): return max(1, int(math.sqrt(l)))

def tokenize(s): return set(re.findall(r"[a-zA-Zа-яА-Я0-9_]+", s.lower()))

def ground_truth(cur, q):
    qt = tokenize(q); rel=set()
    cur.execute("SELECT id,text FROM embeddings;")
    for rid,t in cur.fetchall():
        if len(qt & tokenize(t)) >= 3: rel.add(rid)
    return rel

def recall_at_k(ids, rel, k):
    return 0.0 if not rel else len([i for i in ids[:k] if i in rel]) / len(rel)

def run_query(cur, qemb, k):
    cur.execute("SELECT id FROM embeddings ORDER BY embedding <=> %s LIMIT %s;", (qemb, k))
    return [r[0] for r in cur.fetchall()]

def main():
    queries = [json.loads(l)["query"] for l in (MANIFEST_DIR/'mini_ragas_dataset.jsonl').read_text(encoding='utf-8').splitlines() if l.strip()]
    conn = psycopg2.connect(host=os.environ.get("PGHOST","127.0.0.1"),port=5432,user="postgres",password="postgres",dbname="iskra")
    conn.autocommit=True; cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM embeddings;"); nrows = cur.fetchone()[0]
    IVF_LISTS = [estimate_lists(nrows), 2*estimate_lists(nrows), 4*estimate_lists(nrows)]
    m = SentenceTransformer(EMB_MODEL); qembs = m.encode(queries, normalize_embeddings=True).tolist()
    out = MANIFEST_DIR/'pgvector_bench_results.csv'; w = csv.writer(open(out,'w',newline='',encoding='utf-8'))
    w.writerow(['engine','conf','query','latency_ms','recall_at_10'])

    # HNSW grid
    for M in HNSW_M:
        for EFC in HNSW_EFC:
            cur.execute("DROP INDEX IF EXISTS emb_hnsw;")
            cur.execute(f"CREATE INDEX emb_hnsw ON embeddings USING hnsw (embedding vector_cosine_ops) WITH (m={M}, ef_construction={EFC});")
            for EFS in HNSW_EFS:
                cur.execute(f"SET hnsw.ef_search = {EFS};")
                for q, qemb in zip(queries, qembs):
                    t0=time.perf_counter(); ids = run_query(cur, qemb, K); t1=time.perf_counter()
                    rec = recall_at_k(ids, ground_truth(cur, q), K)
                    w.writerow(['HNSW', json.dumps({'m':M,'ef_construction':EFC,'ef_search':EFS}), q, round((t1-t0)*1000.0,3), round(rec,4)])

    # IVFFlat grid
    for L in IVF_LISTS:
        cur.execute("DROP INDEX IF EXISTS emb_ivf;")
        cur.execute(f"CREATE INDEX emb_ivf ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists={L});")
        cur.execute("ANALYZE embeddings;")
        for P in [probes_for_lists(L), max(1, 2*probes_for_lists(L))]:
            cur.execute(f"SET ivfflat.probes = {P};")
            for q, qemb in zip(queries, qembs):
                t0=time.perf_counter(); ids = run_query(cur, qemb, K); t1=time.perf_counter()
                rec = recall_at_k(ids, ground_truth(cur, q), K)
                w.writerow(['IVFFlat', json.dumps({'lists':L,'probes':P}), q, round((t1-t0)*1000.0,3), round(rec,4)])
    print('Wrote', out)

if __name__ == "__main__":
    main()
