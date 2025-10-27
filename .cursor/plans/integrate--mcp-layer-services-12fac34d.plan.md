<!-- 12fac34d-54af-4972-af73-fc43a2a492cd 2459e124-91a7-45f1-97a2-f21a23b098c1 -->
# Integrate GrantManagement/McpLayer and cockpit-ui Services

## Phase 1: Merge and Initial Verification

### 1.1 Create Task Structure

Create `.tasks/mcp-layer-integration/` with required files per workspace rules:

- TASK_DEFINITION.md
- STATUS.md
- CHANGELOG.md
- NOTES.md
- memory-bank/ (for timeline-ordered findings)
- artifacts/ (for code snippets, configs)
- docs/ (for spec files and references)

### 1.2 Merge GrantMcpLayer Branch

```bash
git merge origin/GrantMcpLayer
```

Resolve conflicts if any, prioritizing:

- Keep existing `srv/` structure initially
- Keep existing `app/mcp-proxy/` and `app/portal/`
- Accept new `GrantManagement/`, `cockpit-ui/`, `Common/` directories
- Merge `package.json` dependencies
- Keep existing `containerize.yaml`, `chart/` (will update later)

### 1.3 Verify Existing Services Still Work

Test locally:

```bash
npm install
npm start
```

Verify endpoints:

- http://localhost:4004/oauth-server/authorize
- http://localhost:4004/grants-management/Grants
- http://localhost:4004/demo-service

## Phase 2: Structure Migration to app/ Folder

### 2.1 Move GrantManagement to app/

Create `app/grant-management/` and move:

```
GrantManagement/ → app/grant-management/
├── GrantManagement.sln
├── GrantManagementServer/
├── GrantMcpLayer/
├── GrantManagement.AppHost/
└── GrantManagement.ServiceDefaults/
```

Update solution file paths if needed.

### 2.2 Move cockpit-ui to app/

```
cockpit-ui/ → app/cockpit-ui/
├── src/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

Update `package.json` scripts and paths.

### 2.3 Move Common DTOs

```
Common/ → app/common/
└── DTOs/
```

Update references in .NET projects:

- Update `GrantManagementServer.csproj` imports
- Update `GrantMcpLayer.csproj` imports

### 2.4 Test Individual Services Locally

Test .NET services:

```bash
cd app/grant-management/GrantManagementServer
dotnet restore
dotnet run
```

Test cockpit-ui:

```bash
cd app/cockpit-ui
npm install
npm run dev
```

Verify existing Node.js services still work:

```bash
npm start
```

## Phase 3: Containerization and Local Integration

### 3.1 Update/Create Dockerfiles

**app/grant-management/GrantManagementServer/Dockerfile** - verify multi-stage build

**app/grant-management/GrantMcpLayer/Dockerfile** - verify multi-stage build

**app/cockpit-ui/Dockerfile** - create if missing:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3.2 Update containerize.yaml

Add new modules:

```yaml
modules:
  - name: grant-management/api
    # existing...
  
  - name: grant-management/approuter
    # existing...
  
  - name: grant-management/mcp-proxy
    # existing...
  
  - name: grant-management/grant-server
    id: v1-grant-server
    build-parameters:
      commands:
        - docker buildx build --platform linux/amd64 -t grant-management/grant-server:v14 app/grant-management/GrantManagementServer --load
  
  - name: grant-management/grant-mcp-layer
    id: v1-grant-mcp-layer
    build-parameters:
      commands:
        - docker buildx build --platform linux/amd64 -t grant-management/grant-mcp-layer:v14 app/grant-management/GrantMcpLayer --load
  
  - name: grant-management/cockpit-ui
    id: v1-cockpit-ui
    build-parameters:
      commands:
        - docker buildx build --platform linux/amd64 -t grant-management/cockpit-ui:v14 app/cockpit-ui --load
```

### 3.3 Create docker-compose for Local Testing

Create `docker-compose.local.yml` at root:

```yaml
version: '3.8'
services:
  srv:
    build: .
    ports:
      - "4004:4004"
    environment:
      - NODE_ENV=development
  
  mcp-proxy:
    build: app/mcp-proxy
    ports:
      - "8080:8080"
    environment:
      - AUTH_SERVER_URL=http://srv:4004/oauth-server
      - GRANT_MANAGEMENT_URL=http://grant-server:8081/api
  
  grant-server:
    build: app/grant-management/GrantManagementServer
    ports:
      - "8081:8080"
    environment:
      - ASPNETCORE_URLS=http://+:8080
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=grants;Username=postgres;Password=postgres
  
  grant-mcp-layer:
    build: app/grant-management/GrantMcpLayer
    ports:
      - "8082:8080"
    environment:
      - ASPNETCORE_URLS=http://+:8080
      - GrantManagementUrl=http://grant-server:8081
  
  cockpit-ui:
    build: app/cockpit-ui
    ports:
      - "8083:80"
  
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=grants
    ports:
      - "5432:5432"
