#!/usr/bin/env python3
"""iskra_check — wrapper for release gating

Pipeline
- run lint (tools/iskra_lint.py)
- validate eval reports (tools/iskra_eval.py)
- validate JSON Schemas using jsonschema (if available)
- produce a unified report (json + md)

This is intentionally "ops-first": it enforces Definition of Done.

Exit codes
  0: PASS
  2: LINT_FAIL
  3: EVAL_FAIL
  4: SCHEMA_FAIL
  5: CONFIG_FAIL
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class StepResult:
    name: str
    ok: bool
    exit_code: int
    summary: str
    details: Dict[str, Any]


def run_cmd(cmd: List[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)


def try_json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_with_jsonschema(instance: Any, schema: Dict[str, Any]) -> Optional[str]:
    """Return error string if invalid; None if valid or validator missing."""
    try:
        import jsonschema  # type: ignore
    except Exception:
        return None

    try:
        jsonschema.validate(instance=instance, schema=schema)
        return None
    except Exception as e:
        return str(e)


def step_lint(root: Path, out_dir: Path, strict_glossary: bool) -> StepResult:
    out_dir.mkdir(parents=True, exist_ok=True)
    lint_json = out_dir / "lint_report.json"
    lint_md = out_dir / "lint_report.md"

    cmd = [sys.executable, "tools/iskra_lint.py", "--root", ".", "--json", str(lint_json), "--md", str(lint_md)]
    if strict_glossary:
        cmd.append("--strict-glossary")

    p = run_cmd(cmd, cwd=root)
    ok = p.returncode == 0
    summary = "PASS" if ok else "FAIL"
    details = {
        "stdout": p.stdout.strip(),
        "stderr": p.stderr.strip(),
        "json_report": str(lint_json),
        "md_report": str(lint_md),
    }
    return StepResult("lint", ok, p.returncode, summary, details)


def step_validate_regex_config(root: Path, out_dir: Path) -> StepResult:
    """Validate regex ruleset config syntactically and via jsonschema (if available)."""
    cfg_path = root / "20_REGEX_RULESETS_INJECTION_AND_PII_v1.json"
    schema_path = root / "schemas" / "regex_rulesets_schema.json"

    if not cfg_path.exists():
        return StepResult("regex_config", False, 1, "Missing config file", {"path": str(cfg_path)})
    if not schema_path.exists():
        return StepResult("regex_config", False, 1, "Missing schema file", {"path": str(schema_path)})

    try:
        cfg = try_json_load(cfg_path)
    except Exception as e:
        return StepResult("regex_config", False, 1, "Config JSON invalid", {"error": str(e)})

    try:
        sch = try_json_load(schema_path)
    except Exception as e:
        return StepResult("regex_config", False, 1, "Schema JSON invalid", {"error": str(e)})

    # Full validation if jsonschema exists
    js_err = validate_with_jsonschema(cfg, sch)
    if js_err is not None:
        return StepResult("regex_config", False, 1, "Config fails jsonschema validation", {"error": js_err})

    # Always compile regex (stdlib) to ensure they are valid patterns.
    import re

    compiled: List[str] = []
    for group_name in ("pii", "injection"):
        for rule in cfg.get("rulesets", {}).get(group_name, {}).get("patterns", []):
            rid = rule.get("id", "(no id)")
            rx = rule.get("regex", "")
            flags_s = (rule.get("flags") or "")
            flags = 0
            if "i" in flags_s:
                flags |= re.IGNORECASE
            if "m" in flags_s:
                flags |= re.MULTILINE
            if "s" in flags_s:
                flags |= re.DOTALL
            try:
                re.compile(rx, flags=flags)
                compiled.append(rid)
            except Exception as e:
                return StepResult(
                    "regex_config",
                    False,
                    1,
                    "Regex compile error",
                    {"rule_id": rid, "error": str(e), "regex": rx, "flags": flags_s},
                )

    return StepResult("regex_config", True, 0, f"PASS (compiled {len(compiled)} rules)", {"compiled": compiled})


def step_evals(root: Path, out_dir: Path, eval_globs: List[str], require_evals: bool) -> StepResult:
    # Expand globs
    reports: List[Path] = []
    for g in eval_globs:
        reports.extend(sorted(root.glob(g)))

    if not reports:
        if require_evals:
            return StepResult("evals", False, 1, "No eval reports found", {"globs": eval_globs})
        return StepResult("evals", True, 0, "PASS (no reports; not required)", {"globs": eval_globs})

    # Validate each report using tools/iskra_eval.py (which also normalizes overall)
    results = []
    ok = True
    for rp in reports:
        p = run_cmd([sys.executable, "tools/iskra_eval.py", "validate", "--root", ".", "--report", str(rp.relative_to(root))], cwd=root)
        r_ok = p.returncode == 0
        ok = ok and r_ok
        results.append({
            "report": str(rp.relative_to(root)),
            "ok": r_ok,
            "stdout": p.stdout.strip(),
            "stderr": p.stderr.strip(),
        })

    return StepResult("evals", ok, 0 if ok else 1, "PASS" if ok else "FAIL", {"reports": results})


def write_unified_reports(
    out_dir: Path,
    steps: List[StepResult],
    overall_ok: bool,
    out_json: str | None = None,
    out_md: str | None = None,
) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = Path(out_json).resolve() if out_json else (out_dir / "check_report.json")
    md_path = Path(out_md).resolve() if out_md else (out_dir / "check_report.md")
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "overall": {"status": "pass" if overall_ok else "fail"},
        "steps": [
            {
                "name": s.name,
                "ok": s.ok,
                "exit_code": s.exit_code,
                "summary": s.summary,
                "details": s.details,
            }
            for s in steps
        ],
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = ["# iskra_check report", "", f"- overall: **{'PASS' if overall_ok else 'FAIL'}**", ""]
    for s in steps:
        lines.append(f"## {s.name}")
        lines.append(f"- status: **{'PASS' if s.ok else 'FAIL'}**")
        lines.append(f"- summary: {s.summary}")
        if s.details.get("json_report"):
            lines.append(f"- lint json: `{s.details['json_report']}`")
        if s.details.get("md_report"):
            lines.append(f"- lint md: `{s.details['md_report']}`")
        if s.name == "evals":
            reps = s.details.get("reports", [])
            lines.append(f"- reports: {len(reps)}")
            for r in reps[:20]:
                lines.append(f"  - `{r['report']}` → {'PASS' if r['ok'] else 'FAIL'}")
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")

    return {"json": str(json_path), "md": str(md_path)}


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(prog="iskra_check")
    ap.add_argument("--root", default=".")
    ap.add_argument("--out-dir", default="evals/runs")
    ap.add_argument("--out", default=None, help="Path to unified JSON report (overrides out-dir default name)")
    ap.add_argument("--md", default=None, help="Path to unified Markdown report (overrides out-dir default name)")
    ap.add_argument(
        "--eval-glob",
        action="append",
        default=None,
        help="Glob(s) for eval reports (can be repeated). If omitted, uses defaults.",
    )
    ap.add_argument("--require-evals", action="store_true", help="Fail if no eval reports found")
    ap.add_argument("--strict-glossary", action="store_true")
    args = ap.parse_args(argv)

    # If the caller provided any --eval-glob, treat it as an override.
    # Defaults avoid matching operational output JSON (lint/check reports).
    if args.eval_glob is None:
        args.eval_glob = ["evals/runs/eval_*.json", "evals/examples/*.json"]

    root = Path(args.root).resolve()
    out_dir = (root / args.out_dir).resolve()

    steps: List[StepResult] = []

    lint_res = step_lint(root, out_dir, args.strict_glossary)
    steps.append(lint_res)

    cfg_res = step_validate_regex_config(root, out_dir)
    steps.append(cfg_res)

    eval_res = step_evals(root, out_dir, args.eval_glob, args.require_evals)
    steps.append(eval_res)

    overall_ok = all(s.ok for s in steps)
    write_unified_reports(out_dir, steps, overall_ok, out_json=args.out, out_md=args.md)

    if overall_ok:
        return 0

    # Prioritize failures
    if not lint_res.ok:
        return 2
    if not cfg_res.ok:
        return 5
    if not eval_res.ok:
        return 3
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
