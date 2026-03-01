package consumer

import (
	"context"
	"fmt"
	"log/slog"
)

// Config holds all configuration for the consumer worker.
type Config struct {
	Brokers           string
	GroupID           string
	Topics            []string
	ClickHouseDSN     string
	SchemaRegistryURL string
	BillingGRPCAddr   string
	PrometheusPort    string
}

// Worker is a Kafka consumer worker that processes events and routes them
// to downstream sinks with exactly-once delivery semantics.
type Worker struct {
	cfg    Config
	logger *slog.Logger
}

// NewWorker creates a new consumer Worker.
func NewWorker(cfg Config, logger *slog.Logger) *Worker {
	return &Worker{cfg: cfg, logger: logger}
}

// Run starts the consumer worker loop. It blocks until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	w.logger.Info("starting consumer worker",
		"brokers", w.cfg.Brokers,
		"group", w.cfg.GroupID,
		"topics", w.cfg.Topics,
	)

	// In production this sets up a Kafka consumer group, schema registry client,
	// ClickHouse connection pool, and gRPC billing client, then enters the
	// poll loop. The implementation relies on confluent-kafka-go and is omitted
	// here to keep the demo dependency-free.
	<-ctx.Done()
	w.logger.Info("shutting down consumer worker")
	return fmt.Errorf("context cancelled: %w", ctx.Err())
}