```

### 3.4 Test Local Integration

```bash
npm run build:containers
docker-compose -f docker-compose.local.yml up
```

Verify:

- srv responds on :4004
- grant-server responds on :8081
- grant-mcp-layer responds on :8082
- cockpit-ui serves on :8083
- mcp-proxy connects to grant-server

## Phase 4: Helm Integration - Deployment v01 (Standalone New Services)

### 4.1 Update chart/Chart.yaml

Add dependencies:

```yaml
dependencies:
  - name: web-application
    alias: srv
    version: ">0.0.0"
  - name: web-application
    alias: approuter
    version: ">0.0.0"
  - name: web-application
    alias: mcp-proxy
    version: ">0.0.0"
  - name: web-application
    alias: grant-server
    version: ">0.0.0"
  - name: web-application
    alias: grant-mcp-layer
    version: ">0.0.0"
  - name: web-application
    alias: cockpit-ui
    version: ">0.0.0"
  - name: service-instance
    alias: destination
    version: ">0.0.0"
  - name: service-instance
    alias: identity
    version: ">0.0.0"
  - name: service-instance
    alias: postgresql
    version: ">0.0.0"
```

### 4.2 Update chart/values.yaml

Add postgresql service (needed by .NET):

```yaml
postgresql:
  serviceOfferingName: postgresql-db
  servicePlanName: development
  fullnameOverride: grants-postgres
```

Add grant-server configuration:

```yaml
grant-server:
  bindings:
    auth:
      serviceInstanceName: identity
      parameters:
        credential-type: X509_GENERATED
        app-identifier: grant-server
    db:
      serviceInstanceName: postgresql
  image:
    repository: grant-management/grant-server
  resources:
    limits:
      ephemeral-storage: 1G
      memory: 512M
    requests:
      ephemeral-storage: 512M
      cpu: 250m
      memory: 256M
  health:
    liveness:
      path: /health
    readiness:
      path: /health
  networkSecurity:
    allowNamespaceInternal: true
  env:
    - name: ASPNETCORE_URLS
      value: "http://+:8080"
```

Add grant-mcp-layer:

```yaml
grant-mcp-layer:
  bindings:
    auth:
      serviceInstanceName: identity
      parameters:
        credential-type: X509_GENERATED
        app-identifier: grant-mcp-layer
  image:
    repository: grant-management/grant-mcp-layer
  resources:
    limits:
      ephemeral-storage: 1G
      memory: 256M
    requests:
      ephemeral-storage: 512M
      cpu: 100m
      memory: 128M
  health:
    liveness:
      path: /health
    readiness:
      path: /health
  networkSecurity:
    allowNamespaceInternal: true
  env:
    - name: ASPNETCORE_URLS
      value: "http://+:8080"
    - name: GrantManagementUrl
      value: "http://grant-server:8080"
```

Add cockpit-ui:

```yaml
cockpit-ui:
  image:
    repository: grant-management/cockpit-ui
  resources:
    limits:
      ephemeral-storage: 1G
      memory: 128M
    requests:
      ephemeral-storage: 256M
      cpu: 50m
      memory: 64M
  health:
    liveness:
      path: /
    readiness:
      path: /
  networkSecurity:
    allowNamespaceInternal: true
```

Update backendDestinations:

```yaml
backendDestinations:
  srv-api:
    service: srv
    forwardAuthToken: true
  mcp-proxy:
    service: mcp-proxy
    forwardAuthToken: false
  grant-server:
    service: grant-server
    forwardAuthToken: true
  grant-mcp-layer:
    service: grant-mcp-layer
    forwardAuthToken: true
  cockpit-ui:
    service: cockpit-ui
    forwardAuthToken: false
