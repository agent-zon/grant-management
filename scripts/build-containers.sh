#!/usr/bin/env bash
set -euo pipefail

# Build containers for all components and optionally push to registry
# Required env:
#   DOCKER_REGISTRY   e.g. registry.example.com
# Optional env:
#   DOCKER_USERNAME   for docker login (needed when --push)
#   DOCKER_PASSWORD   for docker login (needed when --push)
#   IMAGE_TAG         default: v15
#   PLATFORMS         default: linux/amd64
#   PUSH              if set to "true" pushes images
# Args:
#   --push            same as setting PUSH=true

PUSH=${PUSH:-false}
IMAGE_TAG=${IMAGE_TAG:-v15}
PLATFORMS=${PLATFORMS:-linux/amd64}

for arg in "$@"; do
  case "$arg" in
    --push)
      PUSH=true
      ;;
  esac
done

if [[ -z "${DOCKER_REGISTRY:-}" ]]; then
  echo "❌ DOCKER_REGISTRY is required" >&2
  exit 1
fi

# Ensure build artifacts for CAP service
if [[ -f package.json ]]; then
  echo "🛠️  Building CAP artifacts (npm run build)"
  npm run build || npx -y @sap/cds-dk@9.3.2 cds build --production
fi

# Setup buildx
if ! docker buildx ls | grep -q gm-builder; then
  echo "🔧 Creating docker buildx builder"
  docker buildx create --name gm-builder --use --bootstrap
else
  docker buildx use gm-builder
fi

TAG="$IMAGE_TAG"
REG="$DOCKER_REGISTRY"

maybe_push=()
if [[ "$PUSH" == "true" ]]; then
  if [[ -n "${DOCKER_USERNAME:-}" && -n "${DOCKER_PASSWORD:-}" ]]; then
    echo "🔐 Docker login to $REG"
    echo "$DOCKER_PASSWORD" | docker login "$REG" -u "$DOCKER_USERNAME" --password-stdin
  else
    echo "⚠️  DOCKER_USERNAME/DOCKER_PASSWORD not set; attempting build without login (push will fail)" >&2
  fi
  maybe_push+=(--push)
else
  maybe_push+=(--load)
fi

# Build matrix
# 1) CAP service (srv) - root Dockerfile
echo "🐳 Building srv -> $REG/grant-management/api:$TAG"
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$REG/grant-management/api:$TAG" \
  -f Dockerfile . \
  "${maybe_push[@]}"

# 2) Approuter
echo "🐳 Building approuter -> $REG/grant-management/approuter:$TAG"
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$REG/grant-management/approuter:$TAG" \
  app/router \
  "${maybe_push[@]}"

# 3) Grant Management Server (.NET)
echo "🐳 Building grant-server -> $REG/grant-management/grant-server:$TAG"
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$REG/grant-management/grant-server:$TAG" \
  -f app/grant-management/GrantManagementServer/Dockerfile \
  app \
  "${maybe_push[@]}"

# 4) Grant MCP Layer (.NET)
echo "🐳 Building grant-mcp-layer -> $REG/grant-management/grant-mcp-layer:$TAG"
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$REG/grant-management/grant-mcp-layer:$TAG" \
  -f app/grant-management/GrantMcpLayer/Dockerfile \
  app/grant-management \
  "${maybe_push[@]}"

# 5) Cockpit UI (nginx static)
echo "🐳 Building cockpit-ui -> $REG/grant-management/cockpit-ui:$TAG"
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$REG/grant-management/cockpit-ui:$TAG" \
  app/cockpit-ui \
  "${maybe_push[@]}"

# 6) Portal (Node SSR)
echo "🐳 Building portal -> $REG/grant-management/portal:$TAG"
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$REG/grant-management/portal:$TAG" \
  -f app/portal/Dockerfile \
  app/portal \
  "${maybe_push[@]}"

echo "✅ Build complete (PUSH=$PUSH)"
