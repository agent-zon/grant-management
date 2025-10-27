#!/bin/bash
# Deploy grant management system to Kubernetes using Helm
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${DOCKER_REGISTRY:-scai-dev.common.repositories.cloud.sap}"
VERSION="${IMAGE_TAG:-v15}"
NAMESPACE="${KUBE_NAMESPACE:-grant-management}"
RELEASE_NAME="${HELM_RELEASE:-v01}"
KUBECONFIG_PATH="${KUBECONFIG:-$HOME/.kube/config}"

echo -e "${GREEN}🚀 Deploying Grant Management System${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"
echo -e "${YELLOW}Release: ${RELEASE_NAME}${NC}"
echo ""

# Step 1: Authenticate with Docker registry if credentials are provided
if [ -n "${DOCKER_USERNAME}" ] && [ -n "${DOCKER_PASSWORD}" ]; then
    echo -e "${YELLOW}🔐 Logging in to Docker registry...${NC}"
    echo "${DOCKER_PASSWORD}" | docker login "${REGISTRY}" -u "${DOCKER_USERNAME}" --password-stdin
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker login successful${NC}"
    else
        echo -e "${RED}❌ Docker login failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Docker credentials not provided, skipping login${NC}"
fi

# Step 2: Setup kubectl with provided credentials if available
if [ -n "${KUBE_TOKEN}" ] && [ -n "${KUBE_SERVER}" ]; then
    echo -e "${YELLOW}🔐 Setting up kubectl...${NC}"
    kubectl config set-cluster deploy-cluster --server="${KUBE_SERVER}" --insecure-skip-tls-verify=true
    kubectl config set-credentials "${KUBE_USER:-deployer}" --token="${KUBE_TOKEN}"
    kubectl config set-context deploy-context --cluster=deploy-cluster --user="${KUBE_USER:-deployer}" --namespace="${NAMESPACE}"
    kubectl config use-context deploy-context
    echo -e "${GREEN}✅ kubectl configured${NC}"
fi

# Step 3: Verify kubectl connection
echo -e "${YELLOW}🔍 Verifying Kubernetes connection...${NC}"
if kubectl cluster-info &> /dev/null; then
    echo -e "${GREEN}✅ Connected to Kubernetes cluster${NC}"
else
    echo -e "${RED}❌ Failed to connect to Kubernetes cluster${NC}"
    exit 1
fi

# Step 4: Create namespace if it doesn't exist
echo -e "${YELLOW}📦 Ensuring namespace exists...${NC}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Step 5: Create Docker registry secret if credentials are provided
if [ -n "${DOCKER_USERNAME}" ] && [ -n "${DOCKER_PASSWORD}" ]; then
    echo -e "${YELLOW}🔑 Creating Docker registry secret...${NC}"
    kubectl create secret docker-registry docker-registry \
        --docker-server="${REGISTRY}" \
        --docker-username="${DOCKER_USERNAME}" \
        --docker-password="${DOCKER_PASSWORD}" \
        --namespace="${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    echo -e "${GREEN}✅ Docker registry secret created${NC}"
fi

# Step 6: Build CAP service to generate chart
echo -e "${YELLOW}🔨 Building CAP service to generate Helm chart...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CAP build successful${NC}"
else
    echo -e "${RED}❌ CAP build failed${NC}"
    exit 1
fi

# Step 7: Check if Helm chart exists
if [ ! -d "./gen/chart" ]; then
    echo -e "${RED}❌ Helm chart not found at ./gen/chart${NC}"
    echo -e "${YELLOW}Checking for chart in ./chart...${NC}"
    if [ -d "./chart" ]; then
        CHART_PATH="./chart"
    else
        echo -e "${RED}❌ No Helm chart found${NC}"
        exit 1
    fi
else
    CHART_PATH="./gen/chart"
fi

# Step 8: Deploy with Helm
echo -e "${YELLOW}🚢 Deploying with Helm...${NC}"
helm upgrade "${RELEASE_NAME}" "${CHART_PATH}" \
    --install \
    --create-namespace \
    --namespace="${NAMESPACE}" \
    --set global.image.registry="${REGISTRY}" \
    --set global.image.tag="${VERSION}" \
    --wait \
    --timeout=10m

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${YELLOW}📊 Deployment Status:${NC}"
    kubectl get pods -n "${NAMESPACE}"
    echo ""
    echo -e "${YELLOW}🌐 Services:${NC}"
    kubectl get services -n "${NAMESPACE}"
    echo ""
    echo -e "${YELLOW}🔗 Ingress/API Rules:${NC}"
    kubectl get apirules -n "${NAMESPACE}" 2>/dev/null || kubectl get ingress -n "${NAMESPACE}" 2>/dev/null || echo "No ingress resources found"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
