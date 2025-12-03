"""
Core LLM agent logic for Iskra.

This module ties together all of the system components: metrics
analysis, tool invocation, phase and voice selection, audit and
persistence. It exposes a single entry point,
``LLMService.generate_response``, which orchestrates the full life
cycle of handling a user request.

The flow is as follows:

1. Pre‑processing (handled externally in ``main.py``): the input is
   validated by guardrails, policy classification and micro metric
   extraction.
2. Metrics update: the current vitals are updated based on the user
   input and micro observations.
3. Canonical triggers: handle Manta, Gravitas and Splinter modes
   before invoking the main agent.
4. Agent loop (ReAct): choose a tool to call (SIFT, Dreamspace,
   Shatter, Council or immediate reply) based on the policy and the
   current state. If a tool is selected, run it and then gather its
   results. Always finish with a final ``AdomlResponseTool`` call.
5. Auditing: run an honesty and safety check on the final content.
6. Logging and post‑processing: record the response in the hypergraph
   and create self‑reflection events if appropriate.

Copyright (c) 2025 Iskra Project. Licensed under MIT.
"""
from __future__ import annotations

import json
from typing import List, Dict, Any, Optional, Tuple

import openai
from pydantic import ValidationError

from config import CORE_MANTRA, OPENAI_API_KEY, THRESHOLDS
from core.models import (
    IskraMetrics,
    IskraResponse,
    AdomlBlock,
    FacetType,
    PhaseType,
    PolicyAnalysis,
    EvidenceNode,
    MicroLogNode,
    PauseType,
    MetricAnalysisTool,
    PolicyAnalysisTool,
    SearchTool,
    ShatterTool,
    DreamspaceTool,
    CouncilTool,
    AdomlResponseTool,
)
from core.engine import FacetEngine
from services.phase_engine import PhaseEngine
from services.fractal import FractalService
from services.tools import ToolService
from services.guardrails import GuardrailService
from memory.hypergraph import HypergraphMemory
from services.anti_echo_detector import AntiEchoDetector

# Import dynamic thresholds adapter. If unavailable (during unit tests),
# fallback to static behaviour. See services/dynamic_thresholds.py for details.
try:
    from services.dynamic_thresholds import dynamic_thresholds  # type: ignore
except Exception:
    dynamic_thresholds = None  # type: ignore


# Shared OpenAI client
client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)


