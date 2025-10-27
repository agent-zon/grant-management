# Notes: .NET Services Integration

**Created**: 2025-10-26  
**Last Updated**: 2025-10-26

## Investigation Notes

### GrantMcpLayer Branch Analysis

The branch contains:
- `GrantManagement/` - .NET solution with 4 projects
  - `GrantManagement.sln` - Solution file
  - `GrantManagementServer/` - Core grant API (.NET 8)
  - `GrantMcpLayer/` - MCP proxy with consent enforcement
  - `GrantManagement.AppHost/` - Aspire app host for orchestration
  - `GrantManagement.ServiceDefaults/` - Shared .NET configuration
- `cockpit-ui/` - React/Vite UI for policy management
- `Common/` - Shared DTOs between .NET services
- Additional supporting services in branch

### Project Structure Patterns

Current structure:
```
app/
├── mcp-proxy/      (Node.js/Express)
├── portal/         (React Router)
└── router/         (Approuter)
```

After migration:
```
app/
├── mcp-proxy/           (Node.js/Express)
├── portal/              (React Router)
├── router/              (Approuter)
├── grant-management/    (.NET services)
│   ├── GrantManagementServer/
│   ├── GrantMcpLayer/
│   ├── GrantManagement.AppHost/
│   └── GrantManagement.ServiceDefaults/
├── cockpit-ui/          (React/Vite)
└── common/              (Shared DTOs)
```

### Service Communication Patterns

**v01 (Standalone)**:
```
Client → Approuter → Individual Services (no inter-service calls)
```

**v02 (Grant Integration)**:
```
Client → Approuter → Authorization Service → GrantManagementServer (HTTP)
Client → Approuter → MCP Proxy → GrantManagementServer (HTTP)
```

**v03 (Full MCP)**:
```
Client → Approuter → MCP Proxy → GrantMcpLayer → GrantManagementServer
                                      ↓
                                Downstream MCP Server
```

### Database Considerations

- Node.js services use SQLite locally, PostgreSQL in deployment
- .NET services require PostgreSQL (EF Core)
- Need to add postgresql service instance to helm chart
- Connection strings configured via environment variables

### Authentication Flow

All services bound to same IAS instance:
- `srv` - app-identifier: grant-api
- `approuter` - app-identifier: approuter  
- `grant-server` - app-identifier: grant-server
- `grant-mcp-layer` - app-identifier: grant-mcp-layer
- `cockpit-ui` - no auth binding (static files, auth via approuter)

### Port Allocation (Local)

- 4004 - srv (Node.js/CAP)
- 8080 - mcp-proxy
- 8081 - grant-server (.NET)
- 8082 - grant-mcp-layer (.NET)
- 8083 - cockpit-ui (nginx)
- 5432 - postgres

### Environment Variables Reference

**GrantManagementServer**:
- `ASPNETCORE_URLS` - Listen URL
- `ConnectionStrings__DefaultConnection` - PostgreSQL connection
- (IAS binding injected by Kyma)

**GrantMcpLayer**:
- `ASPNETCORE_URLS` - Listen URL
- `GrantManagementUrl` - URL to GrantManagementServer
- `DownstreamMcpServer` - Actual MCP server URL
- (IAS binding injected by Kyma)

**mcp-proxy** (updated):
- `MCP_SERVER_URL` - Points to grant-mcp-layer (v03) or direct server (v01-v02)
- `AUTH_SERVER_URL` - Points to srv authorization service
- `GRANT_MANAGEMENT_URL` - Points to grant-server (.NET)

**srv** (updated):
- `GRANT_SERVER_URL` - Points to grant-server for grant operations

## Open Questions

1. ~~Does cockpit-ui need its own IAS binding?~~ - No, auth handled by approuter
2. ~~Should we use the same approuter or separate ones?~~ - Same approuter
3. ~~Do we keep Node.js grant management?~~ - No, replace with .NET version
4. Need to verify .NET service health endpoints exist
5. Need to check if grant-mcp-layer has proper interceptor configuration

## Risks and Mitigations

### Risk: Breaking existing OAuth flow during v02 integration
**Mitigation**: Test thoroughly with docker-compose locally before deployment; keep v01 running as fallback

### Risk: .NET services may have different grant data model
**Mitigation**: Create adapter layer in authorization service to map between Node.js and .NET formats

### Risk: MCP protocol incompatibility between proxy and layer
**Mitigation**: Verify grant-mcp-layer implements full JSON-RPC 2.0 spec; test with example MCP server

### Risk: Database migration from SQLite to PostgreSQL
**Mitigation**: Both use similar schema; verify entity mappings in .NET; test data flow locally

## Performance Considerations

- .NET services generally faster than Node.js for CPU-bound operations
- Added network hop: mcp-proxy → grant-mcp-layer → grant-server
- Consider caching grant lookups in grant-mcp-layer
- Monitor latency impact of HTTP calls from authorization service to grant-server

## Security Notes

- All services use IAS OAuth2 tokens
- Grant IDs are non-secret, can be logged
- Ensure grant-server validates tokens properly
- Verify CORS configuration in approuter for cockpit-ui
- Check that grant-mcp-layer doesn't leak sensitive tool data

## Testing Strategy

**Unit Tests**:
- Keep existing Node.js tests
- Add .NET service tests (if they exist in branch)

**Integration Tests**:
- docker-compose end-to-end flows
- Test each deployment milestone locally before pushing

**E2E Tests**:
- Update test/oauth-basic-flow.test.ts to work with .NET backend
- Update test/mcp-consent.test.ts for grant-mcp-layer flow
- Run against deployed environments

## Deployment URLs (Planned)

**v01**: https://v01-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/
- All services accessible individually
- No integration yet

**v02**: https://v02-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/
- OAuth flow uses .NET grant management
- MCP proxy calls .NET API directly

**v03**: https://v03-grant-management-approuter.c-127c9ef.stage.kyma.ondemand.com/
- Full MCP flow through grant-mcp-layer
- Complete .NET integration

## Useful Commands

```bash
# Local development
npm start                          # Start Node.js services
dotnet run --project app/grant-management/GrantManagementServer
npm run dev --prefix app/cockpit-ui

# Docker
npm run build:containers           # Build all containers
docker-compose -f docker-compose.local.yml up

# Deployment
npm run deploy                     # Deploy to Kyma
kubectl get pods -n grant-management
kubectl logs -n grant-management <pod-name>

# Testing
npm test                          # Run all tests
npm run test:e2e                  # E2E tests
```

