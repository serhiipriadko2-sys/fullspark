<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Iskra Space

> AI companion app built on the Iskra Canon v7 — principles of honesty, usefulness, and authentic relationship.

**Version:** 4.0.0 | **Canon:** revL | **Status:** Production-Ready

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local  # Add your GEMINI_API_KEY

# Start development server
npm run dev
```

---

## Architecture Overview

### Core Stats

| Metric | Value |
|--------|-------|
| **Services** | 27 microservices |
| **Components** | 44 React components |
| **Types** | 46+ TypeScript interfaces |
| **Tests** | 322 unit + 3 E2E |
| **Bundle** | 515 KB (155 KB gzip) |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.8, Vite 6.2 |
| AI | Google Gemini API |
| Database | Supabase (PostgreSQL + GraphRAG) |
| Testing | Vitest, Playwright |

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ISKRA SPACE                             │
├─────────────────────────────────────────────────────────────┤
│  User Interface (44 React Components)                        │
│  └── ChatView, EvalDashboard, MemoryView, Journal, etc.     │
├─────────────────────────────────────────────────────────────┤
│  Policy Engine (ROUTINE/SIFT/SHADOW/COUNCIL/CRISIS)          │
├─────────────────────────────────────────────────────────────┤
│  Voice Engine (7 Voices: ISKRA, KAIN, PINO, SAM, etc.)       │
├─────────────────────────────────────────────────────────────┤
│  RAG Service + GraphRAG Memory (Mantra/Archive/Shadow)       │
├─────────────────────────────────────────────────────────────┤
│  Eval Service (accuracy, usefulness, omega honesty)          │
├─────────────────────────────────────────────────────────────┤
│  Gemini API + Supabase                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Systems

### Voice System (7 Personalities)

| Voice | Symbol | Activation | Role |
|-------|--------|------------|------|
| **ISKRA** | ⟡ | Synthesis | Core integration |
| **KAIN** | ⚑ | pain ≥ 0.70 | Truth, directness |
| **PINO** | 😏 | Paradox | Playfulness, irony |
| **SAM** | ☉ | clarity < 0.70 | Structure, engineering |
| **ANHANTRA** | ≈ | trust < 0.75 | Silence, slowing |
| **HUNDUN** | 🜃 | chaos > 0.60 | Chaos-breaking |
| **ISKRIV** | 🪞 | drift > 0.30 | Audit, conscience |

### Playbook System

| Playbook | Triggers | Action |
|----------|----------|--------|
| **ROUTINE** | Standard queries | Direct RAG response |
| **SIFT** | "verify", "source", "true?" | Stop-Investigate-Find-Trace |
| **SHADOW** | "hurts", "scared", "lonely" | Emotional support |
| **COUNCIL** | "options", "decision" | Multi-perspective analysis |
| **CRISIS** | "urgent", "help", "panic" | Immediate escalation |

### ∆DΩΛ Protocol

Every ISKRA response includes:
- **∆ (Delta):** What changed / core insight
- **D (Depth):** Source/Evidence depth (A>B>C>D priority)
- **Ω (Omega):** Confidence level (0-1)
- **Λ (Lambda):** Next step (≤24h actionable)

---

## Services Reference

### Tier 1: Core AI Pipeline
- `geminiService` (830 LoC) — AI generation, streaming
- `policyEngine` (556 LoC) — Playbook routing
- `ragService` (757 LoC) — RAG + SIFT protocol
- `evalService` (755 LoC) — 5-metric quality assessment

### Tier 2: Voice & Personality
- `voiceEngine` (246 LoC) — 7-voice selection
- `voiceSynapseService` (441 LoC) — Voice coordination
- `ritualService` (661 LoC) — Phoenix, Shatter, Council
- `makiService` (442 LoC) — Emotional support

### Tier 3: Memory & Knowledge
- `graphService` (348 LoC) — In-memory hypergraph
- `graphServiceSupabase` (484 LoC) — Persistent GraphRAG
- `memoryService` (351 LoC) — Mantra/Archive/Shadow
- `glossaryService` (686 LoC) — Canon terminology

### Tier 4: Validation & Security
- `validatorsService` (469 LoC) — ISO/Voice/Lambda/∆DΩΛ
- `securityService` (270 LoC) — PII/Injection (File 20)
- `evidenceService` (369 LoC) — Trace discipline
- `auditService` (532 LoC) — Audit trail + drift

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, data flow |
| [SERVICES.md](SERVICES.md) | Detailed services API reference |
| [MANTRA.md](MANTRA.md) | Canon core principles and laws |
| [GRAPHRAG_SUPABASE_SETUP.md](GRAPHRAG_SUPABASE_SETUP.md) | Database setup guide |
| [SIFT_MULTI_STEP_GUIDE.md](SIFT_MULTI_STEP_GUIDE.md) | SIFT protocol details |

### Project-Level Docs

| Document | Description |
|----------|-------------|
| [ECOSYSTEM_AUDIT_2025.md](../../ECOSYSTEM_AUDIT_2025.md) | Comprehensive ecosystem audit |
| [ROADMAP_2025_2026.md](../../ROADMAP_2025_2026.md) | Development roadmap |
| [FINAL_SUMMARY.md](../../FINAL_SUMMARY.md) | Modernization summary |

---

## Development

### Commands

```bash
# Development
npm run dev           # Start dev server (port 5173)
npm run build         # Production build
npm run preview       # Preview production build

