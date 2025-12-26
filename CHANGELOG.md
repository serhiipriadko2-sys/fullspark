# Changelog

All notable changes to Fullspark/ISKRA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- ESLint + Prettier configuration
- TypeScript strict mode
- Component unit tests
- Centralized logging (Winston)
- Bundle size optimization

---

## [4.0.0] - 2025-12-26

### Added
- **ECOSYSTEM_AUDIT_2025.md** — Comprehensive ecosystem audit document
- **ROADMAP_2025_2026.md** — Development roadmap through 2026
- **CHANGELOG.md** — This file for version tracking

### Changed
- Updated README.md with current architecture (27 services, 44 components)
- Reorganized documentation structure

### Documentation
- Full ecosystem analysis (7.6/10 maturity score)
- SWOT analysis
- Best practices research from world leaders
- Detailed development phases (0-4)

---

## [3.1.0] - 2025-12-22

### Added
- **SIFT Multi-Step** — Automatic conflict resolution with re-query
- **GraphRAG Supabase** — Persistent graph storage (450 lines)
- **Unit Tests** — 170+ new tests for services
- **Eval Report** — R01-R12 protocol (7 PASS, 1 WARN, 4 PENDING)

### Changed
- Enhanced ragService with multi-step SIFT
- Improved conflict detection and resolution

### Fixed
- SIFT source priority (A>B>C>D)

---

## [3.0.0] - 2025-12-22

### Added
- **Hypergraph Memory** (graphService.ts) — 330 lines
  - 8 node types: EVENT, DECISION, INSIGHT, CANON, etc.
  - 6 edge types: CAUSAL, SIMILARITY, RESONANCE, etc.
  - BFS traversal with resonance filtering

- **CD-Index** (Composite Desiderata) — 5 components
  - groundedness: clarity × (1-drift)
  - truthfulness: trust
  - helpfulness: mirror_sync
  - resolution: (1-pain) × (1-chaos)
  - civility: trust

- **Law-47 Fractality** — Integrity × Resonance × 2.0

- **Rule-8 Context Updater** (rule8Service.ts) — 330 lines
  - Analyzes 100 recent messages
  - Tracks commitments and obligations

- **SIFT Protocol Complete**
  - Stop-Investigate-Find-Trace
  - Source priority: A (canon) > B (project) > C (company) > D (web)
  - Conflict detection and resolution

- **Security File 20 Integration** (securityService.ts) — 270 lines
  - Dynamic JSON-driven patterns
  - PII detection
  - Injection protection

- **Evidence System** (evidenceService.ts) — 340 lines
  - Format: `{e:contour:id#anchor}`
  - Trace discipline: [FACT], [INFER], [HYP], [DESIGN], [PLAN], [QUOTE]

- **Validators Service** (validatorsService.ts) — 450 lines
  - ISO date validation
  - Voice ID validation (9 voices)
  - Lambda validation
  - ∆DΩΛ signature validation

### Changed
- Canon compliance upgraded from revK (40%) to revL (100%)
- metricsService extended with CD-Index and Law-47

### Tests
- evidenceService.test.ts — 60+ tests
- validatorsService.test.ts — 70+ tests
- graphService.test.ts — 40+ tests

---

## [2.0.0] - 2025-12-15

### Added
- **Voice Engine** — 7 personalities (ISKRA, KAIN, PINO, SAM, ANHANTRA, HUNDUN, ISKRIV)
- **Policy Engine** — Playbook routing (ROUTINE/SIFT/SHADOW/COUNCIL/CRISIS)
- **Eval Service** — 5-metric quality assessment
- **Memory Service** — 3-layer memory (Mantra/Archive/Shadow)
- **Glossary Service** — Canon terminology

### Changed
- Migrated from prototype to production architecture
- Added TypeScript strict typing

---

## [1.0.0] - 2025-12-01

### Added
- Initial prototype (IskraSAprototype)
- Basic chat functionality
- Gemini API integration
- React 19 + Vite setup

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 4.0.0 | 2025-12-26 | Ecosystem audit, roadmap |
| 3.1.0 | 2025-12-22 | SIFT multi-step, Supabase GraphRAG |
| 3.0.0 | 2025-12-22 | Full Canon v7 revL compliance |
| 2.0.0 | 2025-12-15 | Voice system, Policy engine |
| 1.0.0 | 2025-12-01 | Initial prototype |

---

## Migration Guides

### From 3.x to 4.x
No breaking changes. Update documentation links in your code.

### From 2.x to 3.x
1. Update imports for new services:
   ```typescript
   import { graphService } from './services/graphService';
   import { evidenceService } from './services/evidenceService';
   import { validatorsService } from './services/validatorsService';
   ```

2. Use new SIFT with enableReQuery:
   ```typescript
   const context = await ragService.buildRAGContextWithSIFT(query, {
     enableReQuery: true
   });
   ```

3. Add ∆DΩΛ signatures to responses:
   ```typescript
   const signature = {
     delta: "Core insight",
     depth: "canon:07",
     omega: "0.85",
     lambda: "Next action"
   };
   ```

---

## Links

- [ECOSYSTEM_AUDIT_2025.md](ECOSYSTEM_AUDIT_2025.md)
- [ROADMAP_2025_2026.md](ROADMAP_2025_2026.md)
- [apps/iskraspaceappMain/README.md](apps/iskraspaceappMain/README.md)
