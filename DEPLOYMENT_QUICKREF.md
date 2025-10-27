# Deployment Quick Reference

## Environment Setup

```bash
# Docker Registry
export DOCKER_REGISTRY="scai-dev.common.repositories.cloud.sap"
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-password"

# Kubernetes
export KUBE_SERVER="https://your-k8s-api-server"
export KUBE_TOKEN="your-k8s-token"
export KUBE_USER="deployer"
export KUBE_NAMESPACE="grant-management"

# Optional
export IMAGE_TAG="v15"
export HELM_RELEASE="v01"
```

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build CAP service only |
| `npm run build:containers` | Build all Docker images locally |
| `npm run build:push` | Build and push all images to registry |
| `npm run deploy` | Full deployment (build + push + helm) |
| `npm run deploy:helm` | Deploy with Helm (skip build) |

## What Gets Built

1. **grant-management/api** - Main CAP service (Node.js)
2. **grant-management/approuter** - SAP App Router
3. **grant-management/mcp-proxy** - MCP Proxy (TypeScript)
4. **grant-management/cockpit-ui** - Cockpit UI (React + nginx)
5. **grant-management/grant-server** - .NET Grant Server
6. **grant-management/grant-mcp-layer** - .NET MCP Layer
7. **grant-management/portal** - User Portal (React)
8. **grant-management/mcp-server-example** - MCP Server Example

## Nginx Services

Only **cockpit-ui** uses nginx:
- Serves static React files
- Runs on port 8080
- Non-root user (101)
- Config: `app/cockpit-ui/nginx.conf`

## Common Issues

### "docker: command not found"
Ensure Docker is installed and running.

### "permission denied"
Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### "failed to push"
Login to registry:
```bash
echo $DOCKER_PASSWORD | docker login $DOCKER_REGISTRY -u $DOCKER_USERNAME --password-stdin
```

### ".NET build fails"
Ensure Directory.Build.* files exist in `app/grant-management/`

### "Helm chart not found"
Run `npm run build` first to generate the chart.

## Verify Deployment

```bash
# Check pods
kubectl get pods -n grant-management

# Check services
kubectl get services -n grant-management

# Check API rules
kubectl get apirules -n grant-management

# View logs
kubectl logs -f <pod-name> -n grant-management

# Port forward for testing
kubectl port-forward svc/srv 4004:4004 -n grant-management
```

## Local Development

```bash
# Run locally with Docker Compose
docker-compose -f docker-compose.local.yml up

# Run individual service
npm run watch
```