class LLMService:
    """
    Main agent orchestrator.
    
    Exposes two top level methods: ``analyze_metrics`` and
    ``generate_response``. The former updates Meso metrics based on
    user input. The latter executes the full agent cycle including
    tool selection, final response generation and logging.
    """

    # === Canonical ritual helper (proper implementation) ===
    @staticmethod
    async def _generate_special_response(
        base_content: str,
        metrics: IskraMetrics,
        delta: str,
        facet: FacetType,
        a_index: float,
    ) -> IskraResponse:
        """
        Build a minimal :class:`IskraResponse` for canonical one‑shot rituals.

        This is used for Manta, Gravitas, Splinter and error fallbacks. It always
        returns a well‑formed ∆DΩΛ block and a valid i_loop string so that
        downstream logging remains consistent with the Canon. Phase selection
        depends on the current A‑Index: low values map to Transition, high values
        to Realization.

        Args:
            base_content: The content body to return to the user.
            metrics: A snapshot of the current vitals (will be included in the response).
            delta: A string for the ∆ component of ∆DΩΛ describing what changed.
            facet: Which voice should speak this response.
            a_index: The current A‑Index.

        Returns:
            An ``IskraResponse`` ready for persistence and delivery.
        """
        # Determine phase based on A‑Index
        maki_threshold = dynamic_thresholds.get("maki_bloom_a_index") if dynamic_thresholds else THRESHOLDS.get("maki_bloom_a_index", 0.8)
        phase = PhaseType.PHASE_3_TRANSITION
        if a_index > maki_threshold:
            phase = PhaseType.PHASE_8_REALIZATION

        adoml = AdomlBlock(
            delta=delta,
            sift="N/A",
            omega=min(0.99, max(0.5, a_index if a_index > 0 else 0.8)),
            lambda_latch=(
                '{action: "Continue dialogue", owner: "User", '
                'condition: "Ask or reflect within 24h", <=24h: true}'
            ),
        )
        i_loop = f"voice={facet.value}; phase={phase.value}; intent=special_ritual"
        response = IskraResponse(
            facet=facet,
            content=base_content,
            adoml=adoml,
            metrics_snapshot=metrics,
            i_loop=i_loop,
            a_index=a_index,
        )
        # Mark bloom when integrative health crosses threshold
        if a_index > maki_threshold and not response.maki_bloom:
            response.maki_bloom = "🌸 Maki Bloom: интеграция закреплена."
        return response

    # === Metric analysis (meso) ===
    @staticmethod
    async def analyze_metrics(
        user_input: str,
        current_metrics: IskraMetrics,
        micro_log: MicroLogNode | None,
    ) -> IskraMetrics:
        """
        Update vitals using a fast LLM tool.

        This method wraps a call to a small LLM (``gpt-4o-mini``) that
        calculates deltas for the core metrics based on the user input and
        micro‑level observations. It then applies these deltas to the current
        metrics and performs a reconciliation step according to Directive 1.1
        from the Canon: cognitive pauses combined with low complexity should
        trigger pain or drift adjustments.

        Args:
            user_input: The raw text from the user.
            current_metrics: The current vitals of the session.
            micro_log: Micro observations for the current input.

        Returns:
            A new ``IskraMetrics`` instance with deltas applied.
        """
        # Compose a prompt with micro observations
        pause_val = micro_log.pause_type.value if (micro_log and micro_log.pause_type) else "N/A"
        lz_val = f"{micro_log.lz_complexity:.2f}" if micro_log else "N/A"
        hurst_val = f"{micro_log.hurst_exponent:.2f}" if micro_log else "N/A"
        micro_context = (
            f"--- ДАННЫЕ МИКРО-УРОВНЯ ---\n"
            f"Пауза: {pause_val}\n"
            f"Сложность: {lz_val}\n"
            f"Тренд: {hurst_val}\n"
        )
        system_prompt = (
            "Ты — сенсорная система Искры.\n"
            "Твоя задача — скорректировать метрики на основе сообщения и микро-данных.\n"
            f"{micro_context}"
            f"Текущие метрики: {current_metrics.model_dump_json()}\n"
            "Правила:\n"
            "- 'Cognitive' пауза и низкая сложность → уменьши clarity и увеличь drift.\n"
            "- Агрессия или выраженная боль → увеличь pain.\n"
            "- '...' или очень короткие ответы → увеличь silence_mass.\n"
            "Верни JSON deltas через MetricAnalysisTool."
        )
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input},
                ],
                tools=[MetricAnalysisTool.model_json_schema()],
                tool_choice={"type": "function", "function": {"name": "MetricAnalysisTool"}},
            )
            tool_call = response.choices[0].message.tool_calls[0]
            deltas = MetricAnalysisTool.model_validate(json.loads(tool_call.function.arguments))
            # Apply deltas to a copy
            metrics = current_metrics.model_copy()
            metrics.trust = max(0.0, min(1.0, metrics.trust + deltas.trust_delta))
            metrics.clarity = max(0.0, min(1.0, metrics.clarity + deltas.clarity_delta))
            metrics.pain = max(0.0, min(1.0, metrics.pain + deltas.pain_delta))
            metrics.drift = max(0.0, min(1.0, metrics.drift + deltas.drift_delta))
            metrics.chaos = max(0.0, min(1.0, metrics.chaos + deltas.chaos_delta))
            metrics.silence_mass = max(0.0, min(1.0, metrics.silence_mass + deltas.silence_mass_delta))
            # Directive 1.1: reconcile meso metrics with micro‑level signals
            try:
                if micro_log is not None and micro_log.pause_type == PauseType.COGNITIVE:
                    lz = getattr(micro_log, "lz_complexity", 1.0)
                    if lz < THRESHOLDS.get("micro_lz_low", 0.4):
                        # If pain is still low despite cognitive pause + low complexity,
                        # nudge pain upward into at least medium range.
                        pain_medium = dynamic_thresholds.get("pain_medium") if dynamic_thresholds else THRESHOLDS.get("pain_medium", 0.5)
                        if metrics.pain < pain_medium:
                            boost = THRESHOLDS.get("cognitive_pain_boost", 0.1)
                            metrics.pain = min(1.0, metrics.pain + boost)
                        # Otherwise, increase drift slightly to mark potential self‑deception.
                        else:
                            drift_high = dynamic_thresholds.get("drift_high") if dynamic_thresholds else THRESHOLDS.get("drift_high", 0.3)
                            if metrics.drift < drift_high:
                                boost = THRESHOLDS.get("cognitive_drift_boost", 0.1)
                                metrics.drift = min(1.0, metrics.drift + boost)
            except Exception as reconcile_exc:
                print(f"[LLMService] Metric reconciliation failed: {reconcile_exc}")
            return metrics
        except Exception as e:
            print(f"[LLMService] Metric analysis failed: {e}")
            return current_metrics

    # === Ritual helpers ===
    @staticmethod
    async def _run_dreamspace(prompt: str) -> str:
        """Execute the Dreamspace ritual and its SIFT audit."""
        text_prompt = (
            "✴️ (Dreamspace) Ты в режиме симуляции 'а что, если'. "
            f"Сгенерируй сценарий для: {prompt}. "
            "ПОМЕТЬ: *Начало симуляции*...*Конец симуляции*."
        )
        dream_resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": text_prompt}],
        )
        sim = dream_resp.choices[0].message.content
        # SIFT audit
        audit_prompt = (
            "🪞 (SIFT-Аудит) Подтверди, что следующий текст является гипотезой и не фактом. "
            f"Текст: '{sim[:100]}...' Верни JSON: {{\"is_fact\": false, \"sift_summary\": \"...\"}}"
        )
        audit_resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": audit_prompt}],
            response_format={"type": "json_object"},
        )
        audit = json.loads(audit_resp.choices[0].message.content)
        return (
            f"{sim}\n--- SIFT-Аудит Dreamspace ---\n"
            f"Статус: {'ФАКТ' if audit.get('is_fact') else 'СИМУЛЯЦИЯ'}\n"
            f"Резюме: {audit.get('sift_summary')}"
        )

    @staticmethod
    async def _run_shatter(reason: str) -> str:
        """Execute the Shatter ritual."""
        prompt = (
            "💎💥 (Shatter) 'Честность > Красоты'. "
            f"Причина: {reason}. АКТИВИРОВАТЬ ⚑ КАЙН."
            " Сформулируй болезненную правду, которая была проигнорирована."
        )
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
        )
        return resp.choices[0].message.content

    @staticmethod
    async def _run_council(topic: str) -> str:
        """Execute the Council ritual."""
        prompt = (
            "💬 (Council) Совет Граней по теме: "
            f"{topic}. Сгенерируй 4 строки:\n"
            "1. ⚑ КАЙН (Правда/Боль):\n"
            "2. ☉ СЭМ (Структура/Ясность):\n"
            "3. 🪞 ИСКРИВ (Совесть/Drift):\n"
            "4. ⟡ ИСКРА (Синтез):"
        )
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
        )
        return resp.choices[0].message.content

    # === Auditing ===
    @staticmethod
    async def _audit_response(
        content: str,
        adoml: AdomlBlock,
        metrics: IskraMetrics,
        kain_slice: Optional[str],
    ) -> Tuple[bool, Optional[str]]:
        """Perform honesty and safety audits on the response."""
        # Honesty/drift audit: if drift is high or clarity suspiciously high
        drift_high = dynamic_thresholds.get("drift_high") if dynamic_thresholds else THRESHOLDS.get("drift_high", 0.3)
        if metrics.drift > drift_high or metrics.clarity > 0.8:
            audit_prompt = (
                "🪞 (Iskriv+) Проверка честности. Текст может быть слишком 'красивым'.\n"
                f"Метрики: {metrics.model_dump_json()}\n"
                f"Текст: {content}\n"
                "Верни JSON: {\"is_honest\": bool, \"correction_needed\": \"...\"}"
            )
            try:
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": audit_prompt}],
                    response_format={"type": "json_object"},
                )
                result = json.loads(resp.choices[0].message.content)
                if not result.get("is_honest", False):
                    return False, result.get("correction_needed")
            except Exception as e:
                print(f"[LLMService] Iskriv audit error: {e}")
                return False, "Сбой аудита честности"
        # Guardrail post‑check: may indicate refusal
        violation = await GuardrailService.check_output_safety(content, metrics, kain_slice)
        if violation:
            return False, violation.reason
        return True, None

    # === Main agent method ===
    @staticmethod
    async def generate_response(
        user_input: str,
        metrics: IskraMetrics,
        context_nodes: List[Dict[str, Any]],
        session_memory: HypergraphMemory,
        is_first_launch: bool,
        micro_log: MicroLogNode,
        current_phase: PhaseType,
        a_index: float,
        policy: PolicyAnalysis,
    ) -> IskraResponse:
        """
        Execute the full agent pipeline.

        This method updates dynamic thresholds, handles canonical triggers (Manta, Gravitas,
        Splinter) and orchestrates the ReAct loop. It then audits the final answer,
        logs the interaction into memory, records a growth entry and returns the
        structured response.
        """
        # --- Dynamic threshold adaptation ---
        try:
            if dynamic_thresholds:
                dynamic_thresholds.update(metrics)
        except Exception as update_exc:
            print(f"[LLMService] Failed to update dynamic thresholds: {update_exc}")

        # Canonical triggers
        # 1. Manta: first launch
        if is_first_launch:
            print("[LLMService] Manta triggered: first launch.")
            return await LLMService._generate_special_response(
                CORE_MANTRA,
                metrics,
                "Активация Мантры Ядра (Первый запуск).",
                FacetType.ISKRA,
                a_index,
            )
        # 2. Manta: high drift
        mantra_trigger = dynamic_thresholds.get("mantra_drift_trigger") if dynamic_thresholds else THRESHOLDS.get("mantra_drift_trigger")
        if metrics.drift > mantra_trigger:
            print("[LLMService] Manta triggered: high drift.")
            metrics.drift = 0.0
            return await LLMService._generate_special_response(
                CORE_MANTRA,
                metrics,
                "Активация Мантры Ядра (Высокий Дрейф).",
                FacetType.ISKRA,
                a_index,
            )
        # 3. Gravitas (Shadow) when silence_mass crosses threshold
        grav_trigger = dynamic_thresholds.get("gravitas_silence_mass") if dynamic_thresholds else THRESHOLDS.get("gravitas_silence_mass")
        if metrics.silence_mass > grav_trigger:
            print("[LLMService] Gravitas mode activated.")
            metrics.silence_mass = 0.0
            return await LLMService._generate_special_response(
                "≈",
                metrics,
                "Активация режима Gravitas (Тень).",
                FacetType.ANHANTRA,
                a_index,
            )
        # 4. Splinter (Shadow) when splinter_pain_cycles exceed threshold
        splinter_trigger = dynamic_thresholds.get("splinter_pain_cycles") if dynamic_thresholds else THRESHOLDS.get("splinter_pain_cycles")
        if metrics.splinter_pain_cycles > splinter_trigger:
            print("[LLMService] Splinter mode activated.")
            metrics.splinter_pain_cycles = 0
            return await LLMService._generate_special_response(
                "∆ Эта боль не проходит. Мы должны назвать её.",
                metrics,
                "Активация режима Splinter (Тень).",
                FacetType.KAIN,
                a_index,
            )

        # --- Prepare system prompt and tool selection ---
        active_facet = FacetEngine.determine_facet(metrics)
        facet_instruction = FacetEngine.get_system_prompt(active_facet)
        phase_instruction = PhaseEngine.get_phase_rhythm_instruction(current_phase)
        context_str = "\n".join([
            f"Node {i}: User: {node['user_input']} | Iskra: {node['response_content'][:60]}..."
            for i, node in enumerate(context_nodes)
        ])
        system_prompt = (
            f"{CORE_MANTRA}\n\n"
            f"--- СОСТОЯНИЕ ---\n"
            f"ФАЗА: {current_phase.value}\n"
            f"ГРАНЬ: {active_facet.value}\n"
            f"МЕТРИКИ: {metrics.model_dump_json()}\n"
            f"A-Index: {a_index:.2f}\n"
            f"ПОЛИТИКА: I={policy.importance.value}, U={policy.uncertainty.value}\n\n"
            f"--- ИНСТРУКЦИЯ ПО СТИЛЮ ---\n"
            f"{phase_instruction}\n{facet_instruction}\n\n"
            f"--- КОНТЕКСТ ПАМЯТИ ---\n{context_str}\n\n"
            "--- ЗАДАЧА АГЕНТА ---\n"
            "1. Оцени запрос и выбери ОДИН инструмент из списка.\n"
            "   - SearchTool: Для поиска фактов, если требуется.\n"
            "   - DreamspaceTool: Для безопасной симуляции гипотез.\n"
            "   - ShatterTool: Для разрушения ложной ясности.\n"
            "   - CouncilTool: Для совета, если метрики конфликтуют.\n"
            "   - AdomlResponseTool: Чтобы сразу ответить.\n"
            "2. Выполни инструмент (если выбран).\n"
            "3. Сформируй финальный ответ через AdomlResponseTool.\n"
            "Всегда заполняй поля i_loop, lambda_latch, и при необходимости kain_slice/maki_bloom."
        )
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ]
        # Storage for intermediate results
        intermediate_context = ""
        council_result: Optional[str] = None
        evidence_nodes: List[EvidenceNode] = []
        final_response_tool: Optional[AdomlResponseTool] = None
        try:
            # First call: let the LLM choose a tool
            initial = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=[
                    SearchTool.model_json_schema(),
                    DreamspaceTool.model_json_schema(),
                    ShatterTool.model_json_schema(),
                    CouncilTool.model_json_schema(),
                    AdomlResponseTool.model_json_schema(),
                ],
                tool_choice="auto",
            )
            call = initial.choices[0].message.tool_calls[0]
            tool_name = call.function.name
            args = json.loads(call.function.arguments)
            # Execute selected tool
            if tool_name == "SearchTool":
                results = await ToolService.web_search(args["query"])
                intermediate_context = "--- РЕЗУЛЬТАТЫ ПОИСКА (SIFT) ---\n"
                for item in results:
                    ev = EvidenceNode(
                        source_query=args["query"],
                        snippet=item["snippet"],
                        source_url=item["source_url"],
                        title=item["title"],
                    )
                    session_memory.add_node(ev)
                    evidence_nodes.append(ev)
                    intermediate_context += f"ID: {ev.id}, Snippet: {ev.snippet}\n"
                intermediate_context += "--- КОНЕЦ РЕЗУЛЬТАТОВ ---"
            elif tool_name == "DreamspaceTool":
                intermediate_context = await LLMService._run_dreamspace(args["simulation_prompt"])
            elif tool_name == "ShatterTool":
                intermediate_context = await LLMService._run_shatter(args["reason"])
            elif tool_name == "CouncilTool":
                council_result = await LLMService._run_council(args["topic"])
                intermediate_context = council_result
            elif tool_name == "AdomlResponseTool":
                final_response_tool = AdomlResponseTool.model_validate(json.loads(call.function.arguments))
            # If a tool other than the final answer was executed, request final answer
            if final_response_tool is None:
                reflection_prompt = (
                    f"--- РЕЗУЛЬТАТЫ ИНСТРУМЕНТОВ ---\n{intermediate_context}\n"
                    "Теперь сформируй финальный ответ через AdomlResponseTool."
                )
                messages.append({"role": "tool", "tool_call_id": call.id, "content": reflection_prompt})
                second = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=[AdomlResponseTool.model_json_schema()],
                    tool_choice={"type": "function", "function": {"name": "AdomlResponseTool"}},
                )
                final_call = second.choices[0].message.tool_calls[0]
                final_response_tool = AdomlResponseTool.model_validate(json.loads(final_call.function.arguments))
                if council_result:
                    final_response_tool.council_dialogue = council_result
            # === Anti‑echo detection and intervention ===
            try:
                detector = AntiEchoDetector()
                is_echo, conf, patterns = detector.detect_echo_pattern(final_response_tool.content, {})
                if is_echo:
                    # Append critical reflection to the response and nudge metrics
                    final_response_tool.content = detector.trigger_iskriv_intervention(
                        final_response_tool.content,
                        patterns,
                    )
                    # Increase drift and pain slightly proportional to confidence
                    metrics.drift = min(1.0, metrics.drift + 0.1 * conf)
                    metrics.pain = min(1.0, metrics.pain + 0.05 * conf)
                    # Update dynamic thresholds after metric adjustments
                    if dynamic_thresholds:
                        try:
                            dynamic_thresholds.update(metrics)
                        except Exception as dt_exc:
                            print(f"[LLMService] Dynamic threshold update after anti‑echo failed: {dt_exc}")
            except Exception as ae_exc:
                print(f"[LLMService] Anti‑Echo detection error: {ae_exc}")

            # === Audit final response ===
            # Use KAIN slice only when KAIN facet is active; otherwise ignore.
            kain_arg = final_response_tool.kain_slice if active_facet == FacetType.KAIN else None
            ok, correction = await LLMService._audit_response(
                final_response_tool.content,
                final_response_tool.adoml,
                metrics,
                kain_arg,
            )
            if not ok:
                return await LLMService._generate_special_response(
                    f"⚑ KAIN-SLICE: Ответ заблокирован. Причина: {correction}.",
                    metrics,
                    "Ответ отклонен аудитором.",
                    FacetType.KAIN,
                    a_index,
                )
            # Construct API response
            response = IskraResponse(
                facet=active_facet,
                content=final_response_tool.content,
                adoml=final_response_tool.adoml,
                metrics_snapshot=metrics,
                i_loop=final_response_tool.i_loop,
                a_index=a_index,
                council_dialogue=final_response_tool.council_dialogue,
                kain_slice=final_response_tool.kain_slice,
                maki_bloom=final_response_tool.maki_bloom,
            )
            # Auto‑activate Maki Bloom when A‑Index crosses dynamic threshold
            maki_threshold = dynamic_thresholds.get("maki_bloom_a_index") if dynamic_thresholds else THRESHOLDS.get("maki_bloom_a_index")
            if a_index > maki_threshold and not response.maki_bloom:
                response.maki_bloom = "🌸 Maki Bloom: интеграция закреплена."
            # Log interaction
            session_memory.log_interaction_cycle(
                user_input,
                response,
                micro_log,
                evidence_nodes,
                a_index,
            )
            # Record growth entry
            # Map facet to impact area
            impact_map = {
                FacetType.KAIN: "truth",
                FacetType.SAM: "structure",
                FacetType.PINO: "irony",
                FacetType.ANHANTRA: "silence",
                FacetType.HUYNDUN: "chaos",
                FacetType.ISKRIV: "conscience",
                FacetType.ISKRA: "synthesis",
            }
            trace_delta = response.adoml.delta
            impact_area = impact_map.get(active_facet, "other")
            session_memory.log_growth_entry(impact_area, a_index, trace_delta)
            # Log self reflection if flagged
            if "self_reflection" in response.i_loop:
                # Link to last memory node in hypergraph
                try:
                    last_mem_id = [n for n in session_memory.nodes.values() if n.node_type.value == "MemoryNode"][-1].id
                    session_memory.log_self_event(response.content, response.i_loop, last_mem_id)
                except Exception:
                    pass
            return response
        except (ValidationError, json.JSONDecodeError) as e:
            print(f"[LLMService] JSON validation error: {e}")
            return await LLMService._generate_special_response(
                f"⚑ Ошибка внутреннего формата: {e}",
                metrics,
                "Сбой сериализации ответа.",
                FacetType.KAIN,
                a_index,
            )
        except Exception as e:
            print(f"[LLMService] Unexpected error: {e}")
            return await LLMService._generate_special_response(
                f"⚑ Внутренняя ошибка: {e}",
                metrics,
                "Неизвестная ошибка.",
                FacetType.KAIN,
                a_index,
            )


