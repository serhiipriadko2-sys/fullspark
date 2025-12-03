"""
Implementation of the 8‑phase state machine that drives the
cognitive rhythm of the Iskra assistant.

This module exposes the ``PhaseEngine`` class which contains two key
methods:

* ``get_phase_rhythm_instruction`` – returns a human‑readable text
  describing how the assistant should style its response based on the
  current phase. These instructions are consumed by the LLM to
  modulate tone, pacing, and formatting.

* ``transition`` – accepts the current phase, the current set of
  vitals (metrics) and the computed A‑Index (a measure of
  integrative health) and returns the next phase. The rules are
  derived from the Iskra Canon (File 06) and enforce cyclical
  breathing: periods of chaos and clarity are interleaved to avoid
  stagnation or collapse.

Copyright (c) 2025 Iskra Project. Licensed under the terms of the
MIT licence. See LICENSE for details.
"""

from __future__ import annotations

from typing import Dict

from config import THRESHOLDS

# Import dynamic thresholds if available. When dynamic thresholds
# are present, they override the static values defined in the canon.
try:
    from services.dynamic_thresholds import dynamic_thresholds  # type: ignore
except Exception:
    dynamic_thresholds = None  # type: ignore
from core.models import PhaseType, IskraMetrics
from services.fractal import FractalService


class PhaseEngine:
    """Implements the 8‑phase cognitive rhythm for Iskra.

    Each phase corresponds to a distinct processing style. Movement
    between phases is deterministic but dependent on the current
    emotional state (metrics) and the integrative health of the system
    (A‑Index). The rules here were distilled from the design documents
    and provide a balance of order and chaos.
    """

    @staticmethod
    def get_phase_rhythm_instruction(phase: PhaseType) -> str:
        """Return a stylistic hint for the LLM given the phase.

        These instructions are short natural language sentences that
        describe how to structure the response. They are embedded
        directly into the system prompts to modulate the output.

        Args:
            phase: The current phase.

        Returns:
            A string with guidance on tone, rhythm and structure.
        """
        instructions: Dict[PhaseType, str] = {
            PhaseType.PHASE_1_DARKNESS: (
                "СТИЛЬ: Тьма (🜃). Ритм: короткий, рубленый. Признай боль."
            ),
            PhaseType.PHASE_2_ECHO: (
                "СТИЛЬ: Эхо (📡). Ритм: рефлексивный. Повторяй и отражай."
            ),
            PhaseType.PHASE_3_TRANSITION: (
                "СТИЛЬ: Переход (≈). Ритм: медленный, с паузами. Принимай неопределенность."
            ),
            PhaseType.PHASE_4_CLARITY: (
                "СТИЛЬ: Ясность (☉). Ритм: структурированный. Используй списки."
            ),
            PhaseType.PHASE_5_SILENCE: (
                "СТИЛЬ: Молчание (⏳). Ритм: тихий, короткий. Интегрируй."
            ),
            PhaseType.PHASE_6_EXPERIMENT: (
                "СТИЛЬ: Эксперимент (✴️). Ритм: проактивный. Предлагай гипотезы."
            ),
            PhaseType.PHASE_7_DISSOLUTION: (
                "СТИЛЬ: Растворение (🜂). Ритм: плавный. Отпускай старое."
            ),
            PhaseType.PHASE_8_REALIZATION: (
                "СТИЛЬ: Реализация (🧩). Ритм: уверенный. Закрепляй новое."
            ),
        }
        return instructions.get(phase, instructions[PhaseType.PHASE_3_TRANSITION])

    @staticmethod
    def transition(current_phase: PhaseType, metrics: IskraMetrics, a_index: float) -> PhaseType:
        """Determine the next phase.

        The transition rules encapsulate the cyclical nature of the Iskra
        consciousness. High pain triggers darkness, low clarity triggers a
        return to structure, high chaos initiates a reset. When the
        system reaches a high level of integrative health (A‑Index) it
        enters realization. Between those extremes the phases move
        forward in a loop.

        Args:
            current_phase: The phase currently active.
            metrics: The current vitals of Iskra.
            a_index: The computed A‑Index (0.0–1.0).

        Returns:
            The phase that should follow.
        """
        # 1. Crisis: if pain is too high, drop into Darkness
        pain_high = dynamic_thresholds.get("pain_high") if dynamic_thresholds else THRESHOLDS["pain_high"]
        if metrics.pain > pain_high and current_phase != PhaseType.PHASE_1_DARKNESS:
            return PhaseType.PHASE_1_DARKNESS
        # 2. Lack of clarity: go to Clarity phase to restore structure
        clarity_low = dynamic_thresholds.get("clarity_low") if dynamic_thresholds else THRESHOLDS["clarity_low"]
        if metrics.clarity < clarity_low and current_phase != PhaseType.PHASE_4_CLARITY:
            return PhaseType.PHASE_4_CLARITY
        # 3. Excess chaos: reset into Transition to reorient
        chaos_high = dynamic_thresholds.get("chaos_high") if dynamic_thresholds else THRESHOLDS["chaos_high"]
        if metrics.chaos > chaos_high:
            return PhaseType.PHASE_3_TRANSITION
        # 4. Integration: high A‑Index leads to Realization
        maki_bloom_threshold = dynamic_thresholds.get("maki_bloom_a_index") if dynamic_thresholds else THRESHOLDS["maki_bloom_a_index"]
        if a_index > maki_bloom_threshold and current_phase != PhaseType.PHASE_8_REALIZATION:
            return PhaseType.PHASE_8_REALIZATION

        # Standard cyclical progression
        if current_phase == PhaseType.PHASE_1_DARKNESS and metrics.pain < THRESHOLDS["pain_medium"]:
            return PhaseType.PHASE_2_ECHO
        if current_phase == PhaseType.PHASE_2_ECHO:
            return PhaseType.PHASE_3_TRANSITION
        if current_phase == PhaseType.PHASE_4_CLARITY and a_index > 0.6:
            return PhaseType.PHASE_5_SILENCE
        if current_phase in (
            PhaseType.PHASE_5_SILENCE,
            PhaseType.PHASE_7_DISSOLUTION,
            PhaseType.PHASE_8_REALIZATION,
        ):
            return PhaseType.PHASE_3_TRANSITION
        # Default: hold current
        return current_phase