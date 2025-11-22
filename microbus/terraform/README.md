# Terraform Deployment Guide

This directory contains Terraform configurations to deploy the Microbus application to AWS.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- AWS CLI configured with appropriate credentials
- Docker image pushed to ECR (use `../scripts/deploy-to-ecr.sh`)

## Quick Start

### 1. Initialize Terraform (Local State)

For local development with local state file:

```bash
cd microbus/terraform
terraform init
```

### 2. Configure Variables

Create a `terraform.tfvars` file from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` to customize your deployment:

```hcl
aws_region = "us-east-1"
project_name = "microbus"
environment = "dev"
app_count = 2
```

### 3. Plan the Deployment

Review what Terraform will create:

```bash
terraform plan
```

### 4. Deploy

Apply the configuration:

```bash
terraform apply
```

Type `yes` when prompted.

### 5. Get Outputs

After deployment, get important information:

```bash
# Get all outputs
terraform output

# Get ALB DNS name
terraform output alb_dns_name

# Get ECR repository URL
terraform output ecr_repository_url
```

## Using Remote State (S3 Backend)

For production or team environments, use S3 backend for state management.

### 1. Create S3 Bucket for State

```bash
# Create S3 bucket
aws s3 mb s3://microbus-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket microbus-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket microbus-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 2. (Optional) Create DynamoDB Table for State Locking

```bash
aws dynamodb create-table \
  --table-name microbus-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 3. Update Backend Configuration

Edit `backend.hcl` with your bucket name:

```hcl
bucket = "microbus-terraform-state"
key    = "microbus/terraform.tfstate"
region = "us-east-1"
dynamodb_table = "microbus-terraform-locks"  # if using state locking
encrypt = true
```

### 4. Update main.tf

Uncomment the backend block in `main.tf`:

```hcl
terraform {
  backend "s3" {}
}
```

### 5. Initialize with Backend

```bash
terraform init -backend-config=backend.hcl
```

## Resources Created

This Terraform configuration creates:

### Networking
- VPC with public and private subnets
- Internet Gateway
- NAT Gateway
- Route tables

### Compute
- ECS Cluster
- ECS Task Definitions (to be added)
- ECS Services (to be added)

### Load Balancing
- Application Load Balancer (ALB)
- Target Groups
- Listeners

### Security
- Security Groups for ALB and ECS tasks
- IAM roles for ECS task execution and task roles

### Container Registry
- ECR repository for application images

### Monitoring
- CloudWatch Log Groups

## Customization

### Change Region

Edit `terraform.tfvars`:

```hcl
aws_region = "us-west-2"
```

### Scale Application

```hcl
app_count = 5      # Number of tasks
app_cpu = 1024     # CPU units (1024 = 1 vCPU)
app_memory = 2048  # Memory in MB
```

### Change Environment

```hcl
environment = "production"
```

This affects:
- Resource naming
- NAT Gateway configuration (single for dev, multi for production)
- Tags

## Updating Infrastructure

### Update Application

After pushing a new image to ECR:

```bash
# Update the image in your task definition
# Then run:
terraform apply
```

### Modify Resources

1. Edit the Terraform files
2. Review changes: `terraform plan`
3. Apply changes: `terraform apply`

## Outputs

Important outputs after deployment:

- `alb_dns_name`: URL to access your application
- `ecr_repository_url`: ECR repository URL for pushing images
- `ecs_cluster_name`: ECS cluster name
- `cloudwatch_log_group_app`: CloudWatch log group for application logs

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will delete all resources including data. Make sure to backup any important data first.

## Common Operations

### View Current State

```bash
terraform show
```

### List Resources

```bash
terraform state list
```

### View Specific Resource

```bash
terraform state show aws_lb.main
```

### Import Existing Resources

If you have existing AWS resources:

```bash
terraform import aws_vpc.main vpc-xxxxx
```

## Troubleshooting

### "Error: No valid credential sources found"

Configure AWS credentials:

```bash
aws configure
```

Or set environment variables:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### "Error: Backend configuration changed"

Reinitialize:

```bash
terraform init -reconfigure
```

### State Lock Issues

If state is locked from a previous operation:

```bash
# Only use if you're certain no other operation is running
terraform force-unlock <LOCK_ID>
```

## Best Practices

1. **Always run `terraform plan` before `apply`**
2. **Use remote state for team environments**
3. **Enable state locking to prevent concurrent modifications**
4. **Use workspaces for multiple environments**:
   ```bash
   terraform workspace new production
   terraform workspace select production
   ```
5. **Tag all resources appropriately**
6. **Use `.gitignore` to exclude sensitive files**:
   ```
   *.tfvars
   *.tfstate
   *.tfstate.backup
   .terraform/
   ```

## Module Structure

```
terraform/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── backend.hcl          # Backend configuration
├── terraform.tfvars.example  # Example variables
└── README.md           # This file
```

## Next Steps

After deploying infrastructure:

1. Push your application image to ECR
2. Create ECS task definitions
3. Create ECS services
4. Configure monitoring and alarms
5. Set up CI/CD pipeline

## References

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
