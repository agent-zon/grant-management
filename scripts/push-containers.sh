#!/bin/bash

# Script to push Docker containers for Grant Management
# Usage: ./scripts/push-containers.sh [tag]

set -e

TAG=${1:-"latest"}
REGISTRY=${DOCKER_REGISTRY:-"scai-dev.common.repositories.cloud.sap"}

echo "🚀 Pushing Docker containers..."
echo "🏷️  Tag: $TAG"
echo "📦 Registry: $REGISTRY"
echo ""

# Check if Docker is logged in
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running or not accessible"
    exit 1
fi

# Login to Docker registry if credentials are provided
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ] && [ -n "$DOCKER_REGISTRY" ]; then
    echo "🔐 Logging in to Docker registry..."
    echo "$DOCKER_PASSWORD" | docker login $DOCKER_REGISTRY -u $DOCKER_USERNAME --password-stdin
fi

# Push the main API container
echo "📤 Pushing grant-management/api..."
docker push $REGISTRY/grant-management/api:$TAG

# Push the approuter container
echo "📤 Pushing grant-management/approuter..."
docker push $REGISTRY/grant-management/approuter:$TAG

# Push the grant-server container
echo "📤 Pushing grant-management/grant-server..."
docker push $REGISTRY/grant-management/grant-server:$TAG

# Push the grant-mcp-layer container
echo "📤 Pushing grant-management/grant-mcp-layer..."
docker push $REGISTRY/grant-management/grant-mcp-layer:$TAG

# Push the cockpit-ui container
echo "📤 Pushing grant-management/cockpit-ui..."
docker push $REGISTRY/grant-management/cockpit-ui:$TAG

echo ""
echo "✅ All containers pushed successfully!"
echo "📋 Pushed images:"
echo "   - $REGISTRY/grant-management/api:$TAG"
echo "   - $REGISTRY/grant-management/approuter:$TAG"
echo "   - $REGISTRY/grant-management/grant-server:$TAG"
echo "   - $REGISTRY/grant-management/grant-mcp-layer:$TAG"
echo "   - $REGISTRY/grant-management/cockpit-ui:$TAG"