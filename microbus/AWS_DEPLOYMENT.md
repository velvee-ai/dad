# Deploying Microbus to AWS

This guide covers multiple approaches for deploying your Microbus microservices application to AWS.

## Deployment Options

1. **AWS ECS (Elastic Container Service)** - Recommended for most use cases
2. **AWS EKS (Elastic Kubernetes Service)** - For teams already using Kubernetes
3. **AWS EC2** - For direct VM deployment
4. **AWS App Runner** - Simplest option for containerized apps

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed locally
- Microbus application tested locally

## Option 1: AWS ECS Deployment (Recommended)

### Architecture Overview

```
┌─────────────────┐
│  Application    │
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────────────────────┐
    │                         │
┌───▼────────┐      ┌────────▼────┐
│ ECS Service│      │ ECS Service │
│ (Microbus) │      │   (NATS)    │
└────────────┘      └─────────────┘
         │                  │
    ┌────┴──────────────────┴────┐
    │                             │
┌───▼────────┐          ┌────────▼────┐
│  Grafana   │          │  CloudWatch │
│ (Optional) │          │   Logs      │
└────────────┘          └─────────────┘
```

### Step 1: Containerize Your Application

Create a `Dockerfile` in the `microbus/` directory:

```dockerfile
# microbus/Dockerfile
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
WORKDIR /app/main
RUN CGO_ENABLED=0 GOOS=linux go build -o /microbus-app .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary
COPY --from=builder /microbus-app .

# Copy config file
COPY --from=builder /app/main/config.yaml ./config.yaml

EXPOSE 8080

CMD ["./microbus-app"]
```

Build and test locally:

```bash
cd microbus
docker build -t microbus-app:latest .
docker run -p 8080:8080 microbus-app:latest
```

### Step 2: Set Up ECR (Elastic Container Registry)

```bash
# Create ECR repository
aws ecr create-repository --repository-name microbus-app --region us-east-1

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag microbus-app:latest \
  <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/microbus-app:latest

docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/microbus-app:latest
```

### Step 3: Deploy NATS on AWS

**Option A: Use AWS MQ (Managed Message Broker)**

AWS doesn't have native NATS support, so you'll need to run NATS in ECS:

```bash
# Create NATS task definition
aws ecs register-task-definition \
  --cli-input-json file://nats-task-definition.json
```

**nats-task-definition.json:**

```json
{
  "family": "nats-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "nats",
      "image": "nats:2-alpine",
      "portMappings": [
        {
          "containerPort": 4222,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nats",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "nats"
        }
      }
    }
  ]
}
```

**Option B: Use NATS JetStream with Persistent Storage**

For production, use ECS with EFS for NATS persistence.

### Step 4: Create ECS Cluster and Services

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name microbus-cluster --region us-east-1

# Create task definition for your app
aws ecs register-task-definition \
  --cli-input-json file://microbus-task-definition.json

# Create service
aws ecs create-service \
  --cluster microbus-cluster \
  --service-name microbus-app \
  --task-definition microbus-app:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

**microbus-task-definition.json:**

```json
{
  "family": "microbus-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "microbus-app",
      "image": "<your-account-id>.dkr.ecr.us-east-1.amazonaws.com/microbus-app:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NATS_URL",
          "value": "nats://nats-service.local:4222"
        },
        {
          "name": "OTEL_EXPORTER_OTLP_ENDPOINT",
          "value": "http://grafana.local:4317"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/microbus-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "app"
        }
      }
    }
  ]
}
```

### Step 5: Set Up Application Load Balancer

```bash
# Create application load balancer
aws elbv2 create-load-balancer \
  --name microbus-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name microbus-targets \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-xxx \
  --target-type ip \
  --health-check-path /health

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<target-group-arn>

# Update ECS service to use load balancer
aws ecs update-service \
  --cluster microbus-cluster \
  --service microbus-app \
  --load-balancers targetGroupArn=<target-group-arn>,containerName=microbus-app,containerPort=8080
```

## Option 2: AWS EKS Deployment

For Kubernetes-based deployment, create Kubernetes manifests:

### NATS Deployment

```yaml
# k8s/nats-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2-alpine
        ports:
        - containerPort: 4222
---
apiVersion: v1
kind: Service
metadata:
  name: nats
spec:
  selector:
    app: nats
  ports:
  - port: 4222
    targetPort: 4222
```

