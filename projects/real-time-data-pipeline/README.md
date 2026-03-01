# Real-Time Data Pipeline

High-throughput streaming pipeline for ingesting, transforming, and routing millions of events per second with exactly-once delivery guarantees.

## Architecture

```
Producers → Kafka Topics → Consumer Workers (Go) → Schema Validation → Transformer → Sinks
                                                                                    ├── ClickHouse (analytics)
                                                                                    ├── Alerting Topic (Kafka)
                                                                                    └── Billing Service (gRPC)
```

## Tech Stack

- **Runtime:** Go 1.22
- **Message broker:** Apache Kafka (MSK)
- **Schema management:** Confluent Schema Registry (Avro)
- **Analytics sink:** ClickHouse
- **Inter-service communication:** gRPC
- **Autoscaling:** KEDA on Kubernetes (EKS)
- **Observability:** Prometheus, Grafana, OpenTelemetry

## Quick Start

```bash
git clone https://github.com/awaregh/Portfolio-site.git
cd Portfolio-site/projects/real-time-data-pipeline
docker compose up -d
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```
KAFKA_BROKERS=localhost:9092
CLICKHOUSE_DSN=clickhouse://localhost:9000/pipeline
SCHEMA_REGISTRY_URL=http://localhost:8081
BILLING_GRPC_ADDR=localhost:50051
PROMETHEUS_PORT=9090
```

## Key Design Decisions

- **Exactly-once delivery** via idempotent Kafka producers and transactional offset commits
- **Schema Registry** prevents silent data corruption from schema drift
- **ClickHouse** handles >2M inserts/sec at peak with sub-second analytical queries
- **KEDA autoscaling** keeps consumer lag near zero without over-provisioning
- **Backpressure control** prevents unbounded memory growth under load spikes

## Running Tests

```bash
go test ./...
```

## Project Structure

```
cmd/consumer/     # Consumer worker entry point
internal/
  consumer/       # Kafka consumer group management
  transformer/    # Tenant-specific event transformation
  sink/           # ClickHouse, Alerting, Billing sinks
  registry/       # Schema Registry client with local cache
proto/            # gRPC protobuf definitions
tests/            # Integration tests
```
