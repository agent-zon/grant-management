# Changelog: .NET Services Integration

**Format**: YYYY-MM-DD HH:MM - [CATEGORY] Description

## 2025-10-26

### 14:30 - [SETUP] Task Structure Created
- Created `.tasks/dotnet-integration/` directory
- Added TASK_DEFINITION.md with goals and acceptance criteria
- Added STATUS.md for progress tracking
- Added CHANGELOG.md for chronological decisions
- Added NOTES.md for additional findings
- Created `memory-bank/`, `artifacts/`, `docs/` subdirectories
- Following workspace rules from tasks-and-memory-bank.mdc

### 14:32 - [PLANNING] Phase 1 Started
- Beginning merge of origin/GrantMcpLayer branch
- Priority: Keep existing srv/ and app/ structure intact
- Accept new services: GrantManagement/, cockpit-ui/, Common/
- Will resolve conflicts favoring current implementation for shared files

---

## Decision Log

### Architecture Decisions

**AD-001**: Use single approuter for all services
- **Date**: 2025-10-26
- **Decision**: All services (Node.js and .NET) will use the same approuter instance
- **Rationale**: Simpler routing, consistent authentication, easier CORS management
- **Impact**: Need to configure destination prefixes and route rules in xs-app.json

**AD-002**: Replace Node.js grant management with .NET version
- **Date**: 2025-10-26
- **Decision**: Completely replace srv/grant-management/ with GrantManagementServer
- **Rationale**: User confirmed "we don't need the nodejs" version
- **Impact**: Need to create HTTP client in authorization service to call .NET API

**AD-003**: Progressive deployment with version preservation
- **Date**: 2025-10-26
- **Decision**: Deploy as v01, v02, v03 with each being a preserved state
- **Rationale**: Maintain working deployment points, easy rollback, staged integration
- **Impact**: Need to update helm release names and container tags between phases

**AD-004**: Bind all services to same IAS identity instance
- **Date**: 2025-10-26
- **Decision**: All services use single identity service instance with different app-identifiers
- **Rationale**: User requirement for unified authentication across services
- **Impact**: Configure separate app-identifier for each service in helm bindings

---

## Technical Decisions

**TD-001**: Use docker-compose for local integration testing
- **Date**: 2025-10-26
- **Decision**: Create docker-compose.local.yml with all services
- **Rationale**: Test service-to-service communication before deployment
- **Impact**: Need to configure service networking and environment variables

**TD-002**: Store Common DTOs in app/common/
- **Date**: 2025-10-26
- **Decision**: Move Common/ directory to app/common/ following project structure
- **Rationale**: Consistent with app/mcp-proxy/, app/portal/ pattern
- **Impact**: Need to update .csproj references in GrantManagementServer and GrantMcpLayer

---

## 2025-10-27

### 09:00 - [VERIFICATION] Phase 1 Complete
- Verified GrantMcpLayer branch was already merged
- Confirmed all three directories present: GrantManagement/, cockpit-ui/, Common/
- Ran npm install successfully (dependencies installed)
- Node.js engine warnings noted but non-blocking

### 09:15 - [MIGRATION] Starting Phase 2 - Directory Structure Migration
- Beginning migration to app/ folder structure per plan
- Will move GrantManagement/ → app/grant-management/
- Will move cockpit-ui/ → app/cockpit-ui/  
- Will move Common/ → app/common/
- Will update .NET project references after move

### 09:30 - [MIGRATION] Phase 2 Complete
- All directories successfully moved using `git mv` to preserve history
- Updated GrantManagementServer.csproj: ../common/Common.csproj reference
- Updated GrantMcpLayer.csproj: ../common/Common.csproj reference
- Updated grant-managment.sln with new paths for all projects
- Committed changes: "Phase 2: Move .NET services to app/ folder structure"

### 09:45 - [CONTAINERIZATION] Starting Phase 3 - Dockerfile Creation
- Verified Dockerfiles exist for GrantManagementServer and GrantMcpLayer
- Created new Dockerfile for cockpit-ui using node:20-alpine + nginx:alpine
- Updated containerize.yaml with three new modules:
  - grant-management/grant-server (v1-grant-server)
  - grant-management/grant-mcp-layer (v1-grant-mcp-layer)
  - grant-management/cockpit-ui (v1-cockpit-ui)
- Created docker-compose.local.yml for local integration testing
  - Services: srv, mcp-proxy, grant-server, grant-mcp-layer, cockpit-ui, mcp-server-example, postgres
  - Configured service networking and environment variables
  - Added postgres volume for data persistence
- Committed changes: "Phase 3: Add containerization configuration"

### 10:00 - [HELM] Starting Phase 4 - Helm Chart Configuration for v01
- Updated chart/Chart.yaml dependencies:
  - Added grant-server, grant-mcp-layer, cockpit-ui as web-application aliases
  - Uncommented postgresql service-instance dependency
- Updated chart/values.yaml:
  - Added grant-server configuration with IAS binding and postgresql binding
  - Added grant-mcp-layer configuration with IAS binding and GrantManagementUrl env
  - Added cockpit-ui configuration (static nginx serve)
  - Updated backendDestinations with all three new services
- Updated app/router/xs-app.json routes:
  - /cockpit-ui/* → cockpit-ui destination (authenticated with IAS)
  - /api/grants/* → grant-server destination (authenticated with IAS)
- Ready for v01 deployment milestone

---

(More entries will be added as work progresses)

