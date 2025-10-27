# Grant Management Deployment Guide

This guide explains how to deploy the Grant Management application using the fixed deployment commands.

## Prerequisites

1. **Docker** - For building and pushing container images
2. **Kubernetes CLI (kubectl)** - For deploying to Kubernetes
3. **Environment Variables** - Set the following required variables:

```bash
export DOCKER_USERNAME="your-docker-username"
export DOCKER_PASSWORD="your-docker-password"
export DOCKER_REGISTRY="your-registry-url"
export DOCKER_TAG="latest"  # Optional, defaults to "latest"
```

## Available Commands

### Build Commands

```bash
# Build the application
npm run build

# Build Docker containers (without pushing)
npm run build:containers

# Build and push Docker containers
npm run build:push
```

### Deployment Commands

```bash
# Deploy everything (build, push, and deploy to Kubernetes)
npm run deploy

# Deploy to specific namespace and tag
npm run deploy grant-managment-dev v1.0.0

# Set up Docker registry secret only
npm run copy-docker-secret

# Set up namespace only
npm run setup-namespace
```

## Manual Deployment Steps

If you prefer to run the steps manually:

### 1. Build the Application
```bash
npm run build
```

### 2. Build and Push Docker Images
```bash
npm run build:push
```

### 3. Set up Docker Registry Secret
```bash
./scripts/copy-docker-secret.sh grant-managment-dev
```

### 4. Deploy to Kubernetes
```bash
./scripts/deploy-k8s.sh grant-managment-dev latest
```

## Docker Images

The following Docker images are built and pushed:

- `{DOCKER_REGISTRY}/grant-management/api:{TAG}` - Main CAP service
- `{DOCKER_REGISTRY}/grant-management/approuter:{TAG}` - Application router
- `{DOCKER_REGISTRY}/grant-management/grant-server:{TAG}` - .NET Grant Management Server
- `{DOCKER_REGISTRY}/grant-management/grant-mcp-layer:{TAG}` - .NET MCP Layer
- `{DOCKER_REGISTRY}/grant-management/cockpit-ui:{TAG}` - React UI

## Kubernetes Configuration

The deployment uses the following Kubernetes resources:

- **Deployment**: `grant-management` - Main application deployment
- **Service**: `grant-management-service` - ClusterIP service
- **APIRule**: `grant-management-api-rule` - Kyma API Gateway configuration
- **Secret**: `docker-registry-secret` - Docker registry authentication

## Environment Variables

The following environment variables are used:

- `DOCKER_USERNAME` - Docker registry username
- `DOCKER_PASSWORD` - Docker registry password
- `DOCKER_REGISTRY` - Docker registry URL
- `DOCKER_TAG` - Image tag (defaults to "latest")

## Troubleshooting

### Docker Build Issues
- Ensure Docker is running and accessible
- Check that all required files are present
- Verify Docker registry credentials

### Kubernetes Deployment Issues
- Check that kubectl is configured correctly
- Verify the namespace exists
- Check that the Docker registry secret is created
- Review pod logs: `kubectl logs -l app=grant-management -n grant-managment-dev`

### Port Configuration
- Main service runs on port 4004
- Service exposes port 80 externally
- Health checks use `/health` endpoint

## Fixed Issues

1. **Docker Files**: Updated to use proper `dotnet publish` for .NET applications
2. **Nginx Removal**: Replaced nginx with `serve` for static file serving
3. **Port Configuration**: Fixed port mappings (4004 internal, 80 external)
4. **Environment Variables**: Added support for Docker registry credentials
5. **Build Scripts**: Created custom build scripts to replace problematic `ctz` tool
6. **Kubernetes Secrets**: Added automatic Docker registry secret creation

## Next Steps

After successful deployment:

1. Verify the application is running: `kubectl get pods -n grant-managment-dev`
2. Check the logs: `kubectl logs -l app=grant-management -n grant-managment-dev`
3. Access the application via the configured hostname
4. Monitor the deployment status and health checks