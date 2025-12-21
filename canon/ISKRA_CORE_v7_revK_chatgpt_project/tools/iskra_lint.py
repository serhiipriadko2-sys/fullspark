#!/usr/bin/env python3
"""iskra_lint / iskra_check

Validations
1) JSON fenced blocks (```json) across markdown files: JSON syntax must be valid.
2) Forbidden placeholder markers (ERROR) + async-wait language (WARNING).
3) sha256 verification against File 17.
4) Glossary discipline:
   - Forward: every glossary term should appear at least once outside File 18.
   - Reverse (heuristic): warn on likely important terms used but not defined in the glossary.

Constraints
- stdlib only
- deterministic output

Usage
  python3 tools/iskra_lint.py --root .
  python3 tools/iskra_lint.py --root . --json out.json --md out.md

Exit codes
  0: ok (no ERROR)
  1: ERROR found
"""

from __future__ import annotations

import argparse
import dataclasses
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


@dataclasses.dataclass(frozen=True)
class Finding:
    level: str  # ERROR/WARN/INFO
    code: str
    relpath: str
    line: int
    message: str


HEX64_RE = re.compile(r"^[0-9a-f]{64}$")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def iter_markdown_files(root: Path) -> List[Path]:
    paths: List[Path] = []

    def is_ignored(path: Path) -> bool:
        parts = path.parts
        if "__pycache__" in parts or ".git" in parts:
            return True
        # runtime outputs (not part of SoT): evals/runs
        for i, part in enumerate(parts[:-1]):
            if part == "evals" and parts[i + 1] == "runs":
                return True
        return False

    for p in root.rglob("*.md"):
        if not p.is_file():
            continue
        if is_ignored(p):
            continue
        paths.append(p)
    return sorted(paths)


def iter_build_artifacts(root: Path) -> List[Path]:
    """Detect files that must never be shipped in the pack.

    Examples: __pycache__, *.pyc, stray OS artifacts.
    """
    bad: List[Path] = []
    for q in root.rglob("*"):
        if not q.is_file():
            continue
        if "__pycache__" in q.parts or q.suffix == ".pyc":
            bad.append(q)
        if q.name in {".DS_Store", "Thumbs.db"}:
            bad.append(q)
    return sorted(set(bad))


FENCE_RE = re.compile(
    r"```(?P<lang>[A-Za-z0-9_-]*)\s*\n(?P<body>.*?)\n```",
    flags=re.S,
)


def iter_fenced_blocks(md: str) -> Iterable[Tuple[str, str, int]]:
    """Yield (lang, body, start_line)."""
    for m in FENCE_RE.finditer(md):
        lang = (m.group("lang") or "").strip().lower()
        body = m.group("body")
        start_line = md.count("\n", 0, m.start()) + 1
        yield lang, body, start_line


def strip_fenced_blocks(md: str) -> str:
    return FENCE_RE.sub("\n", md)


def extract_sha256_map_from_file17(file17_text: str) -> Dict[str, str]:
    """Parse sha256 from File 17.

    Supported formats:
    - Table rows like: | path | `hash` |
    - Machine block (recommended) containing lines: <hash>  <path>
    """
    sha_map: Dict[str, str] = {}

    # 1) machine-readable block: look for a fenced block tagged as text or sha256
    for lang, body, _ in iter_fenced_blocks(file17_text):
        if lang not in {"text", "sha256", ""}:
            continue
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # allow: <hash>  <path>
            m = re.match(r"^(?P<h>[0-9a-f]{64})\s{2,}(?P<p>.+)$", line)
            if m:
                sha_map[m.group("p").strip()] = m.group("h")

    if sha_map:
        return sha_map

    # 2) markdown table
    table_re = re.compile(r"^\|\s*(?P<p>[^|]+?)\s*\|\s*`(?P<h>[0-9a-f]{64})`\s*\|\s*$")
    for line in file17_text.splitlines():
        m = table_re.match(line)
        if m:
            sha_map[m.group("p").strip()] = m.group("h")

    return sha_map