```

### 4.3 Update app/router/xs-app.json

Add routes for new services:

```json
{
  "routes": [
    {
      "source": "^/api-docs(.*)$",
      "target": "$1",
      "localDir": "./api-docs",
      "csrfProtection": false,
      "authenticationType": "none"
    },
    {
      "source": "^/cockpit-ui/(.*)$",
      "target": "/$1",
      "destination": "cockpit-ui",
      "csrfProtection": false,
      "authenticationType": "ias"
    },
    {
      "source": "^/api/grants/(.*)$",
      "target": "/api/grants/$1",
      "destination": "grant-server",
      "csrfProtection": false,
      "authenticationType": "ias"
    },
    {
      "source": "^/mcp-proxy/(.*)$",
      "target": "/$1",
      "destination": "mcp-proxy",
      "csrfProtection": false,
      "authenticationType": "none"
    },
    {
      "source": "^/(.*)$",
      "target": "$1",
      "destination": "srv-api",
      "csrfProtection": false,
      "authenticationType": "ias"
    }
  ]
}
```

### 4.4 Update package.json scripts

Add version to deploy command:

```json
{
  "scripts": {
    "deploy": "helm upgrade --install --create-namespace --wait v01 ./chart --namespace grant-management",
    "build:containers": "npm run containerize",
    "containerize": "cds-containerize"
  }
}
```

### 4.5 Deploy v01 - Verify All Services Accessible

```bash
npm run build:containers
npm run deploy
```

Test deployment:

- https://v01-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/
- https://v01-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/cockpit-ui/
- https://v01-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/api/grants
- https://v01-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/oauth-server/metadata

Verify IAS authentication works for all services.

**Checkpoint: v01 deployed and all services accessible independently**

## Phase 5: Authorization Service Integration - Deployment v02

### 5.1 Update mcp-proxy to Use .NET Grant Server

Update `app/mcp-proxy/src/services/grant-management-client.ts`:

```typescript
async getGrant(grantId: string): Promise<any> {
  const response = await fetch(`${this.baseUrl}/api/grants/${grantId}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  // Handle .NET response format
}
```

Update environment in values.yaml:

```yaml
mcp-proxy:
  env:
    - name: GRANT_MANAGEMENT_URL
      value: "http://grant-server:8080"
```

### 5.2 Create .NET Grant Client in Authorization Service

Create `srv/authorization-service/clients/grant-management-client.ts`:

```typescript
export class DotNetGrantClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.GRANT_SERVER_URL || 'http://grant-server:8080';
  }
  
  async createGrant(data: CreateGrantDto): Promise<Grant> {
    const response = await fetch(`${this.baseUrl}/api/grants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async getGrant(grantId: string): Promise<Grant> {
    const response = await fetch(`${this.baseUrl}/api/grants/${grantId}`, {
      method: 'GET'
    });
    return response.json();
  }
  
  async updateGrant(grantId: string, data: UpdateGrantDto): Promise<Grant> {
    const response = await fetch(`${this.baseUrl}/api/grants/${grantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async revokeGrant(grantId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/grants/${grantId}`, {
      method: 'DELETE'
    });
  }
}
```

### 5.3 Update Authorization Handler to Use .NET Client

Update `srv/authorization-service/handler.token.tsx`:

- Replace CDS grant queries with DotNetGrantClient calls
- Map Node.js data structures to .NET DTOs
- Update authorization_details format if needed

Update `srv/authorization-service/handler.consent.tsx`:

- Use DotNetGrantClient.createGrant() after consent
- Pass authorization_details in .NET format

### 5.4 Remove Node.js Grant Management Service

Comment out or remove:

- `srv/grant-management/` (keep for reference initially)
- Remove from `srv/index.cds`:
```cds
// using from './grant-management/grant-management.cds';
```


Update `db/grants.cds` - keep schema definitions for CDS but mark as deprecated.

### 5.5 Update Environment Configuration

Update `srv/server.js` or environment:

```javascript
process.env.GRANT_SERVER_URL = process.env.GRANT_SERVER_URL || 'http://localhost:8081';
```

Add to `chart/values.yaml` srv section:

```yaml
srv:
  env:
    - name: GRANT_SERVER_URL
      value: "http://grant-server:8080"
```

### 5.6 Test Locally with docker-compose

Update `docker-compose.local.yml` to connect srv to grant-server:

```yaml
services:
  srv:
    environment:
      - GRANT_SERVER_URL=http://grant-server:8080
```

Test OAuth flow:

1. Start services: `docker-compose -f docker-compose.local.yml up`
2. Initiate authorization: `POST /oauth-server/par`
3. Complete consent
4. Exchange token
5. Verify grant created in .NET grant-server
6. Query grant via MCP proxy

### 5.7 Deploy v02

Update package.json:

```json
{
  "scripts": {
    "deploy": "helm upgrade --install --create-namespace --wait v02 ./chart --namespace grant-management"
  }
}
```

Update `containerize.yaml` tag to v15:

```yaml
tag: v15
```

Update `chart/values.yaml`:

```yaml
global:
  image:
    tag: v15
```

Deploy:

```bash
npm run build:containers
npm run deploy
```

Test v02 deployment:

- Complete OAuth flow through approuter
- Verify grants created in .NET backend
- Test MCP consent flow end-to-end
- Verify cockpit-ui can query grants from .NET API

**Checkpoint: v02 deployed with full .NET grant management integration**

## Phase 6: Grant MCP Layer Integration - Deployment v03

### 6.1 Route MCP Proxy Through Grant MCP Layer

Update `app/mcp-proxy/src/config.ts`:

```typescript
export const config = {
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://grant-mcp-layer:8080/mcp',
  // ... rest
};
```

Update values.yaml:

```yaml
mcp-proxy:
  env:
    - name: MCP_SERVER_URL
      value: "http://grant-mcp-layer:8080/mcp"
```

### 6.2 Configure Grant MCP Layer

Ensure GrantMcpLayer properly:

- Intercepts tool calls
- Checks authorization_details from grant-server
- Forwards authorized calls to downstream MCP server
- Returns consent-required errors when needed

Update appsettings.json or environment:

```json
{
  "GrantManagementUrl": "http://grant-server:8080",
  "DownstreamMcpServer": "http://localhost:3000/mcp"
}
```

### 6.3 Test Full MCP Flow Locally

```bash
docker-compose -f docker-compose.local.yml up
```

Test:

1. Agent calls MCP proxy
2. MCP proxy forwards to grant-mcp-layer
3. Grant-mcp-layer checks permissions via grant-server
4. If unauthorized, returns consent URL
5. Complete OAuth consent flow
6. Retry tool call - should succeed

### 6.4 Deploy v03

Update package.json:

```json
{
  "scripts": {
    "deploy": "helm upgrade --install --create-namespace --wait v03 ./chart --namespace grant-management"
  }
}
```

Update tags to v16.

Deploy and test full integration.

**Checkpoint: v03 deployed with complete .NET integration including MCP layer**

## Phase 7: Testing and Documentation

### 7.1 E2E Tests

Update `test/oauth-basic-flow.test.ts` to work with .NET backend.

Update `test/mcp-consent.test.ts` to test through grant-mcp-layer.

### 7.2 Update Documentation

Update `README.md`:

- Document new .NET services
- Update architecture diagrams
- Add deployment instructions for v01/v02/v03

Create `app/grant-management/README.md` with .NET service docs.

### 7.3 Update Memory Bank

Create timeline files in `.tasks/dotnet-integration/memory-bank/`:

- `00_merge-and-migration.md` - Initial merge and structure changes
- `01_containerization-approach.md` - Docker and docker-compose setup
- `02_helm-integration-patterns.md` - Multi-service helm configuration
- `03_authorization-integration.md` - Node.js to .NET client patterns
- `04_deployment-milestones.md` - v01, v02, v03 progression and lessons learned

### 7.4 Clean Up

- Remove old `srv/grant-management/` after v03 is stable
- Archive `GrantManagement/` root folder artifacts
- Update `.gitignore` for .NET build outputs

### To-dos

- [ ] Create .tasks/dotnet-integration/ with all required files (TASK_DEFINITION.md, STATUS.md, CHANGELOG.md, NOTES.md, memory-bank/, artifacts/, docs/)
- [ ] Merge origin/GrantMcpLayer branch and resolve conflicts
- [ ] Verify existing Node.js services (srv/, app/mcp-proxy) still run after merge
- [ ] Move GrantManagement/, cockpit-ui/, Common/ to app/ folder structure
- [ ] Test each service individually with dotnet run and npm run dev
- [ ] Create/verify Dockerfiles for grant-server, grant-mcp-layer, cockpit-ui
- [ ] Add new service modules to containerize.yaml
- [ ] Create docker-compose.local.yml for multi-service local testing
- [ ] Build containers and test integration with docker-compose
- [ ] Update Chart.yaml to add grant-server, grant-mcp-layer, cockpit-ui dependencies
- [ ] Add service configurations to values.yaml with IAS bindings and postgresql
- [ ] Update xs-app.json to route /cockpit-ui/*, /api/grants/* to new services
- [ ] Deploy v01 with all services accessible but not integrated - verify endpoints and IAS auth
- [ ] Create DotNetGrantClient in srv/authorization-service/clients/
- [ ] Update mcp-proxy grant-management-client.ts to call .NET API
- [ ] Update authorization service handlers to use DotNetGrantClient for grant operations
- [ ] Comment out srv/grant-management/ and remove from srv/index.cds
- [ ] Test complete OAuth flow locally with docker-compose pointing to .NET grant-server
- [ ] Deploy v02 with .NET grant management integrated - test OAuth and MCP consent flows
- [ ] Configure mcp-proxy to route through grant-mcp-layer instead of direct MCP server
- [ ] Test complete MCP flow: agent → mcp-proxy → grant-mcp-layer → grant-server → consent
- [ ] Deploy v03 with full .NET integration including grant-mcp-layer in the flow
- [ ] Update E2E tests to work with .NET backend
- [ ] Update README.md and create memory bank timeline files
- [ ] Remove old srv/grant-management/ and archive artifacts after v03 is stable