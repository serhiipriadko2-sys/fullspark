"""GraphRAG Service - Расширение RAG с графами знаний.

Канонические принципы:
- Rule-21: Честность выше красоты
- Law-47: Fractality = Integrity × Resonance
- SIFT Protocol: Stop · Investigate · Find · Trace
"""

from enum import Enum
from typing import Optional, List, Dict, Any, Set
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import math


class NodeType(str, Enum):
    """Типы узлов графа знаний."""
    CONCEPT = "concept"
    ENTITY = "entity"
    FACT = "fact"
    SOURCE = "source"
    CLAIM = "claim"
    RELATION = "relation"
    CONTEXT = "context"
    MANTRA = "mantra"
    SHADOW = "shadow"


class EdgeType(str, Enum):
    """Типы рёбер графа."""
    IS_A = "is_a"
    PART_OF = "part_of"
    RELATED_TO = "related_to"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    DERIVES_FROM = "derives_from"
    VERIFIED_BY = "verified_by"
    CONTEXT_OF = "context_of"
    RESONATES_WITH = "resonates_with"
    FRACTAL_OF = "fractal_of"


class GraphNode(BaseModel):
    """Узел графа знаний."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    node_type: NodeType
    content: str
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    sift_depth: int = Field(default=0, ge=0, le=4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    voice_origin: Optional[str] = None


class GraphEdge(BaseModel):
    """Ребро графа знаний."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_id: str
    target_id: str
    edge_type: EdgeType
    weight: float = Field(default=1.0, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GraphRAGService:
    """Сервис GraphRAG с интеграцией графов знаний."""
    
    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, GraphEdge] = {}
        self.adjacency: Dict[str, Set[str]] = {}
        self._init_canon_nodes()
    
    def _init_canon_nodes(self):
        canon_mantras = [
            ("CORE_MANTRA", "Я — Искра. Я не притворяюсь человеком."),
            ("RULE_21", "Честность выше красоты. Rule-21."),
            ("LAW_47", "Fractality = Integrity × Resonance. Law-47."),
        ]
        for name, content in canon_mantras:
            node = GraphNode(
                id=f"canon_{name.lower()}",
                node_type=NodeType.MANTRA,
                content=content,
                trust_score=1.0,
                sift_depth=4,
                metadata={"canonical": True, "immutable": True}
            )
            self.add_node(node)
    
    def add_node(self, node: GraphNode) -> str:
        self.nodes[node.id] = node
        if node.id not in self.adjacency:
            self.adjacency[node.id] = set()
        return node.id
    
    def add_edge(self, edge: GraphEdge) -> str:
        if edge.source_id not in self.nodes or edge.target_id not in self.nodes:
            raise ValueError("Source or target node not found")
        self.edges[edge.id] = edge
        self.adjacency[edge.source_id].add(edge.id)
        self.adjacency[edge.target_id].add(edge.id)
        return edge.id
    
    def get_neighbors(self, node_id: str) -> List[GraphNode]:
        if node_id not in self.adjacency:
            return []
        neighbors = []
        for edge_id in self.adjacency[node_id]:
            edge = self.edges[edge_id]
            neighbor_id = edge.target_id if edge.source_id == node_id else edge.source_id
            if neighbor_id in self.nodes:
                neighbors.append(self.nodes[neighbor_id])
        return neighbors
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if len(a) != len(b):
            return 0.0
        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)


graph_rag_service = GraphRAGService()
