"""
Persistence layer for Iskra sessions (hardened).

This version removes pickle usage entirely and persists UserSession as JSON
in a compact SQLite table. The design goals are:
- No executable data is ever loaded from storage.
- A corrupted row or schema drift never crashes the core loop.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from typing import Dict, Optional

from config import DB_PATH
from core.models import IskraMetrics, PhaseType
from memory.hypergraph import HypergraphMemory


@dataclass
class UserSession:
    """
    In-memory representation of a user's Iskra session.

    It bundles metrics, hypergraph memory and a couple of runtime flags.
    Additional opaque dict fields are reserved for small helper states
    (pain history, anti-echo window) that are themselves JSON-serialisable.
    """

    metrics: IskraMetrics = field(default_factory=IskraMetrics)
    memory: HypergraphMemory = field(default_factory=HypergraphMemory)
    is_first_launch: bool = True
    current_phase: PhaseType = PhaseType.PHASE_3_TRANSITION

    # Helper state for advanced metrics/rituals; kept as plain dict so it
    # can be hydrated without tight coupling to concrete helper classes.
    pain_state: Dict[str, object] = field(default_factory=dict)
    anti_echo_state: Dict[str, object] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        """Serialise this session into a plain JSON-serialisable dict."""
        return {
            "metrics": self.metrics.model_dump(),
            "memory": self.memory.to_dict(),
            "is_first_launch": self.is_first_launch,
            "current_phase": self.current_phase.value,
            "pain_state": self.pain_state,
            "anti_echo_state": self.anti_echo_state,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, object]) -> "UserSession":
        """
        Hydrate a session from :meth:`to_dict` output.

        Any missing or malformed fields fall back to safe defaults so that a
        corrupted row never prevents a new session from being created.
        """
        data = data or {}
        metrics_payload = data.get("metrics") or {}
        memory_payload = data.get("memory") or {}

        metrics = IskraMetrics.model_validate(metrics_payload)
        memory = HypergraphMemory.from_dict(memory_payload)

        phase_value = data.get("current_phase", PhaseType.PHASE_3_TRANSITION.value)
        try:
            phase = PhaseType(phase_value)
        except Exception:
            phase = PhaseType.PHASE_3_TRANSITION

        session = cls(
            metrics=metrics,
            memory=memory,
            is_first_launch=bool(data.get("is_first_launch", True)),
            current_phase=phase,
        )
        session.pain_state = data.get("pain_state") or {}
        session.anti_echo_state = data.get("anti_echo_state") or {}
        return session


class PersistenceService:
    """
    Tiny SQLite-backed persistence for UserSession.

    The public interface matches the previous pickle-based version but
    the implementation is now data-only and auditable.
    """

    def __init__(self, db_path: str = DB_PATH) -> None:
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS sessions (
                        user_id TEXT PRIMARY KEY,
                        session_data TEXT NOT NULL
                    )
                    """
                )
                conn.commit()
            print(f"[Persistence] DB initialised at {self.db_path}")
        except sqlite3.Error as exc:
            print(f"[Persistence] CRITICAL: failed to initialise DB: {exc}")
            raise

    def save_session(self, user_id: str, session: UserSession) -> None:
        """
        Persist a session snapshot for *user_id*.

        Errors are logged but do not crash the main flow.
        """
        try:
            payload = json.dumps(session.to_dict(), ensure_ascii=False)
        except TypeError as exc:
            print(f"[Persistence] ERROR: session for {user_id} is not JSON-serialisable: {exc}")
            return

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO sessions (user_id, session_data) VALUES (?, ?)",
                    (user_id, payload),
                )
                conn.commit()
        except sqlite3.Error as exc:
            print(f"[Persistence] ERROR: failed to save session for {user_id}: {exc}")

    def load_session(self, user_id: str) -> Optional[UserSession]:
        """Load a session for *user_id*, or ``None`` if not found or corrupt."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT session_data FROM sessions WHERE user_id = ?",
                    (user_id,),
                )
                row = cursor.fetchone()
        except sqlite3.Error as exc:
            print(f"[Persistence] ERROR: failed to load session for {user_id}: {exc}")
            return None

        if not row:
            return None

        raw = row[0]
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            print(f"[Persistence] ERROR: corrupt JSON for {user_id}: {exc}")
            return None

        try:
            return UserSession.from_dict(data)
        except Exception as exc:
            print(f"[Persistence] ERROR: failed to hydrate session for {user_id}: {exc}")
            return None

    def delete_session(self, user_id: str) -> None:
        """Delete persisted data for *user_id* if it exists."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "DELETE FROM sessions WHERE user_id = ?",
                    (user_id,),
                )
                conn.commit()
        except sqlite3.Error as exc:
            print(f"[Persistence] ERROR: failed to delete session for {user_id}: {exc}")
