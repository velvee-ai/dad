# Microbus Fabric Framework Setup

This repository now includes the [Microbus Fabric](https://github.com/microbus-io/fabric) framework - a holistic open source framework for the development, testing, deployment & operation of microservices at scale.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Go** (version 1.24.3 or later)
   - Check your version: `go version`
   - Download from: https://golang.org/dl/

2. **Docker Desktop** (for running NATS and Grafana)
   - Download from: https://www.docker.com/products/docker-desktop
   - Alternative: Install NATS and Grafana manually

3. **Network connectivity** for downloading Go dependencies

## Quick Start

### Step 1: Start Infrastructure Services

Navigate to the microbus/setup directory and start NATS and Grafana using Docker Compose:

```bash
cd microbus/setup
docker compose -f microbus.yaml -p microbus up -d
```

This will start:
- **NATS** on port 4222 (messaging broker)
- **Grafana LGTM** on port 3000 (observability and telemetry)
- **OpenTelemetry** collectors on ports 4317-4318

To verify the services are running:
```bash
docker ps
```

### Step 2: Download Dependencies

If you haven't already, download the Go module dependencies:

```bash
cd microbus
go mod tidy
```

**Note:** If you encounter network errors, ensure you have internet connectivity and DNS resolution is working properly.

### Step 3: Run the Application

Navigate to the microbus/main directory and run the application:

```bash
cd microbus/main
go run main.go
```

Alternatively, if you're using VS Code:
- Press `F5`
- Select "Run Microbus Application" from the launch configurations

### Step 4: Test the Application

Once the application is running, you can test the example service:

**Hello World Service:**
```bash
curl "http://localhost:8080/helloworld.example/?name=YourName"
```

Expected response:
```
Hello, YourName!
```

### Step 5: Access Monitoring

Open Grafana for metrics and traces:
```
http://localhost:3000
```

## Project Structure

```
dad/
└── microbus/                   # Microbus framework
    ├── setup/                  # Infrastructure setup
    │   ├── microbus.yaml      # Docker Compose configuration
    │   └── grafana/
    │       └── dashboards/    # Grafana dashboard configurations
    ├── main/                   # Main application entry point
    │   ├── main.go            # Application bootstrap
    │   └── config.yaml        # Service configuration
    ├── examples/               # Example microservices
    │   └── helloworld/        # Simple hello world service
    │       └── service.go
    ├── go.mod                  # Go module definition
    └── go.sum                  # Go dependencies checksums
```

## Configuration

Service configuration is managed through `main/config.yaml`. You can configure:

- HTTP ingress ports
- Time budgets
- Service-specific settings

Example configuration:
```yaml
http.ingress.core:
  Ports: 8080
#  TimeBudget: 20s
```

## Creating New Microservices

To create a new microservice:

1. Create a new directory under `examples/` or your own services directory
2. Implement the service using the Microbus connector pattern
3. Add the service to `main/main.go`
4. Restart the application

### Example Service Template

```go
package myservice

import (
    "context"
    "net/http"
    "github.com/microbus-io/fabric/connector"
)

type Service struct {
    *connector.Connector
}

func NewService() *Service {
    svc := &Service{}
    svc.Connector = connector.New("myservice.example")
    svc.Connector.Subscribe("GET", "/endpoint", svc.handleRequest)
    return svc
}

func (svc *Service) handleRequest(w http.ResponseWriter, r *http.Request) (err error) {
    // Your handler logic here
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Response"))
    return nil
}

func (svc *Service) OnStartup(ctx context.Context) (err error) {
    return nil
}

func (svc *Service) OnShutdown(ctx context.Context) (err error) {
    return nil
}
```

Then add to `main/main.go`:
```go
import "github.com/velvee-ai/dad/microbus/examples/myservice"

// In main():
app.Add(
    myservice.NewService(),
)
```

## Stopping the Infrastructure

To stop the NATS and Grafana services:

```bash
cd microbus/setup
docker compose -f microbus.yaml -p microbus down
```

## Troubleshooting

### Dependencies Won't Download

If you encounter errors like "dial tcp: lookup storage.googleapis.com":
1. Check your internet connection
2. Verify DNS resolution: `nslookup storage.googleapis.com`
3. Check your firewall settings
4. Try using a different DNS server

### Services Won't Start

1. Ensure Docker is running: `docker ps`
2. Check if ports are already in use:
   - Port 4222 (NATS)
   - Port 8080 (HTTP Ingress)
   - Port 3000 (Grafana)
3. Check the application logs for errors

### Can't Access HTTP Endpoints

1. Verify the application is running
2. Check the configured port in `main/config.yaml`
3. Ensure no firewall is blocking the port

## Deploying to Production

Ready to deploy to the cloud? Choose your platform:

### 📖 [DigitalOcean Deployment →](DIGITALOCEAN_DEPLOYMENT.md) ⭐ Recommended for Startups

**Why DigitalOcean?**
- ✅ **Simpler**: Easy setup, transparent pricing
- ✅ **Cheaper**: From $36/month (vs $55+ on AWS)
- ✅ **Free $200 credit**: 60-day trial
- ✅ **Great docs**: Beginner-friendly

**Quick Deploy:**
```bash
./scripts/deploy-to-digitalocean.sh
```

### 📖 [AWS Deployment →](AWS_DEPLOYMENT.md)

**Why AWS?**
- ✅ **Enterprise features**: Advanced IAM, compliance
- ✅ **Global reach**: More regions worldwide
- ✅ **Ecosystem**: Integrates with other AWS services

**Quick Deploy:**
```bash
./scripts/deploy-to-ecr.sh
cd terraform && terraform apply
```

### Deployment Features (Both Platforms)

- **Infrastructure as Code** with Terraform
- **CI/CD pipelines** with GitHub Actions
- **Observability** with Grafana
- **Auto-scaling** and load balancing
- **Security best practices**

## Learn More

- [Microbus Fabric Documentation](https://github.com/microbus-io/fabric/tree/main/docs)
- [Quick Start Guide](https://github.com/microbus-io/fabric/blob/main/docs/howto/quick-start.md)
- [Examples](https://github.com/microbus-io/fabric/tree/main/examples)
- [AWS Deployment Guide](AWS_DEPLOYMENT.md)
- [DigitalOcean Deployment Guide](DIGITALOCEAN_DEPLOYMENT.md)

## Key Features

- **Fast Messaging Bus**: Up to 10X faster than HTTP/1.1
- **Code Generation**: Automatic skeleton and client stub generation
- **Observability**: Distributed tracing, structured logging, and metrics
- **Configuration Management**: Centralized service configuration
- **Integration Testing**: Test across multiple microservices
- **OpenAPI Support**: Automatic API documentation

## Architecture

The Microbus framework uses:
- **NATS** for inter-service communication
- **OpenTelemetry** for distributed tracing
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **HTTP Ingress** for external API access

## License

The Microbus Fabric framework is licensed under Apache 2.0.
