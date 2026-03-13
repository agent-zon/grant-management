#!/bin/bash

# Deploy Policies CAP using simple Kubernetes manifests (no APIRule issues)

set -e

# Configuration
REGISTRY="scai-dev.common.repositories.cloud.sap"
REPOSITORY="policies-cap/policies-cap"
TAG=${1:-"latest"}
IMAGE_NAME="${REGISTRY}/${REPOSITORY}:${TAG}"
RELEASE_NAME="policies-cap"
NAMESPACE="tomer-dev"

echo "=== Deploying Policies CAP with Kubernetes Manifests ==="
echo "Image: ${IMAGE_NAME}"
echo "Release: ${RELEASE_NAME}"
echo "Namespace: ${NAMESPACE}"
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

# Step 4: Deploy with kubectl
echo "4. Deploying with kubectl..."
kubectl apply -f k8s-simple.yaml -n ${NAMESPACE}

# Step 5: Update image
echo "5. Updating deployment image..."
kubectl set image deployment/policies-cap policies-cap="${IMAGE_NAME}" -n ${NAMESPACE}

# Step 6: Wait for rollout
echo "6. Waiting for deployment..."
kubectl rollout status deployment/policies-cap -n ${NAMESPACE} --timeout=300s

# Step 7: Show deployment status
echo "7. Deployment status:"
kubectl get pods -l app=policies-cap -n ${NAMESPACE}
kubectl get svc -l app=policies-cap -n ${NAMESPACE}

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "To check logs:"
echo "kubectl logs -l app=policies-cap -f -n ${NAMESPACE}"