"""
Enhanced GraphRAG with Semantic Search capabilities.

This module extends the base GraphRAG with:
- TF-IDF based semantic similarity
- BM25 ranking for text retrieval
- Multi-hop graph traversal for context
- Semantic clustering of related nodes
- Query expansion using graph relationships
- SIFT-aware search with trust scoring

Canon Reference:
- Rule-21: Честность выше красоты
- Law-47: Fractality = Integrity × Resonance  
- SIFT Protocol: Stop · Investigate · Find · Trace
"""

from __future__ import annotations

import math
import re
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple, Any
from enum import Enum
from datetime import datetime
import uuid

from pydantic import BaseModel, Field

from services.graph_rag import (
    GraphNode, 
    GraphEdge, 
    NodeType, 
    EdgeType,
    GraphRAGService,
)

logger = logging.getLogger(__name__)


class SearchMode(str, Enum):
    """Search mode for semantic queries."""
    EXACT = "exact"           # Exact phrase matching
    SEMANTIC = "semantic"     # TF-IDF/BM25 similarity
    GRAPH = "graph"           # Graph traversal from matches
    HYBRID = "hybrid"         # Combination of all


class RelevanceSignal(str, Enum):
    """Signals used for relevance scoring."""
    TEXT_MATCH = "text_match"
    SEMANTIC_SIM = "semantic_similarity"
    GRAPH_PROXIMITY = "graph_proximity"
    TRUST_SCORE = "trust_score"
    SIFT_DEPTH = "sift_depth"
    RECENCY = "recency"
    EDGE_WEIGHT = "edge_weight"


@dataclass
class SearchResult:
    """Result from semantic search."""
    node: GraphNode
    score: float
    signals: Dict[RelevanceSignal, float] = field(default_factory=dict)
    path_from_query: List[str] = field(default_factory=list)
    highlighted_content: Optional[str] = None
    
    def __lt__(self, other: "SearchResult") -> bool:
        return self.score < other.score


@dataclass
class SearchQuery:
    """Structured search query."""
    text: str
    mode: SearchMode = SearchMode.HYBRID
    node_types: Optional[List[NodeType]] = None
    min_trust: float = 0.0
    min_sift_depth: int = 0
    max_results: int = 10
    include_shadows: bool = False
    expand_with_graph: bool = True
    max_hops: int = 2


