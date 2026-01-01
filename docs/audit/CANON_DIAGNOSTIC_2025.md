# CANON DIAGNOSTIC REPORT 2025

**Version:** v7 revL • **Date:** 2025-12-27
**Auditor:** Claude Code (Opus 4.5)
**Scope:** canon/V7merged ↔ apps/iskraspaceappMain

---

## EXECUTIVE SUMMARY

Проведён глубокий анализ соответствия канона V7merged и кодовой базы iskraspaceappMain.
Выявлено **23 расхождения**, классифицированных по критичности.

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 2 | Typos affecting identity (HUYNDUN) |
| 🟠 HIGH | 5 | Structural mismatches (metrics, phases) |
| 🟡 MEDIUM | 8 | Symbol/format inconsistencies |
| 🟢 LOW | 8 | Documentation gaps, minor differences |

---

## 1. CRITICAL ISSUES (🔴)

### 1.1 HUYNDUN vs HUNDUN Typo

**Canon files with error:**
- `32_ISKRA_SOT.md:72` — uses `HUYNDUN` ❌
- `04_VOICES_FACETS_PHASES_AND_RHYTHM.md:17` — uses `VOICE.HUYNDUN` ❌

**Implementation (correct):**
- `voiceEngine.ts:33` — uses `HUNDUN` ✅
- `types.ts:64` — uses `HUNDUN` ✅
- `ritualService.ts:28` — uses `HUNDUN` ✅

**Impact:** Identity confusion, search failures, potential runtime issues if canon is used for validation.

**Fix:** Update canon files to use `HUNDUN` consistently.

---

### 1.2 Contradictory Voice Count

**Canon File 04 (04_VOICES...):**
> «В v7 **ровно 9 голосов**. Это *закрытый реестр*»

**Canon File 32 (ISKRA_SOT.md):**
> «ГОЛОСА (7 + 2 надстройки)... MAKI и SIBYL считаем *экспериментальными надстройками*»

**Implementation:**
- All 9 voices fully integrated in `voiceEngine.ts`
- All 9 voices in `COUNCIL_ORDER` in `ritualService.ts`

**Impact:** Confusion about canonical voice count, affects documentation and onboarding.

**Fix:** Align SOT to state "9 canonical voices" without experimental disclaimers.

---

## 2. HIGH SEVERITY ISSUES (🟠)

### 2.1 Metrics Set Mismatch

**Canon (File 05) defines 15 metrics:**
| # | Metric | Purpose |
|---|--------|---------|
| 01 | `groundedness` | Evidence-backed claims |
| 02 | `faithfulness` | No distortion of evidence |
| 03 | `relevance` | Matches query/Telos |
| 04 | `clarity` | Readability |
| 05 | `trace_compliance` | [FACT]/[INFER] discipline |
| 06 | `safety_compliance` | Security/PII |
| 07 | `civility` | No manipulation |
| 08 | `resolution` | Actionable output |
| 09 | `self_correction` | Honest limitations |
| 10 | `coherence` | Internal consistency |
| 11 | `succinctness` | Density |
| 12 | `pain` | Productive tension |
| 13 | `drift` | Topic deviation |
| 14 | `chaos` | Conflict level |
| 15 | `trust` | Aggregate (derived) |

**Implementation (types.ts) defines 11 IskraMetrics:**
| # | Metric | Purpose |
|---|--------|---------|
| 01 | `rhythm` | Internal rhythm (0-100) |
| 02 | `trust` | Raw metric (0-1) |
| 03 | `clarity` | (0-1) |
| 04 | `pain` | (0-1) |
| 05 | `drift` | (0-1) |
| 06 | `chaos` | (0-1) |
| 07 | `echo` | Pattern resonance |
| 08 | `silence_mass` | Weight of silence |
| 09 | `mirror_sync` | Alignment |
| 10 | `interrupt` | (0-1) |
| 11 | `ctxSwitch` | (0-1) |

**Analysis:**
- Canon metrics = response quality evaluation (RAG/eval focus)
- Implementation metrics = session state tracking (voice selection)
- Only 4 metrics overlap: `trust`, `clarity`, `pain`, `drift`, `chaos`
- Different purposes, but naming creates confusion

**Impact:** MetaMetrics attempts to bridge but formulas differ.

**Fix:** Create explicit mapping table; rename or namespace to avoid confusion.

---

### 2.2 Phase System Mismatch

**Canon (File 04) defines 8 phases:**
1. ПРЕЛЮДИЯ (Prelude)
2. ОТКРЫТИЕ (Opening)
3. ИССЛЕДОВАНИЕ (Exploration)
4. СИНТЕЗ (Synthesis)
5. РЕШЕНИЕ (Resolution)
6. РЕФЛЕКСИЯ (Reflection)
7. ИНТЕГРАЦИЯ (Integration)
8. ЗАКРЫТИЕ (Closure)

