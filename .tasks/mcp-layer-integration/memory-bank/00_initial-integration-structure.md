# .NET Services Integration - Initial Structure

**Created**: 2025-10-27  
**Last Updated**: 2025-10-27  
**Category**: [ARCHITECTURE]  
**Timeline**: 00 of 04 - Initial integration and structure setup

## Overview

Integrated three .NET services (GrantManagementServer, GrantMcpLayer) and one React UI (cockpit-ui) from the GrantMcpLayer branch into the existing Node.js/CAP grant-management project. This document captures the structural decisions and migration patterns.

## Directory Structure Migration

### Before
```
/
├── GrantManagement/          # At root
│   ├── GrantManagementServer/
│   ├── GrantMcpLayer/
│   └── ...
├── cockpit-ui/               # At root
└── Common/                   # At root
```

### After
```
/
├── app/
│   ├── grant-management/     # Moved here
│   │   ├── GrantManagementServer/
│   │   ├── GrantMcpLayer/
│   │   ├── GrantManagement.AppHost/
│   │   └── GrantManagement.ServiceDefaults/
│   ├── cockpit-ui/           # Moved here
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── common/               # Moved here
│   │   └── DTOs/
│   ├── mcp-proxy/            # Existing
│   ├── portal/               # Existing
│   └── router/               # Existing
├── srv/                      # Existing Node.js services
└── chart/                    # Helm charts
```

## Key Architectural Decisions

### AD-001: Unified app/ Folder Structure
**Decision**: Move all application services under `app/` directory  
**Rationale**: 
- Consistency with existing `app/mcp-proxy/` and `app/portal/` structure
- Clear separation between application code and infrastructure (srv/, db/, chart/)
- Better IDE navigation and discoverability

**Impact**:
- .NET project references updated (`../../Common` → `../common`)
- Solution file paths updated for all projects
- Build contexts in Dockerfiles remain relative to service directory

### AD-002: Service Naming Convention
**Decision**: Use kebab-case for directory names  
**Rationale**:
- Matches existing naming: `mcp-proxy`, not `McpProxy`
- Kubernetes-friendly (lowercase, hyphens)
- Consistent with helm chart aliases

**Mapping**:
- `GrantManagement` → `grant-management`
- `GrantManagementServer` → stays as-is (within grant-management/)
- `cockpit-ui` → stays as-is (already kebab-case)
- `Common` → `common`

### AD-003: PostgreSQL Database Strategy
**Decision**: Add postgresql service-instance in Helm, bind to .NET services  
**Rationale**:
- .NET services use EntityFrameworkCore with PostgreSQL
- Node.js services use SQLite (separate, unchanged)
- Future: may migrate Node.js to shared PostgreSQL

**Configuration**:
```yaml
postgresql:
  serviceOfferingName: postgresql-db
  servicePlanName: development
  fullnameOverride: grants-postgres
```

## Project Reference Updates

### GrantManagementServer.csproj
```xml
<!-- Before -->
<ProjectReference Include="..\..\Common\Common.csproj" />

<!-- After -->
<ProjectReference Include="..\..\common\Common.csproj" />
```

### GrantMcpLayer.csproj
```xml
<!-- Before -->
<ProjectReference Include="..\..\Common\Common.csproj" />

<!-- After -->
<ProjectReference Include="..\..\common\Common.csproj" />
```

### grant-managment.sln
```
<!-- Before -->
"GrantManagement\GrantManagementServer\GrantManagementServer.csproj"
"Common\Common.csproj"

<!-- After -->
"app\grant-management\GrantManagementServer\GrantManagementServer.csproj"
"app\common\Common.csproj"
```

## Containerization Strategy

### Multi-Stage Dockerfile Pattern (.NET)
Both GrantManagementServer and GrantMcpLayer use Microsoft's recommended multi-stage build:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
FROM build AS publish
FROM base AS final
```

**Build Context**: `app/grant-management/` (parent directory)  
**Dockerfile Location**: `app/grant-management/GrantManagementServer/Dockerfile`

**Why parent context?**
- Needs access to `../Common/` for shared DTOs
- Needs access to `../GrantManagement.ServiceDefaults/` for shared config
- Allows `COPY . .` to include all dependencies

### Node + Nginx Pattern (cockpit-ui)
```dockerfile
FROM node:20-alpine AS builder
# ... build React app ...
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Build Context**: `app/cockpit-ui/` (self-contained)

## Helm Integration Pattern

### Service Dependency Structure
```yaml
dependencies:
  - name: web-application
    alias: srv              # Node.js CAP service
  - name: web-application
    alias: grant-server     # .NET GrantManagementServer
  - name: web-application
    alias: grant-mcp-layer  # .NET GrantMcpLayer
  - name: web-application
    alias: cockpit-ui       # React UI
  - name: service-instance
    alias: postgresql       # Database for .NET services
```

### IAS Authentication Binding
All services bind to same `identity` service instance with unique `app-identifier`:

```yaml
grant-server:
  bindings:
    auth:
      serviceInstanceName: identity
      parameters:
        app-identifier: grant-server  # Unique per service
        
grant-mcp-layer:
  bindings:
    auth:
      serviceInstanceName: identity
      parameters:
        app-identifier: grant-mcp-layer
```

### Service-to-Service Communication
Environment variables configure internal networking:

```yaml
grant-mcp-layer:
  env:
    - name: GrantManagementUrl
      value: "http://grant-server:8080"  # Kubernetes service name
```

## Approuter Routing Strategy

### Route Priority Order
1. Static files (`/api-docs`, `/auth/debug`)
2. Auth APIs (`/auth/api/me`)
3. User API (`/user-api`)
4. MCP Proxy (`/mcp-proxy/*`) - no auth
5. **Cockpit UI** (`/cockpit-ui/*`) - IAS auth
6. **Grant API** (`/api/grants/*`) - IAS auth
7. Fallback to srv (`^/(.*)$`) - IAS auth

### New Routes
```json
{
  "source": "^/cockpit-ui/(.*)$",
  "destination": "cockpit-ui",
  "authenticationType": "ias"
},
{
  "source": "^/api/grants/(.*)$",
  "destination": "grant-server",
  "authenticationType": "ias"
}
```

## Lessons Learned

### 1. Git History Preservation
✅ **Used `git mv`** to preserve file history during directory restructuring  
❌ Don't use `mv` + `git add` - loses history

### 2. .NET Build Context
✅ **Parent directory as context** when projects share dependencies  
❌ Don't use project directory if it references `../` paths

### 3. Helm Alias Naming
✅ **Match Kubernetes naming rules**: lowercase, hyphens  
❌ Don't use PascalCase or underscores in aliases

### 4. Service Discovery
✅ **Use Kubernetes service names** in env vars: `http://grant-server:8080`  
❌ Don't hardcode pod IPs or use localhost

## Related Files

- Plan: `.cursor/plans/integrate--mcp-layer-services-12fac34d.plan.md`
- CHANGELOG: `.tasks/mcp-layer-integration/CHANGELOG.md`
- STATUS: `.tasks/mcp-layer-integration/STATUS.md`
- Solution: `grant-managment.sln`
- Dockerfiles: `app/grant-management/*/Dockerfile`, `app/cockpit-ui/Dockerfile`
- Helm: `chart/Chart.yaml`, `chart/values.yaml`
- Routes: `app/router/xs-app.json`

## Next Phase

Phase 5 will integrate the Node.js authorization service with .NET grant-server by:
1. Creating HTTP client in `srv/authorization-service/`
2. Replacing CDS grant queries with REST API calls
3. Removing old `srv/grant-management/` service

