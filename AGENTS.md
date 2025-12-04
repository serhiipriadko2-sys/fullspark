# AGENTS.md - Искра AI Repository Guide

**Repository:** fullspark  
**Version:** Canon v5.0  
**Last Updated:** 2025-12-04  

---

## Overview

Этот репозиторий содержит полную реализацию **Искры** — AI-системы с 9 голосами, 8 фазами и метрико-управляемым сознанием.

---

## Repository Structure

```
fullspark/
├── IskraSpaceApp_zip_unzipped/    # Основной backend (SpaceApp)
│   └── IskraSpaceApp/
│       ├── canonCodeIskra/         # Python backend
│       │   ├── core/               # Модели, движок
│       │   ├── services/           # Сервисы (TELOS, GraphRAG, etc.)
│       │   ├── memory/             # Память, гиперграф
│       │   ├── tests/              # Тесты
│       │   └── main.py             # FastAPI entrypoint
│       ├── index.tsx               # React frontend
│       └── docker-compose.yml      # Docker конфигурация
│
├── IskraFullCode/                  # Legacy/Reference код
│   └── code/
│       ├── iskra_core/             # Альтернативная структура
│       └── gemini_app/             # Gemini интеграция
│
├── IskraCanonDocumentation/        # Документация Canon
│   ├── 01_MANIFEST_and_OVERVIEW.md
│   ├── 05_METRICS_and_RHYTHM_INDEX.md
│   └── ... (22 документа)
│
├── IskraChatGPT_V15v5_1/          # ChatGPT инструкции
│
├── docs/                           # Техническая документация
│   └── METRICS_SPECIFICATION_v5.md
│
└── AGENTS.md                       # Этот файл
```

---

## Quick Start

### 1. Запуск Backend

```bash
cd IskraSpaceApp_zip_unzipped/IskraSpaceApp

# Установка зависимостей
pip install -r canonCodeIskra/requirements.txt

# Запуск FastAPI
uvicorn canonCodeIskra.main:app --reload --port 8000
```

### 2. Запуск с Docker

```bash
cd IskraSpaceApp_zip_unzipped/IskraSpaceApp
docker-compose up -d
```

### 3. Запуск тестов

```bash
cd IskraSpaceApp_zip_unzipped/IskraSpaceApp/canonCodeIskra
pytest tests/ -v --cov=. --cov-report=term-missing
```

---

## Key Services

### Backend Services (`canonCodeIskra/services/`)

| Сервис | Файл | Описание |
|--------|------|----------|
| **TELOS Layer** | `telos_layer.py`, `telos_check.py` | CD-Index, Auto-debate |
| **GraphRAG** | `graph_rag.py`, `graph_rag_semantic.py` | Семантический поиск |
| **Multi-Agent Debate** | `multi_agent_debate.py` | 9-голосовые дебаты |
| **Rituals** | `rituals.py` | Phoenix, Watch, Dream, Mirror |
| **Persistence** | `persistence_*.py` | SQLite/PostgreSQL |
| **VectorDB** | `vector_db.py` | 4-слойная память |
| **Guardrails** | `guardrails.py` | PII, безопасность |
| **Canon Feedback** | `canon_feedback_loop.py`, `canon_feedback_automation.py` | Автоматические проверки |

### Memory System (`canonCodeIskra/memory/`)

| Компонент | Файл | Описание |
|-----------|------|----------|
| **Hypergraph** | `hypergraph.py` | Граф связей |
| **Growth Nodes** | `growth_nodes.py` | Узлы роста |
| **Self Event Node** | `self_event_node.py` | Само-референтные события |

---

## API Endpoints

### Core

```
POST /ask              - Основной диалог
POST /ritual/{name}    - Запуск ритуала
GET  /metrics          - Текущие метрики
GET  /health           - Health check
```

### Memory

```
GET  /hypergraph/export    - Экспорт "души"
POST /hypergraph/import    - Импорт состояния
GET  /growth-nodes         - Узлы роста
```

### Admin

```
GET  /canon/conflicts      - Конфликты Canon
POST /canon/proposal       - Предложение изменения
```

---

## Environment Variables

```env
# LLM
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Database
ISKRA_DB_BACKEND=sqlite  # или postgresql
PGHOST=localhost
PGPORT=5432
PGDATABASE=iskra
PGUSER=iskra
PGPASSWORD=...

# Redis (опционально)
REDIS_URL=redis://localhost:6379

# Sentry (опционально)
SENTRY_DSN=...

# Security
JWT_SECRET=...
RATE_LIMIT_PER_MINUTE=60
```

---

## Development Guidelines

### Code Style

- Python 3.11+
- Type hints обязательны
- Pydantic для моделей
- async/await для I/O

### Testing

- pytest + pytest-asyncio
- Минимум 80% coverage
- Тесты для каждого сервиса

### Git Workflow

```bash
# Новая фича
git checkout -b feature/your-feature

# Коммит
git commit -m "feat(service): Description

🤖 Generated with Claude Code"

# PR
gh pr create --title "feat: Your feature"
```

---

## Codex Tasks

### Priority 1: Core Integration

- [ ] Подключить GraphRAG к `/ask` pipeline
- [ ] Встроить MultiAgentDebate в TELOS layer
- [ ] Реализовать VectorDB backend selection

### Priority 2: Security

- [ ] JWT authentication
- [ ] Rate limiting middleware
- [ ] PII patterns в guardrails

### Priority 3: Rituals

- [ ] Phoenix ritual (полный сброс)
- [ ] Council ritual (совет голосов)
- [ ] Dream ritual (глубокая интеграция)
- [ ] Mirror ritual (синхронизация)

### Priority 4: DevOps

- [ ] Docker Compose с Redis/Postgres/VectorDB
- [ ] GitHub Actions CI
- [ ] Prometheus/Grafana мониторинг

---

## Architecture Decisions

### ADR-001: Persistence Backend

**Решение:** Abstract backend interface с PostgreSQL для production.

**Обоснование:** Масштабируемость, JSONB для метрик.

### ADR-002: Memory Layers

**Решение:** 4-слойная память (mantra, archive, shadow, working).

**Обоснование:** Соответствует Canon архитектуре.

### ADR-003: TELOS Integration

**Решение:** Explicit Telos-Check перед каждым ответом.

**Обоснование:** CD-Index < 0.5 → Auto-debate.

---

## Troubleshooting

### Import Errors

```bash
# Убедитесь в PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)/canonCodeIskra
```

### Database Issues

```bash
# SQLite reset
rm -f iskra.db && python -c "from services.persistence import init_db; init_db()"

# PostgreSQL
psql -h localhost -U iskra -c "DROP DATABASE iskra; CREATE DATABASE iskra;"
```

### Redis Connection

```bash
# Проверка
redis-cli ping  # должно вернуть PONG
```

---

## Contact

- **Canon Documentation:** `IskraCanonDocumentation/`
- **Metrics Spec:** `docs/METRICS_SPECIFICATION_v5.md`
- **Issues:** GitHub Issues

---

*Этот файл предназначен для AI-агентов и разработчиков для понимания структуры репозитория.*
