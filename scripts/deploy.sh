#!/bin/bash

# Comprehensive deployment script for Grant Management
# Usage: ./scripts/deploy.sh [namespace] [tag]

set -e

NAMESPACE=${1:-"grant-managment-dev"}
TAG=${2:-"latest"}

echo "🚀 Starting Grant Management deployment"
echo "📦 Namespace: $NAMESPACE"
echo "🏷️  Tag: $TAG"
echo ""

# Check if required environment variables are set
if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ] || [ -z "$DOCKER_REGISTRY" ]; then
    echo "❌ Error: Required environment variables not set:"
    echo "   DOCKER_USERNAME: ${DOCKER_USERNAME:-'NOT SET'}"
    echo "   DOCKER_PASSWORD: ${DOCKER_PASSWORD:-'NOT SET'}"
    echo "   DOCKER_REGISTRY: ${DOCKER_REGISTRY:-'NOT SET'}"
    echo ""
    echo "Please set these environment variables before running this script."
    exit 1
fi

# Set Docker tag environment variable
export DOCKER_TAG=$TAG

echo "🔧 Step 1: Building application..."
npx cds build --production

echo ""
echo "🐳 Step 2: Building and pushing Docker images..."
if command -v docker >/dev/null 2>&1; then
    npm run build:push
else
    echo "⚠️  Docker not available, skipping image build and push"
    echo "   Please ensure images are already built and pushed to the registry"
fi

echo ""
echo "🔐 Step 3: Setting up Docker registry secret..."
./scripts/copy-docker-secret.sh $NAMESPACE

echo ""
echo "🚀 Step 4: Deploying to Kubernetes..."
./scripts/deploy-k8s.sh $NAMESPACE $TAG

echo ""
echo "⏳ Step 5: Waiting for deployment to be ready..."
kubectl rollout status deployment/grant-management -n $NAMESPACE --timeout=300s

echo ""
echo "🔍 Step 6: Checking deployment status..."
kubectl get pods -n $NAMESPACE -l app=grant-management

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Application should be available at: https://grants.$NAMESPACE.kyma.ondemand.com/"
echo ""
echo "📋 Useful commands:"
echo "   View logs: kubectl logs -l app=grant-management -n $NAMESPACE"
echo "   Check status: kubectl get pods -n $NAMESPACE"
echo "   Restart deployment: kubectl rollout restart deployment/grant-management -n $NAMESPACE"