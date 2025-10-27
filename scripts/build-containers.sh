#!/bin/bash
# Build all containers for the grant management system
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${DOCKER_REGISTRY:-scai-dev.common.repositories.cloud.sap}"
VERSION="${IMAGE_TAG:-v15}"
PUSH="${PUSH:-false}"

echo -e "${GREEN}🚀 Building Grant Management Containers${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo ""

# Login to Docker registry if credentials are provided and we're pushing
if [ "${PUSH}" = "true" ] && [ -n "${DOCKER_USERNAME}" ] && [ -n "${DOCKER_PASSWORD}" ]; then
    echo -e "${YELLOW}🔐 Logging in to Docker registry...${NC}"
    echo "${DOCKER_PASSWORD}" | docker login "${REGISTRY}" -u "${DOCKER_USERNAME}" --password-stdin
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker login successful${NC}"
    else
        echo -e "${RED}❌ Docker login failed${NC}"
        exit 1
    fi
fi

# Function to build and optionally push an image
build_image() {
    local name=$1
    local context=$2
    local dockerfile=$3
    local image_name="${REGISTRY}/${name}:${VERSION}"
    
    echo -e "${GREEN}📦 Building ${name}...${NC}"
    
    if [ -f "${dockerfile}" ]; then
        # Try buildx first, fall back to regular docker build
        if command -v docker &> /dev/null && docker buildx version &> /dev/null 2>&1; then
            # Use buildx
            if [ "${PUSH}" = "true" ]; then
                docker buildx build \
                    --platform linux/amd64 \
                    -t "${image_name}" \
                    -f "${dockerfile}" \
                    "${context}" \
                    --push
            else
                docker buildx build \
                    --platform linux/amd64 \
                    -t "${image_name}" \
                    -f "${dockerfile}" \
                    "${context}" \
                    --load
            fi
        else
            # Use regular docker build
            docker build \
                -t "${image_name}" \
                -f "${dockerfile}" \
                "${context}"
            
            if [ "${PUSH}" = "true" ]; then
                docker push "${image_name}"
            fi
        fi
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Successfully built ${name}${NC}"
        else
            echo -e "${RED}❌ Failed to build ${name}${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Dockerfile not found: ${dockerfile}${NC}"
        exit 1
    fi
}

# Step 1: Build CDS/Node.js services first (generates gen folder)
echo -e "${YELLOW}🔨 Building CAP service...${NC}"
npm run build

# Step 2: Build all Docker images

# Main API service
build_image "grant-management/api" "." "Dockerfile"

# App Router
build_image "grant-management/approuter" "app/router" "app/router/Dockerfile"

# MCP Proxy
build_image "grant-management/mcp-proxy" "app/mcp-proxy" "app/mcp-proxy/Dockerfile"

# Cockpit UI (uses nginx)
build_image "grant-management/cockpit-ui" "app/cockpit-ui" "app/cockpit-ui/Dockerfile"

# .NET Grant Server
build_image "grant-management/grant-server" "." "app/grant-management/GrantManagementServer/Dockerfile"

# .NET Grant MCP Layer
build_image "grant-management/grant-mcp-layer" "." "app/grant-management/GrantMcpLayer/Dockerfile"

# Portal (optional - only if it exists and we want to deploy it)
if [ -f "app/portal/Dockerfile" ]; then
    build_image "grant-management/portal" "app/portal" "app/portal/Dockerfile"
fi

# MCP Server Example (for local testing)
if [ -f "mcp-server-example/Dockerfile" ]; then
    build_image "grant-management/mcp-server-example" "mcp-server-example" "mcp-server-example/Dockerfile"
fi

echo ""
echo -e "${GREEN}✅ All containers built successfully!${NC}"

if [ "${PUSH}" = "true" ]; then
    echo -e "${GREEN}✅ All containers pushed to registry!${NC}"
fi
