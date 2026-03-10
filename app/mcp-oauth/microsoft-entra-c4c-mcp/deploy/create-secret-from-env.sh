#!/usr/bin/env bash
# Create K8s Secret microsoft-entra-c4c-mcp-env from this repo's .env (parent of deploy/).
# BASE_URL in the Function is set from the same URL as the APIRule when you pass base_url.
# Usage: ./create-secret-from-env.sh <namespace> [base_url]
# Example: ./create-secret-from-env.sh my-namespace https://microsoft-entra-c4c-mcp.my-namespace.cluster.example.com
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${APP_DIR}/.env"
APIRULE_FILE="${SCRIPT_DIR}/apirule.yaml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No .env file at $ENV_FILE. Copy .env.example to .env and fill in values." >&2
  exit 1
fi

NAMESPACE="${1:?Usage: $0 <namespace> [base_url]}"
BASE_URL="${2:-}"

# Build env file for kubectl: strip "export ", skip comments and empty lines
TMP_ENV=$(mktemp)
trap "rm -f '$TMP_ENV'" EXIT
grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/^export \s*//' > "$TMP_ENV"

if [[ -n "$BASE_URL" ]]; then
  echo "BASE_URL=$BASE_URL" >> "$TMP_ENV"
fi

kubectl create secret generic microsoft-entra-c4c-mcp-env \
  --from-env-file="$TMP_ENV" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret microsoft-entra-c4c-mcp-env applied in namespace $NAMESPACE (from .env). BASE_URL=${BASE_URL:-<not set>}"

if [[ -n "$BASE_URL" ]] && [[ -f "$APIRULE_FILE" ]]; then
  APIRULE_HOST="${BASE_URL#https://}"
  APIRULE_HOST="${APIRULE_HOST#http://}"
  APIRULE_HOST="${APIRULE_HOST%%/*}"
  sed -e "s|__APIRULE_HOST__|$APIRULE_HOST|g" -e "s|__NAMESPACE__|$NAMESPACE|g" "$APIRULE_FILE" | kubectl apply -f - -n "$NAMESPACE"
  echo "APIRule applied with host=$APIRULE_HOST (from base_url)."
fi
