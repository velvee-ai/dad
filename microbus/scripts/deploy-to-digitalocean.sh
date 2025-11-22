#!/bin/bash
# Complete deployment script for Microbus to DigitalOcean

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
REGION="${DO_REGION:-nyc1}"
# Convert region to lowercase (DO requires lowercase slugs)
REGION=$(echo "$REGION" | tr '[:upper:]' '[:lower:]')
CLUSTER_NAME="${CLUSTER_NAME:-microbus-cluster}"
REGISTRY_NAME="${REGISTRY_NAME:-microbus-registry}"
NODE_SIZE="${NODE_SIZE:-s-2vcpu-4gb}"
NODE_COUNT="${NODE_COUNT:-3}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Microbus DigitalOcean Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}doctl CLI is not installed${NC}"
    echo "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo -e "${RED}Not authenticated with DigitalOcean${NC}"
    echo "Run: doctl auth init"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Region: $REGION"
echo "  Cluster: $CLUSTER_NAME"
echo "  Registry: $REGISTRY_NAME"
echo "  Node Size: $NODE_SIZE"
echo "  Node Count: $NODE_COUNT"
echo ""

# Step 1: Create or use existing registry
echo -e "${YELLOW}Step 1: Setting up Container Registry${NC}"
if doctl registry get $REGISTRY_NAME &> /dev/null; then
    echo "Registry '$REGISTRY_NAME' already exists"
else
    echo "Creating registry '$REGISTRY_NAME'..."
    doctl registry create $REGISTRY_NAME --region $REGION
fi

# Login to registry
echo "Logging in to registry..."
doctl registry login

# Step 2: Build and push Docker image
echo ""
echo -e "${YELLOW}Step 2: Building and pushing Docker image${NC}"
cd "$(dirname "$0")/.."

if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Dockerfile not found${NC}"
    exit 1
fi

IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="registry.digitalocean.com/$REGISTRY_NAME/microbus-app"

echo "Building image: $IMAGE_NAME:$IMAGE_TAG"
docker build -t $IMAGE_NAME:$IMAGE_TAG .
docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest

echo "Pushing image to registry..."
docker push $IMAGE_NAME:$IMAGE_TAG
docker push $IMAGE_NAME:latest

# Step 3: Create Kubernetes cluster
echo ""
echo -e "${YELLOW}Step 3: Setting up Kubernetes cluster${NC}"
if doctl kubernetes cluster get $CLUSTER_NAME &> /dev/null; then
    echo "Cluster '$CLUSTER_NAME' already exists"
else
    echo "Creating cluster '$CLUSTER_NAME' (this takes 3-5 minutes)..."
    doctl kubernetes cluster create $CLUSTER_NAME \
        --region $REGION \
        --version 1.28.2-do.0 \
        --node-pool "name=${CLUSTER_NAME}-pool;size=$NODE_SIZE;count=$NODE_COUNT;auto-scale=true;min-nodes=2;max-nodes=5" \
        --wait
fi

# Step 4: Configure kubectl
echo ""
echo -e "${YELLOW}Step 4: Configuring kubectl${NC}"
doctl kubernetes cluster kubeconfig save $CLUSTER_NAME

# Verify connection
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Failed to connect to cluster${NC}"
    exit 1
fi
echo "Connected to cluster successfully"

# Step 5: Update Kubernetes manifests
echo ""
echo -e "${YELLOW}Step 5: Updating Kubernetes manifests${NC}"
cd k8s

# Backup original files
for file in microbus-deployment.yaml nats-deployment.yaml grafana-deployment.yaml; do
    if [ -f "$file" ]; then
        cp "$file" "$file.bak"
    fi
done

# Update image references
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|image: .*microbus-app:.*|image: $IMAGE_NAME:latest|g" microbus-deployment.yaml
    sed -i '' "s|storageClassName: gp3|storageClassName: do-block-storage|g" *.yaml
else
    # Linux
    sed -i "s|image: .*microbus-app:.*|image: $IMAGE_NAME:latest|g" microbus-deployment.yaml
    sed -i "s|storageClassName: gp3|storageClassName: do-block-storage|g" *.yaml
fi

# Step 6: Deploy to Kubernetes
echo ""
echo -e "${YELLOW}Step 6: Deploying to Kubernetes${NC}"

echo "Deploying NATS..."
kubectl apply -f nats-deployment.yaml

echo "Deploying Microbus application..."
kubectl apply -f microbus-deployment.yaml

echo "Deploying Grafana (optional)..."
kubectl apply -f grafana-deployment.yaml || echo "Grafana deployment skipped"

# Step 7: Wait for LoadBalancer
echo ""
echo -e "${YELLOW}Step 7: Waiting for LoadBalancer IP${NC}"
echo "This may take 1-2 minutes..."

# Wait for service to be created
kubectl wait --for=condition=ready pod -l app=microbus-app -n microbus --timeout=300s 2>/dev/null || true

# Get LoadBalancer IP
EXTERNAL_IP=""
for i in {1..30}; do
    EXTERNAL_IP=$(kubectl get svc microbus-app -n microbus -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$EXTERNAL_IP" ]; then
        break
    fi
    echo "Waiting for LoadBalancer IP... ($i/30)"
    sleep 10
done

# Restore backup files
cd ..
for file in k8s/*.bak; do
    if [ -f "$file" ]; then
        original="${file%.bak}"
        mv "$file" "$original"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ -n "$EXTERNAL_IP" ]; then
    echo -e "${GREEN}🌐 Application URL:${NC}"
    echo "   http://$EXTERNAL_IP/helloworld.example/?name=World"
    echo ""
    echo "Test it:"
    echo "   curl \"http://$EXTERNAL_IP/helloworld.example/?name=World\""
else
    echo -e "${YELLOW}LoadBalancer IP not yet assigned${NC}"
    echo "Check status with:"
    echo "   kubectl get svc microbus-app -n microbus"
fi

echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  # View pods"
echo "  kubectl get pods -n microbus"
echo ""
echo "  # View logs"
echo "  kubectl logs -f -l app=microbus-app -n microbus"
echo ""
echo "  # View services"
echo "  kubectl get svc -n microbus"
echo ""
echo "  # Access Grafana"
echo "  kubectl get svc grafana -n microbus"
echo ""
echo "  # Scale application"
echo "  kubectl scale deployment microbus-app -n microbus --replicas=5"