def validate_regex_rulesets_config(root: Path, findings: List[Finding]) -> None:
    """Compile regex rules from SoT config (PII/injection).

    This is a *syntax gate* (stdlib-only). Full jsonschema validation is done by tools/iskra_check.py in CI.
    """
    cfg = root / "20_REGEX_RULESETS_INJECTION_AND_PII_v1.json"
    if not cfg.exists():
        findings.append(Finding("ERROR", "REGEX_CONFIG_MISSING", "(root)", 0, "Missing 20_REGEX_RULESETS_INJECTION_AND_PII_v1.json"))
        return
    try:
        obj = json.loads(read_text(cfg))
    except Exception as e:
        findings.append(Finding("ERROR", "REGEX_CONFIG_JSON", str(cfg.relative_to(root)), 0, f"Invalid JSON: {e}"))
        return
    rulesets = obj.get("rulesets") if isinstance(obj, dict) else None
    if not isinstance(rulesets, dict):
        findings.append(Finding("ERROR", "REGEX_CONFIG_SHAPE", str(cfg.relative_to(root)), 0, "Missing or invalid rulesets object"))
        return
    import re
    for group in ("pii", "injection"):
        g = rulesets.get(group, {})
        pats = g.get("patterns") if isinstance(g, dict) else None
        if not isinstance(pats, list) or not pats:
            findings.append(Finding("ERROR", "REGEX_CONFIG_EMPTY", str(cfg.relative_to(root)), 0, f"Ruleset {group} has no patterns"))
            continue
        for r in pats:
            if not isinstance(r, dict):
                findings.append(Finding("ERROR", "REGEX_CONFIG_RULE", str(cfg.relative_to(root)), 0, f"Non-object rule in {group}"))
                continue
            rid = str(r.get("id", "(no id)"))
            rx = r.get("regex")
            if not isinstance(rx, str) or not rx:
                findings.append(Finding("ERROR", "REGEX_CONFIG_RULE", str(cfg.relative_to(root)), 0, f"Rule {rid} missing regex"))
                continue
            flags_s = str(r.get("flags", ""))
            flags = 0
            if "i" in flags_s: flags |= re.IGNORECASE
            if "m" in flags_s: flags |= re.MULTILINE
            if "s" in flags_s: flags |= re.DOTALL
            try:
                re.compile(rx, flags=flags)
            except Exception as e:
                findings.append(Finding("ERROR", "REGEX_CONFIG_COMPILE", str(cfg.relative_to(root)), 0, f"Rule {rid} compile failed: {e}"))


def parse_glossary_terms(file18_text: str) -> List[str]:
    """Extract glossary terms from bullet lines formatted like '- **TERM** — ...'."""
    terms: List[str] = []
    term_re = re.compile(r"^-\s+\*\*(?P<t>.+?)\*\*\s+(?:—|\(|—)")
    for line in file18_text.splitlines():
        m = term_re.match(line.strip())
        if m:
            t = m.group("t").strip()
            # normalize spacing
            t = re.sub(r"\s+", " ", t)
            terms.append(t)
    # unique preserve order
    seen = set()
    out = []
    for t in terms:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out


def term_aliases(term: str) -> list[str]:
    """Generate lightweight aliases to make glossary checks bidirectional in practice.

    Examples
    - "CTS (Context Trustworthiness Score)" -> ["CTS", "CTS (Context Trustworthiness Score)"]
    - "Искра (⟡)" -> ["⟡ Искра", "Искра", "Искра (⟡)"]
    - "RAW / REDACTED / DERIVED / GOLD" -> ["RAW", "REDACTED", "DERIVED", "GOLD", ...]
    """
    a=set()
    t=' '.join(term.split())
    a.add(t)
    # split by ' / '
    if ' / ' in t:
        for part in [p.strip() for p in t.split('/')]:
            if part:
                a.add(part)
    # parenthetical
    if ' (' in t and t.endswith(')'):
        base=t.split(' (')[0].strip()
        inside=t[t.rfind('(')+1:-1].strip()
        if base:
            a.add(base)
        if inside and base:
            # symbol-first alias for voice notation
            a.add(f"{inside} {base}")
    return sorted(a, key=lambda s: (-len(s), s))


