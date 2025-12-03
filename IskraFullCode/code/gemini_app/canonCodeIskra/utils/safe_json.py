"""Utility functions for safely loading JSON data.

This module provides simple wrappers around the built‑in ``json`` library
that enforce a maximum size on input data. The goal is to mitigate
denial‑of‑service and memory exhaustion attacks by ensuring we never
attempt to parse arbitrarily large payloads. The functions in this
module should be used in place of ``json.load`` or ``json.loads`` when
loading untrusted data (e.g. from user input or external files).

Example usage::

    from utils.safe_json import safe_json_loads

    payload = safe_json_loads(request.body, max_size=1024*1024)  # limit to 1 MiB

"""

from __future__ import annotations

import io
import json
from typing import Any, Union

DEFAULT_MAX_SIZE = 1 * 1024 * 1024  # 1 MiB

def safe_json_loads(s: Union[str, bytes], *, max_size: int = DEFAULT_MAX_SIZE) -> Any:
    """Parse a JSON string with an upper size bound.

    Args:
        s: The JSON content as a string or bytes.
        max_size: The maximum number of bytes permitted. If the input
            exceeds this size a ``ValueError`` is raised.

    Returns:
        The parsed Python object.

    Raises:
        ValueError: If the input exceeds ``max_size``.
        json.JSONDecodeError: If the input is not valid JSON.
    """
    # Convert bytes to str if necessary.
    if isinstance(s, bytes):
        s = s.decode('utf-8', errors='strict')
    if len(s) > max_size:
        raise ValueError(f"JSON string exceeds maximum allowed size of {max_size} bytes")
    return json.loads(s)


def safe_json_load(fp: io.TextIOBase, *, max_size: int = DEFAULT_MAX_SIZE) -> Any:
    """Load JSON from an open file object with an upper size bound.

    Args:
        fp: A file object opened in text mode.
        max_size: The maximum number of bytes to read from the file. If
            the file contains more data than ``max_size`` a ``ValueError`` is
            raised.

    Returns:
        The parsed Python object.

    Raises:
        ValueError: If the file contains more than ``max_size`` bytes.
        json.JSONDecodeError: If the file contents are not valid JSON.
    """
    # Read at most max_size + 1 bytes to detect oversize data.
    data = fp.read(max_size + 1)
    if len(data) > max_size:
        raise ValueError(f"JSON file exceeds maximum allowed size of {max_size} bytes")
    return json.loads(data)