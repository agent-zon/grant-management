# Deployment Instructions for Policies CAP Service

## Prerequisites
1. MCP Hub credentials (already configured in mcp-hub-env secret)
2. Git Access Token for SAP GitHub Enterprise

## Environment Variables Required

### Git Integration
- `GIT_ACCESS_TOKEN`: Personal Access Token for SAP GitHub Enterprise (github.tools.sap)
  - Needs access to the `AIAM/policies` repository
  - Required permissions: `repo` scope for reading and writing to the repository

### MCP Hub Integration (already configured)
- `MCP_HUB_URL`
- `MCP_HUB_CLIENT_ID`
- `MCP_HUB_CLIENT_SECRET`
- `MCP_HUB_CERTIFICATE_PATH`
- `MCP_HUB_PRIVATE_KEY_PATH`

## Deployment Steps

### 1. Update Kubernetes Secret
Add the Git access token to your existing secret:

```bash
# Get current secret values (if you need to preserve them)
kubectl get secret mcp-hub-env -n tomer-dev -o yaml

# Update the secret with Git access token
kubectl create secret generic mcp-hub-env \
  --from-literal=MCP_HUB_URL="your-mcp-hub-url" \
  --from-literal=MCP_HUB_CLIENT_ID="your-client-id" \
  --from-literal=MCP_HUB_CLIENT_SECRET="your-client-secret" \
  --from-literal=MCP_HUB_CERTIFICATE_PATH="/app/certs/client.crt" \
  --from-literal=MCP_HUB_PRIVATE_KEY_PATH="/app/certs/client.key" \
  --from-literal=GIT_ACCESS_TOKEN="your-git-access-token" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 2. Deploy the Application
```bash
# Build and push the Docker image
docker build -t scai-dev.common.repositories.cloud.sap/policies-cap/policies-cap:latest .
docker push scai-dev.common.repositories.cloud.sap/policies-cap/policies-cap:latest

# Apply the Kubernetes deployment
kubectl apply -f k8s-simple.yaml

# Check deployment status
kubectl get pods -n tomer-dev
kubectl logs -f deployment/policies-cap -n tomer-dev
```

## Features Enabled with Git Integration
- **Policy Storage**: Policies are stored in `{agentId}/policies.json` files in the AIAM/policies repository
- **Version Control**: All policy changes are committed with descriptive messages
- **Agent Manifests**: Load agent-specific configurations from Git repository
- **MCP YAML Files**: Load individual MCP server configurations from repository

## Repository Structure
```
AIAM/policies/
├── A532408/
│   ├── agent_manifest.yaml
│   ├── policies.json
│   └── mcps/
│       ├── ariba-mcp.yaml
│       ├── concur-mcp.yaml
│       └── commerce-mcp.yaml
└── other-agents/
    └── ...
```

## Testing
1. Access the application at the service endpoint
2. Load agent A532408 to test Git integration
3. Create/modify policies to test Git commits
4. Verify changes appear in the AIAM/policies repository