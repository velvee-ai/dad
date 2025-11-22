# Terraform Backend Configuration for S3
# Usage: terraform init -backend-config=backend.hcl

bucket = "microbus-terraform-state"
key    = "microbus/terraform.tfstate"
region = "us-east-1"

# Optional: Enable state locking with DynamoDB
# dynamodb_table = "microbus-terraform-locks"

# Optional: Enable encryption
encrypt = true
