#!/bin/bash
# Script to build and push Microbus application to AWS ECR

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-microbus-app}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to AWS ECR...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS account ID
echo -e "${YELLOW}Getting AWS account ID...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}Failed to get AWS account ID. Please check your AWS credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}AWS Account ID: $AWS_ACCOUNT_ID${NC}"

# ECR repository URL
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE_NAME="${ECR_URL}/${ECR_REPOSITORY}:${IMAGE_TAG}"

# Create ECR repository if it doesn't exist
echo -e "${YELLOW}Checking if ECR repository exists...${NC}"
if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}Creating ECR repository: $ECR_REPOSITORY${NC}"
    aws ecr create-repository \
        --repository-name "$ECR_REPOSITORY" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    echo -e "${GREEN}ECR repository created successfully${NC}"
else
    echo -e "${GREEN}ECR repository already exists${NC}"
fi

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$ECR_URL"

echo -e "${GREEN}Successfully logged in to ECR${NC}"

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
cd "$(dirname "$0")/.."
docker build -t "$ECR_REPOSITORY:$IMAGE_TAG" -f Dockerfile .

echo -e "${GREEN}Docker image built successfully${NC}"

# Tag image for ECR
echo -e "${YELLOW}Tagging image for ECR...${NC}"
docker tag "$ECR_REPOSITORY:$IMAGE_TAG" "$FULL_IMAGE_NAME"

# Push to ECR
echo -e "${YELLOW}Pushing image to ECR...${NC}"
docker push "$FULL_IMAGE_NAME"

echo -e "${GREEN}Successfully pushed image to ECR${NC}"
echo -e "${GREEN}Image URL: $FULL_IMAGE_NAME${NC}"

# Also tag and push as latest
if [ "$IMAGE_TAG" != "latest" ]; then
    echo -e "${YELLOW}Tagging and pushing as latest...${NC}"
    docker tag "$ECR_REPOSITORY:$IMAGE_TAG" "${ECR_URL}/${ECR_REPOSITORY}:latest"
    docker push "${ECR_URL}/${ECR_REPOSITORY}:latest"
    echo -e "${GREEN}Also pushed as latest${NC}"
fi

echo -e "${GREEN}Deployment to ECR completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your ECS task definition with this image:"
echo "   $FULL_IMAGE_NAME"
echo "2. Deploy to ECS service or create a new service"
echo "3. Monitor the deployment in AWS Console"
