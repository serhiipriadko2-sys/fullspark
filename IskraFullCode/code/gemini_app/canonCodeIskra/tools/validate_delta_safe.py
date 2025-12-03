"""CLI entrypoint for validating ∆DΩΛ payloads using safe JSON loading.

This script replicates the behaviour of the original ``validate_delta.py`` but
adds security hardening:

 * Uses :mod:`utils.safe_json` to enforce a maximum payload size and
   protect against maliciously large JSON inputs.
 * Performs basic path validation to prevent directory traversal and
   disallow loading files outside the working directory.

Running the script without arguments reads from stdin by default.
Return codes mirror the original utility:

 * ``0`` — payload is valid.
 * ``1`` — payload violates the schema (errors printed).
 * ``2`` — usage error (file missing or invalid JSON).
"""

from __future__ import annotations

import argparse
import pathlib
import sys
from typing import Any, Dict, Iterable, List, Tuple

from packages.core.validator.delta_omega_lambda import validate_delta_omega_lambda  # type: ignore
from utils.safe_json import safe_json_load, safe_json_loads


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


def _load_payload(path: str | None, max_size: int = 1 * 1024 * 1024) -> Tuple[Dict[str, Any], List[str]]:
    """Load a JSON payload from a file or stdin with safety checks.

    Args:
        path: Filesystem path or ``'-'``/``None`` to read from stdin.
        max_size: Maximum number of bytes to read.

    Returns:
        A tuple ``(payload, errors)`` where ``payload`` is the parsed
        dictionary if no errors occurred; otherwise it will be empty and
        ``errors`` will contain descriptive messages.
    """
    if path in (None, "-"):
        try:
            payload = safe_json_loads(sys.stdin.read(max_size + 1), max_size=max_size)
            return payload, []
        except Exception as exc:
            return {}, [f"Invalid JSON from stdin: {exc}"]

    candidate = pathlib.Path(path)
    try:
        resolved = candidate.resolve(strict=True)
    except FileNotFoundError:
        return {}, [f"File does not exist: {candidate}"]

    # Disallow loading files outside of the current working directory.
    cwd = pathlib.Path.cwd().resolve()
    try:
        resolved.relative_to(cwd)
    except ValueError:
        return {}, ["Path traversal is disallowed"]

    try:
        with resolved.open('r', encoding='utf-8') as f:
            payload = safe_json_load(f, max_size=max_size)
            return payload, []
    except Exception as exc:  # pylint: disable=broad-except
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


if __name__ == "__main__":
    raise SystemExit(main())