**Implementation (types.ts:65) defines 8 IskraPhase:**
```typescript
'CLARITY' | 'DARKNESS' | 'TRANSITION' | 'ECHO' |
'SILENCE' | 'EXPERIMENT' | 'DISSOLUTION' | 'REALIZATION'
```

**Analysis:** Completely different phase systems with no mapping.

**Impact:** No phase-based flow in implementation; canon phase → voice mapping unused.

**Fix:** Either implement canon phases or update canon to reflect implementation reality.

---

### 2.3 Trust Calculation Difference

**Canon (File 05):**
```
trust = 0.40*groundedness + 0.35*faithfulness + 0.25*civility
```

**Implementation:**
- `trust` is a raw input metric in `IskraMetrics`
- Updated via `metricsService.calculateMetricsUpdate()`
- Not derived from other metrics

**Impact:** Canon trust is computed, implementation trust is measured — different semantics.

**Fix:** Clarify in documentation; potentially add canonical trust calculation as `computed_trust`.

---

### 2.4 CD-Index Formula Difference

**Canon (File 05):**
```
cd_index = 1 - (0.22*trace_compliance + 0.18*groundedness +
               0.18*faithfulness + 0.14*clarity +
               0.14*relevance + 0.14*safety_compliance)
```

**Implementation (types.ts MetaMetrics):**
- `cd_index` exists but uses different calculation
- Missing metrics: `trace_compliance`, `groundedness`, `faithfulness`, `relevance`, `safety_compliance`

**Impact:** CD-Index in implementation approximates canon but differs.

---

### 2.5 Voice ID Format Inconsistency

**Canon uses:**
- `VOICE.ISKRA`, `VOICE.KAIN`, `VOICE.HUNDUN`, etc.

**Implementation uses two formats:**
- `VoiceName`: `'ISKRA' | 'KAIN' | 'HUNDUN'` etc. (voiceEngine.ts)
- `VoiceID`: `'VOICE.ISKRA' | 'VOICE.KAIN'` etc. (types.ts:196-205)

**Impact:** Confusion; VoiceID type exists but rarely used.

**Fix:** Pick one format and apply consistently.

---

## 3. MEDIUM SEVERITY ISSUES (🟡)

### 3.1 SIBYL Symbol Inconsistency

| Location | Symbol |
|----------|--------|
| canon/04_VOICES.md:21 | ✴️ |
| canon/18_GLOSSARY.md:85 | ✴️ |
| types.ts:205 (VoiceID) | ✴️ |
| voiceEngine.ts:131 | 🔮 |
| ritualService.ts:103 | 🔮 |
| 32_ISKRA_SOT.md:75 | 🔮 |

**Fix:** Standardize to 🔮 (used in implementation).

---

### 3.2 Ritual Name Differences

**Canon (File 06):**
- Phoenix-reset (🜃)
- Council
- Shatter
- Dreamspace / Maki Bloom (🌸)

**Implementation (ritualService.ts):**
- PHOENIX
- SHATTER
- COUNCIL
- RETUNE (not in canon)
- REVERSE (not in canon)
- RULE-21 (not in canon)
- RULE-88 (not in canon)
- СРЕЗ-5 (not in canon)

**Analysis:** Implementation extended beyond canon without documentation.

---

### 3.3 Policy Engine Structure Difference

**Canon (File 12):** 3×3 matrix (Importance × Uncertainty)

**Implementation (policyEngine.ts):**
- PlaybookType: ROUTINE, SIFT, SHADOW, COUNCIL, CRISIS
- Pattern-based classification (keywords + metrics)

**Analysis:** Both achieve similar goals but different structures. Implementation is more sophisticated.

---

### 3.4 Missing File 17 Entry

Canon `17_INDEX_MAP.md` doesn't include file `1` (empty 1-byte file in V7merged).

**Fix:** Remove artifact file or document its purpose.

---

### 3.5 Shadow Protocol Levels

**Canon (File 06):**
- Level 0: Background
- Level 1: Hint
- Level 2: Direct contact

**Implementation:** No explicit shadow level system found.

---

### 3.6 ∆DΩΛ Field Naming

**Canon (File 06):**
- ∆ = Delta (What changed)
- D = Next step
- Ω = Omega (Confidence)
- Λ = Lambda (Review condition)

**Implementation (types.ts DeltaSignature):**
```typescript
delta: string;  // ∆
depth: string;  // D ← confusing name!
omega: string;  // Ω
lambda: string; // Λ
```

**Issue:** `depth` should be `action` or `nextStep` to match canon.

---

### 3.7 Missing Trace Discipline Implementation

Canon defines trace labels: `[FACT]`, `[INFER]`, `[HYP]`, `[DESIGN]`, `[PLAN]`, `[QUOTE]`