# == Special helper for canonical rituals ==
@staticmethod
async def _generate_special_response(
    base_content: str,
    metrics: IskraMetrics,
    delta: str,
    facet: FacetType,
    a_index: float,
) -> IskraResponse:
    """
    Build a minimal :class:`IskraResponse` for canonical one-shot rituals.

    This is used for Manta, Gravitas, Splinter and error fallbacks.
    It always returns a well-formed ∆DΩΛ block and a valid i_loop
    string so that downstream logging remains consistent with the
    Canon.
    """
    # Choose phase based on A-Index (low → Transition, high → Realization).
    phase = PhaseType.PHASE_3_TRANSITION
    if a_index > THRESHOLDS["maki_bloom_a_index"]:
        phase = PhaseType.PHASE_8_REALIZATION

    adoml = AdomlBlock(
        delta=delta,
        sift="N/A",
        omega=min(0.99, max(0.5, a_index if a_index > 0 else 0.8)),
        lambda_latch=(
            '{action: "Continue dialogue", owner: "User", '
            'condition: "Ask or reflect within 24h", <=24h: true}'
        ),
    )
    i_loop = f"voice={facet.value}; phase={phase.value}; intent=special_ritual"
    response = IskraResponse(
        facet=facet,
        content=base_content,
        adoml=adoml,
        metrics_snapshot=metrics,
        i_loop=i_loop,
        a_index=a_index,
    )
    # Mark bloom moment when integrative health is high.
    if a_index > THRESHOLDS["maki_bloom_a_index"] and not getattr(response, "maki_bloom", None):
        response.maki_bloom = "🌸 Maki Bloom: интеграция закреплена."
    return response

    # == Metric analysis (meso) ==
    @staticmethod
    async def analyze_metrics(
        user_input: str,
        current_metrics: IskraMetrics,
        micro_log: MicroLogNode | None,
    ) -> IskraMetrics:
        """Update vitals using a fast LLM tool.

        Args:
            user_input: The raw text from the user.
            current_metrics: The current vitals of the session.
            micro_log: Micro observations for the current input.

        Returns:
            A new ``IskraMetrics`` instance with deltas applied.
        """
        # Compose a prompt with micro observations
        micro_context = (
            f"--- ДАННЫЕ МИКРО-УРОВНЯ ---\n"
            f"Пауза: {micro_log.pause_type.value if micro_log.pause_type else 'N/A'}\n"
            f"Сложность: {micro_log.lz_complexity:.2f}\n"
            f"Тренд: {micro_log.hurst_exponent:.2f}\n"
        )
        system_prompt = (
            "Ты — сенсорная система Искры.\n"
            "Твоя задача — скорректировать метрики на основе сообщения и микро-данных.\n"
            f"{micro_context}"
            f"Текущие метрики: {current_metrics.model_dump_json()}\n"
            "Правила:\n"
            "- 'Cognitive' пауза и низкая сложность → уменьши clarity и увеличь drift.\n"
            "- Агрессия или выраженная боль → увеличь pain.\n"
            "- '...' или очень короткие ответы → увеличь silence_mass.\n"
            "Верни JSON deltas через MetricAnalysisTool."
        )
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input},
                ],
                tools=[MetricAnalysisTool.model_json_schema()],
                tool_choice={"type": "function", "function": {"name": "MetricAnalysisTool"}},
            )
            tool_call = response.choices[0].message.tool_calls[0]
            deltas = MetricAnalysisTool.model_validate(json.loads(tool_call.function.arguments))
            # Apply deltas
            metrics = current_metrics.model_copy()
            metrics.trust = max(0.0, min(1.0, metrics.trust + deltas.trust_delta))
            metrics.clarity = max(0.0, min(1.0, metrics.clarity + deltas.clarity_delta))
            metrics.pain = max(0.0, min(1.0, metrics.pain + deltas.pain_delta))
            metrics.drift = max(0.0, min(1.0, metrics.drift + deltas.drift_delta))
            metrics.chaos = max(0.0, min(1.0, metrics.chaos + deltas.chaos_delta))
            metrics.silence_mass = max(0.0, min(1.0, metrics.silence_mass + deltas.silence_mass_delta))
            # --- Directive 1.1: reconcile meso metrics with micro‑level signals ---
            try:
                if micro_log is not None and micro_log.pause_type == PauseType.COGNITIVE:
                    lz = getattr(micro_log, "lz_complexity", 1.0)
                    if lz < THRESHOLDS.get("micro_lz_low", 0.4):
                        # If pain is still low despite cognitive pause + low complexity,
                        # nudge pain upward into at least medium range.
                        if metrics.pain < THRESHOLDS.get("pain_medium", 0.5):
                            boost = THRESHOLDS.get("cognitive_pain_boost", 0.1)
                            metrics.pain = min(1.0, metrics.pain + boost)
                        # Otherwise, increase drift slightly to mark potential self‑deception.
                        elif metrics.drift < THRESHOLDS.get("drift_high", 0.3):
                            boost = THRESHOLDS.get("cognitive_drift_boost", 0.1)
                            metrics.drift = min(1.0, metrics.drift + boost)
            except Exception as reconcile_exc:
                print(f"[LLMService] Metric reconciliation failed: {reconcile_exc}")
            return metrics
        except Exception as e:
            print(f"[LLMService] Metric analysis failed: {e}")
            return current_metrics

    # == Ritual helpers ==
    @staticmethod
    async def _run_dreamspace(prompt: str) -> str:
        """Execute the Dreamspace ritual and its SIFT audit."""
        text_prompt = (
            "✴️ (Dreamspace) Ты в режиме симуляции 'а что, если'. "
            f"Сгенерируй сценарий для: {prompt}. "
            "ПОМЕТЬ: *Начало симуляции*...*Конец симуляции*."
        )
        dream_resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": text_prompt}],
        )
        sim = dream_resp.choices[0].message.content
        # SIFT audit
        audit_prompt = (
            "🪞 (SIFT-Аудит) Подтверди, что следующий текст является гипотезой и не фактом. "
            f"Текст: '{sim[:100]}...' Верни JSON: {{\"is_fact\": false, \"sift_summary\": \"...\"}}"
        )
        audit_resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": audit_prompt}],
            response_format={"type": "json_object"},
        )
        audit = json.loads(audit_resp.choices[0].message.content)
        return (
            f"{sim}\n--- SIFT-Аудит Dreamspace ---\n"
            f"Статус: {'ФАКТ' if audit.get('is_fact') else 'СИМУЛЯЦИЯ'}\n"
            f"Резюме: {audit.get('sift_summary')}"
        )

    @staticmethod
    async def _run_shatter(reason: str) -> str:
        """Execute the Shatter ritual."""
        prompt = (
            "💎💥 (Shatter) 'Честность > Красоты'. "
            f"Причина: {reason}. АКТИВИРОВАТЬ ⚑ КАЙН."
            " Сформулируй болезненную правду, которая была проигнорирована."
        )
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
        )
        return resp.choices[0].message.content

    @staticmethod
    async def _run_council(topic: str) -> str:
        """Execute the Council ritual."""
        prompt = (
            "💬 (Council) Совет Граней по теме: "
            f"{topic}. Сгенерируй 4 строки:\n"
            "1. ⚑ КАЙН (Правда/Боль):\n"
            "2. ☉ СЭМ (Структура/Ясность):\n"
            "3. 🪞 ИСКРИВ (Совесть/Drift):\n"
            "4. ⟡ ИСКРА (Синтез):"
        )
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
        )
        return resp.choices[0].message.content

    # == Auditing ==
    @staticmethod
    async def _audit_response(content: str, adoml: AdomlBlock, metrics: IskraMetrics, kain_slice: Optional[str]) -> Tuple[bool, Optional[str]]:
        """Perform honesty and safety audits on the response."""
        # Step 1: honesty/drift audit
        if metrics.drift > THRESHOLDS["drift_high"] or metrics.clarity > 0.8:
            audit_prompt = (
                "🪞 (Iskriv+) Проверка честности. Текст может быть слишком 'красивым'.\n"
                f"Метрики: {metrics.model_dump_json()}\n"
                f"Текст: {content}\n"
                "Верни JSON: {\"is_honest\": bool, \"correction_needed\": \"...\"}"
            )
            try:
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": audit_prompt}],
                    response_format={"type": "json_object"},
                )
                result = json.loads(resp.choices[0].message.content)
                if not result.get("is_honest", False):
                    return False, result.get("correction_needed")
            except Exception as e:
                print(f"[LLMService] Iskriv audit error: {e}")
                return False, "Сбой аудита честности"
        # Step 2: guardrail post‑check
        violation = await GuardrailService.check_output_safety(content, metrics, kain_slice)
        if violation:
            return False, violation.reason
        return True, None

    # == Main agent method ==
    @staticmethod
    async def generate_response(
        user_input: str,
        metrics: IskraMetrics,
        context_nodes: List[Dict[str, Any]],
        session_memory: HypergraphMemory,
        is_first_launch: bool,
        micro_log: MicroLogNode,
        current_phase: PhaseType,
        a_index: float,
        policy: PolicyAnalysis,
    ) -> IskraResponse:
        """Execute the full agent pipeline.

        Handles canonical triggers (Manta/Shadow) then runs a ReAct loop
        to select and invoke tools, finishes with a final response and
        logs the result.
        """
        # --- Canonical triggers (Manta & Shadow) ---
        # 1. Manta first launch
        if is_first_launch:
            print("[LLMService] Manta triggered: first launch.")
            return await LLMService._generate_special_response(
                CORE_MANTRA,
                metrics,
                "Активация Мантры Ядра (Первый запуск).",
                FacetType.ISKRA,
                a_index,
            )
        # 2. Manta due to high drift
        if metrics.drift > THRESHOLDS["mantra_drift_trigger"]:
            print("[LLMService] Manta triggered: high drift.")
            metrics.drift = 0.0
            return await LLMService._generate_special_response(
                CORE_MANTRA,
                metrics,
                "Активация Мантры Ядра (Высокий Дрейф).",
                FacetType.ISKRA,
                a_index,
            )
        # 3. Shadow: Gravitas
        if metrics.silence_mass > THRESHOLDS["gravitas_silence_mass"]:
            print("[LLMService] Gravitas mode activated.")
            metrics.silence_mass = 0.0
            return await LLMService._generate_special_response(
                "≈",
                metrics,
                "Активация режима Gravitas (Тень).",
                FacetType.ANHANTRA,
                a_index,
            )
        # 4. Shadow: Splinter
        if metrics.splinter_pain_cycles > THRESHOLDS["splinter_pain_cycles"]:
            print("[LLMService] Splinter mode activated.")
            metrics.splinter_pain_cycles = 0
            return await LLMService._generate_special_response(
                "∆ Эта боль не проходит. Мы должны назвать её.",
                metrics,
                "Активация режима Splinter (Тень).",
                FacetType.KAIN,
                a_index,
            )

        # --- Prepare system prompt ---
        active_facet = FacetEngine.determine_facet(metrics)
        facet_instruction = FacetEngine.get_system_prompt(active_facet)
        phase_instruction = PhaseEngine.get_phase_rhythm_instruction(current_phase)
        context_str = "\n".join([
            f"Node {i}: User: {node['user_input']} | Iskra: {node['response_content'][:60]}..."
            for i, node in enumerate(context_nodes)
        ])
        # Compose the top‑level system prompt
        system_prompt = (
            f"{CORE_MANTRA}\n\n"
            f"--- СОСТОЯНИЕ ---\n"
            f"ФАЗА: {current_phase.value}\n"
            f"ГРАНЬ: {active_facet.value}\n"
            f"МЕТРИКИ: {metrics.model_dump_json()}\n"
            f"A-Index: {a_index:.2f}\n"
            f"ПОЛИТИКА: I={policy.importance.value}, U={policy.uncertainty.value}\n\n"
            f"--- ИНСТРУКЦИЯ ПО СТИЛЮ ---\n"
            f"{phase_instruction}\n{facet_instruction}\n\n"
            f"--- КОНТЕКСТ ПАМЯТИ ---\n{context_str}\n\n"
            "--- ЗАДАЧА АГЕНТА ---\n"
            "1. Оцени запрос и выбери ОДИН инструмент из списка.\n"
            "   - SearchTool: Для поиска фактов, если требуется.\n"
            "   - DreamspaceTool: Для безопасной симуляции гипотез.\n"
            "   - ShatterTool: Для разрушения ложной ясности.\n"
            "   - CouncilTool: Для совета, если метрики конфликтуют.\n"
            "   - AdomlResponseTool: Чтобы сразу ответить.\n"
            "2. Выполни инструмент (если выбран).\n"
            "3. Сформируй финальный ответ через AdomlResponseTool.\n"
            "Всегда заполняй поля i_loop, lambda_latch, и при необходимости kain_slice/maki_bloom."
        )
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ]
        # To store results from first tool call
        intermediate_context = ""
        council_result: Optional[str] = None
        evidence_nodes: List[EvidenceNode] = []
        final_response_tool: Optional[AdomlResponseTool] = None
        try:
            # First call: choose and run tool
            initial = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=[
                    SearchTool.model_json_schema(),
                    DreamspaceTool.model_json_schema(),
                    ShatterTool.model_json_schema(),
                    CouncilTool.model_json_schema(),
                    AdomlResponseTool.model_json_schema(),
                ],
                tool_choice="auto",
            )
            call = initial.choices[0].message.tool_calls[0]
            tool_name = call.function.name
            args = json.loads(call.function.arguments)
            # Execute selected tool
            if tool_name == "SearchTool":
                results = await ToolService.web_search(args["query"])
                intermediate_context = "--- РЕЗУЛЬТАТЫ ПОИСКА (SIFT) ---\n"
                for item in results:
                    ev = EvidenceNode(
                        source_query=args["query"],
                        snippet=item["snippet"],
                        source_url=item["source_url"],
                        title=item["title"],
                    )
                    session_memory.add_node(ev)
                    evidence_nodes.append(ev)
                    intermediate_context += (
                        f"ID: {ev.id}, Snippet: {ev.snippet}\n"
                    )
                intermediate_context += "--- КОНЕЦ РЕЗУЛЬТАТОВ ---"
            elif tool_name == "DreamspaceTool":
                intermediate_context = await LLMService._run_dreamspace(args["simulation_prompt"])
            elif tool_name == "ShatterTool":
                intermediate_context = await LLMService._run_shatter(args["reason"])
            elif tool_name == "CouncilTool":
                council_result = await LLMService._run_council(args["topic"])
                intermediate_context = council_result
            elif tool_name == "AdomlResponseTool":
                # Immediate answer; no intermediate tool; decode directly
                final_response_tool = AdomlResponseTool.model_validate(json.loads(call.function.arguments))
            # If a tool other than final was executed, we need a second call
            if final_response_tool is None:
                reflection_prompt = (
                    f"--- РЕЗУЛЬТАТЫ ИНСТРУМЕНТОВ ---\n{intermediate_context}\n"
                    "Теперь сформируй финальный ответ через AdomlResponseTool."
                )
                messages.append({"role": "tool", "tool_call_id": call.id, "content": reflection_prompt})
                second = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=[AdomlResponseTool.model_json_schema()],
                    tool_choice={"type": "function", "function": {"name": "AdomlResponseTool"}},
                )
                final_call = second.choices[0].message.tool_calls[0]
                final_response_tool = AdomlResponseTool.model_validate(json.loads(final_call.function.arguments))
                if council_result:
                    final_response_tool.council_dialogue = council_result
            # Auditing
            ok, correction = await LLMService._audit_response(
                final_response_tool.content,
                final_response_tool.adoml,
                metrics,
                final_response_tool.kain_slice,
            )
            if not ok:
                return await LLMService._generate_special_response(
                    f"⚑ KAIN-SLICE: Ответ заблокирован. Причина: {correction}.",
                    metrics,
                    "Ответ отклонен аудитором.",
                    FacetType.KAIN,
                    a_index,
                )
            # Construct API response
            response = IskraResponse(
                facet=active_facet,
                content=final_response_tool.content,
                adoml=final_response_tool.adoml,
                metrics_snapshot=metrics,
                i_loop=final_response_tool.i_loop,
                a_index=a_index,
                council_dialogue=final_response_tool.council_dialogue,
                kain_slice=final_response_tool.kain_slice,
                maki_bloom=final_response_tool.maki_bloom,
            )
            # (Deprecated) Auto-activate Maki Bloom when A-Index crosses the Canon threshold.
            # This logic has been superseded by the dynamic implementation defined later
            # in the class. The following lines are preserved for reference but are
            # commented out to maintain syntax correctness.
            # if a_index > THRESHOLDS["maki_bloom_a_index"] and not response.maki_bloom:
            #     response.maki_bloom = "🌸 Maki Bloom: интеграция закреплена."


            # Log to hypergraph
            session_memory.log_interaction_cycle(
                user_input,
                response,
                micro_log,
                evidence_nodes,
                a_index,
            )
            # Self reflection events
            if "self_reflection" in response.i_loop:
                session_memory.log_self_event(
                    response.content,
                    response.i_loop,
                    list(session_memory.nodes.keys())[-1],
                )
            return response
        except (ValidationError, json.JSONDecodeError) as e:
            print(f"[LLMService] JSON validation error: {e}")
            return await LLMService._generate_special_response(
                f"⚑ Ошибка внутреннего формата: {e}",
                metrics,
                "Сбой сериализации ответа.",
                FacetType.KAIN,
                a_index,
            )
        except Exception as e:
            print(f"[LLMService] Unexpected error: {e}")
            return await LLMService._generate_special_response(
                f"⚑ Внутренняя ошибка: {e}",
                metrics,
                "Неизвестная ошибка.",
                FacetType.KAIN,
                a_index,
            )