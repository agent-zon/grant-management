#!/usr/bin/env bash
# Push app/mcp-oauth/export-for-aiam-functions to https://github.tools.sap/AIAM/functions.git
# via git subtree. Run from the agent-grants repo root.
# The remote branch will have microsoft-entra-c4c-mcp/ at root.
set -e

REMOTE_NAME="${1:-aiam-functions}"
BRANCH="${2:-main}"
# Script lives at app/mcp-oauth/export-for-aiam-functions/push-subtree.sh -> repo root is 3 levels up
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PREFIX="app/mcp-oauth/export-for-aiam-functions"
REMOTE_URL="https://github.tools.sap/AIAM/functions.git"

cd "$REPO_ROOT"

if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
  echo "Adding remote $REMOTE_NAME -> $REMOTE_URL"
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

echo "Pushing subtree $PREFIX to $REMOTE_NAME $BRANCH"
git subtree push --prefix="$PREFIX" "$REMOTE_NAME" "$BRANCH"

echo "Done. Remote $REMOTE_NAME branch $BRANCH now has microsoft-entra-c4c-mcp/ at root."
