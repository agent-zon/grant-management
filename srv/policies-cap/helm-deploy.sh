#!/bin/bash

# Deploy Policies CAP using Helm

set -e

# Configuration
REGISTRY="scai-dev.common.repositories.cloud.sap"
REPOSITORY="policies-cap/policies-cap"
TAG=${1:-"latest"}
IMAGE_NAME="${REGISTRY}/${REPOSITORY}:${TAG}"
RELEASE_NAME="policies-cap"

echo "=== Deploying Policies CAP with Helm ==="
echo "Image: ${IMAGE_NAME}"
echo "Release: ${RELEASE_NAME}"
echo "Using current namespace: $(kubectl config view --minify --output 'jsonpath={..namespace}')"
echo ""

# Step 1: Build CAP application
echo "1. Building CAP application..."
npx cds build --production

# Step 2: Build Docker image
echo "2. Building Docker image..."
docker build -t "${IMAGE_NAME}" .

# Step 3: Push to registry
echo "3. Pushing to registry..."
docker push "${IMAGE_NAME}"

# Step 4: Deploy with Helm
echo "4. Deploying with Helm..."
helm upgrade --install "${RELEASE_NAME}" ./gen/chart \
  --set global.image.tag="${TAG}" \
  --set global.image.registry="${REGISTRY}" \
  --set srv.image.repository="policies-cap" \
  --set web-application.expose.enabled=false \
  --wait \
  --timeout=300s

# Step 5: Show deployment status
echo "5. Deployment status:"
kubectl get pods -l app.kubernetes.io/name=policies-cap
kubectl get svc -l app.kubernetes.io/name=policies-cap

echo ""
echo "=== Deployment Complete ==="
echo "Service URL: https://policies-cap-srv-c-127c9ef.stage.kyma.ondemand.com"
echo ""
echo "To check logs:"
echo "kubectl logs -l app.kubernetes.io/name=policies-cap -f"