### Microbus Application Deployment

```yaml
# k8s/microbus-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microbus-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: microbus-app
  template:
    metadata:
      labels:
        app: microbus-app
    spec:
      containers:
      - name: microbus-app
        image: <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/microbus-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: NATS_URL
          value: "nats://nats:4222"
---
apiVersion: v1
kind: Service
metadata:
  name: microbus-app
spec:
  type: LoadBalancer
  selector:
    app: microbus-app
  ports:
  - port: 80
    targetPort: 8080
```

Deploy to EKS:

```bash
# Create EKS cluster
eksctl create cluster --name microbus-cluster --region us-east-1

# Deploy NATS
kubectl apply -f k8s/nats-deployment.yaml

# Deploy Microbus app
kubectl apply -f k8s/microbus-deployment.yaml

# Get load balancer URL
kubectl get service microbus-app
```

## Option 3: Terraform Infrastructure as Code

Create a complete AWS infrastructure with Terraform:

```hcl
# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "microbus-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  enable_dns_hostnames = true
}

module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws"

  cluster_name = "microbus-cluster"
}

# Add more resources as needed
```

## Environment Variables and Configuration

Update your `config.yaml` to use environment variables:

```yaml
# microbus/main/config.yaml
http.ingress.core:
  Ports: ${HTTP_PORT:-8080}

# NATS connection (configured via environment)
# NATS_URL: nats://your-nats-server:4222
```

## Observability on AWS

### Option 1: AWS CloudWatch

Update task definitions to send logs to CloudWatch:

```json
"logConfiguration": {
  "logDriver": "awslogs",
  "options": {
    "awslogs-group": "/ecs/microbus",
    "awslogs-region": "us-east-1",
    "awslogs-stream-prefix": "microbus"
  }
}
```

### Option 2: AWS Managed Grafana

1. Create AWS Managed Grafana workspace
2. Configure OTLP endpoint to send telemetry
3. Set up dashboards for Microbus metrics

```bash
# Create Grafana workspace
aws grafana create-workspace \
  --account-access-type CURRENT_ACCOUNT \
  --authentication-providers AWS_SSO \
  --permission-type SERVICE_MANAGED \
  --workspace-name microbus-grafana
```

## Security Best Practices

1. **Use Secrets Manager for sensitive data:**

```bash
# Store NATS credentials
aws secretsmanager create-secret \
  --name microbus/nats-creds \
  --secret-string '{"username":"nats-user","password":"secure-password"}'
```

2. **Use IAM roles for ECS tasks:**

```json
{
  "taskRoleArn": "arn:aws:iam::account-id:role/microbusTaskRole",
  "executionRoleArn": "arn:aws:iam::account-id:role/ecsTaskExecutionRole"
}
```

3. **Configure Security Groups:**

```bash
# Allow traffic only from ALB
aws ec2 authorize-security-group-ingress \
  --group-id sg-app \
  --protocol tcp \
  --port 8080 \
  --source-group sg-alb
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: microbus-app
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd microbus
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster microbus-cluster \
            --service microbus-app \
            --force-new-deployment
```

## Monitoring and Scaling

### Auto Scaling Configuration

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/microbus-cluster/microbus-app \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/microbus-cluster/microbus-app \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Cost Optimization

1. **Use Fargate Spot for non-critical workloads**
2. **Set up auto-scaling based on metrics**
3. **Use AWS Compute Savings Plans**
4. **Monitor with AWS Cost Explorer**

## Troubleshooting

### Check ECS service status
```bash
aws ecs describe-services \
  --cluster microbus-cluster \
  --services microbus-app
```

### View logs
```bash
aws logs tail /ecs/microbus-app --follow
```

### Test connectivity to NATS
```bash
# Execute command in running container
aws ecs execute-command \
  --cluster microbus-cluster \
  --task <task-id> \
  --container microbus-app \
  --interactive \
  --command "/bin/sh"
```

## Next Steps

1. Set up CloudWatch alarms for critical metrics
2. Configure AWS WAF for web application firewall
3. Set up AWS Backup for NATS data persistence
4. Implement blue/green deployments with ECS
5. Set up AWS X-Ray for distributed tracing

## Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Microbus Framework Docs](https://github.com/microbus-io/fabric)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
