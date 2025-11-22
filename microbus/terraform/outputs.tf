output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.microbus_app.repository_url
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "cloudwatch_log_group_app" {
  description = "Name of the CloudWatch log group for the application"
  value       = aws_cloudwatch_log_group.microbus_app.name
}

output "cloudwatch_log_group_nats" {
  description = "Name of the CloudWatch log group for NATS"
  value       = aws_cloudwatch_log_group.nats.name
}

output "ecs_service_app_name" {
  description = "Name of the ECS service for the application"
  value       = aws_ecs_service.microbus_app.name
}

output "ecs_service_nats_name" {
  description = "Name of the ECS service for NATS"
  value       = aws_ecs_service.nats.name
}

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${aws_lb.main.dns_name}/helloworld.example/?name=World"
}
