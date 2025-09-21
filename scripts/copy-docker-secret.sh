#!/bin/bash

# Script to copy docker-registry secret from development namespace to target namespace
# Usage: ./scripts/copy-docker-secret.sh <target-namespace>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <target-namespace>"
    echo "Example: $0 my-namespace"
    exit 1
fi

TARGET_NAMESPACE=$1
SOURCE_NAMESPACE="scai-dev"

echo "Copying docker-registry secret from $SOURCE_NAMESPACE to $TARGET_NAMESPACE..."

# Check if source secret exists
if ! kubectl get secret docker-registry -n $SOURCE_NAMESPACE >/dev/null 2>&1; then
    echo "Error: docker-registry secret not found in namespace $SOURCE_NAMESPACE"
    exit 1
fi

# Check if target namespace exists
if ! kubectl get namespace $TARGET_NAMESPACE >/dev/null 2>&1; then
    kubectl create namespace $TARGET_NAMESPACE
    kubectl label namespace $TARGET_NAMESPACE istio-injection=enabled
fi

# Copy the secret
kubectl get secret docker-registry -n $SOURCE_NAMESPACE -o yaml | \
    sed "s/namespace: $SOURCE_NAMESPACE/namespace: $TARGET_NAMESPACE/" | \
    kubectl apply -f -

if [ $? -eq 0 ]; then
    echo "✅ Successfully copied docker-registry secret to $TARGET_NAMESPACE"
    echo "You can now deploy services that require the private registry."
else
    echo "❌ Failed to copy docker-registry secret"
    exit 1
fi
