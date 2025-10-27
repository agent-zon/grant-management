# v01 Deployment Results

**Created**: 2025-10-27  
**Last Updated**: 2025-10-27  
**Category**: [DEPLOYMENT]  
**Timeline**: 01 of 04 - First deployment milestone

## Overview

v01 deployment to Kyma completed with partial success. Core Node.js services (srv, approuter) are running and accessible. New .NET services require additional work to resolve image build/pull issues.

## Deployment Status

### ✅ Successfully Running

| Service           | Status        | URL                                                                      |
| ----------------- | ------------- | ------------------------------------------------------------------------ |
| **v01-srv**       | Running (2/2) | https://v01-srv-grant-management.c-127c9ef.stage.kyma.ondemand.com       |
| **v01-approuter** | Running (2/2) | https://v01-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com |

### ⚠️ Partially Working

| Service              | Status           | Issue                                                    |
| -------------------- | ---------------- | -------------------------------------------------------- |
| **v01-grant-server** | Init:0/2         | Waiting for PostgreSQL service instance initialization   |
| **v01-cockpit-ui**   | ImagePullBackOff | Registry reports image not found despite successful push |

### ❌ Failed (Missing Images)

| Service                 | Status           | Issue                                                |
| ----------------------- | ---------------- | ---------------------------------------------------- |
| **v01-mcp-proxy**       | ImagePullBackOff | Image not built - TypeScript errors in build process |
| **v01-grant-mcp-layer** | ImagePullBackOff | Image not built - requires csharp-sdk git submodule  |

## Tested URLs

### Working Endpoints ✅

```bash
# Approuter (redirects to IAS auth)
curl https://v01-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/
# HTTP 302 → IAS login

# API Documentation (no auth)
curl https://v01-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/api-docs/
# HTTP 200 ✓

# Srv Health Check (direct)
curl https://v01-srv-grant-management.c-127c9ef.stage.kyma.ondemand.com/health
# HTTP 200 ✓
```

### Endpoints Requiring Authentication

```bash
# OAuth Server Metadata
https://v01-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/oauth-server/metadata
# → Redirects to IAS (requires authentication)

# Grant Management API
https://v01-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/grants-management/Grants
# → Requires IAS authentication
```

## Images Successfully Built & Pushed

| Image                         | Tag | Size   | Registry Status        |
| ----------------------------- | --- | ------ | ---------------------- |
| grant-management/api          | v14 | 270MB  | ✅ Pushed              |
| grant-management/grant-server | v14 | 97.4MB | ✅ Pushed              |
| grant-management/cockpit-ui   | v14 | 25.7MB | ✅ Pushed              |
| grant-management/approuter    | v14 | 269MB  | ✅ Already in registry |

## Technical Issues Resolved

### Issue 1: "Invalid framework identifier" Error

**Problem**: .NET Docker build failed with cryptic framework identifier error  
**Root Cause**: Directory.Build.props, Directory.Build.targets, Directory.Packages.props not in Docker context  
**Solution**: Copied these files to app/grant-management/ folder

**Technical Details**:

- MSBuild looks for Directory.Build.\* files in parent directories
- Projects inherit TargetFramework, package versions, and other settings
- Docker COPY can't access files outside build context
- Moved files into build context, updated Dockerfile to place them at container root

### Issue 2: Missing tsconfig.json

**Problem**: tsconfig.cdsbuild.json extends ./tsconfig.json which didn't exist  
**Root Cause**: File accidentally removed during branch merge  
**Solution**: Restored from commit 72967a2 where it previously existed

## Outstanding Issues

### Issue 3: cockpit-ui ImagePullBackOff

**Symptoms**: Pod shows `ImagePullBackOff` despite successful `docker push`  
**Possible Causes**:

1. Registry authentication issue in Kubernetes
2. Image manifest not propagated yet
3. Wrong image name/tag in deployment

**Next Steps**:

- Verify image exists in registry: `docker manifest inspect scai-dev.common.repositories.cloud.sap/grant-management/cockpit-ui:v14`
- Check pod describe for exact error
- Verify imagePullSecret is configured correctly

### Issue 4: mcp-proxy Image Not Built

**Symptoms**: TypeScript compilation errors prevent container build  
**Root Cause**: Build process runs TypeScript checks which fail  
**Options**:

1. Fix TypeScript errors in temp/ and test/ directories
2. Skip TypeScript checks in containerize.yaml
3. Use existing v13 mcp-proxy image (if compatible)

### Issue 5: grant-mcp-layer Requires csharp-sdk

**Symptoms**: GrantMcpLayer.csproj references `csharp-sdk` submodule which doesn't exist  
**Root Cause**: Git submodule not initialized, no .gitmodules file  
**Options**:

1. Initialize submodule if it has URL configured
2. Remove csharp-sdk dependency if not needed for v01
3. Clone sdk separately and update project reference

### Issue 6: grant-server Waiting on PostgreSQL

**Symptoms**: Pod stuck in Init:0/2  
**Root Cause**: PostgreSQL service instance taking time to provision  
**Expected**: Should resolve automatically once DB is ready

## Kubernetes Resources Created

```bash
# Pods
kubectl get pods -n grant-management | grep v01

# Services
kubectl get svc -n grant-management | grep v01

# VirtualServices (Istio)
kubectl get virtualservice -n grant-management | grep v01
```

## Next Actions for Full v01

1. **Fix cockpit-ui image pull** - Verify registry and imagePullSecret
2. **Build mcp-proxy:v14** - Fix TypeScript errors or skip checks
3. **Handle csharp-sdk dependency** - Initialize submodule or remove dependency
4. **Wait for PostgreSQL** - Should auto-resolve, monitor grant-server pod

## Lessons Learned

### .NET Multi-Project Docker Builds

✅ **Always copy Directory.Build.\* files** into the build context  
✅ **Place them at container root (/)** for MSBuild to find them  
❌ Don't assume projects are self-contained - check for parent directory dependencies

### Registry Push Verification

⚠️ **Pushing != Available** - Need to verify images are pullable  
✅ **Check pod events** for exact error messages  
✅ **Use manifest inspect** to verify image in registry

### Helm Deployment Strategy

✅ **Deploy incrementally** - Services can fail independently  
✅ **Check pod status immediately** - Don't wait for full timeout  
⚠️ **ImagePullBackOff** usually means auth or image not found

## Related Files

- Dockerfile fixes: `app/grant-management/GrantManagementServer/Dockerfile`
- Build config: `app/grant-management/Directory.Build.*`
- Restored config: `tsconfig.json`
- Helm values: `chart/values.yaml`
- Generated chart: `gen/chart/`
