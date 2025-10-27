# Task: .Merge MCP Layer Branch 

**Created**: 2025-10-26  
**Last Updated**: 2025-10-26  
**Category**: [ARCHITECTURE]  
**Status**: In Progress

## Overview

Integrate .NET GrantManagement service and cockpit-ui from the GrantMcpLayer branch into the existing Node.js/CAP project, migrating to a microservices architecture with progressive deployment milestones (v01, v02, v03).

## Goals

1. Merge GrantMcpLayer branch without breaking existing functionality
2. Migrate new services to `app/` folder structure following project conventions
3. Containerize all services and enable local integration testing
4. Deploy in three progressive milestones:
   - **v01**: All services accessible independently (no integration yet)
   - **v02**: Full .NET grant management integration with authorization service
   - **v03**: Complete MCP flow through grant-mcp-layer

## Services Being Integrated

### From GrantMcpLayer Branch:

1. **GrantManagementServer** (.NET/C#) - Core grant management API
   - Replaces Node.js grant management service
   - Uses PostgreSQL database
   - Exposes `/api/grants/*` endpoints

2. **GrantMcpLayer** (.NET/C#) - MCP protocol layer with grant enforcement
   - Intercepts MCP tool calls
   - Validates permissions via GrantManagementServer
   - Routes to downstream MCP server when authorized

3. **cockpit-ui** (React/Vite) - Policy management UI
   - Tool policy configuration
   - Grant management dashboard
   - Served via approuter at `/cockpit-ui/*`

4. **Common** - Shared DTOs and models between .NET services

## Requirements

### Technical
- All services bound to same IAS identity instance
- Each service has its own destination configuration
- Single approuter serves all services
- PostgreSQL instance for .NET services
- Preserve existing Node.js authorization and MCP proxy services

### Deployment
- Use versioned releases: v01, v02, v03
- Each milestone is a preserved deployment point
- Helm version increments (v14 → v15 → v16)
- Local testing with docker-compose before each deployment

## Acceptance Criteria

- [ ] Existing Node.js services continue working after merge
- [ ] All new services build and run locally
- [ ] Docker containers build successfully for all services
- [ ] Local integration works via docker-compose
- [ ] v01 deployed: All services accessible with IAS auth
- [ ] v02 deployed: OAuth flow uses .NET grant management
- [ ] v03 deployed: MCP flow routes through grant-mcp-layer
- [ ] E2E tests pass against .NET backend
- [ ] Documentation updated with architecture changes

## Non-Goals

- Keeping Node.js grant management service (will be replaced)
- Cross-party consent sharing
- Historical consent archives

## References

- Plan: `.cursor/plans/integrate--mcp-layer-services-12fac34d.plan.md`
- MDC Rule: `.cursor/rules/tasks-and-memory-bank.mdc`
- MCP Integration: `.cursor/plans/mcp-consent-integration-ea9c81ac.plan.md`

