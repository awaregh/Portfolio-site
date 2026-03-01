package main

import (
	"context"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/awaregh/distributed-rate-limiter/internal/limiter"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg := limiter.Config{
		RedisAddr:      getenv("REDIS_ADDR", "localhost:6379"),
		PostgresDSN:    getenv("POSTGRES_DSN", "postgres://ratelimiter:password@localhost:5432/ratelimiter?sslmode=disable"),
		GRPCPort:       getenv("GRPC_PORT", "50052"),
		PrometheusPort: getenv("PROMETHEUS_PORT", "9090"),
		FailOpen:       getenv("FAIL_OPEN", "true") == "true",
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	srv := limiter.NewServer(cfg, logger)

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		logger.Error("failed to listen", "err", err)
		os.Exit(1)
	}

	logger.Info("rate limiter gRPC server listening", "port", cfg.GRPCPort)
	if err := srv.Serve(ctx, lis); err != nil {
		logger.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
