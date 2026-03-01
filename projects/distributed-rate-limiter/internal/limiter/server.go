package limiter

import (
	"context"
	"log/slog"
	"net"
)

// Config holds configuration for the rate limiter server.
type Config struct {
	RedisAddr      string
	PostgresDSN    string
	GRPCPort       string
	PrometheusPort string
	FailOpen       bool
}

// Algorithm selects the rate limiting strategy.
type Algorithm int

const (
	TokenBucket   Algorithm = iota // Burst-tolerant; Lua atomic read/refill/decrement
	SlidingWindow                  // Strict per-second; Redis sorted set of timestamps
)

// CheckRequest is the input to a rate limit check.
type CheckRequest struct {
	TenantID string
	UserID   string
	Endpoint string
}

// CheckResponse is the result of a rate limit check.
type CheckResponse struct {
	Allowed   bool
	Remaining int32
	ResetInMs int64
}

// Server is the gRPC rate limiter server.
type Server struct {
	cfg    Config
	logger *slog.Logger
}

// NewServer creates a new rate limiter Server.
func NewServer(cfg Config, logger *slog.Logger) *Server {
	return &Server{cfg: cfg, logger: logger}
}

// Check evaluates a rate limit for the given request.
// In production this executes a Lua script on Redis for atomic token bucket
// or sliding-window enforcement. The implementation is omitted here to keep
// the project dependency-free for demonstration purposes.
func (s *Server) Check(_ context.Context, req CheckRequest) (CheckResponse, error) {
	s.logger.Debug("rate limit check", "tenant", req.TenantID, "endpoint", req.Endpoint)
	// Stub: always allow in demo mode
	return CheckResponse{Allowed: true, Remaining: 99, ResetInMs: 10000}, nil
}

// Serve starts the gRPC server and blocks until ctx is cancelled.
func (s *Server) Serve(ctx context.Context, lis net.Listener) error {
	s.logger.Info("serving gRPC", "addr", lis.Addr())
	defer lis.Close()
	<-ctx.Done()
	s.logger.Info("shutting down rate limiter server")
	return nil
}
