# Build & Deploy System - Complete Summary

## 🎯 Problem Solved

The deployment commands `npm run build:containers` and `npm run deploy` were broken because:
1. They relied on the `ctz` tool which wasn't installed
2. .NET Dockerfiles had incorrect context paths
3. No clear separation between build and deploy steps
4. Missing documentation

## ✅ Solution Implemented

### New Scripts Created

#### 1. `scripts/build-containers.sh`
**Purpose**: Build all Docker images

**Features**:
- Builds 8 different services
- Supports both `docker buildx` and regular `docker build`
- Automatic Docker login when pushing
- Environment variable configuration
- Progress indicators and error handling

**Usage**:
```bash
# Build locally
npm run build:containers

# Build and push
npm run build:push

# With custom tag
IMAGE_TAG=v16 npm run build:push
```

#### 2. `scripts/deploy.sh`
**Purpose**: Deploy to Kubernetes using Helm

**Features**:
- kubectl configuration from environment variables
- Automatic namespace creation
- Docker registry secret creation
- Helm deployment with custom values
- Post-deployment verification

**Usage**:
```bash
# Deploy only
npm run deploy:helm

# Full build and deploy
npm run deploy
```

### Files Modified

#### 1. `package.json`
Updated scripts:
- `build:containers`: `./scripts/build-containers.sh`
- `build:push`: `PUSH=true ./scripts/build-containers.sh`
- `deploy`: `PUSH=true ./scripts/build-containers.sh && ./scripts/deploy.sh`
- `deploy:helm`: `./scripts/deploy.sh`

#### 2. `app/grant-management/GrantManagementServer/Dockerfile`
- Fixed paths to reference `app/grant-management/` from root context
- Fixed paths to reference `app/common/` for shared dependencies
- Ensured Directory.Build.* files are properly copied

#### 3. `app/grant-management/GrantMcpLayer/Dockerfile`
- Fixed paths to reference `app/grant-management/` from root context
- Fixed paths to reference `app/common/` for shared dependencies
- Added missing APP_UID argument

### Files Deleted

- `containerize.yaml` - No longer needed (replaced by build script)

### Documentation Created

1. **`DEPLOYMENT.md`** (359 lines)
   - Complete deployment guide
   - Prerequisites and setup
   - Service overview
   - Troubleshooting
   - CI/CD examples

2. **`DEPLOYMENT_QUICKREF.md`** (94 lines)
   - Quick reference for commands
   - Common issues and solutions
   - Verification steps

3. **`DEPLOYMENT_CHANGES.md`** (208 lines)
   - What changed and why
   - Migration guide
   - Benefits of new system

4. **`.env.example`**
   - Template for environment variables
   - All required and optional settings

5. **`BUILD_DEPLOY_SUMMARY.md`** (this file)
   - Complete overview of the solution

## 🏗️ Architecture

### Build Flow
```
npm run build:containers
    ↓
[1] npm run build (CAP service)
    ↓
[2] Build grant-management/api (Node.js)
    ↓
[3] Build grant-management/approuter
    ↓
[4] Build grant-management/mcp-proxy
    ↓
[5] Build grant-management/cockpit-ui (nginx)
    ↓
[6] Build grant-management/grant-server (.NET)
    ↓
[7] Build grant-management/grant-mcp-layer (.NET)
    ↓
[8] Build grant-management/portal
    ↓
[9] Build grant-management/mcp-server-example
```

### Deploy Flow
```
npm run deploy
    ↓
[1] Build all containers (with PUSH=true)
    ↓
[2] Docker login
    ↓
[3] Push all images
    ↓
[4] Configure kubectl
    ↓
[5] Create namespace
    ↓
[6] Create registry secret
    ↓
[7] Build CAP (generate Helm chart)
    ↓
[8] Helm upgrade --install
    ↓
[9] Verify deployment
```

## 🐳 Docker Images

