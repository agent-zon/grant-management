#!/bin/bash

# Script to build Docker containers for Grant Management
# Usage: ./scripts/build-containers.sh [tag]

set -e

TAG=${1:-"latest"}
REGISTRY=${DOCKER_REGISTRY:-"scai-dev.common.repositories.cloud.sap"}

echo "🐳 Building Docker containers..."
echo "🏷️  Tag: $TAG"
echo "📦 Registry: $REGISTRY"
echo ""

# Build the main API container
echo "🔧 Building grant-management/api..."
docker buildx build --platform linux/amd64 -t $REGISTRY/grant-management/api:$TAG -f Dockerfile . --load

# Build the approuter container
echo "🔧 Building grant-management/approuter..."
docker buildx build --platform linux/amd64 -t $REGISTRY/grant-management/approuter:$TAG app/router --load

# Build the grant-server container
echo "🔧 Building grant-management/grant-server..."
docker buildx build --platform linux/amd64 -t $REGISTRY/grant-management/grant-server:$TAG -f app/grant-management/GrantManagementServer/Dockerfile app --load

# Build the grant-mcp-layer container
echo "🔧 Building grant-management/grant-mcp-layer..."
docker buildx build --platform linux/amd64 -t $REGISTRY/grant-management/grant-mcp-layer:$TAG -f app/grant-management/GrantMcpLayer/Dockerfile app --load

# Build the cockpit-ui container
echo "🔧 Building grant-management/cockpit-ui..."
docker buildx build --platform linux/amd64 -t $REGISTRY/grant-management/cockpit-ui:$TAG app/cockpit-ui --load

echo ""
echo "✅ All containers built successfully!"
echo "📋 Built images:"
echo "   - $REGISTRY/grant-management/api:$TAG"
echo "   - $REGISTRY/grant-management/approuter:$TAG"
echo "   - $REGISTRY/grant-management/grant-server:$TAG"
echo "   - $REGISTRY/grant-management/grant-mcp-layer:$TAG"
echo "   - $REGISTRY/grant-management/cockpit-ui:$TAG"