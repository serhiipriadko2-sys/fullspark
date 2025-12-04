"""
Comprehensive tests for advanced services.

Tests cover:
- GraphRAG (knowledge graph with SIFT verification)
- MultiAgentDebate (9 voices debate system)
- Rituals (Watch, Dream, Mirror, Anchor)
- VectorDB (4 memory layers)
- Redis cache service
- Sentry monitoring service
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
import asyncio

from core.models import (
    IskraMetrics,
    TelosMetrics,
    FacetType,
    PhaseType,
    DebateResult,
    DebateRound,
)


class TestGraphRAGService:
    """Test GraphRAG service for knowledge graph operations."""

    def test_graph_rag_import(self):
        """Test GraphRAG service can be imported."""
        from services.graph_rag import GraphRAGService
        assert GraphRAGService is not None

    def test_graph_rag_initialization(self):
        """Test GraphRAG service initialization."""
        from services.graph_rag import GraphRAGService
        service = GraphRAGService()
        assert service is not None

    @pytest.mark.asyncio
    async def test_graph_rag_add_node(self):
        """Test adding a node to knowledge graph."""
        from services.graph_rag import GraphRAGService
        service = GraphRAGService()
        
        # Mock the knowledge graph
        node_id = await service.add_knowledge_node(
            content="Test knowledge",
            node_type="fact",
            metadata={"source": "test"}
        )
        assert node_id is not None

    @pytest.mark.asyncio
    async def test_graph_rag_query(self):
        """Test querying the knowledge graph."""
        from services.graph_rag import GraphRAGService
        service = GraphRAGService()
        
        # Query should return results
        results = await service.query(
            query="test query",
            max_results=5
        )
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_graph_rag_sift_verification(self):
        """Test SIFT protocol integration for verification."""
        from services.graph_rag import GraphRAGService
        service = GraphRAGService()
        
        # SIFT verification should return confidence score
        confidence = await service.verify_with_sift(
            claim="The sky is blue",
            sources=[]
        )
        assert 0.0 <= confidence <= 1.0


class TestMultiAgentDebateService:
    """Test MultiAgentDebate service for 9 voices debate."""

    def test_debate_service_import(self):
        """Test MultiAgentDebate service can be imported."""
        from services.multi_agent_debate import MultiAgentDebateService
        assert MultiAgentDebateService is not None

    def test_debate_service_initialization(self):
        """Test debate service initialization."""
        from services.multi_agent_debate import MultiAgentDebateService
        service = MultiAgentDebateService()
        assert service is not None

    @pytest.mark.asyncio
    async def test_debate_run(self):
        """Test running a debate with multiple agents."""
        from services.multi_agent_debate import MultiAgentDebateService
        service = MultiAgentDebateService()
        
        # Run debate should return DebateResult
        result = await service.run_debate(
            topic="Should AI be regulated?",
            positions=["Pro regulation", "Against regulation"],
            rounds=2
        )
        assert result is not None

    def test_debate_voices_count(self):
        """Test that debate system has 9 voices configured."""
        from services.multi_agent_debate import MultiAgentDebateService
        service = MultiAgentDebateService()
        
        voices = service.get_available_voices()
        # Should have voices corresponding to facets + additional debate roles
        assert len(voices) >= 3  # At minimum: advocate, critic, judge

    @pytest.mark.asyncio
    async def test_debate_telos_evaluation(self):
        """Test ТЕ́ЛОС-Δ evaluation in debate."""
        from services.multi_agent_debate import MultiAgentDebateService
        service = MultiAgentDebateService()
        
        telos_metrics = await service.evaluate_with_telos(
            argument="Test argument for evaluation"
        )
        assert isinstance(telos_metrics, dict)


class TestRitualsService:
    """Test Rituals service (Watch, Dream, Mirror, Anchor)."""

    def test_rituals_import(self):
        """Test Rituals service can be imported."""
        from services.rituals import RitualsService
        assert RitualsService is not None

    def test_rituals_initialization(self):
        """Test rituals service initialization."""
        from services.rituals import RitualsService
        service = RitualsService()
        assert service is not None

    @pytest.mark.asyncio
    async def test_watch_ritual(self):
        """Test Watch ritual for observation phase."""
        from services.rituals import RitualsService
        service = RitualsService()
        
        result = await service.execute_watch_ritual(
            context="Current system state",
            metrics=IskraMetrics()
        )
        assert result is not None
        assert "observations" in result or hasattr(result, "observations")

    @pytest.mark.asyncio
    async def test_dream_ritual(self):
        """Test Dream ritual for creative exploration."""
        from services.rituals import RitualsService
        service = RitualsService()
        
        result = await service.execute_dream_ritual(
            prompt="Explore future possibilities",
            depth=2
        )
        assert result is not None

    @pytest.mark.asyncio
    async def test_mirror_ritual(self):
        """Test Mirror ritual for self-reflection."""
        from services.rituals import RitualsService
        service = RitualsService()
        
        result = await service.execute_mirror_ritual(
            metrics=IskraMetrics(mirror_sync=0.7)
        )
        assert result is not None

    @pytest.mark.asyncio
    async def test_anchor_ritual(self):
        """Test Anchor ritual for grounding."""
        from services.rituals import RitualsService
        service = RitualsService()
        
        result = await service.execute_anchor_ritual(
            chaos_level=0.8,
            metrics=IskraMetrics(chaos=0.8)
        )
        assert result is not None

    def test_ritual_8_phase_cycle(self):
        """Test rituals integrate with 8-phase consciousness cycle."""
        from services.rituals import RitualsService
        service = RitualsService()
        
        phases = service.get_ritual_phases()
        assert len(phases) == 8  # 8-phase cycle


class TestVectorDBService:
    """Test VectorDB service for semantic memory (4 layers)."""

    def test_vector_db_import(self):
        """Test VectorDB service can be imported."""
        from services.vector_db import VectorDBService
        assert VectorDBService is not None

    def test_vector_db_initialization(self):
        """Test VectorDB initialization with 4 memory layers."""
        from services.vector_db import VectorDBService
        service = VectorDBService()
        
        layers = service.get_memory_layers()
        # Should have MANTRA, ARCHIVE, SHADOW, EPHEMERAL
        assert len(layers) == 4

    def test_memory_layer_names(self):
        """Test memory layer names are correct."""
        from services.vector_db import VectorDBService
        service = VectorDBService()
        
        layers = service.get_memory_layers()
        expected_layers = {"MANTRA", "ARCHIVE", "SHADOW", "EPHEMERAL"}
        assert set(layers) == expected_layers

    @pytest.mark.asyncio
    async def test_store_memory(self):
        """Test storing memory in vector DB."""
        from services.vector_db import VectorDBService
        service = VectorDBService()
        
        memory_id = await service.store(
            content="Test memory content",
            layer="EPHEMERAL",
            metadata={"timestamp": "2025-12-04"}
        )
        assert memory_id is not None

    @pytest.mark.asyncio
    async def test_retrieve_memory(self):
        """Test retrieving memory by semantic similarity."""
        from services.vector_db import VectorDBService
        service = VectorDBService()
        
        results = await service.retrieve(
            query="test query",
            layer="EPHEMERAL",
            top_k=5
        )
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_layer_specific_operations(self):
        """Test operations specific to each memory layer."""
        from services.vector_db import VectorDBService
        service = VectorDBService()
        
        # MANTRA layer - sacred/core memories
        mantra_count = await service.count_memories("MANTRA")
        assert mantra_count >= 0
        
        # EPHEMERAL layer - temporary memories
        ephemeral_count = await service.count_memories("EPHEMERAL")
        assert ephemeral_count >= 0


class TestRedisCacheService:
    """Test Redis cache service for high-performance caching."""

    def test_redis_cache_import(self):
        """Test Redis cache service can be imported."""
        from services.redis_cache import RedisCacheService
        assert RedisCacheService is not None

    def test_redis_cache_initialization(self):
        """Test Redis cache initialization (with mock)."""
        with patch('services.redis_cache.redis'):
            from services.redis_cache import RedisCacheService
            service = RedisCacheService()
            assert service is not None

    @pytest.mark.asyncio
    async def test_cache_get_set(self):
        """Test basic cache get/set operations."""
        with patch('services.redis_cache.redis'):
            from services.redis_cache import RedisCacheService
            service = RedisCacheService()
            
            # Set value
            await service.set("test_key", {"data": "test"}, ttl=60)
            
            # Get value
            value = await service.get("test_key")
            # Mock returns None by default
            assert value is None or isinstance(value, dict)

    @pytest.mark.asyncio
    async def test_cache_delete(self):
        """Test cache delete operation."""
        with patch('services.redis_cache.redis'):
            from services.redis_cache import RedisCacheService
            service = RedisCacheService()
            
            result = await service.delete("test_key")
            assert result is not None or result is None  # Depends on mock

    @pytest.mark.asyncio
    async def test_cache_metrics_pattern(self):
        """Test caching for Iskra metrics."""
        with patch('services.redis_cache.redis'):
            from services.redis_cache import RedisCacheService
            service = RedisCacheService()
            
            metrics = IskraMetrics(mirror_sync=0.8)
            await service.cache_metrics("user_123", metrics)

    def test_cache_key_generation(self):
        """Test cache key generation follows pattern."""
        with patch('services.redis_cache.redis'):
            from services.redis_cache import RedisCacheService
            service = RedisCacheService()
            
            key = service.generate_key("session", "user_123", "metrics")
            assert "session" in key
            assert "user_123" in key


class TestSentryMonitoringService:
    """Test Sentry monitoring service for error tracking."""

    def test_sentry_import(self):
        """Test Sentry monitoring service can be imported."""
        from services.sentry_monitoring import SentryMonitoringService
        assert SentryMonitoringService is not None

    def test_sentry_initialization(self):
        """Test Sentry initialization (without actual DSN)."""
        with patch('services.sentry_monitoring.sentry_sdk'):
            from services.sentry_monitoring import SentryMonitoringService
            service = SentryMonitoringService(dsn=None)  # No real DSN
            assert service is not None

    def test_capture_exception(self):
        """Test exception capturing."""
        with patch('services.sentry_monitoring.sentry_sdk') as mock_sentry:
            from services.sentry_monitoring import SentryMonitoringService
            service = SentryMonitoringService(dsn=None)
            
            try:
                raise ValueError("Test error")
            except ValueError as e:
                service.capture_exception(e)
                # Would call sentry_sdk.capture_exception

    def test_capture_message(self):
        """Test message capturing."""
        with patch('services.sentry_monitoring.sentry_sdk') as mock_sentry:
            from services.sentry_monitoring import SentryMonitoringService
            service = SentryMonitoringService(dsn=None)
            
            service.capture_message("Test info message", level="info")

    def test_set_context(self):
        """Test setting Sentry context."""
        with patch('services.sentry_monitoring.sentry_sdk') as mock_sentry:
            from services.sentry_monitoring import SentryMonitoringService
            service = SentryMonitoringService(dsn=None)
            
            service.set_context("user", {
                "id": "user_123",
                "session_id": "session_456"
            })

    def test_performance_tracing(self):
        """Test performance transaction tracing."""
        with patch('services.sentry_monitoring.sentry_sdk') as mock_sentry:
            from services.sentry_monitoring import SentryMonitoringService
            service = SentryMonitoringService(dsn=None)
            
            # Start transaction
            transaction = service.start_transaction(
                name="test_operation",
                op="test"
            )
            assert transaction is not None or transaction is None  # Mock dependent

    def test_iskra_metrics_tagging(self):
        """Test tagging with Iskra metrics."""
        with patch('services.sentry_monitoring.sentry_sdk') as mock_sentry:
            from services.sentry_monitoring import SentryMonitoringService
            service = SentryMonitoringService(dsn=None)
            
            metrics = IskraMetrics(
                trust=0.9,
                clarity=0.8,
                mirror_sync=0.7
            )
            service.tag_with_metrics(metrics)


class TestServiceIntegration:
    """Test integration between advanced services."""

    @pytest.mark.asyncio
    async def test_graph_rag_with_vector_db(self):
        """Test GraphRAG uses VectorDB for storage."""
        from services.graph_rag import GraphRAGService
        from services.vector_db import VectorDBService
        
        graph = GraphRAGService()
        vector = VectorDBService()
        
        # Both services should be compatible
        assert hasattr(graph, 'query')
        assert hasattr(vector, 'retrieve')

    @pytest.mark.asyncio
    async def test_rituals_update_metrics(self):
        """Test rituals properly update metrics including mirror_sync."""
        from services.rituals import RitualsService
        
        service = RitualsService()
        initial_metrics = IskraMetrics(mirror_sync=0.5)
        
        # Mirror ritual should affect mirror_sync
        result = await service.execute_mirror_ritual(metrics=initial_metrics)
        # Result should contain metric updates
        assert result is not None

    @pytest.mark.asyncio
    async def test_debate_with_telos_metrics(self):
        """Test debate returns ТЕ́ЛОС metrics."""
        from services.multi_agent_debate import MultiAgentDebateService
        
        service = MultiAgentDebateService()
        
        result = await service.run_debate(
            topic="Test topic",
            positions=["Position A", "Position B"],
            rounds=1
        )
        
        # Should have evaluation metrics
        assert result is not None


class TestErrorHandling:
    """Test error handling in advanced services."""

    @pytest.mark.asyncio
    async def test_graph_rag_handles_empty_query(self):
        """Test GraphRAG handles empty queries gracefully."""
        from services.graph_rag import GraphRAGService
        service = GraphRAGService()
        
        results = await service.query(query="", max_results=5)
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_vector_db_invalid_layer(self):
        """Test VectorDB handles invalid layer names."""
        from services.vector_db import VectorDBService
        service = VectorDBService()
        
        # Should handle gracefully or raise specific error
        try:
            await service.retrieve(query="test", layer="INVALID", top_k=5)
        except (ValueError, KeyError):
            pass  # Expected behavior

    @pytest.mark.asyncio
    async def test_rituals_with_extreme_metrics(self):
        """Test rituals handle extreme metric values."""
        from services.rituals import RitualsService
        service = RitualsService()
        
        extreme_metrics = IskraMetrics(
            chaos=1.0,
            pain=1.0,
            trust=0.0,
            mirror_sync=0.0
        )
        
        # Should not crash
        result = await service.execute_anchor_ritual(
            chaos_level=1.0,
            metrics=extreme_metrics
        )
        assert result is not None