| Image | Base | Build Type | Nginx |
|-------|------|------------|-------|
| api | node:22-alpine | Multi-stage | ❌ |
| approuter | sapse/approuter:20.8.0 | Single-stage | ❌ |
| mcp-proxy | node:20-alpine | Multi-stage TypeScript | ❌ |
| **cockpit-ui** | nginx:alpine | **Multi-stage (Node + nginx)** | ✅ |
| grant-server | dotnet/aspnet:9.0 | Multi-stage .NET | ❌ |
| grant-mcp-layer | dotnet/aspnet:9.0 | Multi-stage .NET | ❌ |
| portal | node:20-alpine | Multi-stage React | ❌ |
| mcp-server-example | node:18-alpine | Multi-stage TypeScript | ❌ |

**Note**: Only `cockpit-ui` uses nginx to serve static React files.

## 🔑 Environment Variables

### Docker Registry (Required for push/deploy)
```bash
DOCKER_REGISTRY=scai-dev.common.repositories.cloud.sap
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password
```

### Kubernetes (Required for deploy)
```bash
KUBE_SERVER=https://api.k8s.cluster
KUBE_TOKEN=your-k8s-token
KUBE_USER=deployer
KUBE_NAMESPACE=grant-management
```

### Optional
```bash
IMAGE_TAG=v15                # Image version tag
HELM_RELEASE=v01             # Helm release name
PUSH=false                   # Set to true to push images
```

## 📋 Quick Commands Reference

| Task | Command |
|------|---------|
| Build CAP only | `npm run build` |
| Build containers locally | `npm run build:containers` |
| Build & push containers | `npm run build:push` |
| Deploy to K8s | `npm run deploy:helm` |
| **Full deployment** | **`npm run deploy`** |
| Local dev (Docker Compose) | `docker-compose -f docker-compose.local.yml up` |

## 🧪 Testing & Verification

### Test Build
```bash
# Dry run (build without push)
npm run build:containers
```

### Test Deploy
```bash
# Just deploy (assumes images exist)
npm run deploy:helm
```

### Verify Deployment
```bash
# Check all pods
kubectl get pods -n grant-management

# Check services
kubectl get svc -n grant-management

# View logs
kubectl logs -f deployment/srv -n grant-management
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm install
      
      - name: Deploy
        env:
          DOCKER_REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
          KUBE_SERVER: ${{ secrets.KUBE_SERVER }}
          KUBE_TOKEN: ${{ secrets.KUBE_TOKEN }}
          KUBE_USER: deployer
          KUBE_NAMESPACE: grant-management
          IMAGE_TAG: ${{ github.sha }}
        run: npm run deploy
```

## 🚨 Common Issues & Solutions

### Issue: "docker: command not found"
**Solution**: Install Docker and ensure it's in PATH

### Issue: "permission denied" on scripts
**Solution**: 
```bash
chmod +x scripts/*.sh
```

### Issue: "failed to push image"
**Solution**: Check Docker credentials and login:
```bash
echo $DOCKER_PASSWORD | docker login $DOCKER_REGISTRY -u $DOCKER_USERNAME --password-stdin
```

### Issue: ".NET build fails"
**Solution**: Ensure all files exist in correct locations:
- `app/grant-management/Directory.Build.props`
- `app/grant-management/Directory.Build.targets`
- `app/grant-management/Directory.Packages.props`
- `app/common/Common.csproj`

### Issue: "Helm chart not found"
**Solution**: Run `npm run build` first to generate the chart

## 📊 Success Metrics

✅ All Dockerfiles now build from correct context
✅ No dependency on external tools (`ctz`)
✅ Standard Docker/kubectl/Helm workflow
✅ Complete documentation coverage
✅ CI/CD ready with environment variables
✅ Both buildx and regular docker build supported
✅ Proper error handling and user feedback
✅ Nginx only used where needed (cockpit-ui)

## 🎉 Final Result

You can now run:
```bash
npm run deploy
```

And it will:
1. ✅ Build all Docker images
2. ✅ Push them to the registry
3. ✅ Deploy to Kubernetes
4. ✅ Show deployment status

**No more manual Docker commands or failed builds!**

## 📚 Additional Resources

- See `DEPLOYMENT.md` for complete guide
- See `DEPLOYMENT_QUICKREF.md` for quick reference
- See `DEPLOYMENT_CHANGES.md` for migration details
- Copy `.env.example` to `.env` for local setup
