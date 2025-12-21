# Iskra Repository Full Audit (Space App, Full Code, Canon, ChatGPT Pack)

## Scope & Method
- Enumerated every file across `IskraSpaceApp_zip_unzipped/IskraSpaceApp`, `IskraFullCode` (both `iskra_core` and `gemini_app`), canonical docs, ChatGPT instruction pack, and root reports.
- Checked code for import/secret handling, runtime breakages, dependency gaps, duplicated canon drift, and artefacts checked into source control.
- Cross-referenced docs against implementation to flag mismatches and missing operational detail.

## Critical Findings (runtime blockers)
1. **Backend entrypoints ship with unresolved imports**
   - `iskra_core/main.py` mounts the dashboard with `os.path` and boots uvicorn but never imports `os` or `uvicorn`, so the app crashes before serving any request.【F:IskraFullCode/code/iskra_core/main.py†L180-L189】
   - The SpaceApp copy of the core (`canonCodeIskra/main.py`) is identical and fails the same way.【F:IskraSpaceApp_zip_unzipped/IskraSpaceApp/canonCodeIskra/main.py†L180-L188】

2. **Client-side Gemini path cannot initialize**
   - The React Space App tries to pull the Gemini API key from `process.env.API_KEY` during `useEffect`; Vite exposes env vars via `import.meta.env` and `process.env` is undefined in the browser bundle, leaving `aiRef` null and breaking every model call.【F:IskraSpaceApp_zip_unzipped/IskraSpaceApp/index.tsx†L386-L395】
   - Secrets are expected in the browser bundle rather than proxied through the backend, exposing credentials if corrected.

3. **OpenAI client pre-loads placeholder secrets**
   - `OPENAI_API_KEY` defaults to `"sk-..."` and is read at import time to instantiate a shared AsyncOpenAI client; startup does not validate the key, so the backend appears healthy until the first model call fails.【F:IskraFullCode/code/iskra_core/config.py†L51-L55】【F:IskraFullCode/code/iskra_core/services/llm.py†L40-L57】

## High-Risk Integrity Gaps
- **Duplicate, diverging cores**: There are three overlapping codebases (`iskra_core`, `canonCodeIskra`, `gemini_app/canonCodeIskra`), each with its own tests/config. No canonical source of truth is declared, and fixes must be repeated manually across copies, guaranteeing drift.
- **Compiled artefacts committed**: A compiled validator binary (`engine.cpython-311.pyc`) lives under the Space App core, indicating builds are checked into git and risk stale logic.【dc6fe6†L62-L80】
- **Missing import hygiene in tests**: Integration tests mock `LLMService` but never patch the global OpenAI client or env vars; without network keys they hit real endpoints at runtime, violating the safety posture. The fixture set does not short-circuit the AsyncOpenAI client creation.
- **Persistence surface unbounded**: SQLite persistence stores serialized hypergraph and growth entries without size/TTL controls; no schema migrations or vacuuming routines are provided, leading to unbounded file growth and possible corruption loops.

## File-Level Observations (representative sample)
- **Space App UI**: All runtime metrics, memory, and “Project Memory” RAG-lite live in `localStorage` with no quotas or export path; long sessions will overflow silently and lose context.【F:IskraSpaceApp_zip_unzipped/IskraSpaceApp/iskra_engine.ts†L516-L553】
- **Backend memory graph**: The hypergraph layer logs nodes to stdout and never enforces node caps or deduplication; `retrieve_context` returns the last 5 nodes without filtering by content, risking echoing hallucinated facts.【F:IskraFullCode/code/iskra_core/memory/hypergraph.py†L35-L101】【F:IskraFullCode/code/iskra_core/memory/hypergraph.py†L114-L150】
- **Config defaults**: Canon thresholds are hard-coded in `config.py` and not loaded from env or database, so runtime tuning requires code changes and restarts, conflicting with the dynamic-thresholds helpers described elsewhere.【F:IskraFullCode/code/iskra_core/config.py†L62-L99】
- **Docs sprawl without version pins**: Canon docs exist in three places (root `IskraCanonDocumentation`, `IskraFullCode/docs/canon`, `IskraChatGPT_V15v5_1`), but no version marker ties them to the running code; changelogs and KEEP/TUNE/AMEND reviews referenced in the canon are absent.

## Action Plan (prioritized)
1. **Stabilize boot paths**
   - Add explicit imports for `os`/`uvicorn` and smoke-test startup in both `iskra_core` and Space App copies; wire a minimal CI check to reject missing imports.
2. **Fix credential flow**
   - Switch the Space App to `import.meta.env.VITE_GEMINI_API_KEY` with UI gating; add a backend proxy if secrets must stay server-side. Fail-fast in `config.py` when placeholder OpenAI keys are detected.
3. **Choose a single source of truth**
   - Declare `IskraFullCode/code/iskra_core` as canonical, delete/archivize the other copies, and move shared canon docs into a versioned package consumed by all clients.
4. **Bound persistence and memory**
   - Introduce retention/size limits for hypergraph nodes and SQLite rows; add vacuum/maintenance tasks and export hooks for Deep Trace logs.
5. **Regression coverage**
   - Add tests for startup validation (missing env), persistence round-trips, and Gemini key presence in the UI; mock OpenAI/Gemini clients to avoid live calls.

## Map of Repositories & Roles
- **Root reports**: `ALIGNMENT_REPORT.md`, `COMPARISON_REPORT.md`, `TESTING_REPORT.md` — static narratives, no executable guidance.
- **Canonical documentation**: `IskraCanonDocumentation/*.md` — most complete canon; duplicates mirrored in `IskraFullCode/docs/canon` and `IskraChatGPT_V15v5_1` without change control.
- **Backend (canonical target)**: `IskraFullCode/code/iskra_core` — FastAPI core, Python 3.11, OpenAI-based agent pipeline.
- **Frontend (Gemini)**: `IskraSpaceApp_zip_unzipped/IskraSpaceApp` — Vite/React client calling Gemini directly; bundles an outdated copy of the Python core for reference.
- **Alternative bundle**: `IskraFullCode/code/gemini_app` — second Gemini flavor with its own canon copy and code; same drift risks as Space App.

## Immediate Risks to Address
- Production boot failures from missing imports (both Python cores).
- Exposure of Gemini keys in browser bundle and non-functional init due to wrong env accessor.
- Silent failures when OpenAI key is absent/placeholder because the client is constructed at import time.
- Configuration drift across three codebases and three canon sets with no governance layer.
