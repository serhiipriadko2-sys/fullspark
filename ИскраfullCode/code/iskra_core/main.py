import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from dataclasses import dataclass
from typing import Dict

# Import core models
from core.models import (
    IskraMetrics,
    IskraResponse,
    UserRequest,
    MicroLogNode,
    PhaseType,
    PolicyAnalysis,
    NodeType,
)

# Import services
from services.llm import LLMService
from services.fractal import FractalService
from services.phase_engine import PhaseEngine
from services.guardrails import GuardrailService
from services.policy_engine import PolicyEngine
from services.persistence import PersistenceService, UserSession
from config import THRESHOLDS


# Initialize FastAPI app
app = FastAPI(
    title="Iskra Core API",
    version="2.0.0-release",
    description="Production-ready implementation of the Iskra core (Fractal Metaconsciousness)"
)

# Initialize persistent session storage
persistence = PersistenceService()


def get_session(user_id: str) -> UserSession:
    """
    Retrieve a user session from persistence or create a new one.
    The session stores metrics, memory graph, and phase state.
    """
    session = persistence.load_session(user_id)
    if session is None:
        session = UserSession()
    return session


@app.post("/ask", response_model=IskraResponse)
async def ask_iskra(request: UserRequest):
    """
    Main pipeline to process user queries:
    1. Guardrails safety check
    2. Load session
    3. Policy analysis (importance/uncertainty)
    4. Compute micro metrics (pause and complexity)
    5. Analyse meso metrics (trust, clarity, pain, drift, chaos)
    6. Compute A-index (integration level)
    7. Retrieve context from memory
    8. Run the ReAct agent to generate a response
    9. Update session state (phase and first-launch flag)
    10. Save session back to persistence
    """
    # Pre-check input for forbidden content
    violation = await GuardrailService.check_input_safety(request.query)
    if violation:
        raise HTTPException(
            status_code=400,
            detail={"message": violation.refusal_message, "reason": violation.reason},
        )

    # Load or create session
    session = get_session(request.user_id)

    # Policy analysis: classify importance and uncertainty
    policy: PolicyAnalysis = await PolicyEngine.analyze_priority(request.query)

    # Micro-level metrics: pause classification and complexity
    lzc, hurst, pause_type = FractalService.calculate_micro_metrics(
        request.query, request.input_duration_ms
    )
    micro_log = MicroLogNode(
        text_length=len(request.query),
        pause_duration_ms=request.input_duration_ms,
        pause_type=pause_type,
        lz_complexity=lzc,
        hurst_exponent=hurst,
    )

    # Meso-level metrics: update trust, clarity, pain, drift, chaos
    updated_metrics: IskraMetrics = await LLMService.analyze_metrics(
        request.query,
        session.metrics,
        micro_log,
    )
    # Meta-level heuristics: compute integrity and resonance (fractality components)
    # Integrity reflects coherence between clarity and trust
    updated_metrics.integrity = 0.5 * (updated_metrics.trust + updated_metrics.clarity)
    # Resonance reflects low drift and low chaos (high is better)
    updated_metrics.resonance = (1.0 - updated_metrics.drift) * (1.0 - updated_metrics.chaos)
    # Shadow core: update splinter pain cycles
    if updated_metrics.pain > THRESHOLDS["pain_high"]:
        updated_metrics.splinter_pain_cycles += 1
    else:
        updated_metrics.splinter_pain_cycles = 0
    session.metrics = updated_metrics

    # Meta-level: compute A-index
    current_a_index = FractalService.calculate_a_index(updated_metrics)

    # Retrieve recent context from memory
    context_nodes = session.memory.retrieve_context()

    # Generate response using ReAct agent
    response: IskraResponse = await LLMService.generate_response(
        user_input=request.query,
        metrics=session.metrics,
        context_nodes=context_nodes,
        session_memory=session.memory,
        is_first_launch=session.is_first_launch,
        micro_log=micro_log,
        current_phase=session.current_phase,
        a_index=current_a_index,
        policy=policy,
    )

    # Update session flags and phase
    if session.is_first_launch:
        session.is_first_launch = False
    next_phase: PhaseType = PhaseEngine.transition(
        session.current_phase, response.metrics_snapshot, current_a_index
    )
    session.current_phase = next_phase

    # Persist the session
    persistence.save_session(request.user_id, session)

    return response


@app.post("/ritual/phoenix/{user_id}")
async def trigger_phoenix(user_id: str):
    """
    Ritual Phoenix: remove session from persistence. Next call will start a new session.
    """
    persistence.delete_session(user_id)
    return {
        "status": "Phoenix ritual complete. Session reset.",
        "user_id": user_id,
    }


@app.get("/session/trace/{node_id}")
async def trace_node(node_id: str, user_id: str = "default_user"):
    """
    Trace a node in the user's hypergraph. Returns the node and its linked nodes
    for forensic analysis.
    """
    session = get_session(user_id)
    node = session.memory.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found in session")
    if node.node_type == NodeType.MEMORY:
        meta_node = session.memory.get_node(node.meta_node_id)
        micro_log_node = session.memory.get_node(node.micro_log_node_id)
        evidence_nodes = [session.memory.get_node(eid) for eid in node.evidence_node_ids]
        return {
            "node": node,
            "links": {
                "meta_node": meta_node,
                "micro_log_node": micro_log_node,
                "evidence_nodes": evidence_nodes,
            },
        }
    return {"node": node}


# Serve static dashboard content
dashboard_dir = os.path.join(os.path.dirname(__file__), "dashboard")
if not os.path.exists(dashboard_dir):
    os.makedirs(dashboard_dir)
app.mount("/", StaticFiles(directory=dashboard_dir, html=True), name="dashboard")


if __name__ == "__main__":
    print("--- Starting Iskra Core (v2.0.0-release) ---")
    uvicorn.run(app, host="0.0.0.0", port=8000)