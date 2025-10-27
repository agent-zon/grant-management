# Grant Management Deployment Guide

This guide explains how to deploy the Grant Management application using the updated Docker and Kubernetes deployment system.

## Prerequisites

- Docker (for building images)
- kubectl (for Kubernetes deployment)
- Access to a Docker registry
- Access to a Kubernetes cluster

## Environment Variables

### Required for Docker Registry

```bash
export DOCKER_REGISTRY="your-registry.com"
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-password"
```

### Required for Kubernetes Deployment

```bash
export KUBE_TOKEN="your-k8s-token"
export KUBE_USER="your-k8s-user"
export KUBE_SERVER="https://your-k8s-server:6443"  # Optional, defaults to https://kubernetes.default.svc
```

### Optional Configuration

```bash
export VERSION="v1.0.0"  # Default: latest
export NAMESPACE="grant-management-dev"  # Default: grant-management-dev
```

## Deployment Commands

### 1. Validate Configuration

Before deploying, validate that all required files and configuration are present:

```bash
npm run validate:deployment
```

### 2. Build and Push Images

Build all Docker images and push them to the registry:

```bash
npm run build:containers
```

This will build and push the following images:
- `grant-management/api` - Main Node.js/CDS service
- `grant-management/approuter` - SAP App Router
- `grant-management/grant-server` - .NET Grant Management Server
- `grant-management/grant-mcp-layer` - .NET MCP Layer
- `grant-management/cockpit-ui` - React UI with nginx
- `grant-management/mcp-proxy` - MCP Proxy service
- `grant-management/mcp-server-example` - Example MCP Server

### 3. Deploy to Kubernetes

Deploy the application to your Kubernetes cluster:

```bash
npm run deploy:k8s
```

### 4. Complete Deployment (Build + Deploy)

To build and deploy in one command:

```bash
npm run deploy
```

## Architecture Overview

The application consists of multiple services:

1. **Main API Service** (`grant-management/api`)
   - Node.js application with CDS framework
   - Handles OAuth 2.0 Grant Management API
   - Port: 8080

2. **App Router** (`grant-management/approuter`)
   - SAP App Router for authentication and routing
   - Handles static file serving and auth

3. **Grant Management Server** (`grant-management/grant-server`)
   - .NET service for grant management operations
   - Port: 8080

4. **Grant MCP Layer** (`grant-management/grant-mcp-layer`)
   - .NET service providing MCP integration
   - Port: 8080

5. **Cockpit UI** (`grant-management/cockpit-ui`)
   - React application served by nginx
   - Management interface for grants
   - Port: 8080

6. **MCP Proxy** (`grant-management/mcp-proxy`)
   - Node.js proxy service for MCP communication
   - Port: 8080

7. **MCP Server Example** (`grant-management/mcp-server-example`)
   - Example MCP server implementation
   - Port: 3000

## Docker Files

### Node.js Services
- Use multi-stage builds with Alpine Linux
- Non-root user execution
- Health checks included

### .NET Services
- Use official Microsoft .NET images
- Multi-stage builds with SDK and runtime
- `dotnet publish` for optimized production builds
- Non-root user execution

### React UI
- Vite build system
- nginx for static file serving
- Custom nginx configuration for SPA routing

## Kubernetes Deployment

The deployment includes:
- Deployment manifest with resource limits
- Service for internal communication
- APIRule for external access (Kyma)
- Docker registry secret for image pulling
- Namespace isolation

## Troubleshooting

### Build Issues

1. **CDS Build Fails**
   ```bash
   npm install
   npm run build
   ```

2. **Docker Build Fails**
   - Check Docker is running
   - Verify Dockerfile syntax
   - Check file paths in COPY commands

3. **Registry Push Fails**
   - Verify Docker credentials
   - Check registry URL format
   - Ensure proper permissions

### Deployment Issues

1. **Kubernetes Connection Fails**
   - Verify KUBE_TOKEN is valid
   - Check KUBE_SERVER URL
   - Ensure kubectl context is correct

2. **Image Pull Fails**
   - Verify Docker registry secret
   - Check image names and tags
   - Ensure images were pushed successfully

3. **Pod Startup Fails**
   - Check pod logs: `kubectl logs -n <namespace> <pod-name>`
   - Verify resource limits
   - Check environment variables

## Security Considerations

- All services run as non-root users
- Docker registry credentials are handled securely
- Kubernetes secrets are used for sensitive data
- Network policies can be applied for additional security

## Monitoring

After deployment, check the status:

```bash
# Check pods
kubectl get pods -n grant-management-dev

# Check services
kubectl get services -n grant-management-dev

# Check API rule (if using Kyma)
kubectl get apirule -n grant-management-dev

# View logs
kubectl logs -n grant-management-dev deployment/grant-management
```

## Development vs Production

### Development
- Use `docker-compose.local.yml` for local development
- SQLite database
- Hot reloading enabled

### Production
- Use Kubernetes deployment
- PostgreSQL database
- Optimized builds
- Resource limits and health checks