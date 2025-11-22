variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name to use for resource naming"
  type        = string
  default     = "microbus"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "app_image" {
  description = "Docker image for the application (leave empty to use ECR repo URL automatically)"
  type        = string
  default     = ""
}

variable "app_cpu" {
  description = "CPU units for the application task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Memory for the application task in MB"
  type        = number
  default     = 1024
}

variable "app_count" {
  description = "Number of application instances to run"
  type        = number
  default     = 2
}

variable "nats_cpu" {
  description = "CPU units for NATS task"
  type        = number
  default     = 256
}

variable "nats_memory" {
  description = "Memory for NATS task in MB"
  type        = number
  default     = 512
}
