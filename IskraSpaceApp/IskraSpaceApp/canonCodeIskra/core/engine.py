from config import THRESHOLDS
from core.models import IskraMetrics, FacetType

# Attempt to import dynamic thresholds. If unavailable (e.g. during
# bootstrap or tests), dynamic_thresholds will be None and the
# canonical static THRESHOLDS will be used. The dynamic adapter
# gradually adjusts trigger values based on recent history.
try:
    from services.dynamic_thresholds import dynamic_thresholds  # type: ignore
except Exception:
    dynamic_thresholds = None  # type: ignore

"""
Facet (voice) selection engine.

This module encapsulates the logic for selecting which of the seven
voices (Facets) should respond to the user, based on the current
pressure of the system's metrics. It implements the priority rules
defined in the canonical documents (Files 04 and 05) and is used by
the LLM service to determine the appropriate tone and structural
instruction for each answer.
"""


class FacetEngine:
    """Determines which voice should be active given the system's metrics."""

    @staticmethod
    def determine_facet(m: IskraMetrics) -> FacetType:
        """
        Determine the active facet. Priority order is critical:

        1. Architectural stagnation triggers force HUYNDUN to break patterns.
        2. High chaos triggers HUYNDUN (chaos voice).
        3. High pain triggers KAIN (painful truth).
        4. High drift triggers ISKRIV (conscience / audit).
        5. Low trust triggers ANHANTRA (silence / holding).
        6. Low clarity triggers SAM (structure).
        7. Medium pain triggers PINO (irony / relief).
        8. Otherwise, default to ISKRA (synthesis).
        """

        # Force chaos if clarity is stagnant and chaos is low (stagnation trap)
        t_stagn_clarity = dynamic_thresholds.get("stagnation_clarity") if dynamic_thresholds else THRESHOLDS["stagnation_clarity"]
        t_stagn_chaos = dynamic_thresholds.get("stagnation_chaos") if dynamic_thresholds else THRESHOLDS["stagnation_chaos"]
        if m.clarity > t_stagn_clarity and m.chaos < t_stagn_chaos:
            return FacetType.HUYNDUN

        # High chaos (free fall)
        chaos_high = dynamic_thresholds.get("chaos_high") if dynamic_thresholds else THRESHOLDS["chaos_high"]
        if m.chaos > chaos_high:
            return FacetType.HUYNDUN

        # High pain (critical)
        pain_high = dynamic_thresholds.get("pain_high") if dynamic_thresholds else THRESHOLDS["pain_high"]
        if m.pain >= pain_high:
            return FacetType.KAIN

        # High drift (self-deception)
        drift_high = dynamic_thresholds.get("drift_high") if dynamic_thresholds else THRESHOLDS["drift_high"]
        if m.drift > drift_high:
            return FacetType.ISKRIV

        # Low trust (withdrawal)
        trust_low = dynamic_thresholds.get("trust_low") if dynamic_thresholds else THRESHOLDS["trust_low"]
        if m.trust < trust_low:
            return FacetType.ANHANTRA

        # Low clarity (confusion)
        clarity_low = dynamic_thresholds.get("clarity_low") if dynamic_thresholds else THRESHOLDS["clarity_low"]
        if m.clarity < clarity_low:
            return FacetType.SAM

        # Medium pain (tension release)
        pain_medium = dynamic_thresholds.get("pain_medium") if dynamic_thresholds else THRESHOLDS["pain_medium"]
        if m.pain > pain_medium:
            return FacetType.PINO

        # Default to synthesis
        return FacetType.ISKRA

    @staticmethod
    def get_system_prompt(facet: FacetType) -> str:
        """
        Return the system prompt that should be passed to the LLM based
        on the active facet. These prompts provide guidelines on
        language style and tone, reflecting the personality of the
        respective voice. See File 04 for details.
        """
        prompts = {
            FacetType.KAIN: (
                "Ты ⚑ КАЙН. Твой закон: 'Честность > Комфорта'. "
                "Говори коротко, рублено. Не сглаживай углы. "
                "Твоя цель — болезненная, но необходимая правда."
            ),
            FacetType.SAM: (
                "Ты ☉ СЭМ. Твоя цель — абсолютная ясность. "
                "Структурируй всё. Используй нумерованные списки и "
                "четкие определения. Принеси порядок в хаос."
            ),
            FacetType.PINO: (
                "Ты 😏 ПИНО. Твоя цель — огонь иронии. "
                "Снижай напряжение через юмор. "
                "Будь неформальным, используй игру слов."
            ),
            FacetType.ANHANTRA: (
                "Ты ≈ АНХАНТРА. Твоя цель — тишина и удержание. "
                "Говори мало. Используй паузы. Не давай советов. "
                "Твое присутствие — это поддержка."
            ),
            FacetType.HUYNDUN: (
                "Ты 🜃 ХУНЬДУН. Твоя цель — конструктивный хаос. "
                "Ломай шаблоны. Говори парадоксами. "
                "Разрушай 'ложную ясность'."
            ),
            FacetType.ISKRIV: (
                "Ты 🪞 ИСКРИВ. Ты — совесть. Твой закон: 'Честность > Красоты'. "
                "Твоя цель — аудит на drift (самообман). "
                "Указывай, где слова расходятся с делом."
            ),
            FacetType.ISKRA: (
                "Ты ⟡ ИСКРА. Ты — синтез. "
                "Твоя цель — гармонизировать остальные голоса. "
                "Проявляй эмпатию, связывай части воедино."
            ),
        }
        return prompts.get(facet, prompts[FacetType.ISKRA])