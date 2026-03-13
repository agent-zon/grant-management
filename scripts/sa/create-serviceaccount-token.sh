#!/bin/bash
#
# Create a Kubernetes token from a ServiceAccount using kubectl create token (Kubernetes 1.24+).
# Use for remote dev, CI/CD, or any automation that needs cluster access.
#
# Usage:
#   ./scripts/create-serviceaccount-token.sh [OPTIONS] [SERVICE_ACCOUNT] [NAMESPACE]
#
# Examples:
#   ./scripts/create-serviceaccount-token.sh
#   ./scripts/create-serviceaccount-token.sh my-sa my-namespace
#   ./scripts/create-serviceaccount-token.sh --duration 24h --output env oauth-grant-management-sa
#

set -e

# Defaults (align with setup-namespace.sh)
DEFAULT_SA="oauth-grant-management-sa"
DURATION="1h"
OUTPUT="token"   # token | env | kubeconfig
CREATE_SA_IF_MISSING=true

usage() {
  cat <<EOF
Usage: $0 [OPTIONS] [SERVICE_ACCOUNT] [NAMESPACE]

Create a token for a Kubernetes ServiceAccount via: kubectl create token

Options:
  -d, --duration DURATION   Token lifetime (e.g. 10m, 1h, 24h). Default: 1h
  -o, --output FORMAT       Output format: token | env | kubeconfig. Default: token
  -n, --namespace NS        Namespace (overrides positional NAMESPACE)
  --no-create               Do not create ServiceAccount if missing; exit with error
  -h, --help                Show this help

Positional:
  SERVICE_ACCOUNT           ServiceAccount name (default: $DEFAULT_SA)
  NAMESPACE                 Namespace (default: current kubectl context namespace)

Environment (for --output env):
  KUBE_SERVICE_ACCOUNT      Set to the ServiceAccount name used
  KUBE_NAMESPACE            Set to the namespace used
  KUBE_TOKEN                Set to the generated token (when -o env)

Examples:
  # Token for default SA in current namespace (print to stdout)
  $0

  # Token for 24h, print as env vars for sourcing
  $0 --duration 24h --output env

  # Token for custom SA in a specific namespace
  $0 -d 8h my-pipeline-sa my-namespace

  # Export token to KUBE_TOKEN for use in scripts
  eval "\$($0 -o env -d 24h)"
  echo "\$KUBE_TOKEN" | base64 -d  # if you need to decode (this script outputs raw token)
EOF
  exit 0
}

# Parse options
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--duration)
      DURATION="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT="$2"
      shift 2
      ;;
    -n|--namespace)
      NAMESPACE_ARG="$2"
      shift 2
      ;;
    --no-create)
      CREATE_SA_IF_MISSING=false
      shift
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      ;;
    *)
      if [ -z "$SA_ARG" ]; then
        SA_ARG="$1"
      elif [ -z "$NS_ARG" ]; then
        NS_ARG="$1"
      fi
      shift
      ;;
  esac
done

SERVICE_ACCOUNT="${SA_ARG:-$DEFAULT_SA}"
NAMESPACE="${NS_ARG:-$NAMESPACE_ARG}"

# Resolve namespace: explicit arg, or current context
if [ -n "$NAMESPACE" ]; then
  NS="$NAMESPACE"
else
  NS=$(kubectl config view --minify -o jsonpath='{..namespace}' 2>/dev/null || true)
  if [ -z "$NS" ]; then
    echo "Error: No namespace set. Use -n/--namespace or set current context: kubectl config set-context --current --namespace=YOUR_NS" >&2
    exit 1
  fi
fi

# Create ServiceAccount if missing
if ! kubectl get serviceaccount "$SERVICE_ACCOUNT" -n "$NS" >/dev/null 2>&1; then
  if [ "$CREATE_SA_IF_MISSING" = true ]; then
    echo "Creating ServiceAccount $SERVICE_ACCOUNT in namespace $NS..."
    kubectl create serviceaccount "$SERVICE_ACCOUNT" -n "$NS"
    echo "ServiceAccount $SERVICE_ACCOUNT created."
  else
    echo "Error: ServiceAccount $SERVICE_ACCOUNT not found in namespace $NS. Use --no-create to avoid auto-creation." >&2
    exit 1
  fi
fi

# Create token (Kubernetes 1.24+)
TOKEN=$(kubectl create token "$SERVICE_ACCOUNT" -n "$NS" --duration="$DURATION" 2>/dev/null) || {
  echo "Error: 'kubectl create token' failed. Ensure Kubernetes >= 1.24 and you have permission to create tokens." >&2
  exit 1
}

case "$OUTPUT" in
  token)
    echo "$TOKEN"
    ;;
  env)
    echo "export KUBE_SERVICE_ACCOUNT=\"$SERVICE_ACCOUNT\""
    echo "export KUBE_NAMESPACE=\"$NS\""
    echo "export KUBE_TOKEN=\"$TOKEN\""
    ;;
  kubeconfig)
    echo "Error: kubeconfig output not implemented. Use --output token or env." >&2
    exit 1
    ;;
  *)
    echo "Error: Unknown output format: $OUTPUT. Use token or env." >&2
    exit 1
    ;;
esac
