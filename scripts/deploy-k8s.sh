#!/bin/bash
set -e

# Kubernetes Deployment Script for Grant Management
# This script deploys the application to Kubernetes using the provided secrets

# Configuration from environment variables
REGISTRY_URL="${DOCKER_REGISTRY:-scai-dev.common.repositories.cloud.sap}"
VERSION="${VERSION:-latest}"
NAMESPACE="${NAMESPACE:-grant-management-dev}"
KUBE_TOKEN="${KUBE_TOKEN}"
KUBE_USER="${KUBE_USER}"
KUBE_SERVER="${KUBE_SERVER:-https://kubernetes.default.svc}"

echo "🚀 Deploying Grant Management to Kubernetes"
echo "📦 Version: $VERSION"
echo "🏷️  Namespace: $NAMESPACE"

# Setup kubectl configuration if credentials are provided
if [ -n "$KUBE_TOKEN" ] && [ -n "$KUBE_SERVER" ]; then
    echo "🔧 Setting up kubectl configuration..."
    
    # Create kubeconfig
    mkdir -p ~/.kube
    cat > ~/.kube/config << EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: $KUBE_SERVER
    insecure-skip-tls-verify: true
  name: target-cluster
contexts:
- context:
    cluster: target-cluster
    user: target-user
    namespace: $NAMESPACE
  name: target-context
current-context: target-context
users:
- name: target-user
  user:
    token: $KUBE_TOKEN
EOF

    echo "✅ kubectl configured successfully"
else
    echo "⚠️  No Kubernetes credentials provided, assuming kubectl is already configured"
fi

# Create namespace if it doesn't exist
echo "🏗️  Creating namespace $NAMESPACE..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create Docker registry secret if credentials are provided
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ] && [ -n "$DOCKER_REGISTRY" ]; then
    echo "🔐 Creating Docker registry secret..."
    kubectl create secret docker-registry docker-registry-secret \
        --docker-server="$DOCKER_REGISTRY" \
        --docker-username="$DOCKER_USERNAME" \
        --docker-password="$DOCKER_PASSWORD" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
fi

# Update the deployment YAML with current image versions
echo "📝 Updating deployment configuration..."
sed "s|scai-dev.common.repositories.cloud.sap|$REGISTRY_URL|g; s|:latest|:$VERSION|g; s|grant-managment-dev|$NAMESPACE|g" k8s-deployment.yaml > k8s-deployment-updated.yaml

# Apply the deployment
echo "🚀 Applying Kubernetes manifests..."
kubectl apply -f k8s-deployment-updated.yaml

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/grant-management -n "$NAMESPACE"

# Get deployment status
echo "📊 Deployment status:"
kubectl get pods -n "$NAMESPACE" -l app=grant-management
kubectl get services -n "$NAMESPACE" -l app=grant-management

# Get the API rule URL if available
echo "🌐 Checking API Rule..."
kubectl get apirule -n "$NAMESPACE" grant-management-api-rule -o jsonpath='{.spec.host}' 2>/dev/null && echo "" || echo "No API Rule found"

# Clean up temporary files
rm -f k8s-deployment-updated.yaml

echo "✅ Deployment completed successfully!"