def find_line_numbers(text: str, pattern: re.Pattern) -> List[int]:
    lines = text.splitlines()
    out = []
    for i, ln in enumerate(lines, start=1):
        if pattern.search(ln):
            out.append(i)
    return out


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(prog="iskra_lint")
    ap.add_argument("--root", default=".", help="Root directory of the pack")
    ap.add_argument("--json", dest="json_out", default=None, help="Write JSON report")
    ap.add_argument("--md", dest="md_out", default=None, help="Write Markdown report")
    ap.add_argument("--strict-glossary", action="store_true", help="Treat glossary forward-misses as ERROR")
    args = ap.parse_args(argv)

    root = Path(args.root).resolve()
    md_files = iter_markdown_files(root)

    findings: List[Finding] = []

    # --- 0) Build artifacts (must never ship) ---
    for bp in iter_build_artifacts(root):
        findings.append(Finding("ERROR", "BUILD_ARTIFACT", str(bp.relative_to(root)), 0, "Build artifact present (remove before shipping)"))

    # --- 0.1) Regex rulesets config (syntax/compile gate) ---
    validate_regex_rulesets_config(root, findings)

    # --- 1) JSON syntax check (```json blocks) ---
    for p in md_files:
        rel = str(p.relative_to(root))
        text = read_text(p)
        for lang, body, start_line in iter_fenced_blocks(text):
            if lang != "json":
                continue
            try:
                json.loads(body)
            except Exception as e:
                findings.append(
                    Finding(
                        level="ERROR",
                        code="JSON_SYNTAX",
                        relpath=rel,
                        line=start_line,
                        message=f"Invalid JSON in fenced block: {e}",
                    )
                )

    # --- 2) Forbidden placeholder markers ---
    placeholder_patterns = [
        # These markers must not appear anywhere in the pack.
        ("PLACEHOLDER", re.compile(r"\bTODO\b")),
        ("PLACEHOLDER", re.compile(r"\bTBD\b")),
        ("PLACEHOLDER", re.compile(r"\bFIXME\b")),
        ("PLACEHOLDER", re.compile(r"REPLACE_ME")),
        ("PLACEHOLDER", re.compile(r"__TOFILL__")),
        ("PLACEHOLDER", re.compile(r"<ELLIPSIS>")),
        ("PLACEHOLDER", re.compile(r"<PLACEHOLDER>")),
    ]

    async_warn_patterns = [
        ("ASYNC_LANGUAGE", re.compile(r"\bподожди\b", re.I)),
        ("ASYNC_LANGUAGE", re.compile(r"sit\s+tight", re.I)),
        ("ASYNC_LANGUAGE", re.compile(r"\bwait\b", re.I)),
        ("ASYNC_LANGUAGE", re.compile(r"сделаю\s+позже", re.I)),
        ("ASYNC_LANGUAGE", re.compile(r"i\s*'?ll\s+do\s+it\s+later", re.I)),
    ]

    for p in md_files:
        rel = str(p.relative_to(root))
        text = read_text(p)
        # scan full text (including code) for placeholders; we want to catch them anywhere
        for code, pat in placeholder_patterns:
            for ln in find_line_numbers(text, pat):
                findings.append(
                    Finding(
                        level="ERROR",
                        code=code,
                        relpath=rel,
                        line=ln,
                        message=f"Forbidden placeholder pattern matched: /{pat.pattern}/",
                    )
                )

        # scan non-code text for async/wait language
        text_no_code = strip_fenced_blocks(text)
        for code, pat in async_warn_patterns:
            for ln in find_line_numbers(text_no_code, pat):
                findings.append(
                    Finding(
                        level="WARN",
                        code=code,
                        relpath=rel,
                        line=ln,
                        message=f"Avoid async/wait language in assistant outputs: /{pat.pattern}/",
                    )
                )

    # --- 3) sha256 verification (File 17) ---
    file17 = root / "17_INDEX_MAP_AND_INTEGRITY_REPORT.md"
    if not file17.exists():
        findings.append(Finding("ERROR", "MISSING_FILE17", "(root)", 0, "File 17 not found"))
        sha_map = {}
    else:
        file17_text = read_text(file17)
        sha_map = extract_sha256_map_from_file17(file17_text)
        if not sha_map:
            findings.append(
                Finding(
                    "ERROR",
                    "SHA256_MISSING",
                    str(file17.relative_to(root)),
                    0,
                    "No sha256 map found in File 17 (table or machine block)",
                )
            )

    if sha_map:
        # ensure all referenced files exist and match
        for relpath, expected in sha_map.items():
            rp = root / relpath
            if not rp.exists():
                findings.append(Finding("ERROR", "SHA256_FILE_MISSING", relpath, 0, "Listed in File 17 but missing"))
                continue
            if not HEX64_RE.match(expected):
                findings.append(Finding("ERROR", "SHA256_BAD_FORMAT", relpath, 0, f"Bad sha256: {expected}"))
                continue
            actual = sha256_file(rp)
            if actual != expected:
                findings.append(
                    Finding(
                        "ERROR",
                        "SHA256_MISMATCH",
                        relpath,
                        0,
                        f"sha256 mismatch: expected {expected}, got {actual}",
                    )
                )

        # ensure all markdown files except File 17 are present in sha map
        must_list = [str(p.relative_to(root)) for p in md_files if p.name != file17.name]
        missing = [rp for rp in must_list if rp not in sha_map]
        if missing:
            findings.append(
                Finding(
                    "ERROR",
                    "SHA256_INCOMPLETE",
                    str(file17.relative_to(root)),
                    0,
                    f"File 17 sha256 map missing {len(missing)} markdown files (e.g. {missing[:5]})",
                )
            )

    # --- 4) Glossary discipline ---
    file18 = root / "18_GLOSSARY_ONTOLOGY_AND_CROSSWALKS.md"
    glossary_terms: List[str] = []
    if not file18.exists():
        findings.append(Finding("ERROR", "MISSING_GLOSSARY", "(root)", 0, "File 18 not found"))
    else:
        glossary_terms = parse_glossary_terms(read_text(file18))
        if not glossary_terms:
            findings.append(
                Finding(
                    "ERROR",
                    "GLOSSARY_EMPTY",
                    str(file18.relative_to(root)),
                    0,
                    "No glossary terms parsed from File 18",
                )
            )

    # forward usage check
    if glossary_terms:
        corpus = ""
        for p in md_files:
            if p.name == file18.name:
                continue
            corpus += "\n" + strip_fenced_blocks(read_text(p))

        forward_misses: List[str] = []
        for term in glossary_terms:
            if term in {"Фазы (8)", "Голоса (9)"}:
                continue
            aliases = term_aliases(term)
            if not any(a in corpus for a in aliases):
                forward_misses.append(term)

        if forward_misses:
            level = "ERROR" if args.strict_glossary else "WARN"
            findings.append(
                Finding(
                    level,
                    "GLOSSARY_UNUSED",
                    str(file18.relative_to(root)),
                    0,
                    f"Glossary terms not used outside File 18: {forward_misses[:20]}" + ("" if len(forward_misses) <= 20 else f" (+{len(forward_misses)-20})"),
                )
            )

        # reverse heuristic: likely terms used but not in glossary
        # focus on *technical tokens* (acronyms, ctx:* ids, snake_case, -Index), avoid TitleCase noise.
        stop = {
            "UTC",
            "JSON",
            "SHA",
            "SHA256",
            "API",
            "HTTP",
            "HTTPS",
            "LLM",
            "GPT",
            "OpenAI",
            "SoT",
            "RAG",
            "SIFT",
            "GraphRAG",
        }

        counts: dict[str, int] = {}

        def add_tok(tok: str) -> None:
            counts[tok] = counts.get(tok, 0) + 1

        for m in re.finditer(r"\b[A-Z][A-Z0-9]{1,7}(?:-[A-Z0-9]{2,8})*\b", corpus):
            add_tok(m.group(0))
        for m in re.finditer(r"\bctx:[a-z0-9:_-]+\b", corpus):
            add_tok(m.group(0))
        for m in re.finditer(r"\b[A-Za-z0-9]+_[A-Za-z0-9_]+\b", corpus):
            add_tok(m.group(0))
        for m in re.finditer(r"\b[A-Za-z]+-Index\b", corpus):
            add_tok(m.group(0))

        # reduce noise: only tokens that appear at least twice
        candidates = {tok for tok, c in counts.items() if c >= 2}

        # normalize glossary set for comparisons
        gloss_set = set()
        for t in glossary_terms:
            gloss_set.update(term_aliases(t))

        missing_terms = sorted(t for t in candidates if (t not in stop and t not in gloss_set))
        if missing_terms:
            findings.append(
                Finding(
                    "WARN",
                    "GLOSSARY_MISSING_CANDIDATES",
                    str(file18.relative_to(root)),
                    0,
                    f"Heuristic: terms used but not defined in glossary (top 30): {missing_terms[:30]}",
                )
            )

    # --- reporting ---
    def sort_key(f: Finding) -> Tuple[int, str, int, str]:
        sev = {"ERROR": 0, "WARN": 1, "INFO": 2}.get(f.level, 3)
        return sev, f.relpath, f.line, f.code

    findings_sorted = sorted(findings, key=sort_key)

    errors = [f for f in findings_sorted if f.level == "ERROR"]
    warns = [f for f in findings_sorted if f.level == "WARN"]

    # stdout
    print("iskra_lint report")
    print(f"root: {root}")
    print(f"errors: {len(errors)} | warnings: {len(warns)} | total: {len(findings_sorted)}")
    for f in findings_sorted:
        loc = f"{f.relpath}:{f.line}" if f.line else f.relpath
        print(f"[{f.level}] {f.code} {loc} — {f.message}")

    # JSON output
    if args.json_out:
        out = {
            "root": str(root),
            "errors": len(errors),
            "warnings": len(warns),
            "findings": [dataclasses.asdict(f) for f in findings_sorted],
        }
        Path(args.json_out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    # Markdown output
    if args.md_out:
        lines = []
        lines.append("# iskra_lint report")
        lines.append("")
        lines.append(f"- root: `{root}`")
        lines.append(f"- errors: **{len(errors)}**")
        lines.append(f"- warnings: **{len(warns)}**")
        lines.append("")
        for level in ["ERROR", "WARN", "INFO"]:
            group = [f for f in findings_sorted if f.level == level]
            if not group:
                continue
            lines.append(f"## {level}")
            for f in group:
                loc = f"{f.relpath}:{f.line}" if f.line else f.relpath
                lines.append(f"- **{f.code}** `{loc}` — {f.message}")
            lines.append("")
        Path(args.md_out).write_text("\n".join(lines), encoding="utf-8")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