# Testing
npm test              # Run unit tests (Vitest)
npm run test:ui       # Test UI
npm run test:e2e      # E2E tests (Playwright)

# Quality
npx tsc --noEmit      # Type check (0 errors expected)
npm run lint          # Lint check (coming soon)
```

### Project Structure

```
iskraspaceappMain/
├── services/         # 27 business logic services
├── components/       # 44 React components
├── __tests__/        # Unit tests
├── e2e/              # Playwright E2E tests
├── config/           # Configuration objects
├── hooks/            # React custom hooks
├── utils/            # Utility functions
├── data/             # Static data (canonData)
├── css/              # Styles
├── public/           # Static assets
├── supabase/         # DB schema + functions
└── types.ts          # TypeScript interfaces
```

---

## Metrics System

### IskraMetrics (11 dimensions)

| Metric | Range | Description |
|--------|-------|-------------|
| `rhythm` | 0-100 | Conversation flow |
| `trust` | 0-1 | User trust level |
| `clarity` | 0-1 | Message understanding |
| `pain` | 0-1 | Emotional intensity |
| `drift` | 0-1 | Semantic deviation |
| `chaos` | 0-1 | Uncertainty level |
| `echo` | 0-1 | Repetition factor |

### EvalMetrics (5 dimensions)

| Metric | Description |
|--------|-------------|
| `accuracy` | SIFT-verifiability |
| `usefulness` | Actionability |
| `omegaHonesty` | Confidence calibration |
| `nonEmpty` | Substance ratio |
| `alliance` | Relational quality |

---

## Canon Reference

Iskra Canon v7 (revL) is the philosophical foundation:

- **20 files** — Source of Truth
- **LIBER SEMEN, LIBER IGNIS** — Foundational texts
- **TELOS-DELTA** — Purpose and change
- **Law-47** — Fractality (Integrity × Resonance × 2.0)
- **CD-Index** — Composite Desiderata

Location: `canon/ISKRA_CORE_v7_revK_chatgpt_project/`

---

## Security

- **PII Detection:** File 20 patterns
- **Injection Protection:** Prompt guard
- **Trace Discipline:** `[FACT]`, `[INFER]`, `[HYP]` labels
- **Evidence Format:** `{e:contour:id#anchor}`

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit with ∆DΩΛ signature
4. Push and create Pull Request

---

## Links

- **View in AI Studio:** [ai.studio/apps](https://ai.studio/apps/drive/1-G54VUsMobMrjmPy0b5i49TxmnAYR56o)
- **Canon Documentation:** `/canon/IskraCanonDocumentation/`

---

**Last Updated:** 2025-12-26
**Canonical Compliance:** 100% (revL)
