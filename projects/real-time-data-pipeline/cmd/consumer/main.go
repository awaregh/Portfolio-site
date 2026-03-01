package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/awaregh/real-time-data-pipeline/internal/consumer"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg := consumer.Config{
		Brokers:             getenv("KAFKA_BROKERS", "localhost:9092"),
		GroupID:             getenv("KAFKA_GROUP_ID", "pipeline-workers"),
		Topics:              []string{"user.events", "order.events", "payment.events"},
		ClickHouseDSN:       getenv("CLICKHOUSE_DSN", "clickhouse://localhost:9000/pipeline"),
		SchemaRegistryURL:   getenv("SCHEMA_REGISTRY_URL", "http://localhost:8081"),
		BillingGRPCAddr:     getenv("BILLING_GRPC_ADDR", "localhost:50051"),
		PrometheusPort:      getenv("PROMETHEUS_PORT", "9090"),
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	w := consumer.NewWorker(cfg, logger)
	if err := w.Run(ctx); err != nil {
		logger.Error("worker exited with error", "err", err)
		os.Exit(1)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
