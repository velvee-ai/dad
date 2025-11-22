terraform {
  required_version = ">= 1.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# DigitalOcean Container Registry
resource "digitalocean_container_registry" "microbus" {
  name                   = var.registry_name
  subscription_tier_slug = var.registry_tier
  region                 = var.region
}

# DigitalOcean Kubernetes Cluster
resource "digitalocean_kubernetes_cluster" "microbus" {
  name    = var.cluster_name
  region  = var.region
  version = var.kubernetes_version

  node_pool {
    name       = "${var.cluster_name}-pool"
    size       = var.node_size
    node_count = var.node_count
    auto_scale = var.enable_auto_scale
    min_nodes  = var.min_nodes
    max_nodes  = var.max_nodes
    tags       = var.tags
  }

  tags = var.tags
}

# Registry integration with cluster
resource "digitalocean_container_registry_docker_credentials" "microbus" {
  registry_name = digitalocean_container_registry.microbus.name
}

# Kubernetes provider configuration
provider "kubernetes" {
  host  = digitalocean_kubernetes_cluster.microbus.endpoint
  token = digitalocean_kubernetes_cluster.microbus.kube_config[0].token
  cluster_ca_certificate = base64decode(
    digitalocean_kubernetes_cluster.microbus.kube_config[0].cluster_ca_certificate
  )
}

# Create namespace
resource "kubernetes_namespace" "microbus" {
  metadata {
    name = "microbus"
    labels = {
      name = "microbus"
      env  = var.environment
    }
  }

  depends_on = [digitalocean_kubernetes_cluster.microbus]
}

# Create image pull secret for private registry
resource "kubernetes_secret" "registry_credentials" {
  metadata {
    name      = "registry-credentials"
    namespace = kubernetes_namespace.microbus.metadata[0].name
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = digitalocean_container_registry_docker_credentials.microbus.docker_credentials
  }

  depends_on = [kubernetes_namespace.microbus]
}

# Persistent Volume Claim for NATS
resource "kubernetes_persistent_volume_claim" "nats_data" {
  metadata {
    name      = "nats-data"
    namespace = kubernetes_namespace.microbus.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.nats_storage_size
      }
    }
    storage_class_name = "do-block-storage"
  }

  depends_on = [kubernetes_namespace.microbus]
}

# Persistent Volume Claim for Grafana
resource "kubernetes_persistent_volume_claim" "grafana_data" {
  metadata {
    name      = "grafana-data"
    namespace = kubernetes_namespace.microbus.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.grafana_storage_size
      }
    }
    storage_class_name = "do-block-storage"
  }

  depends_on = [kubernetes_namespace.microbus]
}

# DigitalOcean Firewall (optional)
resource "digitalocean_firewall" "microbus" {
  count = var.enable_firewall ? 1 : 0

  name = "${var.cluster_name}-firewall"

  tags = var.tags

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.allowed_ssh_ips
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Data sources
data "digitalocean_kubernetes_versions" "available" {
  version_prefix = var.kubernetes_version_prefix
}
