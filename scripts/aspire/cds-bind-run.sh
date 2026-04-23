#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/aspire/cds-bind-run.sh <resource> [--profile <profile>] [--kubeconfig <path>] [--] <command...>

Examples:
  scripts/aspire/cds-bind-run.sh auth --profile hybrid -- cds env requires.auth --resolve-bindings --profile hybrid
  scripts/aspire/cds-bind-run.sh destination --kubeconfig .kube-remote-config -- npm run token:client-credentials
  scripts/aspire/cds-bind-run.sh all -- npm run bind:resolve

Supported resources:
  auth | destination | github | srv | router | all

Notes:
  - If KUBECONFIG is set in the environment it will be used by cds bind --on k8s.
  - --kubeconfig overrides KUBECONFIG for the current invocation only.
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

resource="$1"
shift

profile="hybrid"
kubeconfig="${KUBECONFIG:-}"
skip_bind="${SKIP_BIND:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      profile="$2"
      shift 2
      ;;
    --kubeconfig)
      kubeconfig="$2"
      shift 2
      ;;
    --skip-bind)
      skip_bind="1"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

if [[ $# -eq 0 ]]; then
  echo "Error: command to run is required."
  usage
  exit 1
fi

if [[ -n "$kubeconfig" ]]; then
  export KUBECONFIG="$kubeconfig"
fi

if [[ "$skip_bind" == "1" ]]; then
  echo "[aspire] --skip-bind enabled -> running command without cds bind"
  exec "$@"
fi

bind_one() {
  local svc="$1"
  case "$svc" in
    auth)
      npx cds bind ias -2 agents-identity --on k8s
      ;;
    destination)
      npx cds bind -2 agents-destination-auth --on k8s
      ;;
    github)
      npx cds bind github -2 git-credentials --on k8s
      ;;
    srv)
      npx cds bind --to-app-services agents-srv --on k8s
      ;;
    router)
      npx cds bind --to-app-services agents-approuter --on k8s
      ;;
    *)
      echo "Unsupported resource: $svc"
      exit 1
      ;;
  esac
}

if [[ "$resource" == "all" ]]; then
  bind_one auth
  bind_one destination
  bind_one github
  bind_one srv
  bind_one router
else
  bind_one "$resource"
fi

exec npx cds bind --profile "$profile" --exec -- "$@"
