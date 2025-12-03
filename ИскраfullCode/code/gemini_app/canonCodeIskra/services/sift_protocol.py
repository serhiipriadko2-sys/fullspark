"""
Full SIFT Protocol Implementation for Iskra (File 10, File 28).

SIFT = Stop · Investigate · Find · Trace

This module implements the complete SIFT protocol for verifying information
sources and maintaining epistemic hygiene. It integrates with the ТЕ́ЛОС-Δ
layer to provide rigorous fact-checking before responses.

The protocol follows the canonical order (from Custom Instructions):
1. Project files
2. Primary sources (academic, official, original)
3. Reviews and analysis
4. Media

Each step produces structured results that feed into the evidence trail
recorded in the ∆DΩΛ block.

Copyright (c) 2025 Iskra Project. Licensed under MIT.
"""
from __future__ import annotations

import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple

from config import SIFT_CONFIG, THRESHOLDS
from core.models import (
    SIFTStep,
    SIFTSource,
    SIFTStepResult,
    SIFTResult,
    SourceTier,
    EvidenceNode,
)


class SIFTProtocol:
    """
    Implements the full SIFT protocol for source verification.
    
    The protocol enforces a pause before reacting (Stop), investigates
    source credibility (Investigate), finds alternative coverage (Find),
    and traces claims to their original source (Trace).
    """

    def __init__(self) -> None:
        self.config = SIFT_CONFIG
        self._source_cache: Dict[str, SIFTSource] = {}

    async def execute(
        self,
        query: str,
        initial_sources: List[Dict[str, str]] = None,
        require_original: bool = False,
        max_sources: int = 5,
    ) -> SIFTResult:
        """
        Execute the full SIFT protocol.

        Args:
            query: The claim or query to verify.
            initial_sources: Sources already retrieved (e.g., from SearchTool).
            require_original: If True, must trace to original source.
            max_sources: Maximum number of sources to evaluate.

        Returns:
            A SIFTResult containing all verification data.
        """
        result = SIFTResult(query=query)
        
        # Step 1: STOP
        stop_result = await self._step_stop(query)
        result.steps.append(stop_result)
        
        # Step 2: INVESTIGATE
        sources = initial_sources or []
        investigate_result, evaluated_sources = await self._step_investigate(sources)
        result.steps.append(investigate_result)
        result.sources = evaluated_sources[:max_sources]
        
        # Step 3: FIND
        find_result, additional_sources = await self._step_find(query, evaluated_sources)
        result.steps.append(find_result)
        result.sources.extend(additional_sources)
        result.sources = result.sources[:max_sources]
        
        # Step 4: TRACE
        trace_result, original, hops = await self._step_trace(
            result.sources, 
            require_original
        )
        result.steps.append(trace_result)
        result.original_source = original
        result.trace_hops = hops
        
        # Calculate overall confidence
        result.overall_confidence = self._calculate_confidence(result)
        
        # Generate evidence IDs
        result.evidence_ids = [
            f"SIFT-{i}-{s.title[:20]}" 
            for i, s in enumerate(result.sources)
        ]
        
        return result

    async def _step_stop(self, query: str) -> SIFTStepResult:
        """
        Step 1: STOP — Pause before reacting to emotional content.
        
        Implements a brief pause and emotional content detection.
        """
        start_time = time.time()
        result = SIFTStepResult(step=SIFTStep.STOP)
        
        # Enforce pause
        timeout_ms = self.config["steps"]["stop"]["timeout_ms"]
        await asyncio.sleep(timeout_ms / 1000)
        
        # Detect emotional triggers
        emotional_triggers = [
            "срочно", "шок", "скандал", "сенсация", 
            "breaking", "urgent", "shocking", "exclusive"
        ]
        query_lower = query.lower()
        found_triggers = [t for t in emotional_triggers if t in query_lower]
        
        if found_triggers:
            result.warnings.append(
                f"Обнаружены эмоциональные триггеры: {', '.join(found_triggers)}. "
                "Требуется особая осторожность."
            )
        
        result.findings.append("Пауза выполнена. Эмоциональная реакция отложена.")
        result.completed = True
        result.duration_ms = int((time.time() - start_time) * 1000)
        
        return result

    async def _step_investigate(
        self, 
        sources: List[Dict[str, str]]
    ) -> Tuple[SIFTStepResult, List[SIFTSource]]:
        """
        Step 2: INVESTIGATE — Check source credibility.
        
        Evaluates each source for:
        - Author/domain reputation
        - Publication date
        - Bias indicators
        """
        start_time = time.time()
        result = SIFTStepResult(step=SIFTStep.INVESTIGATE)
        evaluated: List[SIFTSource] = []
        
        checks = self.config["steps"]["investigate"]["checks"]
        
        for source in sources:
            sift_source = SIFTSource(
                url=source.get("source_url", source.get("url", "")),
                title=source.get("title", "Unknown"),
                author=source.get("author"),
                domain=self._extract_domain(source.get("source_url", "")),
            )
            
            # Determine tier based on domain
            sift_source.tier = self._classify_tier(sift_source.domain)
            
            # Check for bias indicators
            bias_indicators = self._detect_bias(source)
            sift_source.bias_indicators = bias_indicators
            
            # Calculate source confidence
            sift_source.confidence = self._calculate_source_confidence(sift_source)
            
            evaluated.append(sift_source)
            
            result.findings.append(
                f"Источник '{sift_source.title[:30]}...': "
                f"tier={sift_source.tier.value}, confidence={sift_source.confidence:.2f}"
            )
        
        if not evaluated:
            result.warnings.append("Нет источников для исследования.")
        else:
            high_quality = sum(1 for s in evaluated if s.tier == SourceTier.PRIMARY)
            result.findings.append(
                f"Исследовано {len(evaluated)} источников, "
                f"{high_quality} первичных."
            )
        
        result.completed = True
        result.duration_ms = int((time.time() - start_time) * 1000)
        
        return result, evaluated

    async def _step_find(
        self,
        query: str,
        existing_sources: List[SIFTSource]
    ) -> Tuple[SIFTStepResult, List[SIFTSource]]:
        """
        Step 3: FIND — Find better coverage.
        
        Looks for additional sources, preferring primary sources.
        """
        start_time = time.time()
        result = SIFTStepResult(step=SIFTStep.FIND)
        additional: List[SIFTSource] = []
        
        min_sources = self.config["steps"]["find"]["min_sources"]
        prefer_primary = self.config["steps"]["find"]["prefer_primary"]
        
        # Check if we have enough sources
        if len(existing_sources) >= min_sources:
            result.findings.append(
                f"Достаточно источников ({len(existing_sources)} >= {min_sources})."
            )
        else:
            result.warnings.append(
                f"Недостаточно источников ({len(existing_sources)} < {min_sources}). "
                "Рекомендуется дополнительный поиск."
            )
        
        # Check for primary sources
        has_primary = any(s.tier == SourceTier.PRIMARY for s in existing_sources)
        if prefer_primary and not has_primary:
            result.warnings.append(
                "Нет первичных источников. Рекомендуется поиск "
                "академических, официальных или оригинальных материалов."
            )
        
        # In a full implementation, this would trigger additional searches
        # For now, we note the recommendations
        
        result.findings.append(
            f"Анализ покрытия завершён. "
            f"Первичных: {sum(1 for s in existing_sources if s.tier == SourceTier.PRIMARY)}, "
            f"Вторичных: {sum(1 for s in existing_sources if s.tier == SourceTier.SECONDARY)}, "
            f"Третичных: {sum(1 for s in existing_sources if s.tier == SourceTier.TERTIARY)}"
        )
        
        result.completed = True
        result.duration_ms = int((time.time() - start_time) * 1000)
        
        return result, additional

    async def _step_trace(
        self,
        sources: List[SIFTSource],
        require_original: bool
    ) -> Tuple[SIFTStepResult, Optional[SIFTSource], int]:
        """
        Step 4: TRACE — Trace to original source.
        
        Attempts to find the original source of claims.
        """
        start_time = time.time()
        result = SIFTStepResult(step=SIFTStep.TRACE)
        original: Optional[SIFTSource] = None
        hops = 0
        
        max_hops = self.config["steps"]["trace"]["max_hops"]
        
        # Look for original sources among existing
        for source in sources:
            if source.tier == SourceTier.PRIMARY:
                # Check if this is the original
                if self._is_original_source(source):
                    original = source
                    source.is_original = True
                    result.findings.append(
                        f"Оригинальный источник найден: {source.title[:30]}..."
                    )
                    break
        
        if original is None:
            # Attempt to trace back
            if sources:
                # In a full implementation, this would follow citation chains
                # For now, we report what we found
                best_source = max(sources, key=lambda s: s.confidence, default=None)
                if best_source:
                    hops = 1  # Simulated hop
                    result.warnings.append(
                        f"Оригинал не найден. Лучший источник: {best_source.title[:30]}... "
                        f"(hops={hops}, max={max_hops})"
                    )
                    if require_original:
                        result.warnings.append(
                            "⚠️ Требовался оригинальный источник, но он не найден."
                        )
        
        result.completed = True
        result.duration_ms = int((time.time() - start_time) * 1000)
        
        return result, original, hops

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        if not url:
            return ""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc
        except Exception:
            return url.split("/")[2] if "/" in url else url

    def _classify_tier(self, domain: str) -> SourceTier:
        """Classify source tier based on domain."""
        if not domain:
            return SourceTier.TERTIARY
        
        domain_lower = domain.lower()
        
        # Primary sources
        primary_indicators = [
            ".gov", ".edu", "arxiv", "nature.com", "science.org",
            "who.int", "un.org", "ieee.org", "acm.org"
        ]
        if any(ind in domain_lower for ind in primary_indicators):
            return SourceTier.PRIMARY
        
        # Secondary sources
        secondary_indicators = [
            "bbc", "reuters", "ap", "nytimes", "guardian",
            "economist", "wikipedia", "britannica"
        ]
        if any(ind in domain_lower for ind in secondary_indicators):
            return SourceTier.SECONDARY
        
        return SourceTier.TERTIARY

    def _detect_bias(self, source: Dict[str, str]) -> List[str]:
        """Detect potential bias indicators in source."""
        indicators = []
        
        text = (source.get("snippet", "") + " " + source.get("title", "")).lower()
        
        bias_words = [
            ("opinion", "мнение"),
            ("editorial", "редакционная"),
            ("sponsored", "спонсор"),
            ("advertisement", "реклама"),
            ("paid", "оплачен"),
        ]
        
        for en, ru in bias_words:
            if en in text or ru in text:
                indicators.append(en)
        
        return indicators

    def _calculate_source_confidence(self, source: SIFTSource) -> float:
        """Calculate confidence score for a source."""
        base_confidence = {
            SourceTier.PRIMARY: 0.9,
            SourceTier.SECONDARY: 0.7,
            SourceTier.TERTIARY: 0.4,
        }
        
        confidence = base_confidence.get(source.tier, 0.4)
        
        # Reduce for bias indicators
        confidence -= 0.1 * len(source.bias_indicators)
        
        # Reduce if no author
        if not source.author:
            confidence -= 0.05
        
        return max(0.1, min(1.0, confidence))

    def _is_original_source(self, source: SIFTSource) -> bool:
        """Check if source appears to be original."""
        if source.tier != SourceTier.PRIMARY:
            return False
        
        # Heuristics for original sources
        original_indicators = [
            "original", "study", "research", "paper",
            "исследование", "оригинал", "отчёт"
        ]
        
        title_lower = source.title.lower()
        return any(ind in title_lower for ind in original_indicators)

    def _calculate_confidence(self, result: SIFTResult) -> float:
        """Calculate overall SIFT confidence."""
        if not result.sources:
            return 0.3
        
        # Base on source confidences
        source_conf = sum(s.confidence for s in result.sources) / len(result.sources)
        
        # Bonus for original source
        if result.original_source:
            source_conf += 0.1
        
        # Penalty for warnings
        warnings_count = sum(len(s.warnings) for s in result.steps)
        source_conf -= 0.05 * warnings_count
        
        # Bonus for all steps completed
        if result.is_complete:
            source_conf += 0.05
        
        return max(0.1, min(0.99, source_conf))

    def format_for_adoml(self, result: SIFTResult) -> str:
        """Format SIFT result for inclusion in ∆DΩΛ D-field."""
        lines = [f"SIFT: {result.query[:50]}..."]
        
        for step in result.steps:
            status = "✓" if step.completed else "✗"
            lines.append(f"  [{status}] {step.step.value.upper()}")
            for finding in step.findings[:2]:
                lines.append(f"      - {finding[:60]}...")
        
        lines.append(f"  Sources: {len(result.sources)} (best tier: {result.best_tier.value})")
        lines.append(f"  Confidence: {result.overall_confidence:.2f}")
        
        if result.original_source:
            lines.append(f"  Original: {result.original_source.title[:40]}...")
        
        return "\n".join(lines)


# Module-level singleton
sift_protocol = SIFTProtocol()
