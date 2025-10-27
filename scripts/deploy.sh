#!/bin/bash
# Deployment script for Grant Management
# Usage: ./scripts/deploy.sh [version]

set -e

# Configuration
VERSION=${1:-"v15"}
REGISTRY_URL=${DOCKER_REGISTRY:-"scai-dev.common.repositories.cloud.sap"}
DOMAIN_NAME="grant-management"

echo "🚀 Starting deployment process..."
echo "📦 Version: $VERSION"
echo "🏗️  Registry: $REGISTRY_URL"

# Check if required environment variables are set
if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
    echo "❌ Error: DOCKER_USERNAME and DOCKER_PASSWORD must be set"
    exit 1
fi

if [ -z "$KUBE_TOKEN" ] || [ -z "$KUBE_USER" ]; then
    echo "❌ Error: KUBE_TOKEN and KUBE_USER must be set"
    exit 1
fi

# Login to Docker registry
echo "🔐 Logging into Docker registry..."
echo "$DOCKER_PASSWORD" | docker login "$REGISTRY_URL" -u "$DOCKER_USERNAME" --password-stdin

# Build and push containers
echo "📦 Building and pushing containers..."
npm run build:push

# Setup Kubernetes context
echo "☸️  Setting up Kubernetes context..."
kubectl config set-credentials "$KUBE_USER" --token="$KUBE_TOKEN"
kubectl config set-context --current --user="$KUBE_USER"

# Deploy using Helm
echo "🚀 Deploying to Kubernetes..."
npm run deploy:helm

echo "✅ Deployment completed successfully!"
echo "🌐 Check your deployment status with: kubectl get pods"