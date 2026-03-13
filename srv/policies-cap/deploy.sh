#!/bin/bash

# Deployment script for policies-cap application
# Replace YOUR_REGISTRY with your actual container registry

REGISTRY="your-registry.com" # Replace with your actual registry
IMAGE_NAME="policies-cap"
VERSION="latest"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "🚀 Starting deployment process..."

# Step 1: Build Docker image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:${VERSION} .

# Step 2: Tag for registry
echo "🏷️  Tagging image for registry..."
docker tag ${IMAGE_NAME}:${VERSION} ${FULL_IMAGE}

# Step 3: Push to registry
echo "⬆️  Pushing to container registry..."
docker push ${FULL_IMAGE}

# Step 4: Update Helm values (optional - can be done manually)
echo "📝 Updating Helm values..."
sed -i "s|repository: policies-cap|repository: ${REGISTRY}/${IMAGE_NAME}|g" helm/values.yaml

# Step 5: Deploy with Helm
echo "🎯 Deploying with Helm..."
helm upgrade --install policies-cap ./helm \
  --set image.repository=${REGISTRY}/${IMAGE_NAME} \
  --set image.tag=${VERSION} \
  --namespace default \
  --create-namespace

echo "✅ Deployment complete!"
echo "📋 Check status with: kubectl get pods -l app.kubernetes.io/name=policies-cap"