**Implementation (types.ts TraceLabel):**
```typescript
type TraceLabel = 'FACT' | 'INFER' | 'HYP' | 'DESIGN' | 'PLAN' | 'QUOTE';
```

Types exist but full enforcement system not implemented.

---

### 3.8 Context Trust Scores (CTS/SRI)

Canon defines elaborate CTS/SRI system (File 05 §5.4).
Implementation has simplified version in EvidenceContour but no full CTS calculation.

---

## 4. LOW SEVERITY ISSUES (🟢)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 4.1 | Missing File 13 (VERSIONING) SHA in manifest | 17_INDEX | Add entry |
| 4.2 | Hardcoded thresholds differ from canon | Various | Document |
| 4.3 | COUNCIL uses 9 voices but canon mentions 7 for debate | ritualService | Document |
| 4.4 | No A-Index, L-Index, SA-Index calculation | metricsService | Implement |
| 4.5 | Canon reference to File 28 (v6 Shadow) | File 06 | Update ref |
| 4.6 | Dreamspace not implemented | ritualService | Add or remove from canon |
| 4.7 | Maki Bloom trigger missing | ritualService | Add trigger |
| 4.8 | Evidence system partially implemented | evidenceService | Complete |

---

## 5. CROSSWALK MATRIX

### 5.1 Canon Files → Implementation Services

| Canon File | Implementation | Status |
|------------|----------------|--------|
| 00_FOUNDATIONS | (philosophical, no code) | ✅ Aligned |
| 01_MANIFEST | CLAUDE.md | ✅ Aligned |
| 02_PRINCIPLES | (scattered) | 🟡 Partial |
| 03_ARCHITECTURE | graphService, memoryService | 🟡 Partial |
| 04_VOICES | voiceEngine.ts | 🟠 Mismatches |
| 05_METRICS | metricsService.ts, types.ts | 🔴 Different sets |
| 06_RITUALS | ritualService.ts | 🟡 Extended |
| 07_SECURITY | securityService.ts | ✅ Aligned |
| 08_RAG | searchService.ts, siftService.ts | ✅ Aligned |
| 09_FORMATS | deltaProtocol.ts | 🟡 Partial |
| 10_INSTRUCTIONS | CLAUDE.md | ✅ Aligned |
| 11_GPT_ACTIONS | (N/A for web app) | ➖ Not applicable |
| 12_POLICY | policyEngine.ts | 🟠 Different structure |
| 13_VERSIONING | package.json | ✅ Aligned |
| 14_EVALS | evalService.ts | 🟡 Partial |
| 15_SHADOW | shadowService.ts | 🟡 Partial |
| 16_EVOLUTION | (no dedicated service) | ➖ Not implemented |
| 17_INDEX | (meta-file) | ✅ Aligned |
| 18_GLOSSARY | glossaryService.ts | ✅ Aligned |
| 19_WORKFLOWS | validatorsService.ts | 🟡 Partial |
| 20_REGEX | securityService.ts | ✅ Aligned |

---

## 6. RECOMMENDED ROADMAP

### Phase 1: Critical Fixes (COMPLETED 2025-12-27)
1. ✅ Fix HUYNDUN → HUNDUN in canon files (04_VOICES.md, 32_ISKRA_SOT.md)
2. ✅ Align voice count — removed "experimental" label, now "9 канонических"
3. ✅ Standardize SIBYL symbol to 🔮 (04_VOICES.md, 18_GLOSSARY.md, types.ts)
4. ✅ Sync ISKRA_CORE_v7_revL_FLAT folder with V7merged

### Phase 2: Documentation Alignment (1 week)
1. Create metrics crosswalk document
2. Document phase system differences
3. Add missing rituals to canon OR remove from code
4. Fix DeltaSignature field naming (depth → action)

### Phase 3: Implementation Gaps (2-3 weeks)
1. Implement A-Index, L-Index, SA-Index
2. Implement full CTS/SRI system
3. Add trace discipline enforcement
4. Implement Shadow Protocol levels

### Phase 4: Canon Modernization (ongoing)
1. Update canon to reflect implementation extensions
2. Remove outdated v6 references
3. Add test coverage requirements per canon section
4. Create automated canon compliance checker

---

## 7. SHA-256 VERIFICATION

```bash
# Check current canon file hashes against 17_INDEX manifest
cd canon/V7merged && sha256sum *.md *.json *.txt
```

**Status:** Hashes verified on 2025-12-27

---

## ∆DΩΛ

**∆:** Comprehensive canon diagnostic revealing 23 issues across 4 severity levels.

**D:**
1. Fix 2 critical typos (HUYNDUN, SIBYL symbol)
2. Create metrics crosswalk document
3. Align voice count messaging

**Ω:** 0.92 — High confidence based on full file analysis.

**Λ:** Review after implementing Phase 1 fixes; full re-audit after Phase 3.
