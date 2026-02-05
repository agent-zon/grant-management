# Agent MCP Destinations (Phase 1)

**Created**: 2026-02-04
**Last Updated**: 2026-02-04
**Category**: [FEATURE]
**Timeline**: Phase 1 - Single destination per agent

## Overview

Enable each agent to stream MCP requests through GrantToolsService to **exactly one** remote MCP server reachable via **SAP Destination**.

## Goal

- **Phase 1**: one agent → **one** MCP destination/server (streaming proxy + tool discovery + call forwarding).
- **Later**: introduce an **aggregator MCP** that fans out to multiple destinations and performs aggregations. This task explicitly does **not** implement aggregation.

## Key Reference

Primary reference for how to proxy/stream to a destination-backed MCP server:

- `srv/grant-tools-service/handler.proxy.tsx`

## Requirements

### Agent MCP Configuration (Phase 1)

Replace `mcpServerName` / `mcpDestination` with a single `mcp` config object in `db/discovery.cds`:

- `mcp.kind`: string, default `"destination"` (Phase 1 only supports destination)
- `mcp.name`: string, the SAP Destination name (e.g. `"MY_MCP_DEST"`)
- `mcp.strategy`: enum controlling destination selection strategy:
  - `alwaysProvider`
  - `alwaysSubscriber`
  - `subscriberFirst` (default)

### Runtime Components

1. **Destination-backed MCP transport helper**: Resolves destination via Cloud SDK, builds merged headers, creates StreamableHTTPClientTransport
2. **Streaming proxy endpoint**: Mirrors `handler.proxy.tsx` behavior for bidirectional streaming
3. **Tool discovery**: Lists tools from remote MCP server via destination transport
4. **Tool execution proxy (callTool)**: Forwards tool calls to remote MCP server

## Acceptance Criteria

- [ ] Each agent has exactly one MCP config: `mcp.kind === 'destination'`, `mcp.name`, `mcp.strategy`
- [ ] GrantToolsService exposes remote tools using their **native tool names** (no namespacing)
- [ ] Destination selection respects `mcp.strategy` (`alwaysProvider|alwaysSubscriber|subscriberFirst`)
- [ ] Streaming proxy uses merged headers + preserves `mcp-session-id` / `last-event-id`
- [ ] Proxy errors surface as JSON-RPC errors (not silent disconnects)

## Constraints

- **Debug Destination service is NOT a dependency**: The debug destination service under `srv/debug-service/*` is valuable to understand/test/debug destination resolution, but the GrantToolsService runtime path MUST NOT depend on it.
- **Tool-name collisions**: Without namespacing, remote tool names may collide with existing local/DB tool names. Phase 1 assumes this won't happen for a given agent.

## Out of Scope

- Aggregator MCP (multiple destinations per agent)
- Fan-out listTools/callTool
- Aggregation/merging policies

## Related Files

- `db/discovery.cds` - Agent model with MCP config
- `srv/grant-tools-service/grant-tools-service.cds` - Service CDS definition
- `srv/grant-tools-service/handler.tools.tsx` - Tool discovery handler
- `srv/grant-tools-service/handler.mcp.tsx` - MCP handler for tool execution
- `srv/grant-tools-service/handler.proxy.tsx` - Reference proxy implementation
