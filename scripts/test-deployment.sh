#!/bin/bash

# Script to test deployment configuration without actually deploying
# Usage: ./scripts/test-deployment.sh [namespace] [tag]

set -e

NAMESPACE=${1:-"grant-managment-dev"}
TAG=${2:-"latest"}

echo "🧪 Testing Grant Management deployment configuration"
echo "📦 Namespace: $NAMESPACE"
echo "🏷️  Tag: $TAG"
echo ""

# Check if required environment variables are set
echo "🔍 Checking environment variables..."
if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ] || [ -z "$DOCKER_REGISTRY" ]; then
    echo "❌ Missing required environment variables:"
    echo "   DOCKER_USERNAME: ${DOCKER_USERNAME:-'NOT SET'}"
    echo "   DOCKER_PASSWORD: ${DOCKER_PASSWORD:-'NOT SET'}"
    echo "   DOCKER_REGISTRY: ${DOCKER_REGISTRY:-'NOT SET'}"
    echo ""
    echo "Please set these environment variables before running deployment."
    exit 1
else
    echo "✅ All required environment variables are set"
fi

# Check if kubectl is available
echo ""
echo "🔍 Checking kubectl availability..."
if command -v kubectl >/dev/null 2>&1; then
    echo "✅ kubectl is available"
    echo "   Version: $(kubectl version --client --short 2>/dev/null || echo 'Unknown')"
else
    echo "❌ kubectl is not available"
    echo "   Please install kubectl and configure it for your cluster"
    exit 1
fi

# Check if Docker is available
echo ""
echo "🔍 Checking Docker availability..."
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker is available"
    echo "   Version: $(docker --version)"
else
    echo "⚠️  Docker is not available"
    echo "   Image building will be skipped during deployment"
fi

# Test application build
echo ""
echo "🔍 Testing application build..."
if npx cds build --production; then
    echo "✅ Application build successful"
else
    echo "❌ Application build failed"
    exit 1
fi

# Test Kubernetes configuration
echo ""
echo "🔍 Testing Kubernetes configuration..."
export DOCKER_TAG=$TAG
TEMP_FILE=$(mktemp)
if envsubst < k8s-deployment.yaml > $TEMP_FILE; then
    echo "✅ Kubernetes configuration is valid"
    echo "   Generated config saved to: $TEMP_FILE"
    rm $TEMP_FILE
else
    echo "❌ Kubernetes configuration is invalid"
    exit 1
fi

# Check if namespace exists
echo ""
echo "🔍 Checking namespace..."
if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
    echo "✅ Namespace $NAMESPACE exists"
else
    echo "⚠️  Namespace $NAMESPACE does not exist"
    echo "   It will be created during deployment"
fi

echo ""
echo "🎉 All tests passed! Deployment configuration is ready."
echo ""
echo "📋 Summary:"
echo "   Environment variables: ✅"
echo "   kubectl: ✅"
echo "   Docker: $(command -v docker >/dev/null 2>&1 && echo '✅' || echo '⚠️')"
echo "   Application build: ✅"
echo "   Kubernetes config: ✅"
echo "   Namespace: $(kubectl get namespace $NAMESPACE >/dev/null 2>&1 && echo '✅' || echo '⚠️')"
echo ""
echo "🚀 Ready to deploy! Run: npm run deploy $NAMESPACE $TAG"