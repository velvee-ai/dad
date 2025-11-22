output "cluster_id" {
  description = "ID of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.microbus.id
}

output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.microbus.name
}

output "cluster_endpoint" {
  description = "Endpoint of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.microbus.endpoint
}

output "cluster_region" {
  description = "Region of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.microbus.region
}

output "registry_endpoint" {
  description = "Container registry endpoint"
  value       = digitalocean_container_registry.microbus.endpoint
}

output "registry_name" {
  description = "Container registry name"
  value       = digitalocean_container_registry.microbus.name
}

output "kubeconfig_command" {
  description = "Command to save kubeconfig"
  value       = "doctl kubernetes cluster kubeconfig save ${digitalocean_kubernetes_cluster.microbus.id}"
}

output "image_repository" {
  description = "Full image repository URL"
  value       = "registry.digitalocean.com/${digitalocean_container_registry.microbus.name}/microbus-app"
}

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.microbus.metadata[0].name
}

output "deployment_commands" {
  description = "Commands to deploy the application"
  value = <<-EOT
    # Save kubeconfig
    doctl kubernetes cluster kubeconfig save ${digitalocean_kubernetes_cluster.microbus.id}

    # Build and push image
    docker build -t microbus-app:latest ../
    docker tag microbus-app:latest registry.digitalocean.com/${digitalocean_container_registry.microbus.name}/microbus-app:latest
    doctl registry login
    docker push registry.digitalocean.com/${digitalocean_container_registry.microbus.name}/microbus-app:latest

    # Deploy
    kubectl apply -f ../k8s/
  EOT
}
