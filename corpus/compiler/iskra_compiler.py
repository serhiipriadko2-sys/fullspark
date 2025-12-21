#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""ISKRA v6 Compiler (IndexLatch)

Назначение:
- проверить целостность 15‑файлового стека (SoT‑слой),
- собрать производный слой (Project Instructions ≈ 8k символов),
- выдать gate‑отчёт (хэши, длины, якоря, версии).

Запуск:
  python iskra_compiler.py --stack_dir ./iskra_15_v6_stack --out_dir ./build

Без внешних зависимостей.
"""

import argparse, json, hashlib, re
from pathlib import Path

REQUIRED_ANCHORS = [
  "Телос", "Нуль", "двухконтур", "Суммирование", "Структура", "Рефлексия", "Шаги", "∆DΩΛ",
  "prompt", "PII", "инъек"
]

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stack_dir", required=True)
    ap.add_argument("--out_dir", required=True)
    ap.add_argument("--index_map", default="index_map_v6.json")
    ap.add_argument("--instructions", default="PROJECT_INSTRUCTIONS_8K.md")
    args = ap.parse_args()

    stack_dir = Path(args.stack_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    index_map_path = Path(args.index_map)
    if not index_map_path.exists():
        raise SystemExit(f"Index map not found: {index_map_path}")

    index_map = json.loads(index_map_path.read_text(encoding="utf-8"))
    required_files = [f["file"] for f in index_map["files"]]

    report = {
        "version": index_map.get("version"),
        "stack": index_map.get("stack"),
        "stack_dir": str(stack_dir),
        "checks": {},
        "files": [],
        "instructions": {}
    }

    # 1) File presence
    present = sorted([p.name for p in stack_dir.glob("*.md")])
    missing = [f for f in required_files if not (stack_dir / f).exists()]
    extra = [f for f in present if f not in required_files]
    report["checks"]["file_presence"] = {
        "expected": len(required_files),
        "present": len(present),
        "missing": missing,
        "extra": extra,
        "ok": (len(missing) == 0)
    }

    # 2) Hashes + version markers
    for fname in required_files:
        p = stack_dir / fname
        if not p.exists():
            continue
        txt = read_text(p)
        report["files"].append({
            "file": fname,
            "sha256": sha256(p),
            "chars": len(txt),
            "has_v6_marker": bool(re.search(r"v6\.0|v6\.0\)", txt, flags=re.I))
        })

    report["checks"]["version_markers_ok"] = all(f["has_v6_marker"] for f in report["files"])

    # 3) Instructions length + anchors
    instr_path = Path(args.instructions)
    if not instr_path.exists():
        raise SystemExit(f"Instructions file not found: {instr_path}")
    instr = read_text(instr_path)
    report["instructions"]["path"] = str(instr_path)
    report["instructions"]["chars"] = len(instr)
    report["instructions"]["within_8k"] = (7800 <= len(instr) <= 8000)
    report["instructions"]["anchors"] = {a: (a.lower() in instr.lower()) for a in REQUIRED_ANCHORS}
    report["instructions"]["anchors_ok"] = all(report["instructions"]["anchors"].values())

    # 4) Emit artifacts
    (out_dir / "index_map_v6.json").write_text(json.dumps(index_map, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "PROJECT_INSTRUCTIONS_8K.md").write_text(instr, encoding="utf-8")
    (out_dir / "REPORT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    ok = (
        report["checks"]["file_presence"]["ok"]
        and report["checks"]["version_markers_ok"]
        and report["instructions"]["within_8k"]
        and report["instructions"]["anchors_ok"]
    )

    print("OK" if ok else "FAIL")
    if not ok:
        print(json.dumps(report["checks"], ensure_ascii=False, indent=2))
        print(json.dumps(report["instructions"], ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()