class TextProcessor:
    """
    Text processing utilities for semantic search.
    
    Provides tokenization, TF-IDF, and BM25 scoring.
    """
    
    # Russian and English stopwords
    STOPWORDS = {
        # Russian
        "и", "в", "на", "с", "по", "для", "к", "от", "за", "из",
        "это", "что", "как", "так", "но", "а", "или", "же", "ли",
        "бы", "не", "да", "он", "она", "оно", "они", "мы", "вы",
        "я", "ты", "его", "её", "их", "быть", "был", "была", "было",
        # English
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
        "for", "of", "with", "by", "from", "is", "are", "was", "were",
        "be", "been", "being", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "must",
        "it", "this", "that", "these", "those", "i", "you", "he", "she",
    }
    
    # BM25 parameters
    BM25_K1 = 1.5
    BM25_B = 0.75
    
    def __init__(self) -> None:
        self._idf_cache: Dict[str, float] = {}
        self._doc_lengths: Dict[str, int] = {}
        self._avg_doc_length: float = 0.0
        self._total_docs: int = 0
    
    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into lowercase words.
        
        Args:
            text: Input text
            
        Returns:
            List of tokens
        """
        # Simple tokenization: split on non-word characters
        tokens = re.findall(r'\w+', text.lower())
        # Remove stopwords and short tokens
        return [t for t in tokens if t not in self.STOPWORDS and len(t) > 2]
    
    def compute_tf(self, tokens: List[str]) -> Dict[str, float]:
        """
        Compute term frequency for tokens.
        
        Args:
            tokens: List of tokens
            
        Returns:
            Dict mapping terms to frequencies
        """
        tf: Dict[str, float] = defaultdict(float)
        for token in tokens:
            tf[token] += 1
        
        # Normalize by document length
        doc_len = len(tokens)
        if doc_len > 0:
            for term in tf:
                tf[term] /= doc_len
        
        return dict(tf)
    
    def update_idf(self, documents: Dict[str, str]) -> None:
        """
        Update IDF cache with new documents.
        
        Args:
            documents: Dict mapping doc_id to text
        """
        self._total_docs = len(documents)
        if self._total_docs == 0:
            return
        
        # Count document frequency for each term
        doc_freq: Dict[str, int] = defaultdict(int)
        total_length = 0
        
        for doc_id, text in documents.items():
            tokens = self.tokenize(text)
            self._doc_lengths[doc_id] = len(tokens)
            total_length += len(tokens)
            
            unique_tokens = set(tokens)
            for token in unique_tokens:
                doc_freq[token] += 1
        
        self._avg_doc_length = total_length / self._total_docs if self._total_docs > 0 else 0
        
        # Compute IDF
        for term, df in doc_freq.items():
            self._idf_cache[term] = math.log(
                (self._total_docs - df + 0.5) / (df + 0.5) + 1
            )
    
    def bm25_score(
        self,
        query_tokens: List[str],
        doc_tokens: List[str],
        doc_id: str,
    ) -> float:
        """
        Compute BM25 score for query against document.
        
        Args:
            query_tokens: Tokenized query
            doc_tokens: Tokenized document
            doc_id: Document identifier
            
        Returns:
            BM25 score
        """
        score = 0.0
        doc_len = self._doc_lengths.get(doc_id, len(doc_tokens))
        avg_len = self._avg_doc_length or len(doc_tokens)
        
        # Count term frequencies in document
        doc_tf: Dict[str, int] = defaultdict(int)
        for token in doc_tokens:
            doc_tf[token] += 1
        
        for term in query_tokens:
            if term not in doc_tf:
                continue
            
            tf = doc_tf[term]
            idf = self._idf_cache.get(term, 0.0)
            
            # BM25 formula
            numerator = tf * (self.BM25_K1 + 1)
            denominator = tf + self.BM25_K1 * (
                1 - self.BM25_B + self.BM25_B * (doc_len / avg_len)
            )
            
            score += idf * (numerator / denominator)
        
        return score
    
    def tfidf_similarity(
        self,
        query_tokens: List[str],
        doc_tokens: List[str],
    ) -> float:
        """
        Compute TF-IDF cosine similarity.
        
        Args:
            query_tokens: Tokenized query
            doc_tokens: Tokenized document
            
        Returns:
            Cosine similarity score
        """
        query_tf = self.compute_tf(query_tokens)
        doc_tf = self.compute_tf(doc_tokens)
        
        # Build TF-IDF vectors
        all_terms = set(query_tf.keys()) | set(doc_tf.keys())
        
        query_vec = []
        doc_vec = []
        
        for term in all_terms:
            idf = self._idf_cache.get(term, 1.0)
            query_vec.append(query_tf.get(term, 0.0) * idf)
            doc_vec.append(doc_tf.get(term, 0.0) * idf)
        
        # Cosine similarity
        dot_product = sum(q * d for q, d in zip(query_vec, doc_vec))
        query_norm = math.sqrt(sum(q * q for q in query_vec))
        doc_norm = math.sqrt(sum(d * d for d in doc_vec))
        
        if query_norm == 0 or doc_norm == 0:
            return 0.0
        
        return dot_product / (query_norm * doc_norm)


class SemanticGraphRAG(GraphRAGService):
    """
    Enhanced GraphRAG with semantic search capabilities.
    
    Extends base GraphRAG with:
    - Semantic similarity search
    - Multi-hop graph traversal
    - Query expansion
    - SIFT-aware ranking
    """
    
    def __init__(self) -> None:
        super().__init__()
        self.text_processor = TextProcessor()
        self._last_index_update: float = 0.0
    
    def _update_index(self) -> None:
        """
        Update the text search index.
        
        Should be called when nodes are added/modified.
        """
        documents = {
            node_id: node.content
            for node_id, node in self.nodes.items()
        }
        self.text_processor.update_idf(documents)
        self._last_index_update = datetime.utcnow().timestamp()
    
    def add_node(self, node: GraphNode) -> str:
        """
        Add node and update index.
        
        Args:
            node: Node to add
            
        Returns:
            Node ID
        """
        result = super().add_node(node)
        # Trigger index update (could be batched for performance)
        self._update_index()
        return result
    
    def search(
        self,
        query: SearchQuery,
    ) -> List[SearchResult]:
        """
        Perform semantic search on the knowledge graph.
        
        Args:
            query: Structured search query
            
        Returns:
            List of search results sorted by relevance
        """
        results: List[SearchResult] = []
        
        # Tokenize query
        query_tokens = self.text_processor.tokenize(query.text)
        if not query_tokens:
            return results
        
        # Filter candidate nodes
        candidates = self._filter_candidates(query)
        
        # Score each candidate
        for node_id, node in candidates.items():
            signals = self._compute_relevance_signals(
                query, query_tokens, node_id, node
            )
            
            # Combine signals into final score
            score = self._combine_signals(signals, query.mode)
            
            if score > 0:
                result = SearchResult(
                    node=node,
                    score=score,
                    signals=signals,
                    highlighted_content=self._highlight_matches(
                        node.content, query_tokens
                    ),
                )
                results.append(result)
        
        # Sort by score descending
        results.sort(reverse=True)
        
        # Expand with graph if requested
        if query.expand_with_graph and query.mode in (SearchMode.GRAPH, SearchMode.HYBRID):
            results = self._expand_with_graph(results, query)
        
        return results[:query.max_results]
    
    def _filter_candidates(
        self,
        query: SearchQuery,
    ) -> Dict[str, GraphNode]:
        """
        Filter nodes based on query constraints.
        
        Args:
            query: Search query with filters
            
        Returns:
            Dict of candidate nodes
        """
        candidates = {}
        
        for node_id, node in self.nodes.items():
            # Filter by node type
            if query.node_types and node.node_type not in query.node_types:
                continue
            
            # Filter by trust score
            if node.trust_score < query.min_trust:
                continue
            
            # Filter by SIFT depth
            if node.sift_depth < query.min_sift_depth:
                continue
            
            # Filter shadows
            if node.node_type == NodeType.SHADOW and not query.include_shadows:
                continue
            
            candidates[node_id] = node
        
        return candidates
    
    def _compute_relevance_signals(
        self,
        query: SearchQuery,
        query_tokens: List[str],
        node_id: str,
        node: GraphNode,
    ) -> Dict[RelevanceSignal, float]:
        """
        Compute all relevance signals for a node.
        
        Args:
            query: Search query
            query_tokens: Tokenized query
            node_id: Node identifier
            node: Graph node
            
        Returns:
            Dict of signal scores
        """
        signals: Dict[RelevanceSignal, float] = {}
        
        doc_tokens = self.text_processor.tokenize(node.content)
        
        # Exact text match
        if query.text.lower() in node.content.lower():
            signals[RelevanceSignal.TEXT_MATCH] = 1.0
        else:
            # Partial match based on token overlap
            overlap = len(set(query_tokens) & set(doc_tokens))
            signals[RelevanceSignal.TEXT_MATCH] = overlap / len(query_tokens) if query_tokens else 0
        
        # Semantic similarity (TF-IDF)
        signals[RelevanceSignal.SEMANTIC_SIM] = self.text_processor.tfidf_similarity(
            query_tokens, doc_tokens
        )
        
        # BM25 score (normalized)
        bm25 = self.text_processor.bm25_score(query_tokens, doc_tokens, node_id)
        signals[RelevanceSignal.SEMANTIC_SIM] = max(
            signals[RelevanceSignal.SEMANTIC_SIM],
            min(1.0, bm25 / 10.0)  # Normalize BM25
        )
        
        # Trust score
        signals[RelevanceSignal.TRUST_SCORE] = node.trust_score
        
        # SIFT depth (normalized to 0-1)
        signals[RelevanceSignal.SIFT_DEPTH] = node.sift_depth / 4.0
        
        # Recency (decay over time)
        age_hours = (datetime.utcnow() - node.created_at).total_seconds() / 3600
        signals[RelevanceSignal.RECENCY] = math.exp(-age_hours / 168)  # Week half-life
        
        return signals
    
    def _combine_signals(
        self,
        signals: Dict[RelevanceSignal, float],
        mode: SearchMode,
    ) -> float:
        """
        Combine relevance signals into final score.
        
        Args:
            signals: Individual signal scores
            mode: Search mode affecting weights
            
        Returns:
            Combined relevance score
        """
        # Mode-specific weights
        if mode == SearchMode.EXACT:
            weights = {
                RelevanceSignal.TEXT_MATCH: 1.0,
                RelevanceSignal.SEMANTIC_SIM: 0.1,
                RelevanceSignal.TRUST_SCORE: 0.2,
                RelevanceSignal.SIFT_DEPTH: 0.1,
                RelevanceSignal.RECENCY: 0.05,
            }
        elif mode == SearchMode.SEMANTIC:
            weights = {
                RelevanceSignal.TEXT_MATCH: 0.3,
                RelevanceSignal.SEMANTIC_SIM: 0.8,
                RelevanceSignal.TRUST_SCORE: 0.3,
                RelevanceSignal.SIFT_DEPTH: 0.2,
                RelevanceSignal.RECENCY: 0.1,
            }
        elif mode == SearchMode.GRAPH:
            weights = {
                RelevanceSignal.TEXT_MATCH: 0.2,
                RelevanceSignal.SEMANTIC_SIM: 0.4,
                RelevanceSignal.GRAPH_PROXIMITY: 0.6,
                RelevanceSignal.TRUST_SCORE: 0.3,
                RelevanceSignal.SIFT_DEPTH: 0.2,
                RelevanceSignal.RECENCY: 0.1,
            }
        else:  # HYBRID
            weights = {
                RelevanceSignal.TEXT_MATCH: 0.4,
                RelevanceSignal.SEMANTIC_SIM: 0.5,
                RelevanceSignal.GRAPH_PROXIMITY: 0.3,
                RelevanceSignal.TRUST_SCORE: 0.3,
                RelevanceSignal.SIFT_DEPTH: 0.2,
                RelevanceSignal.RECENCY: 0.1,
            }
        
        score = 0.0
        for signal, weight in weights.items():
            score += signals.get(signal, 0.0) * weight
        
        return score
    
    def _expand_with_graph(
        self,
        initial_results: List[SearchResult],
        query: SearchQuery,
    ) -> List[SearchResult]:
        """
        Expand results using graph traversal.
        
        Finds related nodes through edges.
        
        Args:
            initial_results: Initial search results
            query: Search query
            
        Returns:
            Expanded result list
        """
        seen_ids: Set[str] = {r.node.id for r in initial_results}
        expanded: List[SearchResult] = list(initial_results)
        
        for result in initial_results[:5]:  # Expand from top 5
            neighbors = self._traverse_graph(
                result.node.id,
                max_hops=query.max_hops,
                seen=seen_ids,
            )
            
            for node, distance, path in neighbors:
                if node.id in seen_ids:
                    continue
                
                seen_ids.add(node.id)
                
                # Compute graph proximity signal
                proximity = 1.0 / (1.0 + distance)
                
                signals = {
                    RelevanceSignal.GRAPH_PROXIMITY: proximity,
                    RelevanceSignal.TRUST_SCORE: node.trust_score,
                    RelevanceSignal.SIFT_DEPTH: node.sift_depth / 4.0,
                }
                
                score = result.score * proximity * 0.5  # Discount graph results
                
                expanded.append(SearchResult(
                    node=node,
                    score=score,
                    signals=signals,
                    path_from_query=path,
                ))
        
        # Re-sort with expanded results
        expanded.sort(reverse=True)
        
        return expanded
    
    def _traverse_graph(
        self,
        start_id: str,
        max_hops: int,
        seen: Set[str],
    ) -> List[Tuple[GraphNode, int, List[str]]]:
        """
        BFS traversal from a starting node.
        
        Args:
            start_id: Starting node ID
            max_hops: Maximum traversal depth
            seen: Already seen node IDs
            
        Returns:
            List of (node, distance, path) tuples
        """
        results: List[Tuple[GraphNode, int, List[str]]] = []
        queue: List[Tuple[str, int, List[str]]] = [(start_id, 0, [start_id])]
        visited: Set[str] = {start_id}
        
        while queue:
            current_id, distance, path = queue.pop(0)
            
            if distance >= max_hops:
                continue
            
            neighbors = self.get_neighbors(current_id)
            
            for neighbor in neighbors:
                if neighbor.id in visited or neighbor.id in seen:
                    continue
                
                visited.add(neighbor.id)
                new_path = path + [neighbor.id]
                
                results.append((neighbor, distance + 1, new_path))
                queue.append((neighbor.id, distance + 1, new_path))
        
        return results
    
    def _highlight_matches(
        self,
        content: str,
        query_tokens: List[str],
    ) -> str:
        """
        Highlight matching tokens in content.
        
        Args:
            content: Original content
            query_tokens: Tokens to highlight
            
        Returns:
            Content with highlighted matches
        """
        result = content
        for token in query_tokens:
            # Case-insensitive replacement with highlight markers
            pattern = re.compile(re.escape(token), re.IGNORECASE)
            result = pattern.sub(f"**{token}**", result)
        
        return result
    
    def find_related_concepts(
        self,
        concept: str,
        limit: int = 5,
    ) -> List[GraphNode]:
        """
        Find concepts related to the given one.
        
        Uses both semantic similarity and graph relationships.
        
        Args:
            concept: Concept to find relations for
            limit: Maximum results
            
        Returns:
            List of related nodes
        """
        query = SearchQuery(
            text=concept,
            mode=SearchMode.HYBRID,
            node_types=[NodeType.CONCEPT, NodeType.ENTITY],
            max_results=limit,
            expand_with_graph=True,
            max_hops=2,
        )
        
        results = self.search(query)
        return [r.node for r in results]
    
    def semantic_cluster(
        self,
        seed_ids: List[str],
        similarity_threshold: float = 0.5,
    ) -> List[Set[str]]:
        """
        Cluster nodes by semantic similarity.
        
        Uses simple agglomerative clustering.
        
        Args:
            seed_ids: IDs of nodes to cluster
            similarity_threshold: Minimum similarity to cluster
            
        Returns:
            List of clusters (sets of node IDs)
        """
        # Start with each node in its own cluster
        clusters: List[Set[str]] = [{nid} for nid in seed_ids if nid in self.nodes]
        
        # Compute pairwise similarities
        similarities: Dict[Tuple[str, str], float] = {}
        
        for i, id1 in enumerate(seed_ids):
            if id1 not in self.nodes:
                continue
            
            tokens1 = self.text_processor.tokenize(self.nodes[id1].content)
            
            for id2 in seed_ids[i+1:]:
                if id2 not in self.nodes:
                    continue
                
                tokens2 = self.text_processor.tokenize(self.nodes[id2].content)
                sim = self.text_processor.tfidf_similarity(tokens1, tokens2)
                similarities[(id1, id2)] = sim
        
        # Merge clusters iteratively
        changed = True
        while changed:
            changed = False
            
            for i, cluster1 in enumerate(clusters):
                for j, cluster2 in enumerate(clusters[i+1:], i+1):
                    # Check if any pair exceeds threshold
                    for id1 in cluster1:
                        for id2 in cluster2:
                            key = (id1, id2) if id1 < id2 else (id2, id1)
                            if similarities.get(key, 0) >= similarity_threshold:
                                # Merge clusters
                                clusters[i] = cluster1 | cluster2
                                clusters.pop(j)
                                changed = True
                                break
                        if changed:
                            break
                    if changed:
                        break
                if changed:
                    break
        
        return clusters


# Module-level singleton
semantic_graph_rag = SemanticGraphRAG()
