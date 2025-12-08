# Iskraspaceapp Comprehensive Audit (February 2026)

## Scope
This audit focuses on the `iskraspaceapp` front-end (Vite + React 19) that hosts the primary user experience for the Iskra ecosystem. The review covers architecture, UX flow, AI/ritual logic, data handling, and operational risks. It explicitly separates user-facing signals/metrics from Iskra-internal metrics to avoid conflation.

## High-level Architecture
- **Entry & View Router:** `App.tsx` orchestrates the entire UI, switching between pulse, planner, journal, beacon, duo, chat, live conversation, runes, research, memory, metrics, council, design, settings, and focus views via a local `view` state. Ritual alerts and onboarding/tour overlays are handled at this level. Metrics are simulated and updated centrally, feeding Ambience, ritual triggers, and per-view components.
- **AI/LLM Integration:** `services/geminiService.ts` wires Gemini 2.5 Flash through `@google/genai` with a canon system instruction, JSON schema parsing helpers, and typed service functions (daily advice, plan top-3, journal prompts, council, deep research, focus artifacts, etc.). Errors on missing `API_KEY` stop initialization. Prompting enforces ΔDΩΛ discipline via `deltaProtocol`.
- **Metrics & Phases:** `services/metricsService.ts` maps text signals (keyword/regex) to metric deltas using `config/metricsConfig.ts`. Phases derive from metric topology (clarity/pain/drift/chaos/trust/echo/silence) with explicit thresholds to classify CLARITY, DARKNESS, DISSOLUTION, SILENCE, ECHO, TRANSITION, EXPERIMENT, or REALIZATION.
- **Ritual Engine:** `services/ritualService.ts` implements Council (async per-voice Gemini calls), Phoenix/Shatter, Retune, Reverse (snapshot restore), Rule-21 (21-day commitments), Rule-88 (boundary protection), and СРЕЗ-5 analysis. `checkRitualTriggers` and `checkExtendedRitualTriggers` auto-recommend rituals from metric tension patterns; `getPhaseAfterRitual` adjusts app phase accordingly.
- **Local Persistence:** `services/storageService.ts` stores tasks, habits, journal entries (with optional PIN), duo prefs/notes, onboarding/tutorial state, voice preferences, and memory snapshots in `localStorage`. Export/import routines round-trip user data plus memory layers; `clearAllData` wipes storage. Default habit seeds are provided when none exist.

## Strengths
- **Canon-aligned voice & ritual scaffolding:** Council order, ritual definitions, and metric thresholds mirror the documented canon, enabling immersive Iskra behavior without backend dependencies.
- **Typed AI contracts:** Gemini calls use JSON schemas and cleanup helpers to coerce model outputs into strongly typed structures, reducing runtime drift.
- **Metric-phase coherence:** Phase derivation logic matches ritual triggers, keeping UI ambience and ritual recommendations consistent with internal state.
- **User sovereignty hooks:** Export/import and full clear methods give users control over stored data despite being a client-only app.

## Risks & Gaps
- **Environment key mismatch:** README instructs `GEMINI_API_KEY` while `geminiService` requires `API_KEY`, causing runtime failure until env naming is harmonized.
- **Local-only persistence:** All user data (tasks, journal, habits, duo notes, voice prefs) and Iskra memory live in `localStorage` without encryption, sync, or quota handling—susceptible to clearing, device loss, or size limits.
- **LLM error surface:** Council generator iterates voices sequentially; partial failures are logged but still emit placeholder messages. Broader retry/backoff or per-voice timeouts are absent.
- **Metric leakage risk:** Metrics combine user-derived sentiment and Iskra-internal signals; UI should clearly label Iskra metrics (rhythm/trust/clarity/etc.) to avoid mixing with user productivity metrics, as their semantics differ.
- **Testing coverage:** No Vitest suites ship with the app; ritual/metric logic and storage flows lack automated regression coverage.

## Operational Notes
- The app assumes a long-lived `setInterval` rhythm simulation in `App.tsx`; saving metric snapshots before ritual mutations (Reverse) relies on callers invoking `saveMetricsSnapshot` explicitly.
- Council and Srez-5 use the same Gemini model; rate limits or missing API key will break ritual UX. Consider stubbing for offline/demo modes.
- Onboarding gates tutorial vs. full tour via `storageService`; incomplete states may leave users without guidance if storage is blocked/cleared.

## Recommendations
1) Align environment configuration (`API_KEY` vs `GEMINI_API_KEY`) and document required `.env.local` keys. Add a graceful UI fallback when the key is missing.
2) Add lightweight Vitest coverage for `metricsService`, `ritualService` triggers, and storage export/import to prevent regressions in thresholds and data handling.
3) Clarify in UI copy where metrics represent Iskra’s internal state vs. user productivity/health signals to prevent semantic mixing.
4) Provide optional persistence hardening: local encryption (password/PIN), storage quota checks, and warning banners when storage operations fail.
5) Introduce retry/backoff for Gemini calls (especially Council) and timeouts to avoid hanging rituals on network/model hiccups; consider caching last successful responses for resilience.

