#!/bin/bash

# Script to deploy to Kubernetes with environment variable substitution
# Usage: ./scripts/deploy-k8s.sh [namespace] [tag]

set -e

NAMESPACE=${1:-"grant-managment-dev"}
TAG=${2:-"latest"}

echo "🚀 Deploying to Kubernetes namespace: $NAMESPACE"
echo "🏷️  Using tag: $TAG"

# Set environment variables for substitution
export DOCKER_REGISTRY=${DOCKER_REGISTRY:-"scai-dev.common.repositories.cloud.sap"}
export DOCKER_TAG=$TAG

# Create a temporary file with substituted values
TEMP_FILE=$(mktemp)
envsubst < k8s-deployment.yaml > $TEMP_FILE

echo "📦 Deploying with image: $DOCKER_REGISTRY/grant-management/api:$TAG"

# Apply the deployment
kubectl apply -f $TEMP_FILE -n $NAMESPACE

# Clean up
rm $TEMP_FILE

echo "✅ Kubernetes deployment completed!"