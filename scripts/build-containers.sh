#!/bin/bash
set -e

# Build and Push Script for Grant Management Deployment
# This script builds all Docker images and pushes them to the registry

# Configuration from environment variables
REGISTRY_URL="${DOCKER_REGISTRY:-scai-dev.common.repositories.cloud.sap}"
VERSION="${VERSION:-latest}"
DOCKER_USERNAME="${DOCKER_USERNAME}"
DOCKER_PASSWORD="${DOCKER_PASSWORD}"

echo "🚀 Building and pushing images to $REGISTRY_URL"
echo "📦 Version: $VERSION"

# Login to Docker registry if credentials are provided
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
    echo "🔐 Logging into Docker registry..."
    echo "$DOCKER_PASSWORD" | docker login "$REGISTRY_URL" -u "$DOCKER_USERNAME" --password-stdin
else
    echo "⚠️  No Docker credentials provided, assuming already logged in"
fi

# Ensure we have a clean build
echo "🧹 Cleaning up previous builds..."
npm run build

echo "🔧 Setting up Docker Buildx for multi-platform builds..."
docker buildx create --name grant-management-builder --use --bootstrap 2>/dev/null || docker buildx use grant-management-builder

# Build and push main API service
echo "📦 Building Grant Management API Service..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/api:$VERSION" \
    -f Dockerfile \
    --push \
    .

# Build and push approuter
echo "📦 Building App Router..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/approuter:$VERSION" \
    -f app/router/Dockerfile \
    --push \
    app/router

# Build and push grant server (.NET)
echo "📦 Building Grant Management Server..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/grant-server:$VERSION" \
    -f app/grant-management/GrantManagementServer/Dockerfile \
    --push \
    app

# Build and push grant MCP layer (.NET)
echo "📦 Building Grant MCP Layer..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/grant-mcp-layer:$VERSION" \
    -f app/grant-management/GrantMcpLayer/Dockerfile \
    --push \
    app/grant-management

# Build and push cockpit UI
echo "📦 Building Cockpit UI..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/cockpit-ui:$VERSION" \
    -f app/cockpit-ui/Dockerfile \
    --push \
    app/cockpit-ui

# Build and push MCP proxy
echo "📦 Building MCP Proxy..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/mcp-proxy:$VERSION" \
    -f app/mcp-proxy/Dockerfile \
    --push \
    app/mcp-proxy

# Build and push MCP server example
echo "📦 Building MCP Server Example..."
docker buildx build \
    --platform linux/amd64 \
    -t "$REGISTRY_URL/grant-management/mcp-server-example:$VERSION" \
    -f mcp-server-example/Dockerfile \
    --push \
    mcp-server-example

echo "✅ All images built and pushed successfully!"

# Verify images
echo "🔍 Verifying pushed images..."
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/api:$VERSION" || echo "❌ API image verification failed"
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/approuter:$VERSION" || echo "❌ Approuter image verification failed"
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/grant-server:$VERSION" || echo "❌ Grant server image verification failed"
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/grant-mcp-layer:$VERSION" || echo "❌ Grant MCP layer image verification failed"
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/cockpit-ui:$VERSION" || echo "❌ Cockpit UI image verification failed"
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/mcp-proxy:$VERSION" || echo "❌ MCP proxy image verification failed"
docker buildx imagetools inspect "$REGISTRY_URL/grant-management/mcp-server-example:$VERSION" || echo "❌ MCP server example image verification failed"

echo "🎉 Build and push completed!"