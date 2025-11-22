# Deploying Microbus to DigitalOcean

This guide covers deploying your Microbus microservices application to DigitalOcean using Kubernetes (DOKS).

## Why DigitalOcean?

- **Simpler pricing**: Predictable, transparent costs
- **Easier setup**: Less complex than AWS
- **Great for startups**: $200 free credit for 60 days
- **Managed Kubernetes**: DOKS is simple and reliable
- **Integrated services**: Container Registry, Load Balancers, Volumes

## Deployment Options

1. **DigitalOcean Kubernetes (DOKS)** - Recommended
2. **App Platform** - Simplest (PaaS)
3. **Droplets** - Direct VM deployment

## Prerequisites

- DigitalOcean account
- `doctl` CLI installed and configured
- Docker installed locally
- `kubectl` installed

## Option 1: DigitalOcean Kubernetes (DOKS) - Recommended

### Architecture

```
┌─────────────────────┐
│  Load Balancer      │ (DO LB)
│  (Managed)          │
└──────────┬──────────┘
           │
    ┌──────┴────────┐
    │               │
┌───▼────┐   ┌─────▼────┐
│ NATS   │   │ Microbus │
│ Pod    │   │ Pods     │
└────────┘   └──────────┘
           │
    ┌──────┴──────┐
    │ Persistent  │
    │ Volumes     │
    └─────────────┘
```

### Step 1: Install doctl CLI

```bash
# macOS
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.98.0/doctl-1.98.0-linux-amd64.tar.gz
tar xf doctl-1.98.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init
```

### Step 2: Create Container Registry

```bash
# Create registry (one-time setup)
doctl registry create microbus-registry

# Login to registry
doctl registry login

# Get registry name
REGISTRY_NAME=$(doctl registry get --format Name --no-header)
echo "Registry: registry.digitalocean.com/$REGISTRY_NAME"
```

### Step 3: Build and Push Docker Image

```bash
cd microbus

# Build image
docker build -t microbus-app:latest .

# Tag for DO registry
docker tag microbus-app:latest \
  registry.digitalocean.com/$REGISTRY_NAME/microbus-app:latest

# Push to registry
docker push registry.digitalocean.com/$REGISTRY_NAME/microbus-app:latest
```

### Step 4: Create Kubernetes Cluster

```bash
# Create cluster (takes 3-5 minutes)
doctl kubernetes cluster create microbus-cluster \
  --region nyc1 \
  --version 1.28.2-do.0 \
  --node-pool "name=microbus-pool;size=s-2vcpu-4gb;count=3;auto-scale=true;min-nodes=2;max-nodes=5"

# Get kubeconfig
doctl kubernetes cluster kubeconfig save microbus-cluster

# Verify connection
kubectl cluster-info
```

### Step 5: Deploy Application

```bash
# Deploy using our Kubernetes manifests
cd k8s

# Update image in microbus-deployment.yaml
# Replace <AWS_ACCOUNT_ID> with your DO registry:
# registry.digitalocean.com/YOUR_REGISTRY/microbus-app:latest

# Apply manifests
kubectl apply -f nats-deployment.yaml
kubectl apply -f microbus-deployment.yaml
kubectl apply -f grafana-deployment.yaml

# Wait for LoadBalancer
kubectl get svc microbus-app -n microbus --watch
```

### Step 6: Access Your Application

```bash
# Get LoadBalancer IP
EXTERNAL_IP=$(kubectl get svc microbus-app -n microbus -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test
curl "http://$EXTERNAL_IP/helloworld.example/?name=World"
```

## Option 2: Using Terraform (Infrastructure as Code)

### Install Terraform Provider

The Terraform configuration is in `terraform-do/` directory.

```bash
cd terraform-do

# Initialize
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
do_token = "your-digitalocean-token"
region = "nyc1"
cluster_name = "microbus-cluster"
node_size = "s-2vcpu-4gb"
node_count = 3
EOF

# Plan
terraform plan

# Apply
terraform apply
```

