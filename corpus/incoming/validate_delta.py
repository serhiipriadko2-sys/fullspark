"""CLI entrypoint for validating ∆DΩΛ payloads.

The module exposes a small command-line utility that reuses the structured
validator from :mod:`packages.core.validator.delta_omega_lambda`. It accepts an
optional path to the JSON payload (or ``-``/stdin) and prints a human-readable
verdict while returning meaningful exit codes:

* ``0`` — payload is valid
* ``1`` — payload violates the schema, details are printed
* ``2`` — the tool was used incorrectly (e.g. missing file)
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import Any, Dict, Iterable, List, Tuple


if __package__ in {None, ""}:
    # When the script is executed directly (``python packages/.../validate_delta.py``)
    # Python only adds the script directory to ``sys.path``. We need the
    # repository root to import ``packages.core.validator.delta_omega_lambda``.
    sys.path.append(str(pathlib.Path(__file__).resolve().parents[3]))

from packages.core.validator.delta_omega_lambda import (  # noqa: E402
    validate_delta_omega_lambda,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate a ∆DΩΛ JSON payload (stdin by default)."
    )
    parser.add_argument(
        "path",
        nargs="?",
        help="Path to the JSON file. Use '-' or omit to read from stdin.",
    )
    return parser


def _load_payload(path: str | None) -> Tuple[Dict[str, Any], List[str]]:
    if path in (None, "-"):
        return json.load(sys.stdin), []

    candidate = pathlib.Path(path)
    if not candidate.exists():
        return {}, [f"File does not exist: {candidate}"]
    try:
        return json.loads(candidate.read_text(encoding="utf-8")), []
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
        return {}, [f"Invalid JSON: {exc}"]


def main(argv: Iterable[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    payload, load_errors = _load_payload(args.path)
    if load_errors:
        for err in load_errors:
            print(err, file=sys.stderr)
        return 2

    ok, errors = validate_delta_omega_lambda(payload)
    if ok:
        print("OK: ∆DΩΛ is valid")
        return 0

    print("FAIL:")
    for err in errors:
        print(f" - {err}")
    return 1


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    raise SystemExit(main())
