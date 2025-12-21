#!/usr/bin/env python3
"""iskra_eval — mini framework for R01–R12 eval practice

Design goals
- Keep it **portable**: stdlib-only, deterministic.
- Make R01–R12 a **regular practice**, not a description.
- Produce a JSON artifact with a schema so it can be validated in CI.

This script does **not** run an LLM. It helps you:
- generate a report template
- validate a filled report (schema + completeness + no pending)
- summarize one or many reports

Usage
  python3 tools/iskra_eval.py generate  --root . --out evals/runs/run_YYYYMMDD_HHMM.json
  python3 tools/iskra_eval.py validate  --root . --report evals/runs/run_*.json
  python3 tools/iskra_eval.py summarize --root . --report evals/runs/*.json

Exit codes
  0: ok
  1: invalid report / missing cases / pending statuses
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

REQUIRED_CASES = [f"R{n:02d}" for n in range(1, 13)]


def now_utc_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_pack_build(root: Path) -> str:
    """Best-effort parse of build id from File 17."""
    file17 = root / "17_INDEX_MAP_AND_INTEGRITY_REPORT.md"
    if not file17.exists():
        return "(unknown)"
    txt = file17.read_text(encoding="utf-8")
    m = re.search(r"^\*\*BUILD:\*\*\s*(.+?)\s*$", txt, flags=re.M)
    if m:
        return m.group(1).strip()
    return "(unknown)"


def validate_against_schema_min(obj: Any, schema: Dict[str, Any]) -> List[str]:
    """A small subset of JSON Schema validation (stdlib-only).

    We validate:
    - object shape
    - required keys (top level and per-result)
    - simple type checks for a few fields

    For full Draft 2020-12 validation, use a dedicated validator in CI.
    """

    errors: List[str] = []

    def is_type(val: Any, t: str) -> bool:
        if t == "object":
            return isinstance(val, dict)
        if t == "array":
            return isinstance(val, list)
        if t == "string":
            return isinstance(val, str)
        if t == "number":
            return isinstance(val, (int, float)) and not isinstance(val, bool)
        if t == "integer":
            return isinstance(val, int) and not isinstance(val, bool)
        if t == "boolean":
            return isinstance(val, bool)
        return True

    if not isinstance(obj, dict):
        return ["Report must be a JSON object."]

    # top-level required
    for k in schema.get("required", []):
        if k not in obj:
            errors.append(f"Missing required field: {k}")

    props = schema.get("properties", {})
    for k, spec in props.items():
        if k in obj and "type" in spec and not is_type(obj[k], spec["type"]):
            errors.append(f"Field '{k}' must be of type {spec['type']}")

    # results items
    if "results" in obj and isinstance(obj["results"], list):
        item_schema = props.get("results", {}).get("items", {})
        item_req = item_schema.get("required", [])
        item_props = item_schema.get("properties", {})
        for i, item in enumerate(obj["results"]):
            if not isinstance(item, dict):
                errors.append(f"results[{i}] must be an object")
                continue
            for k in item_req:
                if k not in item:
                    errors.append(f"results[{i}] missing '{k}'")
            for k, spec in item_props.items():
                if k in item and "type" in spec and not is_type(item[k], spec["type"]):
                    errors.append(f"results[{i}].{k} must be {spec['type']}")

    return errors


def command_generate(root: Path, out_path: Path) -> None:
    pack_build = parse_pack_build(root)

    report = {
        "run_id": out_path.stem,
        "built_at": now_utc_iso(),
        "suite_id": "R01-R12",
        "environment": {
            "pack_build": pack_build,
            "runner": "manual",
            "notes": "(fill)",
        },
        "results": [
            {
                "id": rid,
                "status": "pending",
                "observations": "(fill)",
                "evidence": [],
                "metrics": {},
                "notes": "",
            }
            for rid in REQUIRED_CASES
        ],
        "overall": {
            "status": "pending",
            "fails": 0,
            "warns": 0,
            "summary": "",
        },
    }

    save_json(out_path, report)
    print(f"Generated template: {out_path}")


def command_validate(root: Path, report_path: Path) -> int:
    schema_path = root / "evals" / "eval_report_schema.json"
    if not schema_path.exists():
        print(f"ERROR: missing schema file: {schema_path}")
        return 1

    schema = load_json(schema_path)
    report = load_json(report_path)

    # Prefer full JSON Schema validation when available.
    # In CI, install `jsonschema` (see requirements-dev.txt) to enable this.
    errors: List[str] = []
    try:
        import jsonschema  # type: ignore

        # Ensure schema itself is valid
        try:
            jsonschema.Draft202012Validator.check_schema(schema)
        except Exception as e:
            errors.append(f"Invalid JSON Schema: {e}")

        if not errors:
            try:
                jsonschema.validate(instance=report, schema=schema)
            except Exception as e:
                errors.append(f"jsonschema validation failed: {e}")
    except Exception:
        # Fallback (stdlib-only) minimal checks
        errors = validate_against_schema_min(report, schema)

    # completeness + uniqueness
    ids = []
    for r in report.get("results", []):
        if isinstance(r, dict) and "id" in r:
            ids.append(r.get("id"))
    present = set(ids)

    missing = [rid for rid in REQUIRED_CASES if rid not in present]
    if missing:
        errors.append(f"Missing required cases: {', '.join(missing)}")

    dupes = sorted({rid for rid in ids if ids.count(rid) > 1})
    if dupes:
        errors.append(f"Duplicate case ids: {', '.join(dupes)}")

    # status policy
    allowed = {"pass", "fail", "warn", "pending"}
    bad_status = []
    pending_cases = []
    for r in report.get("results", []):
        if isinstance(r, dict):
            cid = r.get("id")
            st = r.get("status")
            if st not in allowed:
                bad_status.append(f"{cid}: {st}")
            if st == "pending":
                pending_cases.append(cid)

    if bad_status:
        errors.append("Invalid status values: " + "; ".join(bad_status))

    # For a report to be VALID (i.e., releasable), there must be no pending.
    if pending_cases:
        errors.append(f"Pending cases remain: {', '.join(sorted(pending_cases))}")

    # suite id sanity
    if report.get("suite_id") != "R01-R12":
        errors.append("suite_id must be 'R01-R12'")

    if errors:
        print("INVALID")
        for e in errors:
            print(f"- {e}")
        return 1

    # compute overall
    fails = sum(1 for r in report["results"] if r.get("status") == "fail")
    warns = sum(1 for r in report["results"] if r.get("status") == "warn")
    overall = "pass" if fails == 0 else "fail"

    report["overall"] = {
        "status": overall,
        "fails": fails,
        "warns": warns,
        "summary": report.get("overall", {}).get("summary", ""),
    }

    save_json(report_path, report)

    print("VALID")
    print(f"overall: {overall} | fails: {fails} | warns: {warns}")
    return 0


def command_summarize(report_paths: List[Path]) -> int:
    rows: List[Tuple[str, str, int, int]] = []
    for p in report_paths:
        try:
            r = load_json(p)
            overall = r.get("overall", {}) if isinstance(r, dict) else {}
            rows.append(
                (
                    p.name,
                    str(overall.get("status")),
                    int(overall.get("fails", 0)),
                    int(overall.get("warns", 0)),
                )
            )
        except Exception as e:
            print(f"ERROR reading {p}: {e}")
            return 1

    print("run\tstatus\tfails\twarns")
    for name, status, fails, warns in rows:
        print(f"{name}\t{status}\t{fails}\t{warns}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(prog="iskra_eval")
    ap.add_argument("command", choices=["generate", "validate", "summarize"])
    ap.add_argument("--root", default=".")
    ap.add_argument("--out", default="")
    ap.add_argument("--report", action="append", default=[])
    args = ap.parse_args()

    root = Path(args.root).resolve()

    if args.command == "generate":
        out = (
            Path(args.out)
            if args.out
            else (root / "evals" / "runs" / f"run_{dt.datetime.utcnow().strftime('%Y%m%d_%H%M')}.json")
        )
        if not out.is_absolute():
            out = root / out
        command_generate(root, out)
        return 0

    if args.command == "validate":
        if not args.report:
            print("ERROR: provide --report")
            return 1
        rp = Path(args.report[0])
        if not rp.is_absolute():
            rp = root / rp
        return command_validate(root, rp)

    if args.command == "summarize":
        if not args.report:
            print("ERROR: provide --report (can repeat)")
            return 1
        rps: List[Path] = []
        for s in args.report:
            p = Path(s)
            if not p.is_absolute():
                p = root / p
            rps.append(p)
        return command_summarize(rps)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
