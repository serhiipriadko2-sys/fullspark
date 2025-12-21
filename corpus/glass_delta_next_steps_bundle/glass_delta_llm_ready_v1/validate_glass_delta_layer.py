#!/usr/bin/env python3
import argparse, gzip, json
from collections import Counter

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--packs", required=True, help="path to *.jsonl.gz")
    args = ap.parse_args()

    cnt = 0
    scores = []
    flags = Counter()
    token_ests = []

    with gzip.open(args.packs, "rt", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            cnt += 1
            g = obj.get("gate", {})
            scores.append(g.get("llm_readability_score", None))
            token_ests.append(g.get("token_est", None))
            for k in ["too_long_flag","prompt_injection_flag","pii_email","pii_url","pii_phone","pii_api_key","codeblock_flag"]:
                if g.get(k):
                    flags[k] += 1

    scores = [s for s in scores if isinstance(s, (int, float))]
    token_ests = [t for t in token_ests if isinstance(t, (int, float))]
    print("packs:", cnt)
    if scores:
        print("score: min/avg/max =", min(scores), sum(scores)/len(scores), max(scores))
    if token_ests:
        print("token_est: min/avg/max =", min(token_ests), sum(token_ests)/len(token_ests), max(token_ests))
    print("flags:")
    for k,v in flags.most_common():
        print(f" - {k}: {v}")

if __name__ == "__main__":
    main()