## Option 3: DigitalOcean App Platform (Simplest)

App Platform is DO's PaaS - no Kubernetes knowledge needed!

### Using the UI

1. Go to DigitalOcean Console → App Platform
2. Click "Create App"
3. Connect your GitHub repository
4. Select the `microbus` directory
5. Configure:
   - **Service**: Web Service
   - **Dockerfile Path**: microbus/Dockerfile
   - **HTTP Port**: 8080
6. Add environment variables:
   - `NATS_URL`: (use managed NATS or deploy separately)
7. Choose instance size: Basic ($5/month)
8. Deploy!

### Using doctl

```bash
# Create app spec
cat > app-spec.yaml <<EOF
name: microbus-app
services:
- name: web
  dockerfile_path: microbus/Dockerfile
  github:
    repo: your-username/dad
    branch: main
    deploy_on_push: true
  http_port: 8080
  instance_count: 2
  instance_size_slug: basic-xs
  routes:
  - path: /
  envs:
  - key: HTTP_PORT
    value: "8080"
EOF

# Create app
doctl apps create --spec app-spec.yaml

# Get app info
doctl apps list
```

## Pricing Comparison

### DOKS (Kubernetes)

**Cluster**:
- 3 nodes × s-2vcpu-4gb: $36/month
- Load Balancer: $12/month
- **Total: ~$48/month**

**With autoscaling (2-5 nodes)**:
- Min: $24/month (2 nodes)
- Max: $60/month (5 nodes)
- Load Balancer: $12/month
- **Total: $36-72/month**

### App Platform

- Basic: $5/month per container
- 2 instances: $10/month
- **Total: ~$10/month** (but less control)

### Storage & Bandwidth

- Volume Storage: $0.10/GB/month
- Bandwidth: 1TB free, then $0.01/GB

## Complete Deployment Script

```bash
#!/bin/bash
# Complete DO deployment

set -e

# Configuration
REGION="nyc1"
CLUSTER_NAME="microbus-cluster"
REGISTRY_NAME="microbus-registry"

echo "🚀 Starting DigitalOcean deployment..."

# 1. Create registry if needed
echo "📦 Setting up Container Registry..."
doctl registry create $REGISTRY_NAME 2>/dev/null || echo "Registry exists"
doctl registry login

# 2. Build and push image
echo "🏗️  Building Docker image..."
cd microbus
docker build -t microbus-app:latest .
docker tag microbus-app:latest registry.digitalocean.com/$REGISTRY_NAME/microbus-app:latest
docker push registry.digitalocean.com/$REGISTRY_NAME/microbus-app:latest

# 3. Create cluster if needed
echo "☸️  Setting up Kubernetes cluster..."
if ! doctl kubernetes cluster get $CLUSTER_NAME &>/dev/null; then
  doctl kubernetes cluster create $CLUSTER_NAME \
    --region $REGION \
    --version 1.28.2-do.0 \
    --node-pool "name=microbus-pool;size=s-2vcpu-4gb;count=3"
fi

# 4. Get kubeconfig
doctl kubernetes cluster kubeconfig save $CLUSTER_NAME

# 5. Update image in manifest
sed -i.bak "s|<AWS_ACCOUNT_ID>.*microbus-app:latest|registry.digitalocean.com/$REGISTRY_NAME/microbus-app:latest|" k8s/microbus-deployment.yaml

# 6. Deploy
echo "🚢 Deploying to Kubernetes..."
kubectl apply -f k8s/nats-deployment.yaml
kubectl apply -f k8s/microbus-deployment.yaml

# 7. Wait for LoadBalancer
echo "⏳ Waiting for LoadBalancer..."
kubectl wait --for=condition=ready pod -l app=microbus-app -n microbus --timeout=300s

# 8. Get URL
EXTERNAL_IP=$(kubectl get svc microbus-app -n microbus -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "✅ Deployment complete!"
echo "🌐 Application URL: http://$EXTERNAL_IP/helloworld.example/?name=World"
```

