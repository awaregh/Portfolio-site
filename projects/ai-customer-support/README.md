# AI Customer Support Platform

A production-grade, multi-tenant AI customer support platform powered by Retrieval-Augmented Generation (RAG). Built with FastAPI, PostgreSQL + pgvector, Redis, and OpenAI.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   Client /   │────▶│   FastAPI    │────▶│   Conversation       │
│   Frontend   │◀────│   REST API   │◀────│   Engine             │
└──────────────┘     └──────┬───────┘     └──────────┬───────────┘
                            │                        │
                     ┌──────▼───────┐         ┌──────▼───────────┐
                     │   Auth /     │         │   RAG Pipeline   │
                     │   JWT        │         │                  │
                     └──────────────┘         │  ┌─────────────┐ │
                                              │  │  Retriever  │ │
┌──────────────┐     ┌──────────────┐         │  │  (pgvector) │ │
│   Document   │────▶│  Ingestion   │         │  └──────┬──────┘ │
│   Upload     │     │  Worker      │         │         │        │
└──────────────┘     └──────┬───────┘         │  ┌──────▼──────┐ │
                            │                 │  │   OpenAI    │ │
                     ┌──────▼───────┐         │  │   LLM       │ │
                     │   Chunker +  │         │  └─────────────┘ │
                     │   Embeddings │         └──────────────────┘
                     └──────┬───────┘
                            │
               ┌────────────▼────────────┐
               │                         │
        ┌──────▼───────┐   ┌─────────────▼─┐
        │  PostgreSQL   │   │    Redis       │
        │  + pgvector   │   │    Cache +     │
        │  (vectors +   │   │    Job Queue   │
        │   data)       │   │               │
        └───────────────┘   └───────────────┘
```

### RAG Pipeline Flow

1. **Ingest** → Document uploaded → Chunked → Embedded → Stored in pgvector
2. **Query** → User message → Embed query → Vector similarity search → Retrieve top-K chunks
3. **Generate** → Build prompt (system + context + history) → LLM completion → Response with sources

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| API Framework | FastAPI | Async-native, auto-docs, type-safe |
| Database | PostgreSQL + pgvector | Vector search without external service |
| Cache / Queue | Redis | Fast caching + lightweight job queue |
| ORM | SQLAlchemy 2.0 (async) | Modern async support, migrations |
| Embeddings | OpenAI text-embedding-3-small | High quality, 1536 dimensions |
| LLM | OpenAI GPT-4o-mini | Cost-effective with strong performance |
| Auth | JWT (python-jose) + bcrypt | Stateless, scalable auth |
| Migrations | Alembic | Industry standard for SQLAlchemy |
| Logging | structlog | Structured JSON logging |
| Metrics | Prometheus | Standard observability |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (DB + Redis status) |
| `GET` | `/metrics` | Prometheus metrics |
| `POST` | `/api/v1/auth/register` | Register tenant + admin user |
| `POST` | `/api/v1/auth/login` | Authenticate, returns JWT |
| `POST` | `/api/v1/documents/ingest` | Ingest document into RAG pipeline |
| `GET` | `/api/v1/documents` | List documents (paginated) |
| `GET` | `/api/v1/documents/{id}` | Get document detail |
| `DELETE` | `/api/v1/documents/{id}` | Delete document + chunks |
| `POST` | `/api/v1/conversations` | Create new conversation |
| `POST` | `/api/v1/conversations/{id}/messages` | Send message, get AI response |
| `GET` | `/api/v1/conversations` | List conversations (paginated) |
| `GET` | `/api/v1/conversations/{id}` | Get conversation with messages |
| `POST` | `/api/v1/conversations/{id}/close` | Close conversation |

## Data Model

```
tenants (1) ──── (*) users
   │
   ├──── (*) documents ──── (*) document_chunks [embedding: vector(1536)]
   │
   └──── (*) conversations ──── (*) messages [sources: jsonb, confidence: float]
```

All queries are scoped by `tenant_id` for strict multi-tenant isolation.

## Quick Start

### Docker (recommended)

```bash
# Clone and navigate
git clone https://github.com/awaregh/ai-customer-support.git
cd ai-customer-support

# Copy environment config
cp .env.example .env
# Edit .env with your OpenAI API key (optional — mock mode works without it)

# Start all services
docker compose up -d

# Run migrations
docker compose exec app alembic upgrade head

# API is available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Local Development

```bash
# Prerequisites: Python 3.11+, PostgreSQL 16 with pgvector, Redis 7

# Clone and navigate
git clone https://github.com/awaregh/ai-customer-support.git
cd ai-customer-support

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Start PostgreSQL and Redis (or use docker compose for just infra)
docker compose up -d postgres redis

# Run migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000

# Start the ingestion worker (separate terminal)
python -m app.workers.ingestion_worker
```

### Running Tests

```bash
pytest tests/ -v
```

## Key Engineering Decisions

### Why pgvector over Pinecone/Weaviate?
- **Local-first**: No external service dependency, works offline
- **Transactional consistency**: Vectors stored alongside relational data in the same transaction
- **Tenant isolation**: Standard SQL WHERE clauses for multi-tenant filtering
- **HNSW indexing**: Approximate nearest neighbor search with sub-millisecond latency at scale

### Why Redis for Job Queue (not Celery/RabbitMQ)?
- **Simplicity**: Redis list operations (`RPUSH`/`BLPOP`) provide a reliable FIFO queue
- **Dual purpose**: Same Redis instance handles caching and job queuing
- **Sufficient for workload**: Document ingestion is bursty but low-volume

### Token-based Chunking
- Chunks are split by **token count** (not character count) to ensure consistent context window usage
- Sentence-boundary-aware splitting prevents mid-sentence cuts
- Markdown/HTML-aware modes respect document structure (headers, code blocks)

### Rolling Conversation Summary
- Every N messages, the conversation history is summarized to a compact form
- Prevents context window overflow for long conversations
- Summary is included in the system prompt alongside fresh message history

### Confidence Gating
- Retrieval scores are aggregated into a confidence metric (weighted average)
- Low-confidence responses include a disclaimer suggesting human agent escalation
- Enables monitoring and alerting on response quality

## Production Notes

- **Scaling**: API and worker scale independently; add worker replicas for ingestion throughput
- **Observability**: Prometheus metrics at `/metrics`, structured JSON logs in production
- **Security**: JWT auth, bcrypt password hashing, tenant-scoped queries prevent data leakage
- **Mock mode**: Runs fully without OpenAI API key using deterministic mock embeddings and responses
- **Migration safety**: Alembic with async support for zero-downtime schema changes
