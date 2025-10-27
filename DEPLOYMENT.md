# Grant Management Deployment Guide

This document describes how to deploy the Grant Management application using the fixed deployment scripts.

## Prerequisites

1. **Docker**: Install Docker and ensure it's running
2. **Node.js**: Version 22.16 or higher
3. **Required Tools**: 
   - `ctz` (containerization tool)
   - `helm` (for Kubernetes deployment)
   - `kubectl` (for Kubernetes management)

## Environment Variables

Set the following environment variables before deployment:

```bash
# Docker Registry Configuration
export DOCKER_USERNAME="your-docker-username"
export DOCKER_PASSWORD="your-docker-password"
export DOCKER_REGISTRY="scai-dev.common.repositories.cloud.sap"

# Kubernetes Configuration
export KUBE_TOKEN="your-kube-token"
export KUBE_USER="your-kube-user"
```

## Deployment Commands

### 1. Build Containers Only
```bash
npm run build:containers
```

### 2. Build and Push Containers
```bash
npm run build:push
```

### 3. Full Deployment
```bash
npm run deploy
```

## What Was Fixed

### Docker Files
- **Removed nginx dependency** from `app/cockpit-ui/Dockerfile`
- **Updated to use Node.js with serve** for static file serving
- **Fixed build contexts** in `containerize.yaml` for .NET projects
- **Added missing modules** (portal, mcp-proxy) to containerization

### Build Scripts
- **Updated `containerize.yaml`** with correct build contexts
- **Created `scripts/deploy.sh`** for automated deployment
- **Updated package.json** to use the new deployment script
- **Added `serve` package** to cockpit-ui dependencies

### Containerization
- **Fixed .NET project build contexts** to use correct directories
- **Added all required services** to the containerization process
- **Maintained proper Docker multi-stage builds** for .NET projects

## Services Included

The deployment includes the following services:

1. **grant-management/api** - Main CAP service
2. **grant-management/approuter** - Application router
3. **grant-management/grant-server** - .NET Grant Management Server
4. **grant-management/grant-mcp-layer** - .NET MCP Layer
5. **grant-management/cockpit-ui** - React UI (no nginx)
6. **grant-management/portal** - Portal application
7. **grant-management/mcp-proxy** - MCP Proxy service

## Testing

Run the test script to verify the setup:

```bash
./scripts/test-build.sh
```

This will check:
- ✅ ctz command availability
- ✅ containerize.yaml validity
- ✅ Docker files existence
- ✅ package.json scripts

## Troubleshooting

### Docker Issues
If you encounter Docker network issues, try:
```bash
# For rootless Docker
export XDG_RUNTIME_DIR=/home/ubuntu/.docker/run
export PATH=/usr/bin:$PATH
export DOCKER_HOST=unix:///home/ubuntu/.docker/run/docker.sock
```

### Missing Dependencies
Install required tools:
```bash
npm install -g @sap/cds-dk ctz
```

### Build Context Issues
Ensure all Docker files are in the correct locations and build contexts are properly set in `containerize.yaml`.

## Next Steps

1. Set up your environment variables
2. Ensure Docker is running properly
3. Run `npm run deploy` to deploy the application
4. Monitor the deployment with `kubectl get pods`