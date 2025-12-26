import numpy as np
from typing import List, Dict, Any, Tuple
from pathlib import Path
import re
import random

# --- 1. Simulated Vector Store (In-Memory) ---

# Mock data structure: (text_snippet, source_file, vector_embedding)
# In a real scenario, this would be a pgvector table.
MOCK_VECTOR_STORE = []
VECTOR_DIMENSION = 384 # Common dimension for sentence embeddings

# Mock Embedding Function (Simulates a model like all-MiniLM-L6-v2)
def get_embedding(text: str) -> np.ndarray:
    """Generates a mock vector embedding for a given text."""
    # Simple hash-based simulation for deterministic but non-meaningful vectors
    random.seed(hash(text) % (2**32 - 1))
    return np.random.rand(VECTOR_DIMENSION).astype(np.float32)

# Function to load and chunk documents, then populate the mock store
def populate_mock_store(root: Path):
    global MOCK_VECTOR_STORE
    MOCK_VECTOR_STORE = []
    
    # Files to index (using the same logic as the original search_files)
    files_to_index = [p for p in root.iterdir() if p.suffix.lower() in {'.md','.txt'} and p.is_file()]
    
    for p in files_to_index:
        try:
            txt = p.read_text(encoding='utf-8', errors='ignore')
            # Simple chunking: split by double newline for paragraphs
            chunks = [c.strip() for c in re.split(r'\n\s*\n', txt) if c.strip()]
            
            for chunk in chunks:
                if len(chunk) > 20: # Ignore very short chunks
                    embedding = get_embedding(chunk)
                    MOCK_VECTOR_STORE.append({
                        "snippet": chunk[:240].replace('\n', ' '),
                        "source": p.name,
                        "embedding": embedding
                    })
        except Exception as e:
            print(f"Error processing file {p.name}: {e}")

# --- 2. Simulated RAG Search Logic ---

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculates cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def pgvector_rag_search(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """
    Simulates a pgvector search using vector similarity.
    
    In a real pgvector setup, this would be a SQL query like:
    SELECT snippet, source FROM chunks ORDER BY embedding <-> query_embedding LIMIT 5
    """
    if not MOCK_VECTOR_STORE:
        return []

    query_embedding = get_embedding(query)
    
    hits = []
    for item in MOCK_VECTOR_STORE:
        similarity = cosine_similarity(query_embedding, item["embedding"])
        hits.append((similarity, item["source"], item["snippet"]))
        
    # Sort by similarity (descending)
    hits.sort(key=lambda x: x[0], reverse=True)
    
    # Format as Citation model
    citations = [{'source': h[1], 'snippet': h[2]} for h in hits[:limit]]
    
    # Mock the confidence score (Ω) based on the top hit's similarity
    # A high similarity means high confidence
    top_similarity = hits[0][0] if hits else 0.0
    # Normalize similarity (which is between -1 and 1) to 0.0-1.0 for Ω
    omega_score = (top_similarity + 1.0) / 2.0
    
    return citations, omega_score

# --- 3. Initialization (Run once on startup) ---

# This will be called when the FastAPI app starts
def initialize_rag_system(root_path: str):
    print(f"Initializing RAG system with documents from {root_path}...")
    populate_mock_store(Path(root_path))
    print(f"RAG system initialized. {len(MOCK_VECTOR_STORE)} chunks indexed.")

# Example usage (for testing)
if __name__ == "__main__":
    # Simulate populating the store with a dummy directory
    class MockPath:
        def iterdir(self):
            class MockFile:
                def __init__(self, name, content):
                    self.name = name
                    self.content = content
                    self.suffix = '.md'
                    self.is_file = lambda: True
                def read_text(self, encoding, errors):
                    return self.content
            return [
                MockFile("doc1.md", "The core idea is anti-fragility. Chaos Maki tests the system's resilience. It uses stress inoculation."),
                MockFile("doc2.txt", "The Delta-Omega-Lambda protocol is key. Omega is confidence. Lambda is the next step. Delta is change.")
            ]
        def __init__(self):
            pass
    
    initialize_rag_system(MockPath())
    
    query = "What is the role of Chaos Maki?"
    citations, omega = pgvector_rag_search(query)
    
    print(f"\nQuery: {query}")
    print(f"Simulated Omega (Confidence): {omega:.4f}")
    print("Citations:")
    for c in citations:
        print(f"  - Source: {c['source']}, Snippet: {c['snippet']}")
