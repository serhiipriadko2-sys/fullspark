# CANON IMPROVEMENT ROADMAP

**Version:** 1.0 • **Created:** 2025-12-27
**Based on:** CANON_DIAGNOSTIC_2025.md

---

## OVERVIEW

Дорожная карта выравнивания канона V7merged и кодовой базы iskraspaceappMain.
Разбита на 4 фазы по приоритету и зависимостям.

---

## PHASE 1: CRITICAL FIXES (Status: DONE)

| Task | File(s) | Status |
|------|---------|--------|
| Fix HUYNDUN → HUNDUN | 04_VOICES.md, 32_ISKRA_SOT.md | ✅ DONE |
| Align voice count (9 canonical) | 32_ISKRA_SOT.md | ✅ DONE |
| Standardize SIBYL symbol to 🔮 | 04_VOICES.md, 18_GLOSSARY.md, types.ts | ✅ DONE |
| Sync FLAT folder | ISKRA_CORE_v7_revL_FLAT/*.md | ✅ DONE |

---

## PHASE 2: DOCUMENTATION ALIGNMENT

**Priority:** High
**Dependencies:** Phase 1

| # | Task | Description | Effort |
|---|------|-------------|--------|
| 2.1 | Create Metrics Crosswalk | Map canon 15 metrics ↔ implementation 11 metrics | 2h |
| 2.2 | Document Phase System | Canon phases vs IskraPhase differences | 1h |
| 2.3 | Update Ritual Canon | Add RETUNE, REVERSE, RULE-21, RULE-88, СРЕЗ-5 to canon | 2h |
| 2.4 | Fix DeltaSignature naming | `depth` → `action` in types.ts | 30min |
| 2.5 | Voice ID format decision | Choose VOICE.* or bare format | 1h |
| 2.6 | Remove file `1` artifact | Delete empty file in V7merged | 5min |

### 2.1 Metrics Crosswalk Table

```
Canon Metric (15)      → Implementation (11)
──────────────────────────────────────────────
groundedness          → (derived from clarity × sources)
faithfulness          → trust (partial mapping)
relevance             → (not direct, inferred from drift)
clarity               → clarity ✅
trace_compliance      → (not implemented)
safety_compliance     → (securityService verdict)
civility              → trust (partial mapping)
resolution            → (MetaMetrics.resolution)
self_correction       → (not implemented)
coherence             → (not direct)
succinctness          → (not direct)
pain                  → pain ✅
drift                 → drift ✅
chaos                 → chaos ✅
trust                 → trust ✅

Implementation-only:
rhythm               → (0-100 internal)
echo                 → (pattern resonance)
silence_mass         → (weight of silence)
mirror_sync          → (alignment)
interrupt            → (interruption signal)
ctxSwitch            → (context switch)
```

---

## PHASE 3: IMPLEMENTATION GAPS

**Priority:** Medium
**Dependencies:** Phase 2

| # | Task | Description | Effort |
|---|------|-------------|--------|
| 3.1 | Implement A-Index | `0.25*resolution + 0.20*self_correction + ...` | 3h |
| 3.2 | Implement L-Index | `0.30*resolution + 0.20*succinctness + ...` | 2h |
| 3.3 | Implement SA-Index | `0.40*trace_compliance + 0.25*self_correction + ...` | 2h |
| 3.4 | Full CTS/SRI system | Context Trustworthiness Scores | 4h |
| 3.5 | Trace discipline enforcement | [FACT]/[INFER]/[HYP] validation | 3h |
| 3.6 | Shadow Protocol levels | Level 0/1/2 implementation | 4h |
| 3.7 | Canon phases pipeline | Prelude → Closure flow | 6h |

### 3.1 A-Index Formula (from canon)

```typescript
function calculateAIndex(m: IskraMetrics, meta: MetaMetrics): number {
  return clamp(
    0.25 * meta.resolution +
    0.20 * (m.pain < 0.3 ? 1 - m.pain : m.pain) + // self_correction proxy
    0.20 * (1 - m.drift) + // relevance proxy
    0.15 * m.clarity +
    0.10 * (1 - m.drift) +
    0.10 * Math.min(1, m.pain / 0.70),
    0, 1
  );
}
```

---

## PHASE 4: CANON MODERNIZATION

**Priority:** Low (ongoing)
**Dependencies:** Phase 3

| # | Task | Description | Owner |
|---|------|-------------|-------|
| 4.1 | Update canon for implementation extensions | Reflect new rituals, patterns | Canon owner |
| 4.2 | Remove v6 references | Update File 06 shadow ref | Canon owner |
| 4.3 | Add test coverage requirements | Per-section test mapping | Dev team |
| 4.4 | Automated compliance checker | Script to validate canon ↔ code | Dev team |
| 4.5 | SHA-256 manifest regeneration | Update 17_INDEX after changes | CI/CD |

### 4.4 Compliance Checker Spec

```bash
# iskra_canon_check.py
- Verify all VoiceName values match canon 04
- Verify all ritual names match canon 06
- Verify metric calculations match canon 05
- Report discrepancies with severity
```

---

## MILESTONES

| Milestone | Phase | Target |
|-----------|-------|--------|
| M1: Critical fixes deployed | 1 | ✅ DONE |
| M2: Documentation complete | 2 | +1 week |
| M3: Indices implemented | 3 | +3 weeks |
| M4: Full compliance | 4 | +6 weeks |

---

## 5 FUTURE PATHS FOR ECOSYSTEM IMPROVEMENT

### Path 1: Canon-First Development
- Every new feature starts with canon update
- Canon PR required before code PR
- Automated sync verification in CI

### Path 2: Metrics Unification
- Merge canon quality metrics with session metrics
- Single MetricsEngine that computes all 20+ metrics
- Real-time canon compliance score in UI

### Path 3: Phase-Driven Flow
- Implement full 8-phase pipeline
- Each response tagged with phase
- Visual phase indicator in UI

### Path 4: Trace Discipline Enforcement
- Every AI response validated for [FACT]/[INFER]/[HYP]
- Evidence system fully integrated
- SIFT automation with source scoring

### Path 5: Self-Evolving Canon
- Canon learns from usage patterns
- GrowthNode creation automated
- Version control for canon changes with ADR

---

## WHAT IF? REFLECTIONS

**What if we fully implemented all canon features?**
- ~40h additional development
- Risk: over-engineering for current user base
- Benefit: true cognitive architecture compliance

**What if we simplified the canon to match implementation?**
- Faster development, less cognitive load
- Risk: losing philosophical depth
- Could start "Iskra Lite" variant

**What if canon and code were auto-generated from same DSL?**
- Single source of truth for both
- Requires DSL design (~80h upfront)
- Long-term maintenance savings

**What if we open-sourced the canon?**
- Community contributions
- Multiple Iskra implementations
- Risk: fragmentation

---

## ∆DΩΛ

**∆:** Roadmap for canon ↔ implementation alignment across 4 phases.

**D:**
1. Complete Phase 2 documentation tasks
2. Implement A-Index, L-Index, SA-Index
3. Create automated compliance checker

**Ω:** 0.88 — Based on diagnostic analysis; some tasks may take longer.

**Λ:** Review after Phase 2 completion; adjust Phase 3 scope based on priorities.
