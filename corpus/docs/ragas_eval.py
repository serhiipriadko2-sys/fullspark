# Minimal RAGAS evaluation harness for 10 queries
# Run: pip install ragas datasets pandas
# Then: python ragas_eval.py --pred path/to/predictions.jsonl --ref path/to/references.jsonl --ctx path/to/contexts.jsonl
import argparse, json
import pandas as pd
from statistics import mean
try:
    from ragas import evaluate
    from ragas.metrics import context_precision, context_recall, faithfulness, answer_relevancy
except Exception as e:
    raise SystemExit("Please install ragas: pip install ragas") from e

def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(x) for x in f if x.strip()]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pred", required=True, help="predictions.jsonl with {'question','answer'}")
    ap.add_argument("--ref", required=True, help="references.jsonl with {'question','ground_truth'}")
    ap.add_argument("--ctx", required=True, help="contexts.jsonl with {'question','contexts':[...]}")
    args = ap.parse_args()

    preds = {x["question"]: x for x in load_jsonl(args.pred)}
    refs  = {x["question"]: x for x in load_jsonl(args.ref)}
    ctxs  = {x["question"]: x for x in load_jsonl(args.ctx)}
    rows = []
    for q in preds.keys():
        rows.append({
            "question": q,
            "answer": preds[q]["answer"],
            "ground_truth": refs[q]["ground_truth"],
            "contexts": ctxs[q]["contexts"],
        })
    df = pd.DataFrame(rows)
    res = evaluate(df, metrics=[context_precision, context_recall, faithfulness, answer_relevancy])
    print(res)
    # Save as JSON
    out = {k: float(v) for k, v in res.items()}
    with open("ragas_report.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("Saved ragas_report.json")

if __name__ == "__main__":
    main()
