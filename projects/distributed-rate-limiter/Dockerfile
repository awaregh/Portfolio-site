FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o rate-limiter ./cmd/server

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/rate-limiter .
COPY --from=builder /app/internal/limiter/*.lua ./internal/limiter/
CMD ["./rate-limiter"]
