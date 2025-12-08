# IskraSpaceApp Architecture & Roadmap (Feb 2026)

## Stack & Runtime Topology
- **Client app:** Vite + React 19 + TypeScript; packaged via standard Vite scripts and Vitest hooks in `package.json` (no test suites yet).【F:iskraspaceapp/package.json†L1-L24】
- **AI/LLM:** Google Gemini 2.5 Flash via `@google/genai`, initialized with a canon system prompt and JSON-schema coercion helpers; hard-fails on missing `API_KEY` env var (README currently mentions `GEMINI_API_KEY`).【F:iskraspaceapp/services/geminiService.ts†L1-L58】
- **State shell:** `App.tsx` owns the navigation state (`view`), Iskra metrics/phase, onboarding/tour gates, and ritual alerts; it routes to Pulse, Planner, Journal, Beacon (habits), Duo, Chat, Live Conversation, Runes, Deep Research, Memory, Metrics/Core, Council, Design System, Settings, and Focus Session views.【F:iskraspaceapp/App.tsx†L1-L205】
- **Metrics & phases:** `metricsService` maps text signals to metric deltas and derives the Iskra phase using canon thresholds (clarity/pain/drift/chaos/trust/echo/silence).【F:iskraspaceapp/services/metricsService.ts†L6-L107】 Ritual triggers, Phoenix/Shatter handlers, and Council redirection live in `ritualService` and are wired at the shell level.【F:iskraspaceapp/App.tsx†L126-L159】【F:iskraspaceapp/services/ritualService.ts†L1-L189】
- **Storage:** `storageService` uses `localStorage` for tasks, habits, journal, duo prefs/canvas, voice prefs/state, onboarding, and memory snapshots, plus export/import and full clear helpers; no encryption or sync is present.【F:iskraspaceapp/services/storageService.ts†L5-L218】

## Module Coverage (what exists vs. placeholder level)
- **Пульс (Pulse/∆-ритм):** `DayPulse` renders rhythm rings, breathing prompts, and daily advice seeded via `IskraAIService`; shell simulates rhythm drift and phases from text input to keep ambience reactive.【F:iskraspaceapp/App.tsx†L76-L159】
- **Планировщик & Привычки:** `Planner` persists tasks locally, seeds initial tasks with `getPlanTop3()` from Gemini when empty, and includes stats/calendar/streak visuals; `BeaconView` uses `storageService` habits with default seeds but no encryption or offline sync beyond browser storage.【F:iskraspaceapp/components/Planner.tsx†L3-L88】【F:iskraspaceapp/services/storageService.ts†L37-L63】
- **Дневник & «Глубокое исследование»:** Journal entries are stored in `localStorage` with an optional PIN flag (not cryptographic); DeepResearch view and Chat pull prompts from `geminiService` schemas, relying on the same API key gate.【F:iskraspaceapp/services/storageService.ts†L65-L97】【F:iskraspaceapp/services/geminiService.ts†L32-L78】
- **Связь двоих:** `DuoLink`/canvas settings persist partner-sharing prefs and notes locally; there is no peer-to-peer transport or encryption yet, so sharing is conceptual only.【F:iskraspaceapp/services/storageService.ts†L98-L141】
- **Ядро / Метрики / Ритуалы:** Metrics panel and Council use `metricsService` + `ritualService`; Council streams per-voice Gemini calls with tolerant fallbacks when a voice fails, but no retries/backoff beyond the base Gemini helper, and Reverse/Retune/Rule-21/Rule-88 scaffolds exist without persistence for commitments/snapshots beyond in-memory state.【F:iskraspaceapp/services/ritualService.ts†L1-L189】
- **Настройки:** Export/import and Phoenix-reset equivalents rely on `storageService` round-tripping the JSON snapshot and `clearAllData`, but there is no checksum/validation or warning about quota/failed writes.【F:iskraspaceapp/services/storageService.ts†L193-L218】

## 4–6 Week Technical Roadmap
**Week 1: Environment + Safety Nets**
- Align env naming (`API_KEY` vs `GEMINI_API_KEY`) and add a startup guardrail banner + offline stub when the key is absent to keep non-AI flows usable.【F:iskraspaceapp/services/geminiService.ts†L7-L58】
- Add Vitest smoke suites for `metricsService` phase logic and `ritualService` trigger/handlers to lock canon thresholds and ritual routing.【F:iskraspaceapp/services/metricsService.ts†L6-L107】【F:iskraspaceapp/services/ritualService.ts†L145-L189】

**Weeks 2–3: Offline-First Data Integrity**
- Introduce client-side encryption (password/PIN derived key) for journal, duo notes, and exports; add storage quota/error surfacing around `storageService` writes and backup warnings.【F:iskraspaceapp/services/storageService.ts†L5-L218】
- Add checksum/version headers to export/import payloads plus validation UI to prevent corrupted restores.【F:iskraspaceapp/services/storageService.ts†L193-L218】

**Weeks 3–4: AI Resilience & Ritual Depth**
- Wrap Gemini calls with retry/backoff + per-voice timeouts in Council; cache last successful responses for offline replay in Pulse/Planner/Research flows.【F:iskraspaceapp/services/geminiService.ts†L1-L78】【F:iskraspaceapp/services/ritualService.ts†L102-L189】
- Persist Rule-21 commitments and Reverse snapshots to storage with timestamps so Phoenix/Shatter/Reverse flows survive refreshes.【F:iskraspaceapp/services/ritualService.ts†L85-L189】

**Weeks 5–6: Connection & Observability**
- Ship a mocked peer-to-peer adapter (QR/export) for Duo sharing, isolating user metrics from Iskra metrics in the UI copy and payload schema.【F:iskraspaceapp/services/storageService.ts†L98-L141】
- Add minimal telemetry (local only) and UI indicators for storage/AI status; extend tests to Planner/Beacon persistence and export/import round-trips to guard the offline-first contract.【F:iskraspaceapp/services/storageService.ts†L37-L218】
