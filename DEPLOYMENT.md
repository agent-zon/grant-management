# Deployment Guide

This guide explains how to build and deploy the Grant Management system to Kubernetes.

## Prerequisites

- Docker (with buildx support recommended)
- kubectl configured with access to your Kubernetes cluster
- Helm 3.x
- Node.js 22+ (for building CAP services)
- Access to Docker registry

## Environment Variables

### Docker Registry

```bash
export DOCKER_REGISTRY="scai-dev.common.repositories.cloud.sap"
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-password"
```

### Kubernetes

```bash
export KUBE_SERVER="https://your-k8s-api-server"
export KUBE_TOKEN="your-k8s-token"
export KUBE_USER="deployer"
export KUBE_NAMESPACE="grant-management"
```

### Optional Configuration

```bash
export IMAGE_TAG="v15"                    # Default: v15
export HELM_RELEASE="v01"                 # Default: v01
```

## Building Containers

### Build Locally (without pushing)

```bash
npm run build:containers
```

This will:
1. Build the CAP service (`npm run build`)
2. Build all Docker images:
   - `grant-management/api` - Main CAP/Node.js service
   - `grant-management/approuter` - SAP App Router
   - `grant-management/mcp-proxy` - MCP Proxy service
   - `grant-management/cockpit-ui` - Cockpit UI (nginx + React)
   - `grant-management/grant-server` - .NET Grant Server
   - `grant-management/grant-mcp-layer` - .NET MCP Layer
   - `grant-management/portal` - User Portal (optional)

### Build and Push to Registry

```bash
npm run build:push
```

This will build all images and push them to the configured Docker registry.

## Deployment

### Full Deployment (Build + Push + Deploy)

```bash
npm run deploy
```

This single command will:
1. Build all Docker images
2. Push them to the registry
3. Deploy to Kubernetes using Helm

### Deploy Only (skip build)

If images are already built and pushed:

```bash
npm run deploy:helm
```

## Manual Deployment Steps

If you prefer to run steps manually:

### 1. Build CAP Service

```bash
npm run build
```

### 2. Build Docker Images

```bash
./scripts/build-containers.sh
```

### 3. Push to Registry

```bash
PUSH=true ./scripts/build-containers.sh
```

### 4. Deploy with Helm

```bash
./scripts/deploy.sh
```

## Services Overview

### Main Services

| Service | Port | Description | Nginx |
|---------|------|-------------|-------|
| **srv** | 4004 | Main CAP/Node.js API service | No |
| **approuter** | 9000 | SAP App Router for authentication | No |
| **grant-server** | 8080 | .NET Grant Management Server | No |
| **grant-mcp-layer** | 8080 | .NET MCP Layer | No |
| **mcp-proxy** | 8080 | MCP Proxy service | No |
| **cockpit-ui** | 8080 | Cockpit UI | **Yes** |
| **portal** | 3000 | User Portal | No |

### Nginx Usage

Only the **cockpit-ui** service uses nginx. It's configured to:
- Serve static React build files
- Run as non-root user (101)
- Use custom temp directories for non-root operation
- Serve on port 8080

The nginx configuration is located at `app/cockpit-ui/nginx.conf`.

## Dockerfiles

### CAP Service (Node.js)
- **Path**: `Dockerfile`
- **Context**: `.` (root)
- **Base**: node:22-alpine
- **Build**: Multi-stage with CAP build

### App Router
- **Path**: `app/router/Dockerfile`
- **Context**: `app/router`
- **Base**: sapse/approuter:20.8.0

### MCP Proxy
- **Path**: `app/mcp-proxy/Dockerfile`
- **Context**: `app/mcp-proxy`
- **Base**: node:20-alpine
- **Build**: TypeScript compilation

### Cockpit UI
- **Path**: `app/cockpit-ui/Dockerfile`
- **Context**: `app/cockpit-ui`
- **Base**: nginx:alpine
- **Build**: Multi-stage (Node.js build + nginx serve)

### Grant Server (.NET)
- **Path**: `app/grant-management/GrantManagementServer/Dockerfile`
- **Context**: `.` (root - needs access to shared dependencies)
- **Base**: mcr.microsoft.com/dotnet/aspnet:9.0
- **Build**: Multi-stage with dotnet publish

### Grant MCP Layer (.NET)
- **Path**: `app/grant-management/GrantMcpLayer/Dockerfile`
- **Context**: `.` (root - needs access to shared dependencies)
- **Base**: mcr.microsoft.com/dotnet/aspnet:9.0
- **Build**: Multi-stage with dotnet publish

### Portal
- **Path**: `app/portal/Dockerfile`
- **Context**: `app/portal`
- **Base**: node:20-alpine
- **Build**: Multi-stage with npm build

## Troubleshooting

### Docker Build Fails

1. Ensure Docker is running
2. Check Docker buildx is available: `docker buildx version`
3. Verify you have access to base images
4. For .NET builds, ensure all Directory.Build.* files exist

### Push Fails

1. Verify Docker credentials: `docker login $DOCKER_REGISTRY`
2. Check network connectivity to registry
3. Ensure you have push permissions

### Deployment Fails

1. Verify kubectl connectivity: `kubectl cluster-info`
2. Check Helm chart exists: `ls -la gen/chart` or `ls -la chart`
3. Verify namespace exists: `kubectl get namespace $KUBE_NAMESPACE`
4. Check Docker registry secret: `kubectl get secret docker-registry -n $KUBE_NAMESPACE`

### Pod Crashes

1. Check pod logs: `kubectl logs <pod-name> -n $KUBE_NAMESPACE`
2. Describe pod: `kubectl describe pod <pod-name> -n $KUBE_NAMESPACE`
3. Verify image pull: `kubectl get events -n $KUBE_NAMESPACE`

## CI/CD Integration

The deployment scripts are designed to work in CI/CD pipelines. Set the required environment variables and run:

```bash
npm run deploy
```

Example GitHub Actions workflow:

```yaml
- name: Deploy
  env:
    DOCKER_REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
    DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
    DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
    KUBE_SERVER: ${{ secrets.KUBE_SERVER }}
    KUBE_TOKEN: ${{ secrets.KUBE_TOKEN }}
    KUBE_USER: ${{ secrets.KUBE_USER }}
    KUBE_NAMESPACE: grant-management
    IMAGE_TAG: ${{ github.sha }}
  run: npm run deploy
```

## Local Development

For local development with Docker Compose:

```bash
docker-compose -f docker-compose.local.yml up
```

This will start all services locally without Kubernetes.

## Next Steps

After deployment:

1. Verify all pods are running: `kubectl get pods -n $KUBE_NAMESPACE`
2. Check services: `kubectl get services -n $KUBE_NAMESPACE`
3. Access the application through the APIRule/Ingress
4. Monitor logs: `kubectl logs -f <pod-name> -n $KUBE_NAMESPACE`
