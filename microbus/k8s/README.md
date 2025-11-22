# Kubernetes Deployment for Microbus

This directory contains Kubernetes manifests for deploying the Microbus application to AWS EKS or any Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or local)
- `kubectl` configured to access your cluster
- Docker image pushed to a container registry (ECR, Docker Hub, etc.)

## Quick Start

### 1. Create the namespace

```bash
kubectl apply -f nats-deployment.yaml
```

This will create the `microbus` namespace along with NATS.

### 2. Update the image reference

Edit `microbus-deployment.yaml` and replace `<AWS_ACCOUNT_ID>` with your actual AWS account ID:

```yaml
image: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/microbus-app:latest
```

### 3. Deploy the application

```bash
kubectl apply -f microbus-deployment.yaml
```

### 4. Deploy Grafana (optional)

```bash
kubectl apply -f grafana-deployment.yaml
```

### 5. Verify the deployment

```bash
# Check all resources
kubectl get all -n microbus

# Check pods
kubectl get pods -n microbus

# Check services
kubectl get svc -n microbus

# Get the LoadBalancer URL
kubectl get svc microbus-app -n microbus -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Configuration

### Environment Variables

The application accepts the following environment variables (configured in `microbus-deployment.yaml`):

- `NATS_URL`: NATS server URL (default: `nats://nats.microbus.svc.cluster.local:4222`)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry collector endpoint
- `HTTP_PORT`: HTTP server port (default: `8080`)

### ConfigMap

Application configuration is managed through a ConfigMap. Edit the `config.yaml` section in `microbus-deployment.yaml` to customize settings.

## Scaling

The deployment includes a HorizontalPodAutoscaler (HPA) that automatically scales based on CPU and memory usage:

- **Min replicas**: 2
- **Max replicas**: 10
- **CPU target**: 70%
- **Memory target**: 80%

To manually scale:

```bash
kubectl scale deployment microbus-app -n microbus --replicas=5
```

## Monitoring

### View logs

```bash
# All pods
kubectl logs -f -l app=microbus-app -n microbus

# Specific pod
kubectl logs -f <pod-name> -n microbus

# Previous container logs (if crashed)
kubectl logs <pod-name> -n microbus --previous
```

### Describe resources

```bash
kubectl describe deployment microbus-app -n microbus
kubectl describe pod <pod-name> -n microbus
```

### Port forwarding for local access

```bash
# Forward Microbus app
kubectl port-forward -n microbus svc/microbus-app 8080:80

# Forward Grafana
kubectl port-forward -n microbus svc/grafana 3000:80

# Forward NATS
kubectl port-forward -n microbus svc/nats 4222:4222
```

## Storage

The deployment uses PersistentVolumeClaims (PVC) for:

- **NATS**: 10Gi for JetStream data persistence
- **Grafana**: 10Gi for dashboard and configuration data

Storage class is set to `gp3` (AWS EBS). Update this in the manifests if using a different cloud provider.

## AWS EKS Specific

### Create EKS cluster

```bash
eksctl create cluster \
  --name microbus-cluster \
  --region us-east-1 \
  --nodegroup-name microbus-nodes \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed
```

### Set up AWS Load Balancer Controller

```bash
# Add the EKS chart repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install AWS Load Balancer Controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=microbus-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Use AWS EBS CSI Driver

```bash
# Install the EBS CSI driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.25"
```

## Security

### Network Policies

Create network policies to restrict traffic between pods:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: microbus-app-netpol
  namespace: microbus
spec:
  podSelector:
    matchLabels:
      app: microbus-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: nats
    ports:
    - protocol: TCP
      port: 4222
```

### Resource Limits

Resource limits are configured in the deployment manifests:

- **CPU requests**: 250m
- **CPU limits**: 1000m
- **Memory requests**: 512Mi
- **Memory limits**: 1Gi

## Troubleshooting

### Pod not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n microbus

# Check logs
kubectl logs <pod-name> -n microbus

# Check if image pull succeeded
kubectl get events -n microbus --sort-by='.lastTimestamp'
```

### Service not accessible

```bash
# Check service endpoints
kubectl get endpoints microbus-app -n microbus

# Check if LoadBalancer was created
kubectl get svc microbus-app -n microbus

# Describe service for events
kubectl describe svc microbus-app -n microbus
```

### NATS connection issues

```bash
# Test NATS connectivity from a pod
kubectl run -it --rm --restart=Never nats-test --image=nats:2-alpine -n microbus -- nats server ping nats:4222
```

## Cleanup

To remove all resources:

```bash
kubectl delete namespace microbus
```

Or individually:

```bash
kubectl delete -f grafana-deployment.yaml
kubectl delete -f microbus-deployment.yaml
kubectl delete -f nats-deployment.yaml
```

## Production Considerations

1. **Use Ingress instead of LoadBalancer** for better control and SSL termination
2. **Set up Pod Disruption Budgets** for high availability
3. **Enable Pod Security Policies** or Pod Security Standards
4. **Use Secrets for sensitive data** instead of environment variables
5. **Set up monitoring with Prometheus and Grafana**
6. **Configure backup for persistent volumes**
7. **Use GitOps tools** like ArgoCD or Flux for declarative deployments
