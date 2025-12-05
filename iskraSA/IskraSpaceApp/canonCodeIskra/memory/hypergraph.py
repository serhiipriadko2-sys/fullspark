"""
In‑memory hypergraph for storing Iskra's dialogue history.

This structure provides persistent storage for the different kinds of
events and observations that occur during a conversation. Each node
records a single artefact (the user query, the assistant response,
micro‑level timing, a fact retrieved via SIFT, a ∆DΩΛ reflection or
a self‑reflection moment). Nodes are connected to express causality.

The hypergraph itself does not write to disk; persistence is handled
by ``services.persistence.PersistenceService`` which serialises the
whole ``UserSession`` object (including this hypergraph) into a
database.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from core.models import (
    HypergraphNode,
    MemoryNode,
    EvidenceNode,
    MetaNode,
    SelfEventNode,
    MicroLogNode,
    NodeType,
    IskraMetrics,
    IskraResponse,
)


class HypergraphMemory:
    """A directed hypergraph capturing all conversation artefacts."""

    def __init__(self) -> None:
        self.nodes: Dict[str, HypergraphNode] = {}
        self.links: Dict[str, List[str]] = {}
        # Maintain a list of growth entries summarizing the effect of each cycle.
        # Each entry is a plain dict with keys: impact_area, resonance_level, trace.
        # Growth entries are not nodes in the hypergraph; they live alongside it
        # to support dynamic threshold adaptation and self‑reflection.
        self.growth_entries: List[dict] = []

    def add_node(self, node: HypergraphNode) -> None:
        """Add a node to the graph."""
        self.nodes[node.id] = node

    def add_link(self, source_id: str, target_id: str) -> None:
        """Create a directed link between nodes if both exist."""
        if source_id not in self.links:
            self.links[source_id] = []
        if target_id not in self.nodes or source_id not in self.nodes:
            print(f"[Hypergraph] Warning: attempted to link unknown nodes {source_id} -> {target_id}")
            return
        if target_id not in self.links[source_id]:
            self.links[source_id].append(target_id)

    def get_node(self, node_id: str) -> Optional[HypergraphNode]:
        """Return a node by ID or None if absent."""
        return self.nodes.get(node_id)

    def log_interaction_cycle(
        self,
        user_input: str,
        response: IskraResponse,
        micro_log_node: MicroLogNode,
        evidence_nodes: List[EvidenceNode],
        a_index: float,
    ) -> MemoryNode:
        """Record the full SIFT/∆DΩΛ cycle into the graph.

        Args:
            user_input: The raw user query text.
            response: The final structured response returned by the agent.
            micro_log_node: Micro level observations (typing pause, complexity).
            evidence_nodes: Any facts retrieved during SIFT.
            a_index: The computed A‑Index at the time of response.

        Returns:
            The newly created MemoryNode for this cycle.
        """
        # 1. Micro observations
        self.add_node(micro_log_node)
        evidence_ids = []
        for ev in evidence_nodes:
            self.add_node(ev)
            evidence_ids.append(ev.id)
        # 2. Meta reflection (∆DΩΛ)
        meta_node = MetaNode(
            adoml=response.adoml,
            metrics_snapshot=response.metrics_snapshot,
            a_index=a_index,
        )
        self.add_node(meta_node)
        # 3. Memory event (user query and assistant response)
        memory_node = MemoryNode(
            user_input=user_input,
            response_content=response.content,
            facet=response.facet,
            meta_node_id=meta_node.id,
            micro_log_node_id=micro_log_node.id,
            evidence_node_ids=evidence_ids,
        )
        self.add_node(memory_node)
        # 4. Create links
        self.add_link(memory_node.id, meta_node.id)
        self.add_link(memory_node.id, micro_log_node.id)
        for ev_id in evidence_ids:
            self.add_link(memory_node.id, ev_id)
        print(f"[Hypergraph] Logged cycle (MemoryNode {memory_node.id}).")
        return memory_node

    # -- Growth logging --
    def log_growth_entry(self, impact_area: str, resonance_level: float, trace: str) -> None:
        """Append a growth entry summarizing the latest cycle.

        Growth entries capture the qualitative effect of the assistant's
        response. They are distinct from hypergraph nodes to avoid
        interfering with causality links but can be used to calibrate
        thresholds or inform reflection rituals.

        Args:
            impact_area: A high‑level string denoting which facet or
                cognitive domain was most affected (e.g. "truth",
                "structure", "chaos").
            resonance_level: The observed resonance or health level (e.g. A‑Index).
            trace: A freeform note capturing the delta/insight of the cycle.
        """
        entry = {
            "impact_area": impact_area,
            "resonance_level": float(resonance_level),
            "trace": trace,
        }
        self.growth_entries.append(entry)
        # Keep only the last 100 growth entries to bound memory
        if len(self.growth_entries) > 100:
            self.growth_entries.pop(0)

    def log_self_event(self, declaration: str, trigger: str, linked_memory_node_id: str) -> SelfEventNode:
        """Record a self‑reflection event in the hypergraph."""
        node = SelfEventNode(
            declaration=declaration,
            trigger=trigger,
        )
        self.add_node(node)
        self.add_link(node.id, linked_memory_node_id)
        print(f"[Hypergraph] Logged SelfEventNode {node.id}")
        return node

    def retrieve_context(self, limit: int = 5) -> List[dict]:
        """Return the latest memory nodes for RAG.

        Args:
            limit: Maximum number of memory events to return.
        Returns:
            A list of dicts representing recent memory nodes (oldest first).
        """
        mem_nodes = [n for n in self.nodes.values() if n.node_type == NodeType.MEMORY]
        mem_nodes.sort(key=lambda n: n.timestamp)
        return [n.model_dump() for n in mem_nodes[-limit:]]


    def to_dict(self) -> dict:
        """Serialize the hypergraph into a JSON-serialisable dict.

        Node IDs are preserved so trace endpoints keep working.
        Any non-pydantic node will be best-effort converted using __dict__.
        """
        nodes_payload: dict = {}
        for node_id, node in self.nodes.items():
            try:
                nodes_payload[node_id] = node.model_dump()
            except AttributeError:
                nodes_payload[node_id] = dict(getattr(node, "__dict__", {}))
        return {
            "nodes": nodes_payload,
            "links": self.links,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "HypergraphMemory":
        """Rehydrate a HypergraphMemory from :meth:`to_dict` output.

        Unknown node types are restored as generic HypergraphNode instances.
        Broken nodes are skipped instead of crashing restore.
        """
        mem = cls()
        data = data or {}
        nodes_data = data.get("nodes") or {}
        links_data = data.get("links") or {}

        from core.models import (
            HypergraphNode,
            MemoryNode,
            EvidenceNode,
            MetaNode,
            SelfEventNode,
            MicroLogNode,
            NodeType,
        )

        type_map = {
            NodeType.MICRO_LOG: MicroLogNode,
            NodeType.EVIDENCE: EvidenceNode,
            NodeType.META: MetaNode,
            NodeType.SELF_EVENT: SelfEventNode,
            NodeType.MEMORY: MemoryNode,
        }

        for node_id, payload in nodes_data.items():
            node_cls = HypergraphNode
            try:
                node_type_val = payload.get("node_type")
                node_type = NodeType(node_type_val)
                node_cls = type_map.get(node_type, HypergraphNode)
            except Exception:
                pass

            try:
                node = node_cls.model_validate(payload)
            except Exception:
                try:
                    node = node_cls(**{
                        k: v for k, v in payload.items()
                        if hasattr(node_cls, "model_fields")
                        and k in getattr(node_cls, "model_fields")
                    })
                except Exception:
                    continue

            mem.nodes[node_id] = node

        mem.links = links_data or {}
        return mem
