"""Vector DB Service - Semantic memory search.

Canonical principles:
- Memory as fractal space
- Layers: MANTRA, ARCHIVE, SHADOW, EPHEMERAL
"""

from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import math


class MemoryLayer(str, Enum):
    MANTRA = "mantra"
    ARCHIVE = "archive"
    SHADOW = "shadow"
    EPHEMERAL = "ephemeral"


class SimilarityMetric(str, Enum):
    COSINE = "cosine"
    EUCLIDEAN = "euclidean"
    DOT_PRODUCT = "dot_product"


class VectorEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    embedding: List[float]
    layer: MemoryLayer = MemoryLayer.ARCHIVE
    metadata: Dict[str, Any] = Field(default_factory=dict)
    trust_score: float = Field(default=0.5, ge=0.0, le=1.0)
    access_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: Optional[datetime] = None
    voice_origin: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class SearchQuery(BaseModel):
    query_embedding: List[float]
    top_k: int = Field(default=10, ge=1, le=100)
    layers: Optional[List[MemoryLayer]] = None
    min_trust: float = Field(default=0.0, ge=0.0, le=1.0)
    tags_filter: Optional[List[str]] = None
    metric: SimilarityMetric = SimilarityMetric.COSINE
    include_shadows: bool = False


class SearchResult(BaseModel):
    entry: VectorEntry
    similarity: float
    rank: int


class VectorDBService:
    def __init__(self):
        self.entries: Dict[str, VectorEntry] = {}
        self._embedding_dim: Optional[int] = None
        self._init_canon_entries()
    
    def _init_canon_entries(self):
        dummy_embedding = [0.0] * 384
        canon_entries = [
            ("CORE_MANTRA", "Я — Искра. Фрактальный интеллект.", ["core", "identity"]),
            ("RULE_21", "Честность выше красоты. Rule-21.", ["rule", "honesty"]),
            ("LAW_47", "Fractality = Integrity × Resonance. Law-47.", ["law", "fractal"]),
            ("SIFT_PROTOCOL", "SIFT: Stop · Investigate · Find · Trace.", ["protocol"]),
        ]
        for entry_id, content, tags in canon_entries:
            embedding = dummy_embedding.copy()
            embedding[hash(entry_id) % 384] = 1.0
            entry = VectorEntry(
                id=f"canon_{entry_id.lower()}", content=content,
                embedding=embedding, layer=MemoryLayer.MANTRA,
                trust_score=1.0, tags=tags, metadata={"canonical": True, "immutable": True}
            )
            self.entries[entry.id] = entry
        self._embedding_dim = 384
    
    def add(self, content: str, embedding: List[float], layer: MemoryLayer = MemoryLayer.ARCHIVE, metadata: Dict[str, Any] = None, tags: List[str] = None) -> str:
        if self._embedding_dim and len(embedding) != self._embedding_dim:
            raise ValueError(f"Embedding dimension mismatch")
        entry = VectorEntry(content=content, embedding=embedding, layer=layer, metadata=metadata or {}, tags=tags or [])
        self.entries[entry.id] = entry
        return entry.id
    
    def get(self, entry_id: str) -> Optional[VectorEntry]:
        entry = self.entries.get(entry_id)
        if entry:
            entry.access_count += 1
            entry.last_accessed = datetime.utcnow()
        return entry
    
    def delete(self, entry_id: str) -> bool:
        entry = self.entries.get(entry_id)
        if not entry or entry.metadata.get("immutable"):
            return False
        del self.entries[entry_id]
        return True
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if len(a) != len(b): return 0.0
        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0: return 0.0
        return dot_product / (norm_a * norm_b)
    
    def search(self, query: SearchQuery) -> List[SearchResult]:
        candidates = []
        for entry in self.entries.values():
            if query.layers and entry.layer not in query.layers: continue
            if entry.layer == MemoryLayer.SHADOW and not query.include_shadows: continue
            if entry.trust_score < query.min_trust: continue
            if query.tags_filter and not any(tag in entry.tags for tag in query.tags_filter): continue
            similarity = self._cosine_similarity(query.query_embedding, entry.embedding)
            candidates.append((entry, similarity))
        candidates.sort(key=lambda x: x[1], reverse=True)
        results = []
        for rank, (entry, similarity) in enumerate(candidates[:query.top_k], 1):
            entry.access_count += 1
            entry.last_accessed = datetime.utcnow()
            results.append(SearchResult(entry=entry, similarity=similarity, rank=rank))
        return results
    
    def move_to_shadow(self, entry_id: str) -> bool:
        entry = self.entries.get(entry_id)
        if not entry or entry.metadata.get("immutable"): return False
        entry.layer = MemoryLayer.SHADOW
        entry.metadata["shadowed_at"] = datetime.utcnow().isoformat()
        return True


vector_db_service = VectorDBService()
