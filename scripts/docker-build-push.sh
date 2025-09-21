#!/bin/bash
#  for mac build and push multi-arch images - workaround for  aspirate build images with platform

# Build and Push Script for Kyma Deployment
# Usage: ./scripts/build-and-push.sh [registry-url] [domain-name] [version]
set -e

# Configuration
REGISTRY_URL=${1:-"scai-dev.common.repositories.cloud.sap"}
DOMAIN_NAME=${2:-"grant-management"}
VERSION=${3:-"latest"}

echo "🚀 Building and pushing images to $REGISTRY_URL"
echo "🌐 Domain: $DOMAIN_NAME"
echo "📦 Version: $VERSION"

echo "🔧 Setting up Docker Buildx for multi-platform builds..."
docker buildx rm multi-platform-builder || true
docker buildx create --name multi-platform-builder --use --bootstrap


echo "📦 Building Grant Management Service..."
docker buildx build --platform linux/amd64,linux/arm64 -t "$REGISTRY_URL/$DOMAIN_NAME/app:$VERSION" --push ./deno


docker manifest inspect "$REGISTRY_URL/$DOMAIN_NAME/app:$VERSION" || echo "Manifest not found, skipping inspection"
 

