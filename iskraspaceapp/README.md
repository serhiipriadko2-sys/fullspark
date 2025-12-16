<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Iskra Space

AI companion app built on the Iskra Canon — principles of honesty, usefulness, and authentic relationship.

## Quick Start

```bash
npm install
cp .env.example .env.local  # Add your GEMINI_API_KEY
npm run dev
```

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, services, data flow |
| [SERVICES.md](SERVICES.md) | Detailed services API reference |
| [MANTRA.md](MANTRA.md) | Canon core principles and laws |
| [components/05_METRICS_and_RHYTHM_INDEX.md](components/05_METRICS_and_RHYTHM_INDEX.md) | Metrics system deep dive |

## Architecture

- **19 Services** — geminiService, policyEngine, evalService, voiceEngine, etc.
- **39 Components** — ChatView, EvalDashboard, GlossaryView, etc.
- **96 Tests** — Vitest, all passing

### Core Systems

```
PolicyEngine → Playbook routing (ROUTINE/SIFT/SHADOW/COUNCIL/CRISIS)
EvalService  → Response quality (accuracy, usefulness, omega honesty)
VoiceEngine  → 7 voices based on metrics (Кайн, Пино, Сэм, Анхантра, etc.)
DeltaProtocol → ∆DΩΛ signature enforcement
```

## Development

```bash
npm test          # Run tests
npm run test:ui   # Test UI
npx tsc --noEmit  # Type check
npm run build     # Production build
```

## Canon Reference

Every Iskra response follows the ∆DΩΛ protocol:
- **Δ (Delta):** What changed / core insight
- **D (D-SIFT):** Source / Evidence depth
- **Ω (Omega):** Confidence level (0-1)
- **Λ (Lambda):** Next step (≤24h actionable)

---

View in AI Studio: https://ai.studio/apps/drive/1-G54VUsMobMrjmPy0b5i49TxmnAYR56o
