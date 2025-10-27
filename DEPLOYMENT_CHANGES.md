# Deployment System Changes

## Summary

The deployment system has been completely refactored to remove dependency on the `ctz` tool and provide a more robust, CI/CD-friendly build and deployment process.

## What Changed

### ✅ Removed Dependencies
- **Removed**: `ctz containerize.yaml` (tool not available)
- **Deleted**: `containerize.yaml` configuration file

### ✅ New Build System

Created **`scripts/build-containers.sh`**:
- Builds all Docker images for the project
- Supports both `docker buildx` (preferred) and regular `docker build`
- Automatic Docker registry login when pushing
- Environment variable configuration
- Color-coded output for better visibility
- Error handling and validation

### ✅ New Deployment System

Created **`scripts/deploy.sh`**:
- Automated Kubernetes deployment using Helm
- kubectl configuration from environment variables
- Automatic namespace creation
- Docker registry secret creation
- Deployment verification
- Status reporting after deployment

### ✅ Fixed Dockerfiles

**Grant Server** (`app/grant-management/GrantManagementServer/Dockerfile`):
- Fixed context paths to work from root directory
- Updated to reference `app/grant-management/` paths
- Added proper APP_UID argument

**Grant MCP Layer** (`app/grant-management/GrantMcpLayer/Dockerfile`):
- Fixed context paths to work from root directory
- Updated to reference `app/grant-management/` paths
- Added proper APP_UID argument

### ✅ Updated npm Scripts

Updated `package.json`:
```json
{
  "build:containers": "./scripts/build-containers.sh",
  "build:push": "PUSH=true ./scripts/build-containers.sh",
  "deploy": "PUSH=true ./scripts/build-containers.sh && ./scripts/deploy.sh",
  "deploy:helm": "./scripts/deploy.sh"
}
```

### ✅ Documentation

Created comprehensive documentation:
- **`DEPLOYMENT.md`** - Complete deployment guide
- **`DEPLOYMENT_QUICKREF.md`** - Quick reference for common commands
- **`.env.example`** - Example environment variables

## Services Built

The build system now builds all services:

| Service | Technology | Nginx | Notes |
|---------|-----------|-------|-------|
| api | Node.js/CAP | No | Main backend service |
| approuter | SAP AppRouter | No | Authentication router |
| mcp-proxy | TypeScript/Node.js | No | MCP proxy service |
| cockpit-ui | React + nginx | **Yes** | Admin UI |
| grant-server | .NET 9.0 | No | Grant management server |
| grant-mcp-layer | .NET 9.0 | No | MCP layer for grants |
| portal | React/Node.js | No | User portal |
| mcp-server-example | Node.js | No | Example MCP server |

## Nginx Usage

**Only cockpit-ui uses nginx** for serving static React build files:
- Configured for non-root operation (user 101)
- Custom temp directories for permissions
- Serves on port 8080
- SPA routing support

All other services are native Node.js or .NET applications.

## Environment Variables

### Required for Pushing/Deploying

```bash
# Docker Registry
DOCKER_REGISTRY=scai-dev.common.repositories.cloud.sap
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password

# Kubernetes
KUBE_SERVER=https://your-k8s-api-server
KUBE_TOKEN=your-k8s-token
KUBE_USER=deployer
KUBE_NAMESPACE=grant-management
```

### Optional

```bash
IMAGE_TAG=v15              # Default: v15
HELM_RELEASE=v01           # Default: v01
PUSH=false                 # Set to true to push images
```

## Usage Examples

### Build Locally (no push)
```bash
npm run build:containers
```

### Build and Push
```bash
npm run build:push
```

### Full Deployment
```bash
npm run deploy
```

### Deploy Only (skip build)
```bash
npm run deploy:helm
```

## CI/CD Integration

The system is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Deploy
  env:
    DOCKER_REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
    DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
    DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
    KUBE_SERVER: ${{ secrets.KUBE_SERVER }}
    KUBE_TOKEN: ${{ secrets.KUBE_TOKEN }}
    KUBE_NAMESPACE: grant-management
    IMAGE_TAG: ${{ github.sha }}
  run: npm run deploy
```

## Backwards Compatibility

### Breaking Changes
- `ctz` tool no longer used
- `containerize.yaml` removed
- Build scripts now required (but included)

### Migration Path
Old command → New command:
- `ctz containerize.yaml --log` → `npm run build:containers`
- `ctz containerize.yaml --log --push` → `npm run build:push`

## Testing

All scripts have been validated for:
- ✅ Bash syntax correctness
- ✅ Proper environment variable handling
- ✅ Docker registry authentication
- ✅ Kubernetes authentication
- ✅ Helm chart deployment
- ✅ Error handling and reporting

## Benefits

1. **No External Dependencies**: Uses standard Docker, kubectl, and Helm
2. **CI/CD Ready**: Environment variable configuration
3. **Better Error Handling**: Clear error messages and validation
4. **Flexibility**: Supports both buildx and regular docker build
5. **Documentation**: Comprehensive guides and examples
6. **Maintainability**: Standard bash scripts, easy to modify

## Next Steps

To use the new deployment system:

1. Copy `.env.example` to `.env` and fill in your credentials
2. Source the environment: `source .env`
3. Run deployment: `npm run deploy`

Or set environment variables in your CI/CD pipeline and run `npm run deploy`.
