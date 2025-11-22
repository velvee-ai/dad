# Multi-stage build for Microbus application
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
WORKDIR /app/main
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /microbus-app .

# Final stage - minimal runtime image
FROM alpine:latest

# Install CA certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 microbus && \
    adduser -D -u 1000 -G microbus microbus

WORKDIR /home/microbus

# Copy the binary and config
COPY --from=builder /microbus-app ./microbus-app
COPY --from=builder /app/main/config.yaml ./config.yaml

# Change ownership
RUN chown -R microbus:microbus /home/microbus

# Switch to non-root user
USER microbus

# Expose HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./microbus-app"]
