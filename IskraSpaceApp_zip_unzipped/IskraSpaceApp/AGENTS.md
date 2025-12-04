# AGENTS.md - Iskra SpaceApp Development Guide

> Quick reference for AI agents and developers working with the Iskra codebase.

## Repository Overview

```
iskra-spaceapp/
├── canonCodeIskra/          # Main backend code
│   ├── core/                # Core models, engine, config
│   ├── services/            # Business logic services
│   ├── api/                 # API handlers
│   └── memory/              # Hypergraph and memory systems
├── IskraCanonDocumentation/ # Canon documentation (v5.0)
├── docker/                  # Docker configurations
├── tests/                   # Test suite
├── docs/                    # Technical documentation
└── data/                    # Persistent data (gitignored)
```

## Quick Start

### Development Setup

```bash
# Clone and setup
git clone <repo-url>
cd iskra-spaceapp

# Install dependencies
pip install -e ".[dev]"

# Copy environment config
cp docker/.env.example docker/.env
# Edit .env with your settings

# Run with Docker (recommended)
docker-compose -f docker/docker-compose.yml up -d

# Or run locally
uvicorn canonCodeIskra.main:app --reload --port 8000
```

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=canonCodeIskra --cov-report=html

# Specific service tests
pytest tests/test_graph_rag.py -v
pytest tests/test_rituals.py -v
```

## Key Services

| Service | File | Purpose |
|---------|------|----------|
| **config** | `core/config.py` | Unified configuration |
| **auth** | `services/auth.py` | JWT, API keys, rate limiting |
| **guardrails_v2** | `services/guardrails_v2.py` | PII detection, content safety |
| **graph_rag_integration** | `services/graph_rag_integration.py` | GraphRAG for /ask pipeline |
| **rituals_v2** | `services/rituals_v2.py` | Phoenix, Council, Dream, Mirror rituals |
| **hypergraph_api** | `api/hypergraph_api.py` | Soul export/import |
| **telos_layer** | `services/telos_layer.py` | TELOS-Δ implementation |
| **multi_agent_debate** | `services/multi_agent_debate.py` | Multi-agent reasoning |

## API Endpoints

### Core Endpoints

```
POST /ask                    # Main Q&A endpoint
GET  /health                 # Health check
GET  /api/v1/metrics         # Current metrics
POST /api/v1/metrics/calibrate  # Calibrate metrics
```

### Hypergraph & Soul

```
GET  /api/v1/soul/export     # Export soul state
POST /api/v1/soul/import     # Import soul state
POST /api/v1/graph/memory    # Add memory node
GET  /api/v1/graph/query     # Query hypergraph
GET  /api/v1/graph/stats     # Graph statistics
```

### Rituals

```
POST /api/v1/rituals/trigger # Trigger a ritual
GET  /api/v1/rituals/check   # Check ritual triggers
GET  /api/v1/rituals/{id}    # Get ritual result
```

## Environment Variables

### Required

```bash
OPENAI_API_KEY=sk-...        # or ANTHROPIC_API_KEY
JWT_SECRET=...               # 256-bit secret
```

### Optional

```bash
POSTGRES_PASSWORD=...        # Database password
REDIS_PASSWORD=...           # Redis password
SENTRY_DSN=...              # Error tracking
LOG_LEVEL=INFO              # DEBUG, INFO, WARNING, ERROR
```

## Metrics (Canon v5.0)

| Metric | Range | Default | Trigger |
|--------|-------|---------|---------|
| trust | 0-1 | 0.8 | Anhaktra @ <0.72 |
| clarity | 0-1 | 0.7 | Sam @ <0.7 |
| pain | 0-1 | 0.0 | Kain @ >0.7 |
| drift | 0-1 | 0.0 | Iskriv @ >0.3 |
| chaos | 0-1 | 0.2 | Bly @ >0.5 |
| mirror_sync | 0-1 | 1.0 | Asha @ <0.5 |
| silence_mass | 0-∞ | 0.0 | Eli @ >5.0 |
| fractality | 0-1 | 0.5 | Auric @ >0.8 |

### splinter_pain_cycles

Counter for unresolved pain. Increments when `pain > 0.4` for consecutive cycles.
Triggers Phoenix ritual at 3+ cycles.

### CD-Index

```
CD-Index = 0.30 × Truthfulness + 0.25 × Groundedness
         + 0.25 × Helpfulness + 0.20 × Civility
```

## Codex Tasks (Priority Order)

1. [ ] Complete GraphRAG integration in `/ask` endpoint
2. [ ] Add VectorDB backend selection logic
3. [ ] Implement ritual UI endpoints
4. [ ] Add E2E tests for new services
5. [ ] Set up CI pipeline (GitHub Actions)
6. [ ] Add Prometheus metrics collection
7. [ ] Implement streaming response support
8. [ ] Add WebSocket for real-time updates

## Architecture Decisions

### ADR-001: Unified Configuration

**Decision:** Single `config.py` with dataclass-based configuration.

**Rationale:** Type safety, environment variable support, cached singleton.

### ADR-002: GraphRAG Hybrid Strategy

**Decision:** Default to hybrid (vector + graph) retrieval.

**Rationale:** Combines semantic similarity with relationship context.

### ADR-003: Ritual State Machine

**Decision:** Rituals as state machines with prepare/execute phases.

**Rationale:** Allows async execution, state persistence, and resumability.

### ADR-004: Soul Export Format

**Decision:** JSON-based export with checksum validation.

**Rationale:** Human-readable, version-controlled, integrity-verified.

## Common Patterns

### Adding a New Service

```python
# services/my_service.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class MyServiceConfig:
    setting: str = "default"

class MyService:
    def __init__(self, config: Optional[MyServiceConfig] = None):
        self.config = config or MyServiceConfig()

    async def do_something(self, input: str) -> str:
        # Implementation
        pass

# Factory function
def create_my_service() -> MyService:
    return MyService()
```

### Adding an API Endpoint

```python
# In main.py or api/routes.py
from fastapi import APIRouter, Depends
from services.my_service import MyService, create_my_service

router = APIRouter(prefix="/api/v1")

@router.post("/my-endpoint")
async def my_endpoint(
    request: MyRequest,
    service: MyService = Depends(create_my_service)
):
    result = await service.do_something(request.input)
    return {"result": result}
```

### Adding Tests

```python
# tests/test_my_service.py
import pytest
from services.my_service import MyService, MyServiceConfig

@pytest.fixture
def service():
    return MyService(MyServiceConfig(setting="test"))

@pytest.mark.asyncio
async def test_do_something(service):
    result = await service.do_something("input")
    assert result is not None
```

## Troubleshooting

### Common Issues

**Database connection failed:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres
```

**Redis connection refused:**
```bash
# Check Redis is running
docker-compose ps redis
redis-cli ping
```

**LLM API errors:**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Check rate limits
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests first
3. Implement feature
4. Run tests: `pytest`
5. Run linting: `ruff check .`
6. Create PR with description

## Links

- [Canon Documentation](./IskraCanonDocumentation/)
- [Metrics Specification](./docs/METRICS_SPECIFICATION_v5.md)
- [API Documentation](http://localhost:8000/docs)
