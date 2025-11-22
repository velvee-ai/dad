# ECS Task Definition for NATS
resource "aws_ecs_task_definition" "nats" {
  family                   = "${var.project_name}-nats"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.nats_cpu
  memory                   = var.nats_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "nats"
      image = "nats:2-alpine"

      portMappings = [
        {
          containerPort = 4222
          protocol      = "tcp"
        },
        {
          containerPort = 8222
          protocol      = "tcp"
        }
      ]

      command = [
        "--jetstream",
        "--store_dir=/data"
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "wget --spider -q http://localhost:8222/healthz || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.nats.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nats"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-nats"
  }
}

# ECS Service for NATS
resource "aws_ecs_service" "nats" {
  name            = "${var.project_name}-nats"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.nats.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  enable_execute_command = true

  service_registries {
    registry_arn = aws_service_discovery_service.nats.arn
  }

  tags = {
    Name = "${var.project_name}-nats-service"
  }
}

# ECS Task Definition for Microbus App
resource "aws_ecs_task_definition" "microbus_app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "microbus-app"
      image = var.app_image != "" ? var.app_image : "${aws_ecr_repository.microbus_app.repository_url}:latest"

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NATS_URL"
          value = "nats://nats.${var.project_name}.local:4222"
        },
        {
          name  = "HTTP_PORT"
          value = "8080"
        }
      ]

      healthCheck = {
        command     = ["CMD-SHELL", "wget --spider -q http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.microbus_app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-app"
  }
}

# ECS Service for Microbus App
resource "aws_ecs_service" "microbus_app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.microbus_app.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.microbus_app.arn
    container_name   = "microbus-app"
    container_port   = 8080
  }

  enable_execute_command = true

  depends_on = [
    aws_lb_listener.http,
    aws_ecs_service.nats
  ]

  tags = {
    Name = "${var.project_name}-app-service"
  }
}

# Service Discovery Namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}.local"
  description = "Private DNS namespace for ${var.project_name}"
  vpc         = module.vpc.vpc_id

  tags = {
    Name = "${var.project_name}-namespace"
  }
}

# Service Discovery Service for NATS
resource "aws_service_discovery_service" "nats" {
  name = "nats"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name = "${var.project_name}-nats-discovery"
  }
}
