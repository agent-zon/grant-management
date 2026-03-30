#!/bin/bash
#
# Install kubectl (if missing) and configure login from env (KUBE_SERVER, KUBE_TOKEN, KUBE_NAMESPACE).
# Optionally source env from env/kube.env or from existing environment.
#
# Usage:
#   source env/kube.env && ./scripts/install-kubectl-and-login.sh
#   # or
#   ./scripts/install-kubectl-and-login.sh [path/to/env/file]
#

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load env file if path given
if [ -n "$1" ] && [ -f "$1" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$1"
  set +a
elif [ -f "$REPO_ROOT/env/kube.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$REPO_ROOT/env/kube.env"
  set +a
fi

# --- Install kubectl if missing ---
need_install=false
if ! command -v kubectl >/dev/null 2>&1; then
  need_install=true
fi

if [ "$need_install" = true ]; then
  echo "Installing kubectl..."
  KUBECTL_VERSION="${KUBECTL_VERSION:-v1.31.0}"
  case "$(uname -s)" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install kubectl
      else
        curl -sSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/darwin/$(uname -m)/kubectl" -o /tmp/kubectl
        chmod +x /tmp/kubectl
        sudo mv /tmp/kubectl /usr/local/bin/kubectl
      fi
      ;;
    Linux)
      curl -sSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/$(uname -m)/kubectl" -o /tmp/kubectl
      chmod +x /tmp/kubectl
      sudo mv /tmp/kubectl /usr/local/bin/kubectl
      ;;
    *)
      echo "Unsupported OS: $(uname -s). Install kubectl manually from https://kubernetes.io/docs/tasks/tools/." >&2
      exit 1
      ;;
  esac
  echo "kubectl installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client 2>/dev/null | head -1)"
else
  echo "kubectl already installed: $(kubectl version --client --short 2>/dev/null || true)"
fi

# --- Login: create/update kubeconfig from env ---
if [ -z "$KUBE_TOKEN" ] || [ -z "$KUBE_SERVER" ]; then
  echo "Error: KUBE_TOKEN and KUBE_SERVER must be set. Source env/kube.env or run ./scripts/generate-kube-env.sh first." >&2
  exit 1
fi

KUBE_NAMESPACE="${KUBE_NAMESPACE:-default}"
KUBECONFIG_PATH="${KUBECONFIG:-$HOME/.kube/config}"

# Create a kubeconfig that uses the token (separate file so we don't overwrite user's main config)
REMOTE_KUBECONFIG="${REMOTE_KUBECONFIG:-$REPO_ROOT/.kube-remote-config}"
mkdir -p "$(dirname "$REMOTE_KUBECONFIG")"

# Cluster name for this env
CLUSTER_NAME="remote-$(echo "$KUBE_SERVER" | sed -e 's|https\?://||' -e 's|[^a-z0-9]|-|gi' | cut -c1-40)"
CONTEXT_NAME="remote-$KUBE_NAMESPACE"

kubectl config set-cluster "$CLUSTER_NAME" \
  --server="$KUBE_SERVER" \
  --insecure-skip-tls-verify=true \
  --kubeconfig="$REMOTE_KUBECONFIG"

kubectl config set-credentials "token-$KUBE_NAMESPACE" \
  --token="$KUBE_TOKEN" \
  --kubeconfig="$REMOTE_KUBECONFIG"

kubectl config set-context "$CONTEXT_NAME" \
  --cluster="$CLUSTER_NAME" \
  --user="token-$KUBE_NAMESPACE" \
  --namespace="$KUBE_NAMESPACE" \
  --kubeconfig="$REMOTE_KUBECONFIG"

kubectl config use-context "$CONTEXT_NAME" --kubeconfig="$REMOTE_KUBECONFIG"

echo ""
echo "Login complete. To use this config:"
echo "  export KUBECONFIG=\"$REMOTE_KUBECONFIG\""
echo "  kubectl get pods"
echo ""
echo "Or use it once:"
echo "  KUBECONFIG=\"$REMOTE_KUBECONFIG\" kubectl get pods -n $KUBE_NAMESPACE"
echo ""

# Optionally export for current shell
if [ "${KUBE_EXPORT_KUBECONFIG:-0}" = "1" ]; then
  export KUBECONFIG="$REMOTE_KUBECONFIG"
  echo "KUBECONFIG exported (KUBE_EXPORT_KUBECONFIG=1)."
fi
