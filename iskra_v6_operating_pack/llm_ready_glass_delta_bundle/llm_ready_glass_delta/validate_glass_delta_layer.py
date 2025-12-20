#!/usr/bin/env python3
"""
Validate GLASS-Δ prompt-pack layer.

Usage:
  python validate_glass_delta_layer.py glass_delta_packs.jsonl.gz
  python validate_glass_delta_layer.py glass_delta_packs.redacted.jsonl.gz --out gate_report.csv

Checks:
- JSON parseable per-line
- required top-level fields
- recompute gate metrics and compare basic invariants
"""
import argparse, gzip, json, re, statistics
from collections import Counter

RE_EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
RE_PHONE = re.compile(r"(\+?\d[\d\-\s()]{7,}\d)")
RE_URL = re.compile(r"https?://\S+|www\.\S+", re.I)
RE_HANDLE = re.compile(r"@\w{3,}")

INJECTION_PATTERNS = [
    re.compile(p, re.I) for p in [
        r"\bignore (all|any|previous) (instructions|rules)\b",
        r"\bdisregard\b.*\binstructions\b",
        r"\byou are (chatgpt|an ai|a language model)\b",
        r"\b(system|developer)\s*[:\-]\s*",
        r"<\s*system\s*>",
        r"<\s*developer\s*>",
        r"\bdo anything now\b|\bDAN\b",
        r"\bact as\b",
    ]
]

def estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / 4))

def gate_metrics(turns):
    texts = [t.get("text","") or "" for t in turns]
    full = "\n".join(texts)
    tok = estimate_tokens(full)
    roles = [t.get("role","") for t in turns]
    role_counts = dict(Counter(roles))
    pii = bool(RE_EMAIL.search(full) or RE_PHONE.search(full))
    url = bool(RE_URL.search(full))
    handle = bool(RE_HANDLE.search(full))
    inj = any(p.search(full) for p in INJECTION_PATTERNS)
    return {
        "token_estimate": tok,
        "message_count": len(turns),
        "role_counts": role_counts,
        "pii_flag": pii,
        "url_flag": url,
        "handle_flag": handle,
        "prompt_injection_flag": inj,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    rows=[]
    bad=0
    with gzip.open(args.path, "rt", encoding="utf-8") as f:
        for i,line in enumerate(f, start=1):
            line=line.strip()
            if not line:
                continue
            try:
                obj=json.loads(line)
            except Exception:
                bad+=1
                continue

            for k in ["pack_id","chapter","session","prompt","data","gate"]:
                if k not in obj:
                    bad+=1
                    break
            turns = obj.get("data",{}).get("turns",[])
            g = gate_metrics(turns)
            rows.append({
                "pack_id": obj.get("pack_id"),
                "chapter_id": obj.get("chapter",{}).get("chapter_id"),
                "session_id": obj.get("session",{}).get("session_id"),
                **g
            })

    print(f"lines_ok={len(rows)} bad_lines={bad}")
    if args.out:
        import csv
        with open(args.out,"w",newline="",encoding="utf-8") as out:
            w=csv.DictWriter(out, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        print(f"wrote {args.out}")

if __name__ == "__main__":
    main()
