# Distributed Rate Limiter Service

Token-bucket and sliding-window rate limiting deployed as a standalone service with multi-region consistency, gRPC API, and sidecar-ready design.

## Architecture

```
Upstream Services → gRPC (Check RPC) → Rate Limiter Service → Redis (Lua scripts)
                                              ↓
                                      Policy Store (PostgreSQL)
                                              ↓
                                      Prometheus Metrics
```

## Tech Stack

- **Runtime:** Go 1.22
- **State store:** Redis 7 (with Sentinel)
- **API:** gRPC (Protocol Buffers)
- **Policy store:** PostgreSQL
- **Observability:** Prometheus, Grafana
- **Infrastructure:** Docker, Kubernetes, Helm

## Quick Start

```bash
git clone https://github.com/awaregh/Portfolio-site.git
cd Portfolio-site/projects/distributed-rate-limiter
docker compose up -d
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```
REDIS_ADDR=localhost:6379
POSTGRES_DSN=postgres://ratelimiter:password@localhost:5432/ratelimiter?sslmode=disable
GRPC_PORT=50052
PROMETHEUS_PORT=9090
```

## gRPC API

```protobuf
service RateLimiter {
  rpc Check(CheckRequest) returns (CheckResponse);
  rpc Decrement(DecrementRequest) returns (DecrementResponse);
}
```

**Average `Check` RPC latency:** 0.4ms p50, 1.1ms p99 (same AZ)

## Key Design Decisions

- **Lua scripts for atomicity** — eliminates TOCTOU race conditions without MULTI/EXEC overhead
- **Two algorithms:** Token bucket (burst-tolerant) + Sliding window (strict enforcement)
- **Fail-open mode** — if Redis is unreachable, requests are allowed through to preserve availability
- **Sidecar-compatible** — stateless binary, deployable as Kubernetes sidecar or Envoy ext_authz backend
- **Multi-region Redis** — async replication to regional replicas; reads are local, writes propagate ~100ms

## Running Tests

```bash
go test ./...
```

## Project Structure

```
cmd/server/        # gRPC server entry point
internal/
  limiter/         # Token bucket + sliding window algorithms (Lua scripts)
  policy/          # Policy store with in-process cache + pub/sub invalidation
  admin/           # Admin gRPC API for inspecting/overriding limits
proto/             # gRPC protobuf definitions
tests/             # Integration tests with testcontainers
```
