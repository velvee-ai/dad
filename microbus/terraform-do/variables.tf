variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc1"
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "microbus-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28.2-do.0"
}

variable "kubernetes_version_prefix" {
  description = "Kubernetes version prefix for data source"
  type        = string
  default     = "1.28."
}

variable "node_size" {
  description = "Droplet size for nodes"
  type        = string
  default     = "s-2vcpu-4gb"
  # Options: s-2vcpu-2gb ($12), s-2vcpu-4gb ($18), s-4vcpu-8gb ($36)
}

variable "node_count" {
  description = "Initial number of nodes"
  type        = number
  default     = 3
}

variable "enable_auto_scale" {
  description = "Enable cluster autoscaling"
  type        = bool
  default     = true
}

variable "min_nodes" {
  description = "Minimum number of nodes for autoscaling"
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum number of nodes for autoscaling"
  type        = number
  default     = 5
}

variable "registry_name" {
  description = "Name of the container registry"
  type        = string
  default     = "microbus-registry"
}

variable "registry_tier" {
  description = "Container registry subscription tier"
  type        = string
  default     = "basic"
  # Options: starter (free), basic ($5), professional ($20)
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = list(string)
  default     = ["microbus", "terraform"]
}

variable "nats_storage_size" {
  description = "Storage size for NATS persistent volume"
  type        = string
  default     = "10Gi"
}

variable "grafana_storage_size" {
  description = "Storage size for Grafana persistent volume"
  type        = string
  default     = "10Gi"
}

variable "enable_firewall" {
  description = "Enable firewall for the cluster"
  type        = bool
  default     = false
}

variable "allowed_ssh_ips" {
  description = "IP addresses allowed to SSH (if firewall enabled)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