## Monitoring & Logging

### Built-in DigitalOcean Monitoring

```bash
# Enable monitoring
doctl kubernetes cluster update microbus-cluster --enable-monitoring

# View metrics in DO Console
open "https://cloud.digitalocean.com/kubernetes/clusters/$(doctl kubernetes cluster get microbus-cluster -o json | jq -r '.[0].id')/monitoring"
```

### Custom Dashboards with Grafana

Already included in `k8s/grafana-deployment.yaml`

```bash
# Get Grafana LoadBalancer IP
kubectl get svc grafana -n microbus

# Access at http://<GRAFANA_IP>
```

## Autoscaling

### Horizontal Pod Autoscaler (HPA)

Already configured in `k8s/microbus-deployment.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: microbus-app-hpa
spec:
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Cluster Autoscaler

Enabled during cluster creation with `--auto-scale` flag.

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy-do.yml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Build and push image
        run: |
          doctl registry login
          cd microbus
          docker build -t registry.digitalocean.com/microbus-registry/microbus-app:${{ github.sha }} .
          docker push registry.digitalocean.com/microbus-registry/microbus-app:${{ github.sha }}

      - name: Update deployment
        run: |
          doctl kubernetes cluster kubeconfig save microbus-cluster
          kubectl set image deployment/microbus-app \
            microbus-app=registry.digitalocean.com/microbus-registry/microbus-app:${{ github.sha }} \
            -n microbus
```

## Troubleshooting

### Check cluster status
```bash
doctl kubernetes cluster get microbus-cluster
```

### View pod logs
```bash
kubectl logs -f -l app=microbus-app -n microbus
```

### Check resource usage
```bash
kubectl top nodes
kubectl top pods -n microbus
```

### Access pod shell
```bash
kubectl exec -it <pod-name> -n microbus -- /bin/sh
```

## Cleanup

### Delete cluster
```bash
doctl kubernetes cluster delete microbus-cluster
```

### Delete registry
```bash
doctl registry delete microbus-registry
```

### Delete LoadBalancer
```bash
kubectl delete svc microbus-app -n microbus
kubectl delete svc grafana -n microbus
```

## Cost Optimization Tips

1. **Use smaller nodes**: Start with `s-2vcpu-2gb` ($12/month)
2. **Reduce node count**: 2 nodes minimum for HA
3. **Use spot instances**: Not available yet on DO
4. **Scale down dev environments**: Delete when not in use
5. **Use App Platform**: For small workloads ($5-10/month)

## Security Best Practices

1. **Use private registry**: Already configured
2. **Enable VPC**: Isolate cluster networking
3. **Use secrets**: Never hardcode credentials
4. **Enable firewalls**: Restrict access to specific IPs
5. **Regular updates**: Keep cluster and images updated

## Advantages of DigitalOcean

✅ **Simpler** than AWS (no VPCs, subnets, NAT gateways)
✅ **Cheaper** for small-medium workloads
✅ **Faster** to get started
✅ **Transparent pricing** - know exactly what you'll pay
✅ **Great documentation** and community
✅ **Managed Kubernetes** without the complexity

## When to Use AWS Instead

- Need AWS-specific services (Lambda, DynamoDB, etc.)
- Global presence required (AWS has more regions)
- Enterprise features (advanced IAM, compliance)
- Already invested in AWS ecosystem

## Next Steps

1. Sign up for DigitalOcean (get $200 credit)
2. Install and configure `doctl`
3. Run the deployment script
4. Access your application!

## Resources

- [DigitalOcean Kubernetes Docs](https://docs.digitalocean.com/products/kubernetes/)
- [doctl Reference](https://docs.digitalocean.com/reference/doctl/)
- [Container Registry Guide](https://docs.digitalocean.com/products/container-registry/)
- [App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
