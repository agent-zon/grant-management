# Status: .NET Services Integration

**Last Updated**: 2025-10-27

## Current Status: IN PROGRESS

### Phase 1: Merge and Initial Verification

- [x] Task structure created
- [x] GrantMcpLayer branch merged (already present)
- [x] Dependencies installed

### Phase 2: Structure Migration

- [x] GrantManagement moved to app/
- [x] cockpit-ui moved to app/
- [x] Common moved to app/
- [x] Project references updated
- [ ] Individual services tested locally

### Phase 3: Containerization

- [x] Dockerfiles created/verified
- [x] containerize.yaml updated
- [x] docker-compose.local.yml created
- [ ] Local integration tested (deferred to after Helm)

### Phase 4: Deployment v01

- [ ] Helm charts updated
- [ ] Values.yaml configured
- [ ] Approuter routes added
- [ ] v01 deployed and verified

### Phase 5: Deployment v02

- [ ] .NET grant client created
- [ ] Authorization service integrated
- [ ] Node.js grant service removed
- [ ] v02 deployed and tested

### Phase 6: Deployment v03

- [ ] MCP proxy routed through grant-mcp-layer
- [ ] Full MCP flow tested
- [ ] v03 deployed

### Phase 7: Testing and Documentation

- [ ] E2E tests updated
- [ ] Documentation updated
- [ ] Memory bank populated
- [ ] Cleanup completed

## Current Working On

Phase 4: Updating Helm charts for v01 deployment.

## Blockers

None currently.

## Next Steps

1. Update chart/Chart.yaml with new service dependencies
2. Add postgresql service configuration to values.yaml
3. Configure grant-server, grant-mcp-layer, cockpit-ui in values.yaml
4. Update app/router/xs-app.json with new routes
