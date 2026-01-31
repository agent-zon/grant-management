#!/bin/bash
# Wrapper script for token exchange that reads from stdin

RESOURCE="${MCP_RESOURCE:-grant-mcp}"
TOKEN=$(cat)
npx cds bind --profile hybrid --exec -- node tools/ias-token-cli/bin/ias-token.js exchange -s "$TOKEN" -r "$RESOURCE" 2>/dev/null | tail -1
