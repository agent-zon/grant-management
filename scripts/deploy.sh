#!/usr/bin/env bash
set -euo pipefail

# Deploy using Helm with images built or pushed to $DOCKER_REGISTRY
# Required env:
#   DOCKER_REGISTRY
#   DOCKER_USERNAME
#   DOCKER_PASSWORD
#   KUBE_SERVER  (e.g. https://your.k8s.cluster:6443)
#   KUBE_TOKEN
#   KUBE_USER
# Optional env:
#   IMAGE_TAG (default v15)
#   NAMESPACE (default grants)
#   CONTEXT_NAME (default gm-context)

IMAGE_TAG=${IMAGE_TAG:-v15}
NAMESPACE=${NAMESPACE:-grants}
CONTEXT_NAME=${CONTEXT_NAME:-gm-context}

if [[ -z "${DOCKER_REGISTRY:-}" ]]; then echo "❌ DOCKER_REGISTRY is required"; exit 1; fi
if [[ -z "${DOCKER_USERNAME:-}" || -z "${DOCKER_PASSWORD:-}" ]]; then echo "❌ DOCKER_USERNAME/DOCKER_PASSWORD are required"; exit 1; fi
if [[ -z "${KUBE_SERVER:-}" || -z "${KUBE_TOKEN:-}" || -z "${KUBE_USER:-}" ]]; then echo "❌ KUBE_SERVER/KUBE_TOKEN/KUBE_USER are required"; exit 1; fi

# Configure kube context (does not persist kubeconfig changes globally)
KUBECONFIG_FILE=$(mktemp)
export KUBECONFIG="$KUBECONFIG_FILE"

kubectl config set-cluster gm-cluster --server="$KUBE_SERVER" --insecure-skip-tls-verify=true >/dev/null
kubectl config set-credentials "$KUBE_USER" --token="$KUBE_TOKEN" >/dev/null
kubectl config set-context "$CONTEXT_NAME" --cluster=gm-cluster --user="$KUBE_USER" --namespace="$NAMESPACE" >/dev/null
kubectl config use-context "$CONTEXT_NAME" >/dev/null

# Ensure namespace exists
kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || kubectl create ns "$NAMESPACE"

# Create/replace image pull secret
kubectl delete secret docker-registry -n "$NAMESPACE" >/dev/null 2>&1 || true
kubectl create secret docker-registry docker-registry \
  --docker-server="$DOCKER_REGISTRY" \
  --docker-username="$DOCKER_USERNAME" \
  --docker-password="$DOCKER_PASSWORD" \
  -n "$NAMESPACE"

# Render values for registry and tag overrides
VALUES_FILE=$(mktemp)
cat >"$VALUES_FILE" <<EOF
global:
  image:
    registry: ${DOCKER_REGISTRY}
    tag: ${IMAGE_TAG}
  imagePullSecret:
    name: docker-registry
EOF

# Build chart if needed
if [[ -d gen/chart ]]; then
  CHART_DIR=gen/chart
else
  CHART_DIR=chart
fi

# Run helm upgrade/install
release_name=${RELEASE_NAME:-v01}
helm upgrade "$release_name" "$CHART_DIR" --install --create-namespace -n "$NAMESPACE" -f "$VALUES_FILE"

echo "✅ Deployed release $release_name to namespace $NAMESPACE"
