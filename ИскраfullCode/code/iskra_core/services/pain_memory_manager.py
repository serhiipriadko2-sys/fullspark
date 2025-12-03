"""Manager for tracking and smoothing pain signals.

The pain memory manager maintains a history of pain values observed over
time and exposes methods to compute aggregate statistics such as
exponential moving averages (EMA) and trend estimates. This can be used
to support adaptive behaviour in response to sustained high pain levels
or sudden spikes. It also provides a mechanism for decaying old pain
records to prevent unbounded growth.
"""

from __future__ import annotations

import collections
import time
from typing import Deque, Tuple, Iterable


class PainMemoryManager:
    """Track and compute statistics on pain values over time."""

    def __init__(self, maxlen: int = 100) -> None:
        self.history: Deque[Tuple[float, float]] = collections.deque(maxlen=maxlen)

    def add_pain(self, value: float, timestamp: float | None = None) -> None:
        """Record a new pain measurement.

        Args:
            value: Pain value in the range [0.0, 1.0].
            timestamp: Optional epoch timestamp; if ``None`` the current time
                is used.
        """
        ts = timestamp if timestamp is not None else time.time()
        value = max(0.0, min(1.0, float(value)))  # clamp to [0,1]
        self.history.append((ts, value))

    def ema(self, alpha: float = 0.1) -> float:
        """Compute an exponential moving average of pain values.

        Args:
            alpha: Smoothing factor (0 < alpha <= 1). Higher values give
                more weight to recent samples.

        Returns:
            The EMA of the pain values in the history or 0 if empty.
        """
        if not self.history:
            return 0.0
        ema_value = 0.0
        for _, value in self.history:
            ema_value = alpha * value + (1 - alpha) * ema_value
        return ema_value

    def average(self) -> float:
        """Compute the arithmetic mean of pain values."""
        if not self.history:
            return 0.0
        return sum(v for _, v in self.history) / len(self.history)

    def clear(self) -> None:
        """Clear the pain history."""
        self.history.clear()

    def recent(self, n: int) -> Iterable[float]:
        """Return the most recent ``n`` pain values."""
        return [v for _, v in list(self.history)[-n:]]


    def to_state(self) -> dict:
        """
        Export internal state into a JSON-serialisable dict.

        This is intentionally minimal so it can be stored inside
        UserSession without resorting to pickle.
        """
        state = {}
        # Common attributes; presence is checked defensively.
        for name in ("history", "maxlen", "warmup", "window", "threshold"):
            if hasattr(self, name):
                value = getattr(self, name)
                try:
                    # history might be a deque; convert to list of primitives
                    if name == "history":
                        value = list(value)
                except Exception:
                    pass
                state[name] = value
        return state

    @classmethod
    def from_state(cls, state: dict | None) -> "PainMemoryManager":
        """
        Re-create an instance from :meth:`to_state` output.

        If *state* is falsy, a fresh instance with default parameters is returned.
        """
        if not state:
            return cls()
        kwargs = {}
        for k in ("maxlen", "warmup", "window", "threshold"):
            if k in state and state[k] is not None:
                kwargs[k] = state[k]
        obj = cls(**kwargs) if kwargs else cls()
        history = state.get("history") or []
        try:
            for item in history:
                # Expect (timestamp, value) tuples or plain values
                if isinstance(item, (list, tuple)) and len(item) == 2:
                    obj.history.append((float(item[0]), float(item[1])))
                else:
                    obj.history.append(item)
        except Exception:
            # Never let broken history crash restore
            pass
        return obj
