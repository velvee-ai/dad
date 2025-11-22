# DigitalOcean Terraform Configuration

Deploy Microbus to DigitalOcean Kubernetes using Terraform.

## Quick Start

### 1. Get DigitalOcean API Token

1. Go to https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Name it "Terraform" and enable both Read and Write scopes
4. Copy the token (you won't see it again!)

### 2. Configure Terraform

```bash
cd microbus/terraform-do

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars and add your token
nano terraform.tfvars
```

### 3. Deploy

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply (creates resources)
terraform apply
```

### 4. Deploy Application

```bash
# Get kubeconfig
doctl kubernetes cluster kubeconfig save microbus-cluster

# Build and push image
cd ..
docker build -t microbus-app:latest .
docker tag microbus-app:latest registry.digitalocean.com/microbus-registry/microbus-app:latest
doctl registry login
docker push registry.digitalocean.com/microbus-registry/microbus-app:latest

# Update k8s manifests with registry URL
sed -i 's|<AWS_ACCOUNT_ID>.*microbus-app:latest|registry.digitalocean.com/microbus-registry/microbus-app:latest|' k8s/microbus-deployment.yaml

# Deploy
kubectl apply -f k8s/
```

## What Gets Created

### Infrastructure

1. **Container Registry**: Private Docker registry
2. **Kubernetes Cluster**: 3-node DOKS cluster
3. **Persistent Volumes**: For NATS and Grafana data
4. **Namespace**: `microbus` namespace in Kubernetes
5. **Secrets**: Registry credentials for pulling images

### Costs

**Minimum (2 nodes)**:
- Cluster: 2 × s-2vcpu-4gb = $36/month
- Registry: Basic = $5/month
- Storage: 20GB = $2/month
- LoadBalancer: $12/month
- **Total: ~$55/month**

**Typical (3 nodes)**:
- Cluster: 3 × s-2vcpu-4gb = $54/month
- Registry: Basic = $5/month
- Storage: 20GB = $2/month
- LoadBalancer: $12/month
- **Total: ~$73/month**

## Configuration Options

### Regions

Choose the region closest to your users:

- **nyc1, nyc3**: New York (USA East Coast)
- **sfo3**: San Francisco (USA West Coast)
- **ams3**: Amsterdam (Europe)
- **sgp1**: Singapore (Asia Pacific)
- **lon1**: London (UK)
- **fra1**: Frankfurt (Germany)
- **tor1**: Toronto (Canada)
- **blr1**: Bangalore (India)

### Node Sizes

```hcl
# Small (development)
node_size = "s-2vcpu-2gb"  # $12/month - 2GB RAM

# Medium (recommended)
node_size = "s-2vcpu-4gb"  # $18/month - 4GB RAM

# Large (production)
node_size = "s-4vcpu-8gb"  # $36/month - 8GB RAM
```

### Autoscaling

```hcl
enable_auto_scale = true
min_nodes         = 2  # Minimum for HA
max_nodes         = 5  # Scale up to handle traffic
```

## Outputs

After `terraform apply`, you'll get:

```bash
# View all outputs
terraform output

# Get specific output
terraform output cluster_endpoint
terraform output image_repository

# Get deployment commands
terraform output -raw deployment_commands
```

## Managing the Cluster

### View Cluster Status

```bash
doctl kubernetes cluster get microbus-cluster
```

### Scale Manually

```bash
# Update terraform.tfvars
node_count = 5

# Apply changes
terraform apply
```

### Upgrade Kubernetes Version

```bash
# Check available versions
doctl kubernetes options versions

# Update terraform.tfvars
kubernetes_version = "1.29.1-do.0"

# Apply upgrade
terraform apply
```

## Monitoring

### DigitalOcean Console

View cluster metrics at:
https://cloud.digitalocean.com/kubernetes/clusters

### Using kubectl

```bash
# Get cluster info
kubectl cluster-info

# View nodes
kubectl get nodes

# View all resources
kubectl get all -n microbus

# View resource usage
kubectl top nodes
kubectl top pods -n microbus
```

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate
doctl auth init

# Refresh kubeconfig
doctl kubernetes cluster kubeconfig save microbus-cluster
```

### Registry Access Issues

```bash
# Login again
doctl registry login

# Test push
docker push registry.digitalocean.com/microbus-registry/test:latest
```

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n microbus

# Check logs
kubectl logs <pod-name> -n microbus

# Check events
kubectl get events -n microbus --sort-by='.lastTimestamp'
```

## Cleanup

### Destroy All Resources

```bash
terraform destroy
```

**Warning**: This deletes everything including data!

### Delete Only Cluster

```bash
terraform destroy -target=digitalocean_kubernetes_cluster.microbus
```

### Delete Only Registry

```bash
terraform destroy -target=digitalocean_container_registry.microbus
```

## CI/CD Integration

### GitHub Actions

Add this secret to your GitHub repository:
- `DIGITALOCEAN_ACCESS_TOKEN`: Your DO API token

See `../.github/workflows/deploy-digitalocean.yml` for the complete workflow.

### GitLab CI

```yaml
deploy:
  image: digitalocean/doctl:latest
  script:
    - doctl kubernetes cluster kubeconfig save $CLUSTER_ID
    - kubectl apply -f k8s/
  only:
    - main
```

## Best Practices

1. **Use separate environments**: Create different clusters for dev/staging/prod
2. **Enable monitoring**: Check DigitalOcean monitoring dashboard
3. **Regular backups**: Use velero for cluster backups
4. **Resource limits**: Set requests and limits in Kubernetes manifests
5. **Use secrets**: Never commit tokens to git

## Cost Optimization

1. **Start small**: Use 2 nodes with s-2vcpu-2gb ($24/month)
2. **Use autoscaling**: Scale down during off-hours
3. **Delete unused resources**: Remove test clusters
4. **Use free tier registry**: Starter tier for small images
5. **Monitor bandwidth**: 1TB included, then $0.01/GB

## Support

- [DigitalOcean Community](https://www.digitalocean.com/community)
- [Terraform DO Provider Docs](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs)
- [DOKS Documentation](https://docs.digitalocean.com/products/kubernetes/)
