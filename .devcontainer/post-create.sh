#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI not found in devcontainer image; install Docker tooling in base image or devcontainer features."
fi

npm install

# Ensure Aspire CLI is available in every devcontainer session.
if ! command -v aspire >/dev/null 2>&1; then
  curl -sSL https://aspire.dev/install.sh -o /tmp/aspire-install.sh
  chmod +x /tmp/aspire-install.sh
  /tmp/aspire-install.sh --install-path "$HOME/.aspire/bin"
  if ! grep -q '.aspire/bin' "$HOME/.bashrc"; then
    echo 'export PATH="$HOME/.aspire/bin:$PATH"' >> "$HOME/.bashrc"
  fi
fi
