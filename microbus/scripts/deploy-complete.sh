#!/bin/bash
# Complete deployment script for Microbus to AWS

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Microbus AWS Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-microbus}"

echo -e "${YELLOW}Step 1: Building and pushing Docker image to ECR${NC}"
cd "$(dirname "$0")/.."
./scripts/deploy-to-ecr.sh

echo ""
echo -e "${YELLOW}Step 2: Getting ECR image URL${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-app:latest"
echo -e "${GREEN}Image URL: $ECR_IMAGE${NC}"

echo ""
echo -e "${YELLOW}Step 3: Deploying infrastructure with Terraform${NC}"
cd terraform

# Create terraform.tfvars if it doesn't exist
if [ ! -f terraform.tfvars ]; then
    echo -e "${YELLOW}Creating terraform.tfvars from example${NC}"
    cp terraform.tfvars.example terraform.tfvars

    # Update the image in terraform.tfvars
    echo "" >> terraform.tfvars
    echo "# Auto-generated" >> terraform.tfvars
    echo "app_image = \"$ECR_IMAGE\"" >> terraform.tfvars
else
    # Update or add app_image in existing terraform.tfvars
    if grep -q "^app_image" terraform.tfvars; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^app_image.*|app_image = \"$ECR_IMAGE\"|" terraform.tfvars
        else
            sed -i "s|^app_image.*|app_image = \"$ECR_IMAGE\"|" terraform.tfvars
        fi
    else
        # Add new
        echo "" >> terraform.tfvars
        echo "app_image = \"$ECR_IMAGE\"" >> terraform.tfvars
    fi
fi

echo ""
echo -e "${YELLOW}Running Terraform${NC}"
terraform init -upgrade
terraform plan -out=tfplan
terraform apply tfplan

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get outputs
ALB_DNS=$(terraform output -raw alb_dns_name)
echo -e "${GREEN}Application URL: http://$ALB_DNS/helloworld.example/?name=World${NC}"
echo ""
echo -e "${YELLOW}Note: It may take 2-3 minutes for the ECS tasks to become healthy.${NC}"
echo ""
echo "Check status with:"
echo "  aws ecs list-tasks --cluster ${PROJECT_NAME}-cluster --region ${AWS_REGION}"
echo "  aws ecs describe-tasks --cluster ${PROJECT_NAME}-cluster --tasks <task-arn> --region ${AWS_REGION}"
