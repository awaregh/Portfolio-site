# AI Workflow Automation Platform

A multi-tenant SaaS backend for orchestrating AI-powered workflows at scale. Built with Node.js, TypeScript, and a job-queue architecture for reliable, observable workflow execution.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client / Frontend                        │
│                   (REST API + WebSocket real-time)                │
└──────────┬──────────────────────────────────────┬────────────────┘
           │ HTTP                                  │ WS
┌──────────▼──────────────────────────────────────▼────────────────┐
│                        Express API Server                        │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Auth    │  │  Workflows │  │   Runs   │  │   Health     │   │
│  │  Routes  │  │  Routes    │  │  Routes  │  │   Check      │   │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │            Middleware (Auth, Rate Limit, Errors)         │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────┬───────────────────────────────────────────────────────┘
           │
┌──────────▼──────────┐   ┌────────────────────────────────────────┐
│   PostgreSQL (DB)   │   │              Redis                     │
│   Prisma ORM        │   │   ┌─────────────────────────────┐      │
│                     │   │   │      BullMQ Job Queue       │      │
│   • Tenants         │   │   │   "workflow-steps" queue    │      │
│   • Users           │   │   └──────────┬──────────────────┘      │
│   • Workflows       │   │              │                         │
│   • Runs + Steps    │   └──────────────┼─────────────────────────┘
│   • Events          │                  │
└─────────────────────┘   ┌──────────────▼─────────────────────────┐
                          │          Worker Process                 │
                          │  ┌────────────────────────────────┐    │
                          │  │      Step Processor             │    │
                          │  │  • Idempotency checks           │    │
                          │  │  • Workflow Engine execution     │    │
                          │  │  • WebSocket event broadcast     │    │
                          │  │  • Retry with exponential backoff│    │
                          │  └────────────────────────────────┘    │
                          │  ┌────────────────────────────────┐    │
                          │  │      Workflow Engine             │    │
                          │  │  • AI Completion (OpenAI)       │    │
                          │  │  • HTTP Requests                │    │
                          │  │  • Conditions (branching)       │    │
                          │  │  • Transforms (data mapping)    │    │
                          │  │  • Delays                       │    │
                          │  │  • Webhooks                     │    │
                          │  └────────────────────────────────┘    │
                          └────────────────────────────────────────┘
```

## Tech Stack

| Technology | Purpose |
|---|---|
| **TypeScript** | Type safety and developer experience |
| **Express** | HTTP API framework — lightweight, mature |
| **Prisma** | Type-safe ORM with migrations for PostgreSQL |
| **BullMQ** | Redis-backed job queue for reliable step execution |
| **Redis / IORedis** | Job queue backend + caching |
| **PostgreSQL** | Primary data store with ACID guarantees |
| **OpenAI SDK** | AI completion step type (with mock fallback) |
| **WebSocket (ws)** | Real-time workflow execution updates |
| **Zod** | Runtime request validation |
| **Pino** | Structured JSON logging |
| **Vitest** | Fast unit testing |
| **Docker** | Containerized deployment |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register tenant + admin user |
| `POST` | `/api/auth/login` | No | Login, receive JWT |
| `GET` | `/api/workflows` | Yes | List workflows (paginated) |
| `POST` | `/api/workflows` | Yes | Create workflow |
| `GET` | `/api/workflows/:id` | Yes | Get workflow detail |
| `PUT` | `/api/workflows/:id` | Yes | Update workflow |
| `DELETE` | `/api/workflows/:id` | Yes | Soft-delete workflow |
| `POST` | `/api/workflows/:id/execute` | Yes | Trigger workflow run |
| `GET` | `/api/workflows/:id/runs` | Yes | List runs for workflow |
| `GET` | `/api/runs/:id` | Yes | Get run detail with steps |
| `GET` | `/api/runs/:id/events` | Yes | Get run events (polling) |
| `POST` | `/api/runs/:id/cancel` | Yes | Cancel running workflow |
| `GET` | `/api/health` | No | Health check (DB + Redis) |
| `WS` | `/ws?token=JWT` | Yes | Real-time workflow updates |

## Data Model

- **Tenant** — Multi-tenant isolation. Each tenant has users, workflows, and runs.
- **User** — Belongs to a tenant. Roles: ADMIN, MEMBER.
- **Workflow** — A DAG definition with typed nodes and edges.
- **WorkflowRun** — A single execution of a workflow with status tracking.
- **WorkflowStep** — Individual step within a run with retry support.
- **WorkflowEvent** — Audit log of every state change during execution.

### Step Types

| Type | Description |
|---|---|
| `AI_COMPLETION` | Calls OpenAI (or mock) with configurable prompts |
| `HTTP_REQUEST` | Makes external HTTP calls |
| `CONDITION` | Evaluates expressions for branching |
| `TRANSFORM` | Maps/transforms data between steps |
| `DELAY` | Pauses execution for a configured duration |
| `WEBHOOK` | Sends workflow data to external webhooks |

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- (Optional) Docker & Docker Compose

### Setup

```bash
# Clone and install
cd projects/ai-workflow-platform
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and Redis URLs

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:push

# Seed demo data
npm run db:seed

# Start development server
npm run dev

# In another terminal, start the worker
npm run worker
```

## Docker Quick Start

```bash
# Start all services
docker compose up -d

# Run migrations
docker compose exec app npx prisma db push

# Seed data
docker compose exec app npm run db:seed

# API is available at http://localhost:3001
curl http://localhost:3001/api/health
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | — | Secret for JWT signing (min 8 chars) |
| `OPENAI_API_KEY` | — | OpenAI API key (optional, falls back to mock) |
| `PORT` | `3001` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Pino log level |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Key Engineering Decisions

1. **Job Queue Architecture** — Workflow steps execute via BullMQ workers, not inline. This enables horizontal scaling, retry semantics, and prevents API timeouts on long-running AI calls.

2. **Idempotency Keys** — Each step execution has a unique `runId:stepKey:retryCount` key, preventing duplicate processing in distributed environments.

3. **Multi-Tenant Isolation** — Every database query is scoped by `tenantId`. JWT tokens carry tenant context. No cross-tenant data leakage is possible.

4. **DAG-Based Workflow Definition** — Workflows are defined as directed acyclic graphs stored as JSON. Supports sequential chains, parallel branches, and conditional routing.

5. **Mock AI Mode** — When `OPENAI_API_KEY` is not set, the platform returns realistic mock responses. Enables full development and testing without API costs.

6. **Event Sourcing for Observability** — Every state transition creates a `WorkflowEvent` record, providing a complete audit trail and enabling real-time updates via WebSocket.

7. **Graceful Shutdown** — Both the API server and worker handle `SIGTERM`/`SIGINT`, draining connections and completing in-flight jobs before exiting.

8. **Exponential Backoff Retries** — Failed steps retry up to 3 times with exponential backoff (1s → 2s → 4s) before marking the run as failed.

## Production Deployment Notes

- Set `NODE_ENV=production` and use strong `JWT_SECRET` values
- Use connection pooling for PostgreSQL (e.g., PgBouncer)
- Scale workers horizontally by running multiple instances
- Configure Redis persistence (AOF/RDB) for queue durability
- Set up monitoring on the `/api/health` endpoint
- Use a reverse proxy (nginx/Caddy) with TLS termination
- Consider rate limiting at the infrastructure level for production traffic
